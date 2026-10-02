import { MAX_RENEWALS, siteUrl } from "./config";
import { firstName, formatDate } from "./dates";
import { sendEmail } from "./email";
import { createAdminClient } from "./supabase/admin";
import type { LoanDetail } from "./types";

export type LoanEvent =
  | "requested"
  | "approved"
  | "declined"
  | "picked_up"
  | "renewed"
  | "returned"
  | "cancelled";

export async function emailFor(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) {
    console.error("Could not look up email", error.message);
    return null;
  }
  return data.user?.email ?? null;
}

function contactLines(name: string, phone: string | null, notes: string | null): string {
  const lines: string[] = [];
  if (phone) lines.push(`${firstName(name)}'s phone: ${phone}`);
  if (notes) lines.push(`Pickup notes: ${notes}`);
  return lines.join("\n");
}

/** Emails the right person after a loan changes. Never throws. */
export async function notifyLoan(loanId: string, event: LoanEvent, actorId: string, note?: string) {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("loan_details").select("*").eq("id", loanId).single();
    if (!data) return;
    const loan = data as LoanDetail;
    const site = siteUrl();
    const title = `"${loan.book_title}"`;
    const owner = firstName(loan.owner_name);
    const borrower = firstName(loan.borrower_name);
    const otherParty = actorId === loan.owner_id ? loan.borrower_id : loan.owner_id;

    let to: string | null = null;
    let subject = "";
    let text = "";

    switch (event) {
      case "requested":
        to = loan.owner_id;
        subject = `${loan.borrower_name} would like to borrow ${title}`;
        text = `Hi ${owner},\n\n${loan.borrower_name} has asked to borrow ${title}.\n\nTheir message:\n${note ?? ""}\n\nApprove or decline the request here: ${site}/loans\nOr reply to them: ${site}/messages/${loan.borrower_id}`;
        break;
      case "approved":
        to = loan.borrower_id;
        subject = `${owner} approved your request for ${title}`;
        text = `Hi ${borrower},\n\n${loan.owner_name} is happy to lend you ${title}.${
          loan.pickup_date ? ` You suggested picking it up on ${formatDate(loan.pickup_date, "weekday")}.` : ""
        }\n\n${contactLines(loan.owner_name, loan.owner_phone, loan.owner_pickup_notes)}\n\nMessage ${owner} to confirm a time: ${site}/messages/${loan.owner_id}`;
        break;
      case "declined":
        to = loan.borrower_id;
        subject = `Request for ${title}`;
        text = `Hi ${borrower},\n\n${loan.owner_name} can't lend ${title} at the moment. You can see other books in the catalogue: ${site}`;
        break;
      case "picked_up":
        to = loan.borrower_id;
        subject = `${title} is due back ${formatDate(loan.due_date, "weekday")}`;
        text = `Hi ${borrower},\n\nYou've borrowed ${title} from ${loan.owner_name}. It's due back on ${formatDate(
          loan.due_date,
          "weekday",
        )}.\n\nYou can renew it up to ${MAX_RENEWALS} times, a month each time, unless someone else is waiting for it. We'll send you a reminder a week before it's due.\n\nYour loans: ${site}/loans`;
        break;
      case "renewed":
        to = loan.owner_id;
        subject = `${loan.borrower_name} renewed ${title}`;
        text = `Hi ${owner},\n\n${loan.borrower_name} has renewed ${title}. It's now due back on ${formatDate(
          loan.due_date,
          "weekday",
        )} (renewal ${loan.renewals} of ${MAX_RENEWALS}).\n\n${site}/loans`;
        break;
      case "returned":
        to = loan.borrower_id;
        subject = `${title} marked as returned`;
        text = `Hi ${borrower},\n\n${loan.owner_name} has marked ${title} as returned. Thanks for bringing it back.\n\nFind your next read: ${site}`;
        break;
      case "cancelled":
        to = otherParty;
        subject = `Request for ${title} cancelled`;
        text = `Hi ${firstName(otherParty === loan.owner_id ? loan.owner_name : loan.borrower_name)},\n\nThe request for ${title} has been cancelled.\n\n${site}/loans`;
        break;
    }

    if (!to || to === actorId) return;
    const email = await emailFor(to);
    if (email) await sendEmail({ to: email, subject, text });
  } catch (err) {
    console.error("notifyLoan failed", err);
  }
}

/** Emails the recipient of a new message, unless they already have unread ones from this person */
export async function notifyMessage(senderId: string, recipientId: string, body: string) {
  try {
    const admin = createAdminClient();
    const { count } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", senderId)
      .eq("recipient_id", recipientId)
      .is("read_at", null);
    if ((count ?? 0) > 1) return;

    const { data: people } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", [senderId, recipientId]);
    const sender = people?.find((p) => p.id === senderId)?.full_name ?? "A member";
    const recipient = people?.find((p) => p.id === recipientId)?.full_name ?? "";
    const email = await emailFor(recipientId);
    if (!email) return;

    await sendEmail({
      to: email,
      subject: `New message from ${sender}`,
      text: `Hi ${firstName(recipient)},\n\n${sender} sent you a message:\n\n${body}\n\nReply here: ${siteUrl()}/messages/${senderId}`,
    });
  } catch (err) {
    console.error("notifyMessage failed", err);
  }
}

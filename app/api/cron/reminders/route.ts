import { NextResponse } from "next/server";
import { APP_NAME, MAX_RENEWALS, siteUrl } from "@/lib/config";
import { daysBetween, firstName, formatDate, todayISO } from "@/lib/dates";
import { sendEmail } from "@/lib/email";
import { emailFor } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LoanDetail } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Runs once a day (see vercel.json). Sends:
 *  - a reminder 7 days before a book is due
 *  - a reminder on the due date
 *  - a weekly reminder while overdue (the owner is told once, at 7 days overdue)
 * The daily database query also stops the free Supabase project from pausing.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const today = todayISO();
  const site = siteUrl();

  const { data: loans, error } = await admin.from("loan_details").select("*").eq("status", "active");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: waitingRows } = await admin.from("loans").select("book_id").eq("status", "requested");
  const waiting = new Set((waitingRows ?? []).map((r) => r.book_id as string));

  let sent = 0;
  for (const loan of (loans ?? []) as LoanDetail[]) {
    if (!loan.due_date) continue;
    const days = daysBetween(today, loan.due_date);

    let kind: string | null = null;
    if (days === 7) kind = "due_in_week";
    else if (days === 0) kind = "due_today";
    else if (days < 0 && -days % 7 === 0) kind = `overdue_${-days}`;
    if (!kind) continue;

    // Record first so a duplicate cron run can't send twice
    const { data: logged } = await admin
      .from("reminder_log")
      .upsert({ loan_id: loan.id, kind, sent_on: today }, { onConflict: "loan_id,kind,sent_on", ignoreDuplicates: true })
      .select();
    if (!logged?.length) continue;

    const title = `"${loan.book_title}"`;
    const owner = firstName(loan.owner_name);
    const left = MAX_RENEWALS - loan.renewals;
    const renewLine = waiting.has(loan.book_id)
      ? `Someone else is waiting for this book, so it can't be renewed. Please arrange to return it to ${owner}.`
      : left > 0
        ? `If you need longer, you can renew it for another month (${left} renewal${left === 1 ? "" : "s"} left): ${site}/loans`
        : `You've used both renewals, so please arrange to return it to ${owner}.`;
    const messageLine = `Message ${owner}: ${site}/messages/${loan.owner_id}`;

    let subject: string;
    let opening: string;
    if (days === 7) {
      subject = `${title} is due back in a week`;
      opening = `Just a reminder that ${title}, borrowed from ${loan.owner_name}, is due back on ${formatDate(loan.due_date, "weekday")}.`;
    } else if (days === 0) {
      subject = `${title} is due back today`;
      opening = `${title}, borrowed from ${loan.owner_name}, is due back today.`;
    } else {
      subject = `${title} is overdue`;
      opening = `${title}, borrowed from ${loan.owner_name}, was due back on ${formatDate(loan.due_date, "weekday")} and is now ${-days} days overdue.`;
    }

    const borrowerEmail = await emailFor(loan.borrower_id);
    if (borrowerEmail) {
      await sendEmail({
        to: borrowerEmail,
        subject,
        text: `Hi ${firstName(loan.borrower_name)},\n\n${opening}\n\n${renewLine}\n\n${messageLine}\n\nThanks,\n${APP_NAME}`,
      });
      sent++;
    }

    if (days === -7) {
      const ownerEmail = await emailFor(loan.owner_id);
      if (ownerEmail) {
        await sendEmail({
          to: ownerEmail,
          subject: `${title} is a week overdue`,
          text: `Hi ${owner},\n\n${title} was due back from ${loan.borrower_name} on ${formatDate(loan.due_date, "weekday")}. We've sent ${firstName(loan.borrower_name)} a reminder each week.\n\nIf you already have it back, mark it as returned: ${site}/loans\nMessage ${firstName(loan.borrower_name)}: ${site}/messages/${loan.borrower_id}`,
        });
        sent++;
      }
    }
  }

  return NextResponse.json({ checked: loans?.length ?? 0, sent });
}

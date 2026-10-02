import Link from "next/link";
import BookCover from "./BookCover";
import LoanActions from "./LoanActions";
import { MAX_RENEWALS } from "@/lib/config";
import { dueLabel, firstName, formatDate } from "@/lib/dates";
import type { LoanDetail } from "@/lib/types";

type Props = {
  loan: LoanDetail;
  meId: string;
  waiting?: number;
  showBook?: boolean;
  showMessageLink?: boolean;
};

export default function LoanCard({ loan, meId, waiting = 0, showBook = true, showMessageLink = true }: Props) {
  const role = loan.owner_id === meId ? "owner" : "borrower";
  const otherId = role === "owner" ? loan.borrower_id : loan.owner_id;
  const otherName = role === "owner" ? loan.borrower_name : loan.owner_name;
  const otherPhone = role === "owner" ? loan.borrower_phone : loan.owner_phone;
  const pickupNotes = role === "borrower" ? loan.owner_pickup_notes : null;
  const due = loan.status === "active" && loan.due_date ? dueLabel(loan.due_date) : null;

  let line: string;
  switch (loan.status) {
    case "requested":
      line =
        role === "owner"
          ? `${loan.borrower_name} would like to borrow it${loan.pickup_date ? ` and pick it up ${formatDate(loan.pickup_date, "weekday")}` : ""}.`
          : `Waiting for ${firstName(loan.owner_name)} to reply.${loan.pickup_date ? ` You suggested ${formatDate(loan.pickup_date, "weekday")}.` : ""}`;
      break;
    case "approved":
      line =
        role === "owner"
          ? `Approved. ${firstName(loan.borrower_name)} will pick it up${loan.pickup_date ? ` around ${formatDate(loan.pickup_date, "weekday")}` : ""}.`
          : `Approved. Pick it up from ${firstName(loan.owner_name)}${loan.pickup_date ? ` around ${formatDate(loan.pickup_date, "weekday")}` : ""}.`;
      break;
    case "active":
      line =
        role === "owner"
          ? `With ${loan.borrower_name} since ${formatDate(loan.started_on)}.`
          : `Borrowed from ${loan.owner_name} on ${formatDate(loan.started_on)}.`;
      break;
    case "returned":
      line = `Returned ${formatDate(loan.returned_at)}.`;
      break;
    default:
      line = loan.status === "declined" ? "Request declined." : "Cancelled.";
  }

  return (
    <article className="panel flex gap-4 p-4">
      {showBook && (
        <Link href={`/books/${loan.book_id}`} className="w-16 shrink-0">
          <BookCover src={loan.book_cover_url} title={loan.book_title} size="sm" className="w-16" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        {showBook && (
          <h3 className="font-display text-lg font-bold leading-snug">
            <Link href={`/books/${loan.book_id}`} className="hover:underline">
              {loan.book_title}
            </Link>
          </h3>
        )}
        <p>{line}</p>

        {due && (
          <p className="mt-2 flex flex-wrap items-center gap-3">
            <span className={`stamp ${due.overdue ? "text-redgum" : "text-gum-deep"}`}>
              Due {formatDate(loan.due_date, "short")}
            </span>
            <span className={due.overdue ? "font-bold text-redgum" : "text-granite"}>{due.text}</span>
            <span className="text-sm text-granite">
              Renewed {loan.renewals} of {MAX_RENEWALS}
            </span>
          </p>
        )}

        {(loan.status === "approved" || loan.status === "active") && (otherPhone || pickupNotes) && (
          <p className="hint mt-2">
            {otherPhone && (
              <>
                {firstName(otherName)}:{" "}
                <a className="link" href={`tel:${otherPhone.replace(/\s/g, "")}`}>
                  {otherPhone}
                </a>
              </>
            )}
            {otherPhone && pickupNotes && <br />}
            {pickupNotes && <>Pickup: {pickupNotes}</>}
          </p>
        )}

        <LoanActions
          loanId={loan.id}
          status={loan.status}
          role={role}
          renewals={loan.renewals}
          waiting={waiting}
        />

        {showMessageLink && ["requested", "approved", "active"].includes(loan.status) && (
          <Link href={`/messages/${otherId}`} className="link mt-3 inline-block text-sm">
            Message {firstName(otherName)}
          </Link>
        )}
      </div>
    </article>
  );
}

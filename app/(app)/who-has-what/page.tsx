import Link from "next/link";
import BookCover from "@/components/BookCover";
import { requireMember } from "@/lib/auth";
import { MAX_RENEWALS } from "@/lib/config";
import { dueLabel, formatDate, todayISO } from "@/lib/dates";
import type { CatalogBook } from "@/lib/types";

export const metadata = { title: "Who has what" };

export default async function WhoHasWhatPage() {
  const { supabase, user } = await requireMember();
  const { data } = await supabase
    .from("catalog")
    .select("*")
    .in("loan_status", ["active", "approved"])
    .order("due_date", { ascending: true, nullsFirst: false });
  const books = (data ?? []) as CatalogBook[];
  const today = todayISO();
  const out = books.filter((b) => b.loan_status === "active");
  const reserved = books.filter((b) => b.loan_status === "approved");

  return (
    <div>
      <h1 className="text-3xl font-bold sm:text-4xl">Who has what</h1>
      <p className="mt-1 text-granite">
        Every book that&apos;s currently out, soonest due first. Books not listed here are on their owner&apos;s shelf.
      </p>

      {out.length === 0 ? (
        <p className="panel mt-8 p-6">Nothing is out on loan at the moment.</p>
      ) : (
        <ul className="panel mt-8 divide-y divide-line">
          {out.map((b) => {
            const due = dueLabel(b.due_date!, today);
            return (
              <li key={b.id} className="grid grid-cols-[3rem_1fr] gap-4 p-4 sm:grid-cols-[3rem_1fr_auto] sm:items-center">
                <BookCover src={b.cover_url} title={b.title} size="sm" className="w-12" />
                <div className="min-w-0">
                  <Link href={`/books/${b.id}`} className="font-display font-bold hover:underline">
                    {b.title}
                  </Link>
                  <p className="text-sm">
                    {b.borrower_id === user.id ? (
                      <strong>You have it</strong>
                    ) : (
                      <>
                        <strong>{b.borrower_name}</strong> has it
                      </>
                    )}
                    , borrowed from {b.owner_id === user.id ? "you" : b.owner_name} on {formatDate(b.started_on, "short")}
                  </p>
                  <p className="text-sm text-granite">
                    Renewed {b.renewals ?? 0} of {MAX_RENEWALS} times
                    {b.pending_requests > 0 &&
                      `, ${b.pending_requests} ${b.pending_requests === 1 ? "person" : "people"} waiting`}
                  </p>
                </div>
                <div className="col-start-2 sm:col-start-3 sm:text-right">
                  <span className={`stamp ${due.overdue ? "text-redgum" : "text-gum-deep"}`}>
                    Due {formatDate(b.due_date, "short")}
                  </span>
                  <p className={`mt-1 text-sm ${due.overdue ? "font-bold text-redgum" : "text-granite"}`}>{due.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {reserved.length > 0 && (
        <>
          <h2 className="mt-12 text-2xl font-bold">Waiting to be picked up</h2>
          <ul className="panel mt-4 divide-y divide-line">
            {reserved.map((b) => (
              <li key={b.id} className="grid grid-cols-[3rem_1fr] items-center gap-4 p-4">
                <BookCover src={b.cover_url} title={b.title} size="sm" className="w-12" />
                <p>
                  <Link href={`/books/${b.id}`} className="font-display font-bold hover:underline">
                    {b.title}
                  </Link>
                  <br />
                  <span className="text-sm">
                    Reserved for {b.borrower_id === user.id ? "you" : b.borrower_name}, from{" "}
                    {b.owner_id === user.id ? "you" : b.owner_name}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

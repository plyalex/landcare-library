import Link from "next/link";
import LoanCard from "@/components/LoanCard";
import { requireMember } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { waitingCounts } from "@/lib/queries";
import type { LoanDetail } from "@/lib/types";

export const metadata = { title: "My loans" };

function Section({ title, empty, children }: { title: string; empty?: string; children: React.ReactNode[] }) {
  if (children.length === 0 && !empty) return null;
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-bold">{title}</h2>
      {children.length === 0 ? (
        <p className="mt-2 text-granite">{empty}</p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">{children}</div>
      )}
    </section>
  );
}

export default async function LoansPage() {
  const { supabase, user } = await requireMember();
  const me = user.id;

  const { data: openData } = await supabase
    .from("loan_details")
    .select("*")
    .or(`owner_id.eq.${me},borrower_id.eq.${me}`)
    .in("status", ["requested", "approved", "active"])
    .order("requested_at", { ascending: true });
  const open = (openData ?? []) as LoanDetail[];

  const { data: pastData } = await supabase
    .from("loan_details")
    .select("*")
    .or(`owner_id.eq.${me},borrower_id.eq.${me}`)
    .in("status", ["returned", "declined", "cancelled"])
    .order("requested_at", { ascending: false })
    .limit(15);
  const past = (pastData ?? []) as LoanDetail[];

  const waiting = await waitingCounts(supabase, open.filter((l) => l.status === "active").map((l) => l.book_id));
  const card = (l: LoanDetail) => (
    <LoanCard key={l.id} loan={l} meId={me} waiting={l.status === "active" ? (waiting[l.book_id] ?? 0) : 0} />
  );

  const requestsForMe = open.filter((l) => l.owner_id === me && l.status === "requested");
  const toCollect = open.filter((l) => l.status === "approved");
  const borrowing = open
    .filter((l) => l.borrower_id === me && l.status === "active")
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
  const lentOut = open
    .filter((l) => l.owner_id === me && l.status === "active")
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
  const myRequests = open.filter((l) => l.borrower_id === me && l.status === "requested");

  return (
    <div>
      <h1 className="text-3xl font-bold sm:text-4xl">My loans</h1>
      <p className="mt-1 text-granite">
        Loans last a month from pickup and can be renewed twice. Reminders are emailed a week before the due date.
      </p>

      <Section title="Requests for your books">{requestsForMe.map(card)}</Section>
      <Section title="Waiting to be picked up">{toCollect.map(card)}</Section>
      <Section
        title="Books you're borrowing"
        empty="You haven't borrowed anything yet. Browse the catalogue to find something to read."
      >
        {borrowing.map(card)}
      </Section>
      <Section title="Your books out on loan">{lentOut.map(card)}</Section>
      <Section title="Your requests">{myRequests.map(card)}</Section>

      {past.length > 0 && (
        <details className="mt-12">
          <summary className="cursor-pointer text-lg font-bold">History</summary>
          <ul className="mt-3 divide-y divide-line">
            {past.map((l) => (
              <li key={l.id} className="py-2">
                <Link href={`/books/${l.book_id}`} className="font-display font-bold hover:underline">
                  {l.book_title}
                </Link>{" "}
                <span className="text-granite">
                  {l.borrower_id === me ? `from ${l.owner_name}` : `to ${l.borrower_name}`},{" "}
                  {l.status === "returned"
                    ? `returned ${formatDate(l.returned_at, "short")}`
                    : `${l.status} ${formatDate(l.responded_at ?? l.requested_at, "short")}`}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

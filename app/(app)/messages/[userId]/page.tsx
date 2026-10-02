import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import LoanCard from "@/components/LoanCard";
import MessageComposer from "@/components/MessageComposer";
import ScrollToBottom from "@/components/ScrollToBottom";
import { requireMember } from "@/lib/auth";
import { formatDate, formatTime } from "@/lib/dates";
import { waitingCounts } from "@/lib/queries";
import type { LoanDetail, Message, Profile } from "@/lib/types";

export default async function ThreadPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const { supabase, user } = await requireMember();
  const me = user.id;
  if (userId === me) redirect("/messages");

  const { data: otherData } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!otherData) notFound();
  const other = otherData as Profile;

  await supabase.rpc("mark_thread_read", { p_other_id: userId });

  const [{ data: msgData }, { data: loanData }] = await Promise.all([
    supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${me},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${me})`)
      .order("created_at", { ascending: true })
      .limit(300),
    supabase
      .from("loan_details")
      .select("*")
      .or(`and(owner_id.eq.${me},borrower_id.eq.${userId}),and(owner_id.eq.${userId},borrower_id.eq.${me})`)
      .order("requested_at", { ascending: false }),
  ]);
  const messages = (msgData ?? []) as Message[];
  const loans = (loanData ?? []) as LoanDetail[];
  const loanTitles = new Map(loans.map((l) => [l.id, l.book_title]));
  const openLoans = loans.filter((l) => ["requested", "approved", "active"].includes(l.status));
  const waiting = await waitingCounts(supabase, openLoans.map((l) => l.book_id));

  let lastDay = "";

  return (
    <div className="max-w-3xl">
      <Link href="/messages" className="link text-sm">
        All messages
      </Link>
      <h1 className="mt-2 text-3xl font-bold">{other.full_name}</h1>
      {(other.phone || other.pickup_notes) && (
        <p className="mt-1 text-granite">
          {other.phone && (
            <a className="link" href={`tel:${other.phone.replace(/\s/g, "")}`}>
              {other.phone}
            </a>
          )}
          {other.phone && other.pickup_notes && <br />}
          {other.pickup_notes && <>Pickup: {other.pickup_notes}</>}
        </p>
      )}

      <ol className="mt-8 flex flex-col gap-3" aria-label="Conversation">
        {messages.map((m) => {
          const mine = m.sender_id === me;
          const day = formatDate(m.created_at, "weekday");
          const showDay = day !== lastDay;
          lastDay = day;
          const bookTitle = m.loan_id ? loanTitles.get(m.loan_id) : undefined;
          return (
            <li key={m.id} className="flex flex-col">
              {showDay && <p className="my-2 text-center text-sm font-bold text-granite">{day}</p>}
              {m.is_system ? (
                <p className="mx-auto max-w-md rounded-full bg-leaf px-4 py-1 text-center text-sm">
                  {mine ? "You" : other.full_name.split(" ")[0]}: {m.body}
                </p>
              ) : (
                <div className={`max-w-[85%] ${mine ? "self-end" : "self-start"}`}>
                  {bookTitle && (
                    <p className={`mb-1 text-xs text-granite ${mine ? "text-right" : ""}`}>About &ldquo;{bookTitle}&rdquo;</p>
                  )}
                  <div
                    className={`whitespace-pre-line rounded-2xl px-4 py-2 ${
                      mine ? "rounded-br-sm bg-gum text-white" : "rounded-bl-sm bg-white ring-1 ring-line"
                    }`}
                  >
                    {m.body}
                  </div>
                  <p className={`mt-0.5 text-xs text-granite ${mine ? "text-right" : ""}`}>{formatTime(m.created_at)}</p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {messages.length === 0 && (
        <p className="mt-6 text-granite">No messages with {other.full_name.split(" ")[0]} yet.</p>
      )}

      {openLoans.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-bold">Open loans with {other.full_name.split(" ")[0]}</h2>
          <div className="mt-3 grid gap-3">
            {openLoans.map((l) => (
              <LoanCard key={l.id} loan={l} meId={me} waiting={waiting[l.book_id] ?? 0} showMessageLink={false} />
            ))}
          </div>
        </section>
      )}

      <MessageComposer recipientId={userId} recipientName={other.full_name.split(" ")[0] || other.full_name} />
      <ScrollToBottom />
    </div>
  );
}

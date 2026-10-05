import Link from "next/link";
import { notFound } from "next/navigation";
import BookCover from "@/components/BookCover";
import LoanCard from "@/components/LoanCard";
import OwnerControls from "@/components/OwnerControls";
import RequestForm from "@/components/RequestForm";
import { STAMP_CLASS, bookStatus } from "@/components/status";
import { requireMember } from "@/lib/auth";
import { addDaysISO, firstName, formatDate, todayISO } from "@/lib/dates";
import { waitingCounts } from "@/lib/queries";
import type { CatalogBook, LoanDetail } from "@/lib/types";

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await requireMember();

  const { data } = await supabase.from("catalog").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const book = data as CatalogBook;

  const { data: loanData } = await supabase
    .from("loan_details")
    .select("*")
    .eq("book_id", id)
    .order("requested_at", { ascending: false });
  const loans = (loanData ?? []) as LoanDetail[];

  const isOwner = book.owner_id === user.id;
  const openStatuses = ["requested", "approved", "active"];
  const myOpenLoan = loans.find((l) => l.borrower_id === user.id && openStatuses.includes(l.status));
  const ownerOpenLoans = isOwner ? loans.filter((l) => openStatuses.includes(l.status)) : [];
  const history = loans.filter((l) => l.status === "active" || l.status === "returned");
  const waiting = (await waitingCounts(supabase, [id]))[id] ?? 0;

  const today = todayISO();
  const status = bookStatus(book, user.id, today);
  const meta = [
    book.published_year && `Published ${book.published_year}`,
    book.publisher,
    book.page_count && `${book.page_count} pages`,
  ].filter(Boolean) as string[];

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,16rem)_1fr] md:gap-12">
      <div className="mx-auto w-48 md:w-full">
        <div className="relative">
          <BookCover src={book.cover_url} title={book.title} author={book.authors[0]} isbn={book.isbn} size="lg" className="w-full" />
          <span className={`stamp absolute -right-2 bottom-5 text-base ${STAMP_CLASS[status.kind]}`}>{status.stamp}</span>
        </div>
      </div>

      <div className="min-w-0">
        <h1 className="text-3xl font-bold sm:text-4xl">{book.title}</h1>
        {book.subtitle && <p className="mt-1 font-display text-xl text-granite">{book.subtitle}</p>}
        {book.authors.length > 0 && <p className="mt-2 text-lg">by {book.authors.join(", ")}</p>}
        {meta.length > 0 && <p className="mt-1 text-granite">{meta.join(", ")}</p>}

        <div className="panel mt-6 p-5">
          <p className="text-lg font-bold">{status.detail}</p>
          <p className="mt-1">
            Owned by {isOwner ? "you" : <Link href={`/messages/${book.owner_id}`} className="link">{book.owner_name}</Link>}
            {book.pending_requests > 0 && `. ${book.pending_requests} ${book.pending_requests === 1 ? "person has" : "people have"} asked to borrow it next`}
            .
          </p>
          {book.notes && <p className="mt-2 text-granite">Owner&apos;s note: {book.notes}</p>}

          {!isOwner && !myOpenLoan && book.available && (
            <RequestForm
              bookId={book.id}
              title={book.title}
              authors={book.authors}
              ownerName={book.owner_name}
              myName={profile.full_name}
              defaultDate={addDaysISO(today, 2)}
              minDate={today}
              isOut={!!book.loan_status}
            />
          )}
          {!isOwner && !myOpenLoan && !book.available && (
            <p className="mt-3">
              You can still{" "}
              <Link href={`/messages/${book.owner_id}`} className="link">
                message {firstName(book.owner_name)}
              </Link>{" "}
              about it.
            </p>
          )}
        </div>

        {myOpenLoan && (
          <div className="mt-6">
            <h2 className="text-xl font-bold">Your loan</h2>
            <div className="mt-3">
              <LoanCard loan={myOpenLoan} meId={user.id} waiting={waiting} showBook={false} />
            </div>
          </div>
        )}

        {ownerOpenLoans.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-bold">Requests and loans</h2>
            <div className="mt-3 grid gap-3">
              {ownerOpenLoans.map((l) => (
                <LoanCard key={l.id} loan={l} meId={user.id} waiting={waiting} showBook={false} />
              ))}
            </div>
          </div>
        )}

        {isOwner && <OwnerControls bookId={book.id} available={book.available} notes={book.notes ?? ""} />}

        {book.description && (
          <section className="mt-8">
            <h2 className="text-xl font-bold">About this book</h2>
            <div className="mt-2 max-w-prose whitespace-pre-line font-display leading-relaxed">
              {book.description}
            </div>
          </section>
        )}

        {(book.categories.length > 0 || book.isbn || book.info_url) && (
          <p className="mt-6 text-sm text-granite">
            {book.categories.length > 0 && <>Subjects: {book.categories.join(", ")}. </>}
            {book.isbn && <>ISBN {book.isbn}. </>}
            {book.info_url && (
              <a href={book.info_url} className="link" target="_blank" rel="noreferrer">
                More details online
              </a>
            )}
          </p>
        )}

        {history.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-bold">Borrowing history</h2>
            <ul className="mt-2 divide-y divide-line">
              {history.map((l) => (
                <li key={l.id} className="py-2">
                  {l.borrower_id === user.id ? "You" : l.borrower_name},{" "}
                  {formatDate(l.started_on, "short")} to{" "}
                  {l.status === "returned" ? formatDate(l.returned_at, "short") : "now"}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

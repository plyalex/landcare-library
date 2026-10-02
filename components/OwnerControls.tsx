"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteBook, updateBook } from "@/app/actions/books";

type Props = { bookId: string; available: boolean; notes: string };

export default function OwnerControls({ bookId, available, notes }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [noteText, setNoteText] = useState(notes);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  function run(fn: () => Promise<{ error?: string }>, success: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      if (result?.error) setMessage({ text: result.error, error: true });
      else {
        setMessage({ text: success });
        router.refresh();
      }
    });
  }

  return (
    <section className="panel mt-6 p-5">
      <h2 className="text-xl font-bold">Your copy</h2>

      <label className="mt-4 flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-5 accent-gum"
          checked={available}
          disabled={pending}
          onChange={(e) => run(() => updateBook(bookId, { available: e.target.checked }), "Saved.")}
        />
        <span>
          <span className="font-bold">Available to borrow</span>
          <span className="hint block">Untick to keep it in the catalogue without taking new requests.</span>
        </span>
      </label>

      <div className="mt-4">
        <label className="label" htmlFor="notes">
          Note for borrowers
        </label>
        <textarea
          id="notes"
          className="field min-h-20"
          placeholder="For example: signed copy, please handle with care"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-secondary mt-2"
          disabled={pending || noteText === notes}
          onClick={() => run(() => updateBook(bookId, { notes: noteText }), "Note saved.")}
        >
          Save note
        </button>
      </div>

      <div className="mt-6 border-t border-line pt-4">
        <button
          type="button"
          className="btn btn-danger"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Remove this book from the library? Its borrowing history will be deleted too.")) {
              run(() => deleteBook(bookId), "Removed.");
            }
          }}
        >
          Remove from library
        </button>
      </div>

      {message && (
        <p role="status" className={`mt-3 font-bold ${message.error ? "text-redgum" : "text-gum"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}

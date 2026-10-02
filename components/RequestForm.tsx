"use client";

import { useState, useTransition } from "react";
import { requestLoan } from "@/app/actions/loans";
import { defaultRequestMessage } from "@/lib/request-message";
import { firstName } from "@/lib/dates";

type Props = {
  bookId: string;
  title: string;
  authors: string[];
  ownerName: string;
  myName: string;
  defaultDate: string;
  minDate: string;
  isOut: boolean;
};

export default function RequestForm(props: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(props.defaultDate);
  const [message, setMessage] = useState(() => template(props.defaultDate));
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function template(pickupDate: string) {
    return defaultRequestMessage({
      ownerName: props.ownerName,
      myName: props.myName,
      title: props.title,
      authors: props.authors,
      pickupDate,
    });
  }

  function changeDate(value: string) {
    setDate(value);
    if (!edited && value) setMessage(template(value));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await requestLoan(props.bookId, date, message);
      if (result?.error) setError(result.error);
    });
  }

  if (!open) {
    return (
      <div className="mt-4">
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          {props.isOut ? "Ask to borrow it next" : "Ask to borrow"}
        </button>
        {props.isOut && (
          <p className="hint mt-2">It&apos;s out at the moment. {firstName(props.ownerName)} will see your request when it comes back.</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-5 grid gap-4 border-t border-line pt-5">
      <div>
        <label className="label" htmlFor="pickup">
          When could you pick it up?
        </label>
        <input
          id="pickup"
          type="date"
          className="field max-w-xs"
          min={props.minDate}
          value={date}
          onChange={(e) => changeDate(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="message">
          Message to {firstName(props.ownerName)}
        </label>
        <textarea
          id="message"
          className="field min-h-44"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setEdited(true);
          }}
          required
        />
        <p className="hint mt-1">This is sent to {firstName(props.ownerName)} in Messages and by email.</p>
      </div>
      {error && (
        <p role="alert" className="font-bold text-redgum">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Sending…" : "Send request"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}

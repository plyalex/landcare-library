"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { loanAction, type LoanActionKind } from "@/app/actions/loans";
import { MAX_RENEWALS } from "@/lib/config";
import type { LoanStatus } from "@/lib/types";

type Props = {
  loanId: string;
  status: LoanStatus;
  role: "owner" | "borrower";
  renewals: number;
  waiting: number;
};

type Button = { kind: LoanActionKind; label: string; style: string; confirm?: string };

function buttonsFor({ status, role, renewals, waiting }: Props): { buttons: Button[]; note?: string } {
  if (status === "requested" && role === "owner")
    return {
      buttons: [
        { kind: "approve", label: "Approve", style: "btn-primary" },
        { kind: "decline", label: "Decline", style: "btn-secondary", confirm: "Decline this request?" },
      ],
    };
  if (status === "requested" && role === "borrower")
    return { buttons: [{ kind: "cancel", label: "Cancel request", style: "btn-secondary", confirm: "Cancel your request?" }] };
  if (status === "approved")
    return {
      buttons: [
        { kind: "picked_up", label: role === "owner" ? "Mark as picked up" : "I've picked it up", style: "btn-primary" },
        { kind: "cancel", label: "Cancel", style: "btn-secondary", confirm: "Cancel this loan before it starts?" },
      ],
      note: "The month starts when the book is picked up.",
    };
  if (status === "active" && role === "owner")
    return {
      buttons: [
        { kind: "returned", label: "Mark as returned", style: "btn-primary", confirm: "Has the book come back to you?" },
      ],
    };
  if (status === "active" && role === "borrower") {
    if (waiting > 0)
      return { buttons: [], note: "Someone else is waiting for this book, so it can't be renewed." };
    if (renewals >= MAX_RENEWALS)
      return { buttons: [], note: `You've used both renewals. Arrange a time to return it.` };
    return {
      buttons: [{ kind: "renew", label: "Renew for another month", style: "btn-secondary" }],
      note: `${MAX_RENEWALS - renewals} renewal${MAX_RENEWALS - renewals === 1 ? "" : "s"} left.`,
    };
  }
  return { buttons: [] };
}

export default function LoanActions(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { buttons, note } = buttonsFor(props);

  if (!buttons.length && !note) return null;

  function run(b: Button) {
    if (b.confirm && !window.confirm(b.confirm)) return;
    setError(null);
    startTransition(async () => {
      const result = await loanAction(b.kind, props.loanId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="mt-3">
      {buttons.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {buttons.map((b) => (
            <button key={b.kind} type="button" className={`btn ${b.style}`} disabled={pending} onClick={() => run(b)}>
              {b.label}
            </button>
          ))}
        </div>
      )}
      {note && <p className="hint mt-2">{note}</p>}
      {error && (
        <p role="alert" className="mt-2 font-bold text-redgum">
          {error}
        </p>
      )}
    </div>
  );
}

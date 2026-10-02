import { dueLabel, firstName, todayISO } from "@/lib/dates";
import type { CatalogBook } from "@/lib/types";

export type BookStatus = {
  kind: "available" | "reserved" | "on-loan" | "overdue" | "not-lending";
  stamp: string;
  detail: string;
};

export function bookStatus(b: CatalogBook, meId?: string, today = todayISO()): BookStatus {
  const who = (id: string | null, name: string | null) => (id && id === meId ? "you" : firstName(name));
  if (b.loan_status === "active" && b.due_date) {
    const due = dueLabel(b.due_date, today);
    return {
      kind: due.overdue ? "overdue" : "on-loan",
      stamp: due.overdue ? "Overdue" : `Due ${shortDate(b.due_date)}`,
      detail: `With ${who(b.borrower_id, b.borrower_name)}. ${due.text}.`,
    };
  }
  if (b.loan_status === "approved") {
    return { kind: "reserved", stamp: "Reserved", detail: `Reserved for ${who(b.borrower_id, b.borrower_name)}.` };
  }
  if (!b.available) {
    return { kind: "not-lending", stamp: "Not lending", detail: "The owner isn't lending this book right now." };
  }
  return { kind: "available", stamp: "On the shelf", detail: `On ${who(b.owner_id, b.owner_name) === "you" ? "your" : `${firstName(b.owner_name)}'s`} shelf.` };
}

function shortDate(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", day: "numeric", month: "short" }).format(d);
}

export const STAMP_CLASS: Record<BookStatus["kind"], string> = {
  available: "border-transparent bg-wattle text-bark transform-none",
  reserved: "text-gum-deep",
  "on-loan": "text-gum-deep",
  overdue: "text-redgum",
  "not-lending": "text-granite",
};

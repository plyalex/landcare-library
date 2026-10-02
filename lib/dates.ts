import { TIME_ZONE } from "./config";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date in Melbourne as YYYY-MM-DD */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** The Melbourne calendar date (YYYY-MM-DD) of a timestamp */
export function melbourneDate(timestamp: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (both YYYY-MM-DD) */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  );
}

type Style = "long" | "short" | "weekday";

/** Formats a date (YYYY-MM-DD) or timestamp for display in Australian style */
export function formatDate(value: string | null | undefined, style: Style = "long"): string {
  if (!value) return "";
  const dateOnly = DATE_ONLY.test(value);
  const d = new Date(dateOnly ? `${value}T00:00:00Z` : value);
  const tz = dateOnly ? "UTC" : TIME_ZONE;
  const sameYear =
    new Intl.DateTimeFormat("en-AU", { timeZone: tz, year: "numeric" }).format(d) ===
    todayISO().slice(0, 4);
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    day: "numeric",
    month: style === "short" ? "short" : "long",
    year: sameYear ? undefined : "numeric",
    weekday: style === "weekday" ? "long" : undefined,
  };
  return new Intl.DateTimeFormat("en-AU", opts).format(d).replace(",", "");
}

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

/** "Due in 5 days", "Due today", "3 days overdue" */
export function dueLabel(due: string, today = todayISO()): { text: string; overdue: boolean } {
  const days = daysBetween(today, due);
  if (days > 1) return { text: `Due in ${days} days`, overdue: false };
  if (days === 1) return { text: "Due tomorrow", overdue: false };
  if (days === 0) return { text: "Due today", overdue: false };
  if (days === -1) return { text: "1 day overdue", overdue: true };
  return { text: `${-days} days overdue`, overdue: true };
}

export function firstName(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] || "there";
}

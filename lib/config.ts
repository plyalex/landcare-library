export const GROUP_NAME =
  process.env.NEXT_PUBLIC_GROUP_NAME || "Balmattum Sheans Creek Landcare";
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Landcare Library";

// Keep these in step with supabase/schema.sql (mark_picked_up / renew_loan)
export const LOAN_MONTHS = 1;
export const MAX_RENEWALS = 2;

export const TIME_ZONE = "Australia/Melbourne";

/** Absolute URL of the deployed site, used in emails and auth links. Server only. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { notifyLoan, type LoanEvent } from "@/lib/notify";

function friendly(message: string): string {
  if (/duplicate key/i.test(message)) return "That request already exists.";
  if (/permission denied|violates row-level/i.test(message)) return "You can't do that.";
  return message;
}

export async function requestLoan(
  bookId: string,
  pickupDate: string,
  message: string,
): Promise<{ error?: string }> {
  const { supabase, user } = await requireMember();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) return { error: "Choose a pickup date." };
  const body = message.trim();
  if (!body) return { error: "Write a short message to the owner." };
  if (body.length > 4000) return { error: "Keep the message under 4,000 characters." };

  const { data: loanId, error } = await supabase.rpc("request_loan", {
    p_book_id: bookId,
    p_pickup_date: pickupDate,
    p_message: body,
  });
  if (error) return { error: friendly(error.message) };

  const { data: book } = await supabase.from("books").select("owner_id").eq("id", bookId).single();
  after(() => notifyLoan(loanId as string, "requested", user.id, body));
  revalidatePath("/", "layout");
  redirect(book ? `/messages/${book.owner_id}` : "/loans");
}

const ACTIONS = {
  approve: { rpc: "respond_to_request", args: { p_approve: true }, event: "approved" },
  decline: { rpc: "respond_to_request", args: { p_approve: false }, event: "declined" },
  picked_up: { rpc: "mark_picked_up", args: {}, event: "picked_up" },
  renew: { rpc: "renew_loan", args: {}, event: "renewed" },
  returned: { rpc: "mark_returned", args: {}, event: "returned" },
  cancel: { rpc: "cancel_loan", args: {}, event: "cancelled" },
} as const satisfies Record<string, { rpc: string; args: Record<string, unknown>; event: LoanEvent }>;

export type LoanActionKind = keyof typeof ACTIONS;

export async function loanAction(kind: LoanActionKind, loanId: string): Promise<{ error?: string }> {
  const { supabase, user } = await requireMember();
  const action = ACTIONS[kind];
  if (!action) return { error: "Unknown action." };

  const { error } = await supabase.rpc(action.rpc, { p_loan_id: loanId, ...action.args });
  if (error) return { error: friendly(error.message) };

  after(() => notifyLoan(loanId, action.event, user.id));
  revalidatePath("/", "layout");
  return {};
}

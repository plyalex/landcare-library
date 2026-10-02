"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import type { FormState } from "./auth";

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireMember();
  const full_name = String(formData.get("full_name") ?? "").trim().slice(0, 100);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 30) || null;
  const pickup_notes = String(formData.get("pickup_notes") ?? "").trim().slice(0, 500) || null;
  if (!full_name) return { error: "Enter your name." };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name, phone, pickup_notes })
    .eq("id", user.id);
  if (error) return { error: "Your details couldn't be saved. Try again." };
  revalidatePath("/", "layout");
  return { message: "Saved." };
}

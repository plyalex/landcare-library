"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; message?: string };

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: field(formData, "email"),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: "That email and password don't match. Check them and try again." };
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const name = field(formData, "name");
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");
  const code = field(formData, "code");

  if (!name) return { error: "Enter your name so other members know who you are." };
  if (password.length < 8) return { error: "Use at least 8 characters for your password." };

  const supabase = await createClient();
  const { data: codeOk } = await supabase.rpc("check_join_code", { p_code: code });
  if (!codeOk) return { error: "That join code doesn't match. Ask the secretary for the current code." };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name, join_code: code },
      emailRedirectTo: `${siteUrl()}/auth/callback`,
    },
  });
  if (error) return { error: error.message };
  if (!data.session) {
    return { message: "Check your email for a link to confirm your address, then sign in." };
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(field(formData, "email"), {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset`,
  });
  return { message: "If that email belongs to a member, a reset link is on its way." };
}

export async function updatePassword(_: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters for your password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "The reset link has expired. Request a new one and try again." };
  redirect("/");
}

export async function joinWithCode(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("join_with_code", { p_code: field(formData, "code") });
  if (!data) return { error: "That join code doesn't match. Ask the secretary for the current code." };
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

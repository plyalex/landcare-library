import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

/** The signed-in person (if any) and their profile, once per request */
export const getViewer = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { supabase, user, profile: (data as Profile | null) ?? null };
});

/** Use at the top of every members-only page and server action */
export async function requireMember() {
  const { supabase, user, profile } = await getViewer();
  if (!user) redirect("/login");
  if (!profile || !profile.is_member) redirect("/pending");
  return { supabase, user, profile };
}

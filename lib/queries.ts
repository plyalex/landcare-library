import type { SupabaseClient } from "@supabase/supabase-js";

/** Number of people waiting (status "requested") for each book */
export async function waitingCounts(
  supabase: SupabaseClient,
  bookIds: string[],
): Promise<Record<string, number>> {
  if (!bookIds.length) return {};
  const { data } = await supabase
    .from("loans")
    .select("book_id")
    .eq("status", "requested")
    .in("book_id", [...new Set(bookIds)]);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.book_id] = (counts[row.book_id] ?? 0) + 1;
  return counts;
}

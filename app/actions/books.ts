"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import type { BookMeta } from "@/lib/types";

function text(v: unknown, max: number): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}
function url(v: unknown): string | null {
  return typeof v === "string" && /^https:\/\//.test(v) ? v.slice(0, 1000) : null;
}
function list(v: unknown, maxItems: number): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && !!x.trim()).slice(0, maxItems).map((x) => x.trim().slice(0, 200))
    : [];
}
function int(v: unknown, min: number, max: number): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null;
}

export async function addBooks(books: BookMeta[]): Promise<{ error?: string; count?: number }> {
  const { supabase, user } = await requireMember();
  if (!Array.isArray(books) || books.length === 0) return { error: "Tick at least one book to add." };
  if (books.length > 100) return { error: "Add up to 100 books at a time." };

  const rows = books
    .map((b) => ({
      owner_id: user.id,
      title: text(b.title, 300),
      subtitle: text(b.subtitle, 300),
      authors: list(b.authors, 10),
      isbn: text(b.isbn, 20),
      publisher: text(b.publisher, 200),
      published_year: int(b.published_year, 0, 2100),
      page_count: int(b.page_count, 1, 20000),
      description: text(b.description, 5000),
      categories: list(b.categories, 6),
      cover_url: url(b.cover_url),
      info_url: url(b.info_url),
    }))
    .filter((r) => r.title);

  const { error } = await supabase.from("books").insert(rows);
  if (error) return { error: "Those books couldn't be saved. Try again." };
  revalidatePath("/", "layout");
  return { count: rows.length };
}

export async function updateBook(
  bookId: string,
  changes: { available?: boolean; notes?: string },
): Promise<{ error?: string }> {
  const { supabase, user } = await requireMember();
  const patch: { available?: boolean; notes?: string | null } = {};
  if (typeof changes.available === "boolean") patch.available = changes.available;
  if (typeof changes.notes === "string") patch.notes = changes.notes.trim().slice(0, 1000) || null;
  const { error } = await supabase.from("books").update(patch).eq("id", bookId).eq("owner_id", user.id);
  if (error) return { error: "That change couldn't be saved. Try again." };
  revalidatePath(`/books/${bookId}`);
  revalidatePath("/");
  return {};
}

export async function deleteBook(bookId: string): Promise<{ error?: string }> {
  const { supabase, user } = await requireMember();
  const { count } = await supabase
    .from("loans")
    .select("id", { count: "exact", head: true })
    .eq("book_id", bookId)
    .in("status", ["requested", "approved", "active"]);
  if ((count ?? 0) > 0) {
    return { error: "This book has an open request or loan. Finish or cancel it before removing the book." };
  }
  const { error } = await supabase.from("books").delete().eq("id", bookId).eq("owner_id", user.id);
  if (error) return { error: "The book couldn't be removed. Try again." };
  revalidatePath("/", "layout");
  redirect("/?filter=mine");
}

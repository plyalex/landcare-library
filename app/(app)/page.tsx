import Link from "next/link";
import CatalogBrowser from "@/components/CatalogBrowser";
import { requireMember } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import type { CatalogBook } from "@/lib/types";

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { supabase, user } = await requireMember();
  const { filter } = await searchParams;
  const { data } = await supabase.from("catalog").select("*").order("title");
  const books = (data ?? []) as CatalogBook[];

  if (books.length === 0) {
    return (
      <div className="panel mx-auto max-w-xl p-8">
        <h1 className="text-3xl font-bold">The shelves are empty</h1>
        <p className="mt-3">
          Take a photo of the books you&apos;re happy to lend and the library will catalogue them for you.
        </p>
        <Link href="/add" className="btn btn-primary mt-6">
          Add your books
        </Link>
      </div>
    );
  }

  return (
    <CatalogBrowser
      books={books}
      meId={user.id}
      today={todayISO()}
      initialFilter={filter === "mine" || filter === "available" || filter === "out" ? filter : "all"}
    />
  );
}

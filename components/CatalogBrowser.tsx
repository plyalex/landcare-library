"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import BookCover from "./BookCover";
import { STAMP_CLASS, bookStatus } from "./status";
import type { CatalogBook } from "@/lib/types";

type Filter = "all" | "available" | "out" | "mine";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All books" },
  { value: "available", label: "On the shelf" },
  { value: "out", label: "Out on loan" },
  { value: "mine", label: "My books" },
];

type Props = { books: CatalogBook[]; meId: string; today: string; initialFilter: Filter };

export default function CatalogBrowser({ books, meId, today, initialFilter }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [owner, setOwner] = useState("");

  const owners = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of books) map.set(b.owner_id, b.owner_name);
    return [...map].sort((a, b) => a[1].localeCompare(b[1]));
  }, [books]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books.filter((b) => {
      if (owner && b.owner_id !== owner) return false;
      if (filter === "mine" && b.owner_id !== meId) return false;
      if (filter === "available" && (b.loan_status || !b.available)) return false;
      if (filter === "out" && b.loan_status !== "active") return false;
      if (!q) return true;
      return [b.title, b.subtitle, b.authors.join(" "), b.owner_name, b.categories.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [books, query, filter, owner, meId]);

  const outCount = books.filter((b) => b.loan_status === "active").length;
  const memberCount = owners.length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Catalogue</h1>
          <p className="mt-1 text-granite">
            {books.length} {books.length === 1 ? "book" : "books"} from {memberCount}{" "}
            {memberCount === 1 ? "member" : "members"}, {outCount} out on loan
          </p>
        </div>
        <Link href="/add" className="btn btn-secondary">
          Add books
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="sr-only" htmlFor="search">
          Search by title, author or owner
        </label>
        <input
          id="search"
          type="search"
          className="field"
          placeholder="Search by title, author or owner"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="sr-only" htmlFor="owner">
          Whose shelf
        </label>
        <select id="owner" className="field sm:w-56" value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="">Everyone&apos;s shelves</option>
          {owners.map(([id, name]) => (
            <option key={id} value={id}>
              {id === meId ? "My shelf" : `${name}'s shelf`}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Show">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            aria-pressed={filter === f.value}
            className={`min-h-10 rounded-full px-4 text-sm font-bold transition-colors ${
              filter === f.value ? "bg-bark text-white" : "bg-white text-bark ring-1 ring-line hover:bg-leaf"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="mt-10 text-granite">
          No books match. Try a different search or{" "}
          <button
            type="button"
            className="link"
            onClick={() => {
              setQuery("");
              setFilter("all");
              setOwner("");
            }}
          >
            show everything
          </button>
          .
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {shown.map((b) => {
            const status = bookStatus(b, meId, today);
            return (
              <li key={b.id}>
                <Link href={`/books/${b.id}`} className="group block">
                  <div className="relative">
                    <BookCover
                      src={b.cover_url}
                      title={b.title}
                      author={b.authors[0]}
                      className="w-full"
                    />
                    <span className={`stamp absolute -right-1 bottom-3 ${STAMP_CLASS[status.kind]}`}>
                      {status.stamp}
                    </span>
                  </div>
                  <h2 className="mt-3 line-clamp-2 font-display text-base font-bold leading-snug group-hover:underline">
                    {b.title}
                  </h2>
                  {b.authors.length > 0 && (
                    <p className="line-clamp-1 text-sm text-granite">{b.authors.join(", ")}</p>
                  )}
                  <p className="mt-1 text-sm">{status.detail}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import BookCover from "./BookCover";
import type { BookMeta } from "@/lib/types";

type Props = {
  initialQuery?: string;
  onPick: (meta: BookMeta) => void;
  autoFocus?: boolean;
  pickLabel?: string;
};

/** Search Google Books / Open Library and pick a result */
export default function CandidateSearch({ initialQuery = "", onPick, autoFocus, pickLabel = "Choose" }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<BookMeta[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/lookup?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Search failed.");
      setResults(json.results as BookMeta[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }

  function addAsTyped() {
    const [title, ...rest] = query.split(/\s+by\s+/i);
    onPick({
      title: title.trim(),
      subtitle: null,
      authors: rest.length ? [rest.join(" by ").trim()] : [],
      isbn: null,
      publisher: null,
      published_year: null,
      page_count: null,
      description: null,
      categories: [],
      cover_url: null,
      info_url: null,
      source: "manual",
    });
  }

  return (
    <div>
      <form onSubmit={search} className="flex gap-2">
        <label className="sr-only" htmlFor="book-search">
          Title, author or ISBN
        </label>
        <input
          id="book-search"
          className="field"
          placeholder="Title and author, or ISBN"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus={autoFocus}
        />
        <button type="submit" className="btn btn-primary shrink-0" disabled={busy || !query.trim()}>
          {busy ? "Searching…" : "Search"}
        </button>
      </form>
      {error && <p className="mt-2 font-bold text-redgum">{error}</p>}
      {results && (
        <ul className="mt-3 grid gap-2">
          {results.map((r, i) => (
            <li key={`${r.title}-${i}`} className="flex items-center gap-3 rounded-lg bg-white p-2 ring-1 ring-line">
              <BookCover src={r.cover_url} title={r.title} size="sm" className="w-10 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold leading-snug">{r.title}</p>
                <p className="text-sm text-granite">
                  {[r.authors.join(", "), r.published_year].filter(Boolean).join(", ")}
                </p>
              </div>
              <button type="button" className="btn btn-secondary shrink-0" onClick={() => onPick(r)}>
                {pickLabel}
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="text-granite">No matches found online.</li>}
          {query.trim() && (
            <li>
              <button type="button" className="link text-sm" onClick={addAsTyped}>
                Add &ldquo;{query.trim()}&rdquo; as typed, without details
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

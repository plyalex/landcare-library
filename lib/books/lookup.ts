import type { BookMeta } from "../types";

const GOOGLE = "https://www.googleapis.com/books/v1/volumes";
const OPEN_LIBRARY = "https://openlibrary.org/search.json";
const OL_FIELDS =
  "key,title,subtitle,author_name,first_publish_year,isbn,publisher,number_of_pages_median,cover_i,subject";

const STOP_WORDS = new Set(["the", "a", "an", "of", "and", "to", "in", "on", "for", "with", "&"]);

function words(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(w));
}

/** How well a looked-up book matches what was read off the photo (0 to 1.5) */
function matchScore(meta: BookMeta, title: string, author: string | null): number {
  const wanted = words(title);
  if (!wanted.length) return 0;
  const have = new Set(words(`${meta.title} ${meta.subtitle ?? ""}`));
  const titleScore = wanted.filter((w) => have.has(w)).length / wanted.length;
  let authorScore = 0;
  if (author) {
    const surname = words(author).pop();
    if (surname && meta.authors.some((a) => words(a).includes(surname))) authorScore = 0.5;
  }
  return titleScore + authorScore;
}

function stripHtml(s: string | undefined): string | null {
  if (!s) return null;
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 5000);
}

function parseYear(s: string | undefined): number | null {
  const m = s?.match(/\d{4}/);
  return m ? Number(m[0]) : null;
}

export function cleanIsbn(s: string): string | null {
  const digits = s.replace(/[\s-]/g, "").toUpperCase();
  return /^(\d{9}[\dX]|\d{13})$/.test(digits) ? digits : null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function fromGoogle(item: any): BookMeta {
  const v = item?.volumeInfo ?? {};
  const ids: { type: string; identifier: string }[] = v.industryIdentifiers ?? [];
  const isbn =
    ids.find((i) => i.type === "ISBN_13")?.identifier ??
    ids.find((i) => i.type === "ISBN_10")?.identifier ??
    null;
  const img: string | undefined = v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail;
  return {
    title: v.title ?? "Untitled",
    subtitle: v.subtitle ?? null,
    authors: v.authors ?? [],
    isbn,
    publisher: v.publisher ?? null,
    published_year: parseYear(v.publishedDate),
    page_count: v.pageCount ?? null,
    description: stripHtml(v.description),
    categories: v.categories ?? [],
    cover_url: img
      ? img.replace(/^http:/, "https:").replace("&edge=curl", "")
      : isbn
        ? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`
        : null,
    info_url: v.canonicalVolumeLink ?? v.infoLink ?? null,
    source: "google",
  };
}

function fromOpenLibrary(doc: any): BookMeta {
  const isbns: string[] = doc?.isbn ?? [];
  return {
    title: doc.title ?? "Untitled",
    subtitle: doc.subtitle ?? null,
    authors: doc.author_name ?? [],
    isbn: isbns.find((i) => i.length === 13) ?? isbns[0] ?? null,
    publisher: doc.publisher?.[0] ?? null,
    published_year: doc.first_publish_year ?? null,
    page_count: doc.number_of_pages_median ?? null,
    description: null,
    categories: (doc.subject ?? []).slice(0, 4),
    cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
    info_url: doc.key ? `https://openlibrary.org${doc.key}` : null,
    source: "openlibrary",
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function google(q: string, max: number): Promise<BookMeta[]> {
  const params = new URLSearchParams({ q, maxResults: String(max), printType: "books" });
  if (process.env.GOOGLE_BOOKS_API_KEY) params.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  try {
    const res = await fetch(`${GOOGLE}?${params}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.warn("Google Books", res.status, q);
      return [];
    }
    const json = await res.json();
    return (json.items ?? []).map(fromGoogle);
  } catch (err) {
    console.warn("Google Books failed", err);
    return [];
  }
}

async function openLibrary(params: Record<string, string>, max: number): Promise<BookMeta[]> {
  const search = new URLSearchParams({ ...params, limit: String(max), fields: OL_FIELDS });
  try {
    const res = await fetch(`${OPEN_LIBRARY}?${search}`, {
      headers: { "User-Agent": "LandcareLibrary/1.0 (community book library)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.docs ?? []).map(fromOpenLibrary);
  } catch (err) {
    console.warn("Open Library failed", err);
    return [];
  }
}

export function manualBook(title: string, author: string | null): BookMeta {
  return {
    title: title.trim(),
    subtitle: null,
    authors: author ? [author.trim()] : [],
    isbn: null,
    publisher: null,
    published_year: null,
    page_count: null,
    description: null,
    categories: [],
    cover_url: null,
    info_url: null,
    source: "manual",
  };
}

/** Best single match for a title (and author) read off a photo */
export async function lookupBest(title: string, author: string | null): Promise<BookMeta> {
  const t = title.replace(/"/g, "");
  const a = author?.replace(/"/g, "") ?? null;
  const surname = a ? a.trim().split(/\s+/).pop() : null;

  const attempts: (() => Promise<BookMeta[]>)[] = [
    () => google(`intitle:"${t}"${surname ? ` inauthor:${surname}` : ""}`, 5),
    () => google(`${t} ${a ?? ""}`.trim(), 5),
    () => openLibrary(a ? { title: t, author: a } : { title: t }, 5),
  ];

  let best: { meta: BookMeta; score: number } | null = null;
  for (const attempt of attempts) {
    for (const meta of await attempt()) {
      const score = matchScore(meta, t, a);
      if (!best || score > best.score) best = { meta, score };
    }
    if (best && best.score >= 1) break; // good title match (plus author) found
  }
  if (best && best.score >= 0.6) return best.meta;
  return manualBook(title, author);
}

/** Free-text search for the "search by title or ISBN" box */
export async function searchBooks(query: string, max = 6): Promise<BookMeta[]> {
  const q = query.trim();
  if (!q) return [];
  const isbn = cleanIsbn(q);
  if (isbn) {
    const g = await google(`isbn:${isbn}`, 3);
    return g.length ? g : openLibrary({ isbn }, 3);
  }
  const g = await google(q, max);
  return g.length ? g : openLibrary({ q }, max);
}

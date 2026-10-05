"use client";

import { useEffect, useRef, useState } from "react";

const SPINE_COLOURS = ["#35634f", "#7a4b2a", "#2f4858", "#a23a22", "#5b5a2e", "#4a3f5c"];

function colourFor(title: string) {
  let h = 0;
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return SPINE_COLOURS[h % SPINE_COLOURS.length];
}

type Props = {
  src: string | null;
  title: string;
  author?: string;
  /** Used to look for a sharper cover on Open Library when the stored one is low-res */
  isbn?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

// Rendered width in px to request per size, roughly 2x the CSS width for sharp text on hi-DPI screens
const TARGET_WIDTH = { sm: 160, md: 360, lg: 520 } as const;

/**
 * Stored cover URLs point at small thumbnails (Google zoom=1 is ~128px wide, Open Library -M ~180px),
 * too blurry to read the author and byline. Ask the source for an image sized to how it's displayed.
 */
function sizedCover(src: string, size: keyof typeof TARGET_WIDTH): string {
  try {
    const u = new URL(src);
    if (u.hostname.endsWith("books.google.com") || u.hostname.endsWith("googleusercontent.com")) {
      const w = TARGET_WIDTH[size];
      u.searchParams.set("fife", `w${w}-h${Math.round(w * 1.5)}`);
      return u.toString();
    }
    if (u.hostname === "covers.openlibrary.org" && size !== "sm") {
      u.pathname = u.pathname.replace(/-[SM]\.jpg$/, "-L.jpg");
      return u.toString();
    }
  } catch {
    // not a parseable URL; use as-is
  }
  return src;
}

/** URLs to try in order: the sized version, a large Open Library cover by ISBN, then the stored URL */
function coverCandidates(src: string, isbn: string | null | undefined, size: keyof typeof TARGET_WIDTH) {
  const urls = [sizedCover(src, size)];
  if (isbn && size !== "sm" && !src.includes("covers.openlibrary.org")) {
    urls.push(`https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-L.jpg?default=false`);
  }
  urls.push(src);
  return [...new Set(urls)];
}

/** A book cover, or a cloth-bound stand-in when there's no image */
export default function BookCover({ src, title, author, isbn, size = "md", className = "" }: Props) {
  const candidates = src ? coverCandidates(src, isbn, size) : [];
  const [attempt, setAttempt] = useState(0);
  // A cover that loaded but came back low-res; used if nothing sharper turns up
  const [lowRes, setLowRes] = useState<string | null>(null);
  // After every candidate has been tried, fall back to the low-res cover, then to the stand-in
  const current = attempt < candidates.length ? candidates[attempt] : attempt === candidates.length ? lowRes : null;
  const failed = !current;
  const imgRef = useRef<HTMLImageElement>(null);

  // Some sources only hold a small thumbnail and ignore the requested size, so move on to the next
  function handleLoad(img: HTMLImageElement) {
    const tooSmall = img.naturalWidth < TARGET_WIDTH[size] * 0.6;
    if (tooSmall && attempt < candidates.length - 1) {
      setLowRes((prev) => prev ?? current);
      setAttempt((a) => a + 1);
    }
  }

  // A server-rendered image can finish loading before hydration, so its load/error events are missed
  useEffect(() => {
    const img = imgRef.current;
    if (!img?.complete) return;
    if (img.naturalWidth === 0) setAttempt((a) => a + 1);
    else handleLoad(img);
    // only on mount: later loads fire the event handlers normally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!src || failed) {
    return (
      <div
        className={`book-shadow flex aspect-[2/3] flex-col justify-between rounded-[3px] p-[8%] text-white ${className}`}
        style={{ background: colourFor(title) }}
        aria-label={`No cover image for ${title}`}
      >
        <span
          className={`font-display font-bold leading-tight ${
            size === "sm" ? "line-clamp-3 text-[0.55rem]" : size === "lg" ? "line-clamp-6 text-xl" : "line-clamp-5 text-sm"
          }`}
        >
          {title}
        </span>
        {author && size !== "sm" && (
          <span className={`line-clamp-2 opacity-80 ${size === "lg" ? "text-sm" : "text-[0.7rem]"}`}>{author}</span>
        )}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={current}
      alt={`Cover of ${title}`}
      loading="lazy"
      decoding="async"
      onLoad={(e) => handleLoad(e.currentTarget)}
      onError={() => setAttempt((a) => a + 1)}
      className={`book-shadow aspect-[2/3] rounded-[3px] bg-leaf object-cover ${className}`}
    />
  );
}

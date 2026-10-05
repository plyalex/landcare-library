"use client";

import { useState } from "react";

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

/** A book cover, or a cloth-bound stand-in when there's no image */
export default function BookCover({ src, title, author, size = "md", className = "" }: Props) {
  // 0 = sized image, 1 = original stored URL, 2 = give up and show the stand-in
  const [attempt, setAttempt] = useState(0);
  const failed = attempt >= 2;

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
      src={attempt === 0 ? sizedCover(src, size) : src}
      alt={`Cover of ${title}`}
      loading="lazy"
      decoding="async"
      onError={() => setAttempt((a) => (a === 0 && sizedCover(src, size) !== src ? 1 : 2))}
      className={`book-shadow aspect-[2/3] rounded-[3px] bg-leaf object-cover ${className}`}
    />
  );
}

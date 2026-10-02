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

/** A book cover, or a cloth-bound stand-in when there's no image */
export default function BookCover({ src, title, author, size = "md", className = "" }: Props) {
  const [failed, setFailed] = useState(false);

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
      src={src}
      alt={`Cover of ${title}`}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`book-shadow aspect-[2/3] rounded-[3px] bg-leaf object-cover ${className}`}
    />
  );
}

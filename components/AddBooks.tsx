"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import BookCover from "./BookCover";
import CandidateSearch from "./CandidateSearch";
import { addBooks } from "@/app/actions/books";
import type { BookMeta, DetectedBook } from "@/lib/types";

type Item = {
  key: string;
  detected: DetectedBook | null;
  meta: BookMeta;
  include: boolean;
  duplicate: boolean;
  editing: boolean;
};

/** Shrinks a phone photo so it uploads quickly (spines stay readable at 2000px) */
async function loadImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height };
  } catch {
    // Older browsers: fall back to an <img> element
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    URL.revokeObjectURL(url);
    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  }
}

async function photoToBase64(file: File, maxSide = 2000): Promise<string> {
  const { source, width, height } = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
}

const norm = (s: string) => s.toLowerCase().trim();

export default function AddBooks({ existingTitles }: { existingTitles: string[] }) {
  const [mode, setMode] = useState<"photo" | "search">("photo");
  const [items, setItems] = useState<Item[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [saving, startSaving] = useTransition();

  const existing = new Set(existingTitles);

  function addItems(newOnes: { detected: DetectedBook | null; meta: BookMeta }[]) {
    setSaved(null);
    setItems((prev) => {
      const seen = new Set(prev.map((i) => norm(i.meta.title)));
      const fresh: Item[] = [];
      for (const n of newOnes) {
        const t = norm(n.meta.title);
        if (seen.has(t)) continue;
        seen.add(t);
        const duplicate = existing.has(t);
        fresh.push({
          key: crypto.randomUUID(),
          detected: n.detected,
          meta: n.meta,
          include: !duplicate,
          duplicate,
          editing: false,
        });
      }
      return [...prev, ...fresh];
    });
  }

  async function handlePhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files);
    let found = 0;
    for (let i = 0; i < list.length; i++) {
      setProgress(
        list.length > 1 ? `Reading photo ${i + 1} of ${list.length}…` : "Reading the spines and looking up each book…",
      );
      try {
        const image = await photoToBase64(list[i]);
        const res = await fetch("/api/identify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ image }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "That photo couldn't be read.");
        const got = json.items as { detected: DetectedBook; meta: BookMeta }[];
        found += got.length;
        addItems(got);
      } catch (err) {
        setError(err instanceof Error ? err.message : "That photo couldn't be read.");
      }
    }
    setProgress(null);
    if (found === 0) {
      setError((e) => e ?? "No book titles could be read. Try a closer, well-lit photo with the spines facing the camera.");
    }
  }

  function update(key: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  const chosen = items.filter((i) => i.include);

  function save() {
    setError(null);
    startSaving(async () => {
      const result = await addBooks(chosen.map((i) => i.meta));
      if (result.error) setError(result.error);
      else {
        setSaved(result.count ?? chosen.length);
        setItems([]);
      }
    });
  }

  return (
    <div className="mt-6">
      <div className="flex gap-2" role="tablist" aria-label="How to add">
        {(
          [
            ["photo", "From a photo"],
            ["search", "Search by title or ISBN"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={`min-h-11 rounded-full px-4 font-bold ${
              mode === value ? "bg-bark text-white" : "bg-white ring-1 ring-line hover:bg-leaf"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="panel mt-4 p-5">
        {mode === "photo" ? (
          <>
            <label className="btn btn-primary cursor-pointer">
              Choose or take photos
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={!!progress}
                onChange={(e) => {
                  handlePhotos(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <p className="hint mt-3">
              Tips: one shelf per photo, spines facing the camera, good light. You can choose several photos at once.
            </p>
          </>
        ) : (
          <CandidateSearch
            autoFocus
            pickLabel="Add to list"
            onPick={(meta) => addItems([{ detected: null, meta }])}
          />
        )}
        {progress && (
          <p role="status" className="mt-4 font-bold text-gum">
            {progress}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 font-bold text-redgum">
            {error}
          </p>
        )}
      </div>

      {saved !== null && (
        <div role="status" className="panel mt-6 border-gum p-5">
          <p className="font-bold">
            Added {saved} {saved === 1 ? "book" : "books"} to the library.
          </p>
          <p className="mt-1">
            <Link className="link" href="/?filter=mine">
              See your books
            </Link>{" "}
            or add more above.
          </p>
        </div>
      )}

      {items.length > 0 && (
        <section className="mt-8">
          <h2 className="text-2xl font-bold">Check the list</h2>
          <p className="mt-1 text-granite">
            Untick anything that isn&apos;t yours to lend. If a book matched the wrong edition or title, use
            &ldquo;Wrong book?&rdquo; to search again.
          </p>
          <ul className="mt-4 grid gap-3">
            {items.map((item) => (
              <li key={item.key} className={`panel p-3 ${item.include ? "" : "opacity-70"}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-2 size-5 shrink-0 accent-gum"
                    checked={item.include}
                    onChange={(e) => update(item.key, { include: e.target.checked })}
                    aria-label={`Add ${item.meta.title}`}
                  />
                  <BookCover src={item.meta.cover_url} title={item.meta.title} size="sm" className="w-12 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold leading-snug">{item.meta.title}</p>
                    <p className="text-sm text-granite">
                      {[item.meta.authors.join(", "), item.meta.published_year].filter(Boolean).join(", ") ||
                        "Author unknown"}
                    </p>
                    {item.meta.source === "manual" && (
                      <p className="text-sm text-redgum">No details found online. It will be added as read.</p>
                    )}
                    {item.detected?.confidence === "low" && (
                      <p className="text-sm text-redgum">
                        Only partly readable in the photo (&ldquo;{item.detected.title}&rdquo;). Worth checking.
                      </p>
                    )}
                    {item.duplicate && <p className="text-sm text-redgum">You already have a book with this title.</p>}
                    <button
                      type="button"
                      className="link mt-1 text-sm"
                      onClick={() => update(item.key, { editing: !item.editing })}
                    >
                      {item.editing ? "Close" : "Wrong book?"}
                    </button>
                  </div>
                </div>
                {item.editing && (
                  <div className="mt-3 border-t border-line pt-3">
                    <CandidateSearch
                      autoFocus
                      initialQuery={
                        item.detected
                          ? `${item.detected.title}${item.detected.author ? ` ${item.detected.author}` : ""}`
                          : item.meta.title
                      }
                      pickLabel="Use this"
                      onPick={(meta) => update(item.key, { meta, editing: false, include: true })}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="sticky bottom-0 mt-4 flex flex-wrap items-center gap-3 bg-lichen/95 py-4 backdrop-blur">
            <button type="button" className="btn btn-primary" disabled={saving || chosen.length === 0} onClick={save}>
              {saving ? "Adding…" : `Add ${chosen.length} ${chosen.length === 1 ? "book" : "books"} to the library`}
            </button>
            <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setItems([])}>
              Clear list
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

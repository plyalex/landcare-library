import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { lookupBest } from "@/lib/books/lookup";
import { detectBooks, isVisionError } from "@/lib/books/vision";
import type { BookMeta, DetectedBook } from "@/lib/types";

export const maxDuration = 120;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function POST(request: Request) {
  const { profile } = await getViewer();
  if (!profile?.is_member) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let image: unknown;
  try {
    ({ image } = await request.json());
  } catch {
    return NextResponse.json({ error: "That photo couldn't be uploaded." }, { status: 400 });
  }
  if (typeof image !== "string" || image.length < 100) {
    return NextResponse.json({ error: "That photo couldn't be uploaded." }, { status: 400 });
  }

  let detected: DetectedBook[];
  try {
    detected = await detectBooks(image);
  } catch (err) {
    console.error("detectBooks", err);
    const message = isVisionError(err)
      ? err.message
      : "The photo couldn't be read. Try again, or add books by searching.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const items: { detected: DetectedBook; meta: BookMeta }[] = await mapLimit(detected, 4, async (d) => ({
    detected: d,
    meta: await lookupBest(d.title, d.author),
  }));
  return NextResponse.json({ items });
}

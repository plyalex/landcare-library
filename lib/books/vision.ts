import type { DetectedBook } from "../types";

const PROMPT = `You are helping catalogue a small community lending library.
Look at this photo of books (spines on a shelf, a stack, or covers) and list every distinct book whose title you can read.

Reply with JSON only, no other text, in exactly this shape:
{"books":[{"title":"...","author":"... or null","confidence":"high" | "medium" | "low"}]}

Rules:
- Give the title as printed on the book. Leave out series numbers unless they are part of the title.
- Include the author if it is printed, or if you are certain who wrote it. Otherwise use null.
- "low" confidence means you could only partly read it.
- Skip magazines, DVDs, folders and anything you cannot read.
- If there are no readable books, reply {"books":[]}.`;

class VisionError extends Error {}

function provider(): "gemini" | "anthropic" {
  const p = process.env.VISION_PROVIDER?.toLowerCase();
  if (p === "gemini" || p === "anthropic") return p;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  throw new VisionError(
    "Photo reading isn't set up yet. Add GEMINI_API_KEY or ANTHROPIC_API_KEY in the Vercel settings.",
  );
}

async function askGemini(imageBase64: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new VisionError("GEMINI_API_KEY is not set.");
  const model = process.env.VISION_MODEL || "gemini-flash-latest";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
              { text: PROMPT },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json", temperature: 0 },
      }),
      signal: AbortSignal.timeout(90_000),
    },
  );
  if (res.status === 429)
    throw new VisionError("The free photo-reading allowance is used up for now. Try again in a minute.");
  if (!res.ok) {
    console.error("Gemini error", res.status, await res.text());
    throw new VisionError("The photo reader returned an error. Try again, or add books by searching.");
  }
  const json = await res.json();
  const parts: { text?: string }[] = json.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p) => p.text ?? "").join("");
}

async function askClaude(imageBase64: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new VisionError("ANTHROPIC_API_KEY is not set.");
  const model = process.env.VISION_MODEL || "claude-haiku-4-5-20251001";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (res.status === 429)
    throw new VisionError("The photo reader is busy. Try again in a minute.");
  if (!res.ok) {
    console.error("Anthropic error", res.status, await res.text());
    throw new VisionError("The photo reader returned an error. Try again, or add books by searching.");
  }
  const json = await res.json();
  const blocks: { type: string; text?: string }[] = json.content ?? [];
  return blocks.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
}

function parse(text: string): DetectedBook[] {
  const start = text.search(/[[{]/);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (start === -1 || end <= start) return [];
  let data: unknown;
  try {
    data = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  const list: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray((data as { books?: unknown })?.books)
      ? ((data as { books: unknown[] }).books)
      : [];
  const seen = new Set<string>();
  const out: DetectedBook[] = [];
  for (const item of list) {
    const b = item as { title?: unknown; author?: unknown; confidence?: unknown };
    if (typeof b?.title !== "string" || !b.title.trim()) continue;
    const key = b.title.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      title: b.title.trim().slice(0, 300),
      author: typeof b.author === "string" && b.author.trim() && b.author !== "null" ? b.author.trim() : null,
      confidence:
        b.confidence === "high" || b.confidence === "low" ? b.confidence : "medium",
    });
  }
  return out.slice(0, 60);
}

export async function detectBooks(imageBase64: string): Promise<DetectedBook[]> {
  const text = provider() === "gemini" ? await askGemini(imageBase64) : await askClaude(imageBase64);
  return parse(text);
}

export function isVisionError(err: unknown): err is Error {
  return err instanceof VisionError;
}

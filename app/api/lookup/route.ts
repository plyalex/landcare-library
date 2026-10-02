import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { searchBooks } from "@/lib/books/lookup";

export async function GET(request: Request) {
  const { profile } = await getViewer();
  if (!profile?.is_member) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.slice(0, 200) ?? "";
  if (!q.trim()) return NextResponse.json({ results: [] });
  const results = await searchBooks(q);
  return NextResponse.json({ results });
}

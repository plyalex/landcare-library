import Link from "next/link";
import NewConversation from "@/components/NewConversation";
import { requireMember } from "@/lib/auth";
import { formatDate, formatTime, melbourneDate, todayISO } from "@/lib/dates";
import type { Message } from "@/lib/types";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const { supabase, user } = await requireMember();
  const me = user.id;

  const [{ data: msgData }, { data: people }] = await Promise.all([
    supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${me},recipient_id.eq.${me}`)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("profiles").select("id, full_name").eq("is_member", true).order("full_name"),
  ]);
  const messages = (msgData ?? []) as Message[];
  const names = new Map((people ?? []).map((p) => [p.id as string, p.full_name as string]));

  const threads = new Map<string, { last: Message; unread: number }>();
  for (const m of messages) {
    const other = m.sender_id === me ? m.recipient_id : m.sender_id;
    const t = threads.get(other) ?? { last: m, unread: 0 };
    if (m.recipient_id === me && !m.read_at) t.unread++;
    threads.set(other, t);
  }
  const today = todayISO();

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold sm:text-4xl">Messages</h1>
      <NewConversation
        people={(people ?? []).filter((p) => p.id !== me).map((p) => ({ id: p.id as string, name: p.full_name as string }))}
      />

      {threads.size === 0 ? (
        <p className="mt-8 text-granite">
          No messages yet. Requests to borrow books, and replies to them, will appear here.
        </p>
      ) : (
        <ul className="panel mt-6 divide-y divide-line">
          {[...threads].map(([other, t]) => {
            const when = t.last.created_at;
            const sameDay = melbourneDate(when) === today;
            return (
              <li key={other}>
                <Link href={`/messages/${other}`} className="flex items-start gap-3 p-4 hover:bg-leaf/50">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline justify-between gap-3">
                      <span className={t.unread ? "font-bold" : ""}>{names.get(other) ?? "Former member"}</span>
                      <span className="shrink-0 text-sm text-granite">
                        {sameDay ? formatTime(when) : formatDate(when, "short")}
                      </span>
                    </p>
                    <p className={`line-clamp-2 text-sm ${t.unread ? "text-bark" : "text-granite"}`}>
                      {t.last.sender_id === me ? "You: " : ""}
                      {t.last.body}
                    </p>
                  </div>
                  {t.unread > 0 && (
                    <span className="mt-1 rounded-full bg-wattle px-2 text-sm font-bold" aria-label={`${t.unread} unread`}>
                      {t.unread}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

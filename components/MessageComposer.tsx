"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendMessage } from "@/app/actions/messages";

export default function MessageComposer({ recipientId, recipientName }: { recipientId: string; recipientName: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    if (!body.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await sendMessage(recipientId, body);
      if (result.error) setError(result.error);
      else {
        setBody("");
        router.refresh();
      }
    });
  }

  return (
    <form
      className="sticky bottom-0 mt-6 bg-lichen/95 py-4 backdrop-blur"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <label className="sr-only" htmlFor="reply">
        Message {recipientName}
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id="reply"
          className="field min-h-12 flex-1 resize-y"
          rows={2}
          placeholder={`Message ${recipientName}`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
          }}
        />
        <button type="submit" className="btn btn-primary" disabled={pending || !body.trim()}>
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 font-bold text-redgum">
          {error}
        </p>
      )}
    </form>
  );
}

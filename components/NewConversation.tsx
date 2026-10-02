"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewConversation({ people }: { people: { id: string; name: string }[] }) {
  const router = useRouter();
  const [id, setId] = useState("");
  if (people.length === 0) return null;
  return (
    <form
      className="mt-4 flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (id) router.push(`/messages/${id}`);
      }}
    >
      <div className="min-w-56 flex-1">
        <label className="label" htmlFor="new-to">
          Message a member
        </label>
        <select id="new-to" className="field" value={id} onChange={(e) => setId(e.target.value)}>
          <option value="">Choose a member</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn btn-secondary" disabled={!id}>
        Open
      </button>
    </form>
  );
}

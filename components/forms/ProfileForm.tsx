"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/profile";
import type { Profile } from "@/lib/types";

export default function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(updateProfile, {});
  return (
    <form action={action} className="panel mt-6 grid gap-4 p-5">
      <div>
        <label className="label" htmlFor="full_name">
          Name
        </label>
        <input id="full_name" name="full_name" className="field" defaultValue={profile.full_name} required />
      </div>
      <div>
        <label className="label" htmlFor="phone">
          Phone <span className="font-normal text-granite">(optional)</span>
        </label>
        <input id="phone" name="phone" type="tel" className="field" defaultValue={profile.phone ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="pickup_notes">
          Pickup notes <span className="font-normal text-granite">(optional)</span>
        </label>
        <textarea
          id="pickup_notes"
          name="pickup_notes"
          className="field min-h-20"
          placeholder="For example: I'm on Balmattum Siding Rd. Weekends suit best, or I can bring books to Landcare events."
          defaultValue={profile.pickup_notes ?? ""}
        />
      </div>
      {state.error && (
        <p role="alert" className="font-bold text-redgum">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="font-bold text-gum">
          {state.message}
        </p>
      )}
      <div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save details"}
        </button>
      </div>
    </form>
  );
}

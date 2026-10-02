import Link from "next/link";
import ProfileForm from "@/components/forms/ProfileForm";
import { signOut } from "@/app/actions/auth";
import { requireMember } from "@/lib/auth";

export const metadata = { title: "Your details" };

export default async function ProfilePage() {
  const { supabase, user, profile } = await requireMember();
  const { count } = await supabase
    .from("books")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-bold sm:text-4xl">Your details</h1>
      <p className="mt-2 text-granite">
        Signed in as {user.email}. Your name, phone and pickup notes are shown to other members so you can arrange
        handovers. Your email address is only used for reminders and notifications.
      </p>
      <ProfileForm profile={profile} />

      <p className="mt-8">
        You&apos;re lending {count ?? 0} {count === 1 ? "book" : "books"}.{" "}
        <Link href="/?filter=mine" className="link">
          See your books
        </Link>
      </p>

      <form action={signOut} className="mt-8 border-t border-line pt-6">
        <button type="submit" className="btn btn-secondary">
          Sign out
        </button>
      </form>
    </div>
  );
}

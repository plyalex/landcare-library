import { redirect } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import AuthShell from "@/components/forms/AuthShell";
import { JoinForm } from "@/components/forms/AuthForms";
import { getViewer } from "@/lib/auth";

export const metadata = { title: "Almost there" };

export default async function PendingPage() {
  const { user, profile } = await getViewer();
  if (!user) redirect("/login");
  if (profile?.is_member) redirect("/");
  return (
    <AuthShell title="Almost there">
      <p className="mt-2">
        Your account ({user.email}) isn&apos;t linked to the group yet. Enter the join code, or ask the secretary to
        approve you.
      </p>
      <JoinForm />
      <form action={signOut} className="mt-6 border-t border-line pt-4">
        <button type="submit" className="link">
          Sign out
        </button>
      </form>
    </AuthShell>
  );
}

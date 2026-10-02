import { redirect } from "next/navigation";
import AuthShell from "@/components/forms/AuthShell";
import { SignupForm } from "@/components/forms/AuthForms";
import { getViewer } from "@/lib/auth";

export const metadata = { title: "Create an account" };

export default async function SignupPage() {
  const { user } = await getViewer();
  if (user) redirect("/");
  return (
    <AuthShell title="Create an account">
      <p className="mt-2 text-granite">For group members only. You&apos;ll need the join code.</p>
      <SignupForm />
    </AuthShell>
  );
}

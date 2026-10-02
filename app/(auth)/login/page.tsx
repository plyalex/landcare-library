import { redirect } from "next/navigation";
import AuthShell from "@/components/forms/AuthShell";
import { LoginForm } from "@/components/forms/AuthForms";
import { getViewer } from "@/lib/auth";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user } = await getViewer();
  if (user) redirect("/");
  const { error } = await searchParams;
  return (
    <AuthShell title="Sign in">
      <LoginForm linkError={error === "link"} />
    </AuthShell>
  );
}

import { redirect } from "next/navigation";
import AuthShell from "@/components/forms/AuthShell";
import { ResetForm } from "@/components/forms/AuthForms";
import { getViewer } from "@/lib/auth";

export const metadata = { title: "Choose a new password" };

export default async function ResetPage() {
  const { user } = await getViewer();
  if (!user) redirect("/login?error=link");
  return (
    <AuthShell title="Choose a new password">
      <ResetForm />
    </AuthShell>
  );
}

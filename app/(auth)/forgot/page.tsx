import AuthShell from "@/components/forms/AuthShell";
import { ForgotForm } from "@/components/forms/AuthForms";

export const metadata = { title: "Reset your password" };

export default function ForgotPage() {
  return (
    <AuthShell title="Reset your password">
      <ForgotForm />
    </AuthShell>
  );
}

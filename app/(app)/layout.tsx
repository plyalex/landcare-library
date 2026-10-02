import Nav from "@/components/Nav";
import { requireMember } from "@/lib/auth";
import { APP_NAME, GROUP_NAME } from "@/lib/config";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireMember();
  return (
    <>
      <Nav userId={profile.id} name={profile.full_name} appName={APP_NAME} groupName={GROUP_NAME} />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">{children}</main>
    </>
  );
}

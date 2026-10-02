import { APP_NAME, GROUP_NAME } from "@/lib/config";

export default function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gum-deep px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-md">
        <p className="font-display text-3xl font-bold text-white">{APP_NAME}</p>
        <p className="text-leaf/90">{GROUP_NAME}</p>
        <div className="mt-8 rounded-2xl bg-paper p-6 shadow-xl sm:p-8">
          <h1 className="text-2xl font-bold">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}

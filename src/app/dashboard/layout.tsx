import { AppHeader } from "@/components/app-header";
import { getSessionProfile } from "@/utils/supabase/session";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSessionProfile();

  if (!session) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <AppHeader role={session.profile.role} email={session.email} />
      <main className="mx-auto max-w-6xl px-4 py-4 pb-24 md:px-6 md:py-8 md:pb-8">
        {children}
      </main>
    </div>
  );
}

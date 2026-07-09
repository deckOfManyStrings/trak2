import { signOut } from "@/app/auth/actions";
import { DashboardNav } from "@/app/dashboard/dashboard-nav";
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
      <header className="border-b bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <span className="flex size-7 items-center justify-center rounded-md bg-foreground text-xs font-semibold text-background">
              T
            </span>
            <DashboardNav role={session.profile.role} />
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {session.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

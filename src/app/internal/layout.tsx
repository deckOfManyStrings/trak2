import { AppHeader } from "@/components/app-header";
import { getSessionProfile } from "@/utils/supabase/session";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

// Matches the dashboard shell (same header/nav/sign-out) for visual
// consistency. This layout only requires *some* session, same as
// dashboard/layout.tsx - the real access control (the SUPER_ADMIN_EMAILS
// allowlist) is enforced per-page, e.g. src/app/internal/accounts/page.tsx.
export default async function InternalLayout({
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
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

import { signOut } from "@/app/auth/actions";
import { DashboardNav } from "@/app/dashboard/dashboard-nav";
import { isSuperAdminEmail } from "@/lib/super-admin";
import type { UserRole } from "@/types/db";

type AppHeaderProps = {
  role: UserRole;
  email: string | null;
};

export function AppHeader({ role, email }: AppHeaderProps) {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <span className="flex size-7 items-center justify-center rounded-md bg-foreground text-xs font-semibold text-background">
            T
          </span>
          <DashboardNav role={role} isSuperAdmin={isSuperAdminEmail(email)} />
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {email}
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
  );
}

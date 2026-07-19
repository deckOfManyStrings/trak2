import { signOut } from "@/app/auth/actions";
import {
  DesktopNav,
  MobileBottomNav,
} from "@/app/dashboard/dashboard-nav";
import { isSuperAdminEmail } from "@/lib/super-admin";
import type { UserRole } from "@/types/db";
import Link from "next/link";

type AppHeaderProps = {
  role: UserRole;
  email: string | null;
};

export function AppHeader({ role, email }: AppHeaderProps) {
  const isSuperAdmin = isSuperAdminEmail(email);

  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-6 md:gap-8">
            <span className="flex size-8 items-center justify-center rounded-md bg-foreground text-xs font-semibold text-background md:size-7">
              T
            </span>
            <DesktopNav role={role} isSuperAdmin={isSuperAdmin} />
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <Link
              href="/dashboard/profile"
              className="hidden max-w-[12rem] truncate text-sm text-muted-foreground hover:text-foreground lg:inline"
            >
              {email}
            </Link>
            <Link
              href="/dashboard/profile"
              className="min-h-11 px-2 text-sm font-medium text-muted-foreground hover:text-foreground md:min-h-0 md:px-0 lg:hidden"
            >
              Profile
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="min-h-11 px-2 text-sm font-medium text-muted-foreground hover:text-foreground md:min-h-0 md:px-0"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <MobileBottomNav role={role} isSuperAdmin={isSuperAdmin} />
    </>
  );
}

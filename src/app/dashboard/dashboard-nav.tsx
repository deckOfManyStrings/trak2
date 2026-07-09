"use client";

import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/db";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/locations", label: "Locations" },
  { href: "/dashboard/staff", label: "Staff" },
  { href: "/dashboard/clients", label: "Clients" },
  { href: "/dashboard/checklists", label: "Checklists" },
  { href: "/dashboard/board", label: "Board" },
];

const STAFF_LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/clients", label: "Clients" },
  { href: "/dashboard/checklists", label: "Checklists" },
];

export function DashboardNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const links = role === "admin" ? ADMIN_LINKS : STAFF_LINKS;

  return (
    <nav className="flex items-center gap-1">
      {links.map((link) => {
        const active =
          link.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

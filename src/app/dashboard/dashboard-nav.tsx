"use client";

import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/db";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export const PRIMARY_LINKS = [
  { href: "/dashboard", label: "Overview", match: "exact" as const },
  { href: "/dashboard/clients", label: "Clients", match: "prefix" as const },
  { href: "/dashboard/checklists", label: "Progress notes", match: "prefix" as const },
];

export const ADMIN_MORE_LINKS = [
  { href: "/dashboard/locations", label: "Locations" },
  { href: "/dashboard/staff", label: "Staff" },
  { href: "/dashboard/board", label: "Board" },
];

function isActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") return pathname === href;
  return pathname.startsWith(href);
}

function linkActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

export function DesktopNav({
  role,
  isSuperAdmin = false,
}: {
  role: UserRole;
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();
  const moreLinks = [
    ...(role === "admin" ? ADMIN_MORE_LINKS : []),
    ...(isSuperAdmin ? [{ href: "/internal/accounts", label: "Admin" }] : []),
  ];

  const links = [...PRIMARY_LINKS, ...moreLinks];

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {links.map((link) => {
        const active = linkActive(pathname, link.href);
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

export function MobileBottomNav({
  role,
  isSuperAdmin = false,
}: {
  role: UserRole;
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const moreLinks = [
    ...(role === "admin" ? ADMIN_MORE_LINKS : []),
    ...(isSuperAdmin ? [{ href: "/internal/accounts", label: "Admin" }] : []),
  ];
  const hasMore = moreLinks.length > 0;
  const moreActive = moreLinks.some((link) => linkActive(pathname, link.href));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (
        moreRef.current &&
        !moreRef.current.contains(event.target as Node)
      ) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [moreOpen]);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <div
        className={cn(
          "mx-auto grid max-w-6xl",
          hasMore ? "grid-cols-4" : "grid-cols-3",
        )}
      >
        {PRIMARY_LINKS.map((link) => {
          const active = isActive(pathname, link.href, link.match);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "rounded-full px-3 py-1",
                  active ? "bg-muted" : "",
                )}
              >
                {link.label}
              </span>
            </Link>
          );
        })}

        {hasMore ? (
          <div ref={moreRef} className="relative flex">
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              onClick={() => setMoreOpen((open) => !open)}
              className={cn(
                "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium",
                moreActive || moreOpen
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "rounded-full px-3 py-1",
                  moreActive || moreOpen ? "bg-muted" : "",
                )}
              >
                More
              </span>
            </button>

            {moreOpen ? (
              <div
                role="menu"
                className="absolute bottom-[calc(100%+0.5rem)] right-2 left-auto w-44 rounded-lg border bg-white p-1 shadow-md"
              >
                {moreLinks.map((link) => {
                  const active = linkActive(pathname, link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      role="menuitem"
                      className={cn(
                        "block rounded-md px-3 py-3 text-sm font-medium",
                        active
                          ? "bg-muted text-foreground"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import {
  MOBILE_NAV_ITEMS,
  isMinimalShellRoute,
  isNavItemActive
} from "@/features/navigation/site-map";

export function BottomNav() {
  const pathname = usePathname();
  const { session } = useAuth();
  const isHidden = isMinimalShellRoute(pathname);
  const navItems =
    session?.user.role === "ADMIN"
      ? [
          ...MOBILE_NAV_ITEMS,
          {
            href: "/admin",
            label: "Admin",
            shortLabel: "Admin",
            description: "Panel",
            matchers: ["/admin"]
          }
        ]
      : MOBILE_NAV_ITEMS;

  if (isHidden) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[hsl(var(--border))] bg-[hsl(var(--card)/0.98)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch">
        {navItems.map((item) => {
          const isActive = isNavItemActive(pathname, item);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-center transition-colors ${
                  isActive
                    ? "text-[hsl(var(--primary))]"
                    : "text-[hsl(var(--muted-foreground))]"
                }`}
              >
                <span className="text-xs font-medium">{item.shortLabel}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

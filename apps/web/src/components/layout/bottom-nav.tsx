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
            description: "Control operativo",
            matchers: ["/admin"]
          }
        ]
      : MOBILE_NAV_ITEMS;

  if (isHidden) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.8rem+env(safe-area-inset-bottom))] lg:hidden">
      <ul className="mx-auto flex max-w-xl items-center justify-between gap-2 rounded-[1.85rem] border border-white/70 bg-[rgba(255,255,255,0.95)] px-3 py-3 shadow-[0_24px_55px_rgba(17,32,29,0.14)] backdrop-blur-2xl">
        {navItems.map((item) => {
          const isActive = isNavItemActive(pathname, item);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex min-h-[3.4rem] w-full flex-col items-center justify-center rounded-[1.25rem] px-2 text-center transition active:scale-[0.98] ${
                  isActive
                    ? "bg-[#11201d] text-white shadow-[0_12px_24px_rgba(17,32,29,0.18)]"
                    : "text-slate-600"
                }`}
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">
                  {item.shortLabel}
                </span>
                <span className={`mt-1 text-[10px] ${isActive ? "text-white/72" : "text-slate-500"}`}>
                  {item.description}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

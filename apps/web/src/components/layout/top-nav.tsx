"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { useAuth } from "@/features/auth/auth-context";
import {
  ACCOUNT_NAV_ITEM,
  ADMIN_NAV_ITEM,
  BUSINESS_NAV_ITEM,
  PRIMARY_NAV_ITEMS,
  isAuthRoute,
  isMinimalShellRoute,
  isNavItemActive
} from "@/features/navigation/site-map";
import { useToast } from "@/features/ui/toast-context";

function IcoUser() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, session, signOut } = useAuth();
  const { showToast } = useToast();
  const isCompact = isMinimalShellRoute(pathname);

  const utilityItems = useMemo(() => {
    if (!session?.user.role) return [ACCOUNT_NAV_ITEM];
    if (session.user.role === "ADMIN") return [ACCOUNT_NAV_ITEM, ADMIN_NAV_ITEM];
    if (["VET", "CAREGIVER", "SHOP"].includes(session.user.role)) {
      return [ACCOUNT_NAV_ITEM, BUSINESS_NAV_ITEM];
    }
    return [ACCOUNT_NAV_ITEM];
  }, [session?.user.role]);

  const handleLogout = async () => {
    await signOut();
    showToast({ tone: "success", title: "Sesión cerrada", description: "Hasta pronto." });
    router.push("/login");
  };

  return (
    <header className="safe-area-top sticky top-0 z-40 border-b border-slate-200/60 bg-[hsl(var(--background)/0.97)] backdrop-blur-xl">
      <div className="safe-area-x mx-auto flex h-[64px] max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">

        {/* ── Logo ─────────────────────────────────────────────── */}
        <Link href="/" className="flex shrink-0 items-center">
          <div className="relative h-11 w-[150px]">
            <Image
              src="/brand/logo-con-titulo.png"
              alt="Kummpa"
              fill
              sizes="150px"
              priority
              className="select-none object-contain object-left"
            />
          </div>
        </Link>

        {/* ── Center nav (desktop) ──────────────────────────────── */}
        {!isCompact && (
          <nav className="hidden flex-1 items-center justify-center gap-0.5 md:flex">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const active = isNavItemActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-1.5 text-[13px] transition-all ${
                    active
                      ? "bg-[hsl(var(--primary)/0.1)] font-bold text-[hsl(var(--primary))]"
                      : "font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* ── Right: Auth ───────────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-2">

          {/* Desktop authenticated */}
          {isAuthenticated && (
            <div className="hidden items-center gap-1.5 md:flex">
              {utilityItems.map((item) => {
                const active = isNavItemActive(pathname, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all ${
                      active
                        ? "border-[hsl(var(--primary)/0.25)] bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))]"
                        : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    <IcoUser />
                    {item.label}
                  </Link>
                );
              })}
              <div className="mx-1 h-4 w-px bg-slate-200" />
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="rounded-full px-3 py-1.5 text-[12.5px] font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                Salir
              </button>
            </div>
          )}

          {/* Desktop unauthenticated */}
          {!isAuthenticated && (
            <div className="hidden items-center gap-2 md:flex">
              {!isAuthRoute(pathname) && (
                <Link
                  href="/login"
                  className="rounded-full px-4 py-1.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  Ingresar
                </Link>
              )}
              {pathname !== "/register" && (
                <Link
                  href="/register"
                  className="rounded-full bg-[hsl(var(--primary))] px-4 py-1.5 text-[13px] font-bold text-white shadow-sm transition hover:opacity-90"
                >
                  Crear cuenta
                </Link>
              )}
            </div>
          )}

          {/* Mobile unauthenticated only */}
          {!isAuthenticated && !isAuthRoute(pathname) && (
            <div className="flex items-center gap-2 md:hidden">
              <Link href="/login" className="text-[13px] font-medium text-slate-600">
                Ingresar
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-[hsl(var(--primary))] px-4 py-1.5 text-[12px] font-bold text-white shadow-sm"
              >
                Crear cuenta
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

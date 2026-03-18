"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
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

function IcoSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[14px] w-[14px] shrink-0">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IcoChevDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, session, signOut } = useAuth();
  const { showToast } = useToast();
  const [searchValue, setSearchValue] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const isCompact = isMinimalShellRoute(pathname);
  const isHome = pathname === "/";

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
    showToast({ tone: "success", title: "Sesion cerrada", description: "Hasta pronto." });
    router.push("/login");
  };

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchValue.trim();
    router.push(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
    setSearchValue("");
    searchRef.current?.blur();
  }

  return (
    <header className="safe-area-top sticky top-0 z-40 border-b border-slate-200/70 bg-[hsl(var(--background)/0.96)] backdrop-blur-xl">
      <div className="safe-area-x mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">

        {/* ── Brand ────────────────────────────────────────────── */}
        <Link href="/" className="flex shrink-0 items-center">
          <div className="relative h-14 w-14 overflow-hidden">
            <Image
              src="/brand/logo-con-titulo.png"
              alt="Kummpa"
              fill
              sizes="56px"
              priority
              className="select-none object-contain scale-[1.55] translate-y-[5%]"
            />
          </div>
        </Link>

        {/* ── Desktop nav ──────────────────────────────────────── */}
        {!isCompact && (
          <nav className="hidden flex-1 items-center gap-0.5 md:flex">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const active = isNavItemActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-full px-3.5 py-1.5 text-[13.5px] transition-colors ${
                    active
                      ? "font-semibold text-[hsl(var(--primary))]"
                      : "font-medium text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute -bottom-[1px] left-1/2 h-0.5 w-[60%] -translate-x-1/2 rounded-full bg-[hsl(var(--primary)/0.35)]" />
                  )}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Spacer on compact mode */}
        {isCompact && <div className="flex-1" />}

        {/* ── Global search (non-home, non-compact, desktop) ──── */}
        {!isCompact && !isHome && (
          <form
            onSubmit={handleSearch}
            className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 transition-all lg:flex ${
              searchFocused
                ? "w-[240px] border-[hsl(var(--secondary)/0.4)] bg-white shadow-[0_0_0_3px_hsl(var(--secondary)/0.07)]"
                : "w-[180px] border-slate-200/80 bg-slate-100/60 hover:border-slate-300 hover:bg-slate-100"
            }`}
          >
            <span className="shrink-0 text-slate-400">
              <IcoSearch />
            </span>
            <input
              ref={searchRef}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Buscar..."
              className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-slate-800 outline-none placeholder:text-slate-400"
            />
          </form>
        )}

        {/* ── Desktop auth ─────────────────────────────────────── */}
        <div className="hidden items-center gap-1.5 md:flex">
          {isAuthenticated ? (
            <>
              {utilityItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                    isNavItemActive(pathname, item)
                      ? "bg-[hsl(var(--primary)/0.08)] font-semibold text-[hsl(var(--primary))]"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="rounded-full px-3.5 py-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-800"
              >
                Salir
              </button>
            </>
          ) : (
            <>
              {!isAuthRoute(pathname) && (
                <Link
                  href="/login"
                  className="rounded-full px-3.5 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:text-slate-900"
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
            </>
          )}
        </div>

        {/* ── Mobile auth ──────────────────────────────────────── */}
        {!isAuthenticated && !isAuthRoute(pathname) && (
          <div className="ml-auto flex items-center gap-2 md:hidden">
            <Link
              href="/login"
              className="text-[13px] font-medium text-slate-600"
            >
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
    </header>
  );
}

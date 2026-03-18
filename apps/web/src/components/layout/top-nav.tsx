"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, session, signOut } = useAuth();
  const { showToast } = useToast();
  const [searchValue, setSearchValue] = useState("");
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
    <header className="safe-area-top sticky top-0 z-40 border-b border-[hsl(var(--border)/0.9)] bg-[hsl(var(--background)/0.9)] backdrop-blur-xl">
      <div className="safe-area-x mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">

        {/* Brand */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <BrandLogo variant="icon" className="h-10 w-10" priority />
          <p className="font-display text-xl font-bold">Kumpa</p>
        </Link>

        {/* Desktop nav — shown at md: (768px+) */}
        {!isCompact && (
          <nav className="hidden flex-1 items-center justify-center gap-0.5 md:flex">
            {PRIMARY_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                  isNavItemActive(pathname, item)
                    ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-white/70 hover:text-[hsl(var(--foreground))]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Global search (non-home, non-compact, desktop) */}
        {!isCompact && !isHome && (
          <form
            onSubmit={handleSearch}
            className="hidden min-w-[200px] max-w-[260px] items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-white/85 py-1.5 pl-3.5 pr-1.5 shadow-sm transition focus-within:border-[hsl(var(--secondary)/0.5)] lg:flex"
          >
            <span className="text-[hsl(var(--muted-foreground))]"><IcoSearch /></span>
            <input
              ref={searchRef}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Buscar..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[hsl(var(--muted-foreground))]"
            />
            <button type="submit" className="rounded-full bg-[hsl(var(--primary))] px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90">
              Ir
            </button>
          </form>
        )}

        {/* Desktop auth — shown at md: */}
        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <>
              {utilityItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3 py-2 text-sm font-medium ${
                    isNavItemActive(pathname, item)
                      ? "bg-[hsl(var(--accent))] text-white"
                      : "bg-[hsl(var(--card)/0.7)] text-[hsl(var(--foreground))]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <button type="button" onClick={() => void handleLogout()} className="btn btn-outline text-sm">
                Salir
              </button>
            </>
          ) : (
            <>
              {!isAuthRoute(pathname) && (
                <Link href="/login" className="btn btn-ghost text-sm">
                  Ingresar
                </Link>
              )}
              {pathname !== "/register" && (
                <Link href="/register" className="btn btn-primary text-sm">
                  Crear cuenta
                </Link>
              )}
            </>
          )}
        </div>

        {/* Mobile auth (only show Ingresar/Crear when NOT authenticated) */}
        {!isAuthenticated && !isAuthRoute(pathname) && (
          <div className="ml-auto flex items-center gap-2 md:hidden">
            <Link href="/login" className="rounded-full border border-[hsl(var(--border))] px-3.5 py-1.5 text-xs font-semibold">
              Ingresar
            </Link>
            <Link href="/register" className="rounded-full bg-[hsl(var(--primary))] px-3.5 py-1.5 text-xs font-bold text-white">
              Crear cuenta
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

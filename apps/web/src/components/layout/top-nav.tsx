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
  const [isOpen, setIsOpen] = useState(false);
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
      <div className="safe-area-x mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">

        {/* Brand */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <BrandLogo variant="icon" className="h-10 w-10" priority />
          <p className="hidden font-display text-xl font-bold sm:block">Kumpa</p>
        </Link>

        {/* Primary nav */}
        {!isCompact && (
          <nav className="hidden flex-1 items-center justify-center gap-1 xl:flex">
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

        {/* Search bar (shown everywhere except home and compact routes) */}
        {!isCompact && !isHome && (
          <form
            onSubmit={handleSearch}
            className="hidden min-w-[240px] items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-white/85 py-1.5 pl-4 pr-1.5 shadow-[0_10px_25px_hsl(var(--foreground)/0.06)] transition focus-within:border-[hsl(var(--secondary)/0.5)] focus-within:shadow-md lg:flex"
          >
            <span className="text-[hsl(var(--muted-foreground))]"><IcoSearch /></span>
            <input
              ref={searchRef}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Buscar servicios, lugares..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[hsl(var(--muted-foreground))]"
            />
            <button
              type="submit"
              className="rounded-full bg-[hsl(var(--primary))] px-3.5 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
            >
              Buscar
            </button>
          </form>
        )}

        {/* Mobile toggle */}
        <button
          className="btn btn-ghost ml-auto text-sm xl:hidden"
          onClick={() => setIsOpen((v) => !v)}
          type="button"
        >
          Menu
        </button>

        {/* Desktop auth */}
        <div className="hidden items-center gap-2 xl:flex">
          {isAuthenticated ? (
            <>
              {utilityItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3 py-2 text-sm ${
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
              {!isAuthRoute(pathname) ? (
                <Link href="/login" className="btn btn-ghost text-sm">
                  Ingresar
                </Link>
              ) : null}
              {pathname !== "/register" ? (
                <Link href="/register" className="btn btn-primary text-sm">
                  Crear cuenta
                </Link>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {isOpen && !isCompact ? (
        <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-4 xl:hidden">
          <div className="mx-auto max-w-7xl space-y-4">
            <form
              onSubmit={(e) => { handleSearch(e); setIsOpen(false); }}
              className="flex items-center gap-2 rounded-[1.3rem] border border-[hsl(var(--border))] bg-white px-4 py-2.5"
            >
              <span className="text-[hsl(var(--muted-foreground))]"><IcoSearch /></span>
              <input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Buscar veterinarias, parques, paseos..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[hsl(var(--muted-foreground))]"
              />
              <button type="submit" className="rounded-full bg-[hsl(var(--primary))] px-3 py-1.5 text-xs font-bold text-white">
                Ir
              </button>
            </form>

            <div className="grid gap-2 sm:grid-cols-2">
              {PRIMARY_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="rounded-[1.2rem] border border-[hsl(var(--border))] bg-white px-4 py-3"
                >
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{item.description}</p>
                </Link>
              ))}
              {isAuthenticated
                ? utilityItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="rounded-[1.2rem] border border-[hsl(var(--border))] bg-white px-4 py-3"
                    >
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{item.description}</p>
                    </Link>
                  ))
                : null}
            </div>

            {isAuthenticated ? (
              <button type="button" onClick={() => void handleLogout()} className="btn btn-outline w-full">
                Salir
              </button>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <Link href="/login" onClick={() => setIsOpen(false)} className="btn btn-outline w-full">
                  Ingresar
                </Link>
                <Link href="/register" onClick={() => setIsOpen(false)} className="btn btn-primary w-full">
                  Crear cuenta
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}

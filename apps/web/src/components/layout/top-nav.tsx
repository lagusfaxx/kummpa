"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, session, signOut } = useAuth();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <header className="safe-area-top sticky top-0 z-40 border-b border-[hsl(var(--border)/0.9)] bg-[hsl(var(--background)/0.9)] backdrop-blur-xl">
      <div className="safe-area-x mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <BrandLogo variant="icon" className="h-8 w-8" priority />
          <div className="hidden sm:block">
            <p className="font-display text-lg font-bold">Kumpa</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
              Pet superapp
            </p>
          </div>
        </Link>

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

        {!isCompact && !isHome ? (
          <Link
            href="/explore"
            className="hidden min-w-[220px] rounded-full border border-[hsl(var(--border))] bg-white/85 px-4 py-2 text-sm text-[hsl(var(--muted-foreground))] shadow-[0_10px_25px_hsl(var(--foreground)/0.06)] lg:block"
          >
            Buscar comida, veterinarias o paseos...
          </Link>
        ) : null}

        <button
          className="btn btn-ghost ml-auto text-sm xl:hidden"
          onClick={() => setIsOpen((value) => !value)}
          type="button"
        >
          Menu
        </button>

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

      {isOpen && !isCompact ? (
        <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-4 xl:hidden">
          <div className="mx-auto max-w-7xl space-y-4">
            <Link
              href="/explore"
              onClick={() => setIsOpen(false)}
              className="flex min-h-[3.5rem] items-center rounded-[1.3rem] border border-[hsl(var(--border))] bg-white px-4 text-sm font-semibold text-[hsl(var(--foreground))]"
            >
              Ir a explorar
            </Link>
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

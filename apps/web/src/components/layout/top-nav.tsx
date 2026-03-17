"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { useAuth } from "@/features/auth/auth-context";
import { PRIMARY_NAV_ITEMS, isAuthRoute, isMinimalShellRoute, isNavItemActive } from "@/features/navigation/site-map";
import { useToast } from "@/features/ui/toast-context";

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, session, signOut } = useAuth();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const isCompact = isMinimalShellRoute(pathname);
  const navItems = session?.user.role === "ADMIN" ? [...PRIMARY_NAV_ITEMS, { href: "/admin", label: "Admin", shortLabel: "Admin", description: "Panel", matchers: ["/admin"] }] : PRIMARY_NAV_ITEMS;

  const handleLogout = async () => {
    await signOut();
    showToast({ tone: "success", title: "Sesion cerrada", description: "Hasta pronto." });
    router.push("/login");
  };

  return (
    <header className="safe-area-top sticky top-0 z-40 border-b border-[hsl(var(--border)/0.9)] bg-[hsl(var(--background)/0.92)] backdrop-blur-xl">
      <div className="safe-area-x mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <BrandLogo variant="icon" className="h-8 w-8" priority />
          <span className="hidden font-display text-lg font-bold sm:block">Kumpa</span>
        </Link>

        {!isCompact && (
          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={`rounded-full px-3.5 py-2 text-sm font-medium ${isNavItemActive(pathname, item) ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}>
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <button className="btn btn-ghost text-sm lg:hidden" onClick={() => setIsOpen((v) => !v)} type="button">Menu</button>
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          {isAuthenticated ? (
            <>
              <Link href="/account" className="rounded-full bg-[hsl(var(--card)/0.74)] px-3 py-2 text-sm">{session?.user.firstName || "Mi cuenta"}</Link>
              <button type="button" onClick={() => void handleLogout()} className="btn btn-outline text-sm">Salir</button>
            </>
          ) : (
            <>
              {!isAuthRoute(pathname) && <Link href="/login" className="btn btn-ghost text-sm">Ingresar</Link>}
              {pathname !== "/register" && <Link href="/register" className="btn btn-primary text-sm">Crear cuenta</Link>}
            </>
          )}
        </div>
      </div>
      {isOpen && !isCompact ? (
        <div className="border-t border-[hsl(var(--border))] bg-white px-4 py-3 lg:hidden">
          <div className="grid gap-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                {item.label}
              </Link>
            ))}
            <Link href="/account" onClick={() => setIsOpen(false)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">Cuenta</Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

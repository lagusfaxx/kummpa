"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand/brand-logo";
import { useAuth } from "@/features/auth/auth-context";
import {
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
  const isCompact = isMinimalShellRoute(pathname);
  const navItems =
    session?.user.role === "ADMIN"
      ? [
          ...PRIMARY_NAV_ITEMS,
          {
            href: "/admin",
            label: "Admin",
            shortLabel: "Admin",
            description: "Panel de control",
            matchers: ["/admin"]
          }
        ]
      : PRIMARY_NAV_ITEMS;

  const handleLogout = async () => {
    await signOut();
    showToast({
      tone: "success",
      title: "Sesion cerrada",
      description: "Hasta pronto."
    });
    router.push("/login");
  };

  return (
    <header className="safe-area-top sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.95)] backdrop-blur-md">
      <div className="safe-area-x mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <BrandLogo variant="icon" className="h-8 w-8" priority />
          <span className="hidden font-display text-lg font-bold sm:block">
            Kumpa
          </span>
        </Link>

        {/* Desktop Nav */}
        {!isCompact && (
          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {navItems.map((item) => {
              const isActive = isNavItemActive(pathname, item);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                      : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right Side Actions */}
        <div className="ml-auto flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link
                href="/account"
                className="hidden text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))] sm:block"
              >
                {session?.user.firstName || "Mi cuenta"}
              </Link>
              <button
                type="button"
                onClick={() => {
                  void handleLogout();
                }}
                className="btn btn-outline text-sm"
              >
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
      </div>
    </header>
  );
}

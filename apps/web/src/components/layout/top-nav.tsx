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
            description: "Control operativo",
            matchers: ["/admin"]
          }
        ]
      : PRIMARY_NAV_ITEMS;

  const handleLogout = async () => {
    await signOut();
    showToast({
      tone: "success",
      title: "Sesion cerrada",
      description: "La cuenta se cerro correctamente en este dispositivo."
    });
    router.push("/login");
  };

  if (isCompact) {
    return (
      <header className="safe-area-top sticky top-0 z-40 border-b border-black/5 bg-[rgba(249,247,241,0.86)] backdrop-blur-2xl">
        <div className="safe-area-x mx-auto flex min-h-[4.75rem] max-w-5xl items-center justify-between gap-3 py-3">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="inline-flex items-center justify-center rounded-[1.35rem] border border-white/70 bg-white/85 p-1 shadow-[0_14px_24px_rgba(17,32,29,0.1)]">
              <BrandLogo variant="icon" className="h-10 w-10" priority />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Ecosistema pet
              </span>
              <span className="block truncate font-display text-lg font-bold text-slate-900">
                Kumpa
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {!isAuthenticated && !isAuthRoute(pathname) && (
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center rounded-2xl border border-black/10 bg-white/80 px-3 text-sm font-semibold text-slate-700 shadow-sm transition active:scale-[0.98]"
              >
                Ingresar
              </Link>
            )}
            {!isAuthenticated && isAuthRoute(pathname) && pathname !== "/register" && (
              <Link
                href="/register"
                className="inline-flex min-h-11 items-center rounded-2xl bg-slate-900 px-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(17,32,29,0.18)] transition active:scale-[0.98]"
              >
                Crear cuenta
              </Link>
            )}
            {isAuthenticated ? (
              <Link
                href="/account"
                className="inline-flex min-h-11 items-center rounded-2xl bg-slate-900 px-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(17,32,29,0.18)] transition active:scale-[0.98]"
              >
                Mi panel
              </Link>
            ) : (
              pathname !== "/" && (
                <Link
                  href="/"
                  className="inline-flex min-h-11 items-center rounded-2xl border border-black/10 bg-white/80 px-3 text-sm font-semibold text-slate-700 shadow-sm transition active:scale-[0.98]"
                >
                  Inicio
                </Link>
              )
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="safe-area-top sticky top-0 z-40 border-b border-black/5 bg-[rgba(249,247,241,0.82)] backdrop-blur-2xl">
      <div className="safe-area-x mx-auto flex min-h-[4.9rem] max-w-7xl items-center gap-3 py-3">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="inline-flex items-center justify-center rounded-[1.45rem] border border-white/70 bg-white/88 p-1 shadow-[0_16px_28px_rgba(17,32,29,0.12)]">
            <BrandLogo variant="icon" className="h-10 w-10" priority />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Ecosistema pet
            </span>
            <span className="block truncate font-display text-xl font-bold text-slate-900">
              Kumpa
            </span>
          </span>
        </Link>
        <nav className="hidden flex-1 items-center justify-center gap-2 lg:flex">
          {navItems.map((item) => {
            const isActive = isNavItemActive(pathname, item);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-[1.35rem] px-3 py-2 transition active:scale-[0.98] ${
                  isActive
                    ? "bg-[#11201d] text-white shadow-[0_14px_24px_rgba(17,32,29,0.18)]"
                    : "text-slate-700 hover:bg-white/70"
                }`}
              >
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className={`block text-[11px] ${isActive ? "text-white/72" : "text-slate-500"}`}>
                  {item.description}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/#explorar"
            className="hidden min-h-11 items-center rounded-2xl border border-black/10 bg-white/80 px-3 text-sm font-semibold text-slate-700 shadow-sm transition active:scale-[0.98] xl:inline-flex"
          >
            Explorar modulos
          </Link>
          {isAuthenticated && (
            <span className="hidden rounded-full bg-[#11201d] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white lg:inline-flex">
              {session?.user.role}
            </span>
          )}
          {isAuthenticated ? (
            <>
              <Link
                href="/account"
                className="inline-flex min-h-11 items-center rounded-2xl border border-black/10 bg-white/80 px-3 text-sm font-semibold text-slate-700 shadow-sm transition active:scale-[0.98]"
              >
                {session?.user.firstName ? `Hola, ${session.user.firstName}` : "Mi panel"}
              </Link>
              <button
                type="button"
                onClick={() => {
                  void handleLogout();
                }}
                className="inline-flex min-h-11 items-center rounded-2xl bg-[#11201d] px-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(17,32,29,0.18)] transition active:scale-[0.98]"
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center rounded-2xl border border-black/10 bg-white/80 px-3 text-sm font-semibold text-slate-700 shadow-sm transition active:scale-[0.98]"
              >
                Ingresar
              </Link>
              <Link
                href="/register"
                className="inline-flex min-h-11 items-center rounded-2xl bg-[#11201d] px-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(17,32,29,0.18)] transition active:scale-[0.98]"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

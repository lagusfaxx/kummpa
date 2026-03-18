"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isMinimalShellRoute } from "@/features/navigation/site-map";

function IcoHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function IcoMap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}
function IcoPaw() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="7" cy="6" r="1.5" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="17" cy="6" r="1.5" />
      <circle cx="4.5" cy="10.5" r="1.5" />
      <path d="M12 20c-3 0-7-4-7-7.5 0-2 1.5-3.5 3.5-3.5 1.2 0 2.2.5 3.5.5s2.3-.5 3.5-.5c2 0 3.5 1.5 3.5 3.5 0 3.5-4 7.5-7 7.5z" />
    </svg>
  );
}
function IcoCommunity() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IcoBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

const TABS = [
  { href: "/",           label: "Inicio",    Icon: IcoHome      },
  { href: "/explore",    label: "Explorar",  Icon: IcoMap       },
  { href: "/pets",       label: "Mascotas",  Icon: IcoPaw       },
  { href: "/community",  label: "Comunidad", Icon: IcoCommunity },
  { href: "/lost-pets",  label: "Alertas",   Icon: IcoBell      },
];

export function BottomNav() {
  const pathname = usePathname();

  if (isMinimalShellRoute(pathname)) return null;

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      className="safe-area-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-[hsl(var(--border)/0.8)] bg-[hsl(var(--background)/0.95)] backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch">
        {TABS.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                active
                  ? "text-[hsl(var(--primary))]"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              <span className={`transition-transform ${active ? "scale-110" : ""}`}>
                <Icon />
              </span>
              <span className={`text-[10px] font-semibold leading-none ${active ? "text-[hsl(var(--primary))]" : ""}`}>
                {label}
              </span>
              {active && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-[hsl(var(--primary))]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

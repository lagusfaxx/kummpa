"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/marketplace",           label: "Marketplace", exact: true       },
  { href: "/marketplace/tiendas",   label: "Tiendas"                        },
  { href: "/marketplace/publicar",  label: "Publicar"                       },
  { href: "/marketplace/chats",     label: "Chats"                          },
  { href: "/marketplace/guardados", label: "Guardados"                      },
];

export function CommercialNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:-mx-6 sm:px-6 mb-6">
      {TABS.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              active
                ? "bg-[hsl(var(--primary))] text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

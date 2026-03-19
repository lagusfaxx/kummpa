"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/* ─── SVG icons ─────────────────────────────────────────────── */
function ChatIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className={`h-4.5 w-4.5 ${className}`}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 5.5A2.5 2.5 0 014.5 3h11A2.5 2.5 0 0118 5.5v6A2.5 2.5 0 0115.5 14H11l-4 3v-3H4.5A2.5 2.5 0 012 11.5v-6z" />
    </svg>
  );
}

function HeartIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className={`h-4.5 w-4.5 ${className}`}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.172 5.172a4 4 0 015.656 0L10 6.344l1.172-1.172a4 4 0 115.656 5.656L10 17.656l-6.828-6.828a4 4 0 010-5.656z" />
    </svg>
  );
}

function PlusIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" className={`h-4 w-4 ${className}`}>
      <path strokeLinecap="round" d="M10 4v12M4 10h12" />
    </svg>
  );
}

/* ─── Section meta ───────────────────────────────────────────── */
const SECTION_META: Record<string, { title: string; subtitle: string }> = {
  "/marketplace":           { title: "Marketplace",   subtitle: "Encuentra o vende productos para tu mascota" },
  "/marketplace/tiendas":   { title: "Tiendas",        subtitle: "Tiendas de productos para mascotas"         },
  "/marketplace/publicar":  { title: "Nueva publicación", subtitle: "Crea tu anuncio en segundos"             },
  "/marketplace/chats":     { title: "Mensajes",        subtitle: "Conversaciones activas"                    },
  "/marketplace/guardados": { title: "Guardados",       subtitle: "Publicaciones que guardaste"               },
};

const MAIN_TABS = [
  { href: "/marketplace",         label: "Marketplace", exact: true },
  { href: "/marketplace/tiendas", label: "Tiendas"                  },
];

const FALLBACK_META = { title: "Marketplace", subtitle: "Encuentra o vende productos para tu mascota" };

function getSectionMeta(pathname: string): { title: string; subtitle: string } {
  const direct = SECTION_META[pathname];
  if (direct) return direct;
  // Sort by key length descending so longer prefixes match first
  const sorted = Object.keys(SECTION_META).sort((a, b) => b.length - a.length);
  for (const key of sorted) {
    if (pathname.startsWith(key + "/")) return SECTION_META[key] ?? FALLBACK_META;
  }
  return FALLBACK_META;
}

/* ─── Component ─────────────────────────────────────────────── */
export function CommercialNav() {
  const pathname = usePathname();
  const meta = getSectionMeta(pathname);

  const isChats     = pathname.startsWith("/marketplace/chats");
  const isGuardados = pathname.startsWith("/marketplace/guardados");
  const isPublicar  = pathname === "/marketplace/publicar";

  return (
    <div className="mb-5 space-y-3">
      {/* ── Row 1: section title + secondary actions ── */}
      <div className="flex items-start justify-between gap-3">
        {/* Title + subtitle */}
        <div className="min-w-0">
          <h1 className="text-[22px] font-black leading-tight text-slate-900">{meta.title}</h1>
          <p className="mt-0.5 text-xs text-slate-500 leading-snug">{meta.subtitle}</p>
        </div>

        {/* Secondary actions */}
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          {/* Chats icon button */}
          <Link
            href="/marketplace/chats"
            title="Mensajes"
            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
              isChats
                ? "border-[hsl(164_42%_30%)] bg-[hsl(164_30%_93%)] text-[hsl(164_42%_30%)]"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            <ChatIcon className="h-[18px] w-[18px]" />
          </Link>

          {/* Guardados icon button */}
          <Link
            href="/marketplace/guardados"
            title="Guardados"
            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
              isGuardados
                ? "border-[hsl(164_42%_30%)] bg-[hsl(164_30%_93%)] text-[hsl(164_42%_30%)]"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            <HeartIcon className="h-[18px] w-[18px]" />
          </Link>

          {/* Publicar CTA — orange accent, always prominent */}
          <Link
            href="/marketplace/publicar"
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold shadow-sm transition-opacity ${
              isPublicar
                ? "bg-[hsl(22_92%_53%)] text-white opacity-80"
                : "bg-[hsl(22_92%_60%)] text-white hover:bg-[hsl(22_92%_55%)] active:opacity-80"
            }`}
          >
            <PlusIcon />
            <span>Publicar</span>
          </Link>
        </div>
      </div>

      {/* ── Row 2: main tabs (Marketplace | Tiendas) ── */}
      <div className="flex gap-2">
        {MAIN_TABS.map(({ href, label, exact }) => {
          // exact-match for /marketplace; prefix match but exclude sub-sections for /marketplace/tiendas
          const active = exact
            ? pathname === href || (pathname.startsWith(href + "/") && !pathname.startsWith("/marketplace/tiendas") && !pathname.startsWith("/marketplace/chats") && !pathname.startsWith("/marketplace/guardados") && !pathname.startsWith("/marketplace/publicar"))
            : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 rounded-xl py-2.5 text-center text-sm font-bold transition-colors ${
                active
                  ? "bg-[hsl(164_30%_18%)] text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

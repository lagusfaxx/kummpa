"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapCanvas } from "@/components/map/map-canvas";
import { listMapServices } from "@/features/map/map-api";
import type { MapServicePoint, MapServiceType } from "@/features/map/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/* ─── Typing placeholder hook ────────────────────────────────── */
const SEARCH_PHRASES = [
  "Royal Canin cerca de ti...",
  "Peluquería para Golden Retriever...",
  "Hill's Science Diet...",
  "Tiendas con Purina Pro Plan...",
  "Paseadores en Ñuñoa...",
  "Eukanuba para cachorros...",
  "Peluquería canina con turno...",
  "Alimento húmedo para gatos...",
  "Acana en tu barrio...",
  "Baño y corte express...",
];

function useTypingPlaceholder(phrases: string[]) {
  const [text, setText] = useState(phrases[0] ?? "");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIdx] ?? "";
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && text === current) {
      timeout = setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && text === "") {
      setDeleting(false);
      setPhraseIdx((p) => (p + 1) % phrases.length);
    } else if (deleting) {
      timeout = setTimeout(() => setText((t) => t.slice(0, -1)), 32);
    } else if (current) {
      timeout = setTimeout(() => setText(current.slice(0, text.length + 1)), 52);
    }

    return () => clearTimeout(timeout);
  }, [text, deleting, phraseIdx, phrases]);

  return text;
}

/* ─── Category definitions ───────────────────────────────────── */
type Category = {
  label: string;
  type?: MapServiceType;
  color: string;
  activeBg: string;
  activeText: string;
  icon: () => JSX.Element;
};

function IcoCatAll() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  );
}
function IcoCatVet() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 3.1 1.7 5.8 4.2 7.2L8 21h8l-1.2-4.8A8 8 0 0 0 19 9c0-3.87-3.13-7-7-7z"/>
      <line x1="12" y1="7" x2="12" y2="13"/><line x1="9" y1="10" x2="15" y2="10"/>
    </svg>
  );
}
function IcoCatGrooming() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
      <line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/>
      <line x1="8.12" y1="8.12" x2="12" y2="12"/>
    </svg>
  );
}
function IcoCatWalk() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="5" r="2"/>
      <path d="M6 20l3-6 2 3 2-7 3 4"/>
      <path d="M3 12c3-3 5-4 9-4"/>
    </svg>
  );
}
function IcoCatShop() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  );
}
function IcoCatPark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M17 14c1.66 0 3-1.34 3-3 0-1.27-.8-2.36-1.93-2.8.17-.38.26-.8.26-1.2a3.5 3.5 0 0 0-6.58-1.65A3.5 3.5 0 0 0 6 8.5c0 .19.01.37.04.55A3 3 0 0 0 7 14"/>
      <line x1="12" y1="14" x2="12" y2="21"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
    </svg>
  );
}
function IcoCatHotel() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}

const CATEGORIES: Category[] = [
  { label: "Todo",        color: "#334155", activeBg: "bg-slate-700",   activeText: "text-white", icon: IcoCatAll      },
  { label: "Tiendas",     type: "SHOP",      color: "#b45309", activeBg: "bg-amber-700",  activeText: "text-white", icon: IcoCatShop     },
  { label: "Paseos",      type: "CAREGIVER", color: "#0369a1", activeBg: "bg-blue-700",   activeText: "text-white", icon: IcoCatWalk     },
  { label: "Parques",     type: "PARK",      color: "#15803d", activeBg: "bg-green-700",  activeText: "text-white", icon: IcoCatPark     },
  { label: "Peluquerías", type: "GROOMING",  color: "#be185d", activeBg: "bg-pink-700",   activeText: "text-white", icon: IcoCatGrooming },
  { label: "Veterinarias",type: "VET",       color: "#0f766e", activeBg: "bg-teal-700",   activeText: "text-white", icon: IcoCatVet      },
];

/* ─── Helpers ────────────────────────────────────────────────── */
function typeLabel(type: MapServiceType): string {
  const m: Record<MapServiceType, string> = {
    VET: "Veterinaria", CAREGIVER: "Paseador", SHOP: "Pet shop",
    GROOMING: "Peluquería", HOTEL: "Hotel", PARK: "Parque", LOST_PET: "Alerta"
  };
  return m[type] ?? type;
}

function priceText(s: MapServicePoint): string {
  if (s.priceFrom) return `$${s.priceFrom.toLocaleString("es-CL")}`;
  return s.priceInfo[0] ?? "";
}

function categoryFor(type: MapServiceType): Category {
  return CATEGORIES.find((c) => c.type === type) ?? CATEGORIES[0]!;
}

/* ─── SVG icons ──────────────────────────────────────────────── */
function IcoSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function IcoX() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
function IcoMapTab() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
      <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  );
}
function IcoListTab() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  );
}
function IcoStar() {
  return <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="h-2.5 w-2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
}
function IcoPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l.98-.98a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  );
}
function IcoChev() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}
function IcoDirections() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <polygon points="3 11 22 2 13 21 11 13 3 11"/>
    </svg>
  );
}
function IcoTag() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  );
}

function mapsUrl(lat: number, lng: number, name: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_name=${encodeURIComponent(name)}`;
}

/* ─── Skeleton ────────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-100" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-3/5 animate-pulse rounded-full bg-slate-100" />
        <div className="h-2.5 w-2/5 animate-pulse rounded-full bg-slate-100" />
      </div>
      <div className="h-2.5 w-8 animate-pulse rounded-full bg-slate-100" />
    </div>
  );
}

/* ─── Empty state ─────────────────────────────────────────────── */
function EmptyState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center px-8 py-20 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-50">
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-slate-300">
          <circle cx="22" cy="22" r="14"/>
          <line x1="40" y1="40" x2="32" y2="32"/>
          <path d="M16 22h12M22 16v12" strokeWidth="2"/>
        </svg>
      </div>
      <p className="text-[15px] font-bold text-slate-800">
        {query ? `Nada para "${query}"` : "Sin resultados"}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
        Prueba con otra categoría<br />o amplía tu búsqueda
      </p>
      {query && (
        <button onClick={onClear} className="mt-5 rounded-full bg-slate-100 px-5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200">
          Limpiar búsqueda
        </button>
      )}
    </div>
  );
}

/* ─── Error state ─────────────────────────────────────────────── */
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center px-8 py-20 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50">
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-red-300">
          <circle cx="24" cy="24" r="18"/>
          <line x1="24" y1="15" x2="24" y2="26"/>
          <circle cx="24" cy="32" r="1.5" fill="currentColor"/>
        </svg>
      </div>
      <p className="text-[15px] font-bold text-slate-800">Sin conexión</p>
      <p className="mt-1.5 text-sm text-slate-400">No pudimos cargar los lugares</p>
      <button onClick={onRetry} className="mt-5 rounded-full bg-slate-100 px-5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200">
        Intentar de nuevo
      </button>
    </div>
  );
}

/* ─── Service card ────────────────────────────────────────────── */
function ServiceCard({
  service, selected, onSelect, animIndex
}: {
  service: MapServicePoint;
  selected: boolean;
  onSelect: () => void;
  animIndex: number;
}) {
  const cat = categoryFor(service.type);
  const price = priceText(service);

  return (
    <article
      onClick={onSelect}
      style={{ animationDelay: `${Math.min(animIndex * 28, 280)}ms` }}
      className={`explore-card relative cursor-pointer transition-all duration-150 ${
        selected
          ? "bg-white shadow-[0_2px_16px_-2px_rgba(0,0,0,0.10)]"
          : "hover:bg-slate-50/70"
      }`}
    >
      {selected && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full" style={{ backgroundColor: cat.color }} />
      )}

      <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3">
        <div
          className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-bold text-white"
          style={{ backgroundColor: service.imageUrl ? "transparent" : cat.color }}
        >
          {service.imageUrl
            ? <img src={service.imageUrl} alt={service.name} className="h-full w-full object-cover" />
            : service.name.slice(0, 1)
          }
          {service.isEmergency24x7 && (
            <span className="absolute bottom-0 left-0 right-0 bg-red-600 py-px text-center text-[7px] font-black tracking-wider text-white">24/7</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[13px] font-semibold leading-tight text-slate-800">{service.name}</p>
            {service.isOpenNow !== null && (
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                service.isOpenNow ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
              }`}>
                {service.isOpenNow ? "Abierto" : "Cerrado"}
              </span>
            )}
          </div>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-400">
            <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
            {typeLabel(service.type)}
            {(service.district ?? service.address) && (
              <><span className="opacity-40">·</span>{service.district ?? service.address}</>
            )}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {service.rating !== null && (
              <span className="flex items-center gap-0.5 text-[11px] font-semibold text-amber-500">
                <IcoStar /> {service.rating.toFixed(1)}
              </span>
            )}
            {price && <span className="text-[11px] font-medium text-slate-500">{price}</span>}
            {service.discountLabel && (
              <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[9px] font-bold text-orange-600">{service.discountLabel}</span>
            )}
            {service.distanceKm !== null && (
              <span className="ml-auto shrink-0 text-[10px] font-medium text-slate-400">{service.distanceKm.toFixed(1)} km</span>
            )}
          </div>
          {service.type === "SHOP" && service.matchedProduct && (
            <div className="mt-1.5 flex items-center gap-1.5">
              {service.matchedProduct.imageUrl
                ? <img src={service.matchedProduct.imageUrl} alt={service.matchedProduct.title}
                    className="h-5 w-5 shrink-0 rounded object-cover" />
                : <span className="shrink-0 text-amber-500"><IcoTag /></span>
              }
              <span className="truncate text-[11px] font-medium text-slate-600">{service.matchedProduct.title}</span>
              <span className="shrink-0 text-[11px] font-bold text-[hsl(22_92%_50%)]">
                ${Math.round(service.matchedProduct.priceCents / 100).toLocaleString("es-CL")}
              </span>
            </div>
          )}
        </div>

        {!selected && <div className="mt-1 shrink-0 text-slate-300"><IcoChev /></div>}
      </div>

      {selected && service.type === "SHOP" && service.matchedProduct && (
        <div className="flex items-center gap-2 border-b border-slate-100 bg-amber-50/60 px-4 pb-2 pt-2 pl-[68px]">
          {service.matchedProduct.imageUrl && (
            <img src={service.matchedProduct.imageUrl} alt={service.matchedProduct.title}
              className="h-7 w-7 shrink-0 rounded-lg object-cover" />
          )}
          {!service.matchedProduct.imageUrl && (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600"><IcoTag /></span>
          )}
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-700">{service.matchedProduct.title}</span>
          <span className="shrink-0 text-[11px] font-bold text-[hsl(22_92%_50%)]">
            ${Math.round(service.matchedProduct.priceCents / 100).toLocaleString("es-CL")}
          </span>
        </div>
      )}

      {selected && (
        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 pb-3 pl-[68px]">
          {service.type === "PARK" ? (
            <a href={mapsUrl(service.latitude, service.longitude, service.name)} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 rounded-full bg-green-700 px-4 py-1.5 text-[11px] font-bold text-white transition hover:opacity-90">
              <IcoDirections /> Cómo llegar
            </a>
          ) : service.type === "SHOP" ? (
            <Link href={`/explore/shop/${service.sourceId}`} onClick={(e) => e.stopPropagation()}
              className="rounded-full bg-[hsl(22_92%_60%)] px-4 py-1.5 text-[11px] font-bold text-white transition hover:opacity-90">
              Ver tienda
            </Link>
          ) : service.type === "VET" ? (
            <Link href={`/explore/vet/${service.sourceId}`} onClick={(e) => e.stopPropagation()}
              className="rounded-full bg-[hsl(var(--primary))] px-4 py-1.5 text-[11px] font-bold text-white transition hover:opacity-90">
              Reservar
            </Link>
          ) : service.type === "GROOMING" ? (
            <Link href={`/explore/groomer/${service.sourceId}`} onClick={(e) => e.stopPropagation()}
              className="rounded-full bg-pink-700 px-4 py-1.5 text-[11px] font-bold text-white transition hover:opacity-90">
              Reservar
            </Link>
          ) : (service.bookingUrl ?? service.profileUrl) ? (
            <Link href={service.bookingUrl ?? service.profileUrl ?? "#"} onClick={(e) => e.stopPropagation()}
              className="rounded-full bg-[hsl(var(--primary))] px-4 py-1.5 text-[11px] font-bold text-white transition hover:opacity-90">
              Reservar
            </Link>
          ) : null}
          {service.phone && service.type !== "PARK" && (
            <a href={`tel:${service.phone}`} onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50">
              <IcoPhone /> Llamar
            </a>
          )}
          {service.profileUrl && service.type !== "VET" && service.type !== "SHOP" && service.type !== "PARK" && service.type !== "GROOMING" && (
            <Link href={service.profileUrl} onClick={(e) => e.stopPropagation()}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50">
              Ver ficha
            </Link>
          )}
        </div>
      )}
    </article>
  );
}

/* ─── Category grid ──────────────────────────────────────────── */
function CategoryGrid({
  selectedType, onSelect
}: {
  selectedType: MapServiceType | null;
  onSelect: (t: MapServiceType | null) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {CATEGORIES.map((cat, i) => {
        const active = cat.type ? selectedType === cat.type : selectedType === null;
        const Icon = cat.icon;
        return (
          <button
            key={cat.label}
            type="button"
            onClick={() => onSelect(cat.type ?? null)}
            style={active ? { backgroundColor: cat.color } : { animationDelay: `${i * 40}ms` }}
            className={`category-chip relative flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-center transition-all duration-200 active:scale-95 ${
              active
                ? "text-white shadow-md"
                : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-slate-100"
            }`}
          >
            <span className={`transition-transform duration-200 ${active ? "scale-110" : ""}`}>
              <Icon />
            </span>
            <span className="text-[10px] font-semibold leading-none">{cat.label}</span>
            {active && (
              <span className="absolute inset-0 animate-ping rounded-2xl opacity-0" style={{ backgroundColor: cat.color }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Mobile Service Card (full-width, list view) ───────────── */
function MobileServiceCard({
  service,
  onSelect,
  animIndex,
}: {
  service: MapServicePoint;
  onSelect: () => void;
  animIndex: number;
}) {
  const cat = categoryFor(service.type);
  const price = priceText(service);

  const cta = (() => {
    if (service.type === "PARK") {
      return (
        <a
          href={mapsUrl(service.latitude, service.longitude, service.name)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-700 py-2.5 text-[13px] font-bold text-white"
        >
          <IcoDirections /> Cómo llegar
        </a>
      );
    }
    if (service.type === "SHOP") {
      return (
        <Link
          href={`/explore/shop/${service.sourceId}`}
          onClick={(e) => e.stopPropagation()}
          className="flex flex-1 items-center justify-center rounded-xl bg-[hsl(22_92%_60%)] py-2.5 text-[13px] font-bold text-white"
        >
          Ver tienda
        </Link>
      );
    }
    if (service.type === "VET") {
      return (
        <Link
          href={`/explore/vet/${service.sourceId}`}
          onClick={(e) => e.stopPropagation()}
          className="flex flex-1 items-center justify-center rounded-xl bg-[hsl(var(--primary))] py-2.5 text-[13px] font-bold text-white"
        >
          Reservar
        </Link>
      );
    }
    if (service.type === "GROOMING") {
      return (
        <Link
          href={`/explore/groomer/${service.sourceId}`}
          onClick={(e) => e.stopPropagation()}
          className="flex flex-1 items-center justify-center rounded-xl bg-pink-700 py-2.5 text-[13px] font-bold text-white"
        >
          Reservar
        </Link>
      );
    }
    if (service.bookingUrl ?? service.profileUrl) {
      return (
        <Link
          href={service.bookingUrl ?? service.profileUrl ?? "#"}
          onClick={(e) => e.stopPropagation()}
          className="flex flex-1 items-center justify-center rounded-xl bg-[hsl(var(--primary))] py-2.5 text-[13px] font-bold text-white"
        >
          Reservar
        </Link>
      );
    }
    return null;
  })();

  return (
    <article
      onClick={onSelect}
      style={{ animationDelay: `${Math.min(animIndex * 28, 280)}ms` }}
      className="explore-card mx-3 mb-3 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_2px_14px_-4px_rgba(0,0,0,0.10)] active:scale-[0.985] transition-transform duration-100 cursor-pointer"
    >
      {/* Main info */}
      <div className="flex items-start gap-3.5 p-4">
        <div
          className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-xl font-bold text-white"
          style={{ backgroundColor: service.imageUrl ? "transparent" : cat.color }}
        >
          {service.imageUrl
            ? <img src={service.imageUrl} alt={service.name} className="h-full w-full object-cover" />
            : service.name.slice(0, 1)
          }
          {service.isEmergency24x7 && (
            <span className="absolute bottom-0 left-0 right-0 bg-red-600 py-px text-center text-[7px] font-black tracking-wider text-white">24/7</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[15px] font-bold leading-snug text-slate-800">{service.name}</p>
            {service.isOpenNow !== null && (
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold leading-none ${
                service.isOpenNow ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
              }`}>
                {service.isOpenNow ? "Abierto" : "Cerrado"}
              </span>
            )}
          </div>

          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-slate-400">
            <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
            <span>{typeLabel(service.type)}</span>
            {(service.district ?? service.address) && (
              <><span className="opacity-30">·</span><span className="truncate">{service.district ?? service.address}</span></>
            )}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {service.rating !== null && (
              <span className="flex items-center gap-1 text-[12px] font-semibold text-amber-500">
                <IcoStar /> {service.rating.toFixed(1)}
              </span>
            )}
            {price && <span className="text-[12px] font-medium text-slate-500">{price}</span>}
            {service.discountLabel && (
              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-600">{service.discountLabel}</span>
            )}
            {service.distanceKm !== null && (
              <span className="ml-auto text-[11px] font-medium text-slate-400">{service.distanceKm.toFixed(1)} km</span>
            )}
          </div>
        </div>
      </div>

      {/* Product match — shown prominently */}
      {service.type === "SHOP" && service.matchedProduct && (
        <div className="mx-4 mb-4 flex items-center gap-3 rounded-xl bg-amber-50 p-3">
          {service.matchedProduct.imageUrl
            ? <img
                src={service.matchedProduct.imageUrl}
                alt={service.matchedProduct.title}
                className="h-12 w-12 shrink-0 rounded-xl object-cover border border-amber-100"
              />
            : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-500">
                <IcoTag />
              </span>
          }
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold leading-snug text-slate-800 line-clamp-2">{service.matchedProduct.title}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Disponible en esta tienda</p>
          </div>
          <span className="shrink-0 text-[16px] font-bold text-[hsl(22_92%_50%)]">
            ${Math.round(service.matchedProduct.priceCents / 100).toLocaleString("es-CL")}
          </span>
        </div>
      )}

      {/* Action buttons */}
      {(cta || (service.phone && service.type !== "PARK")) && (
        <div className="flex gap-2.5 border-t border-slate-100 px-4 py-3">
          {cta}
          {service.phone && service.type !== "PARK" && (
            <a
              href={`tel:${service.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-700"
            >
              <IcoPhone /> Llamar
            </a>
          )}
        </div>
      )}
    </article>
  );
}

/* ─── Mobile Card Strip ──────────────────────────────────────── */
/* ─── Mobile Map Card (ultra-compacto, 2 filas) ─────────────── */
function MobileMapCard({
  services,
  selectedId,
  onSelect,
}: {
  services: MapServicePoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const rawIdx = selectedId ? services.findIndex((s) => s.id === selectedId) : 0;
  const activeIdx = rawIdx < 0 ? 0 : rawIdx;
  const service = services[activeIdx] ?? null;
  const touchStartX = useRef<number | null>(null);

  if (!service) return null;

  const cat = categoryFor(service.type);

  const goTo = (i: number) => {
    const next = services[Math.max(0, Math.min(i, services.length - 1))];
    if (next) onSelect(next.id);
  };

  const ctaHref =
    service.type === "SHOP"     ? `/explore/shop/${service.sourceId}`    :
    service.type === "VET"      ? `/explore/vet/${service.sourceId}`      :
    service.type === "GROOMING" ? `/explore/groomer/${service.sourceId}`  :
    service.type === "PARK"     ? mapsUrl(service.latitude, service.longitude, service.name) :
    (service.bookingUrl ?? service.profileUrl ?? null);

  const ctaLabel =
    service.type === "SHOP" ? "Ver tienda" :
    service.type === "PARK" ? "Ir" : "Reservar";

  const ctaBg =
    service.type === "SHOP"     ? "hsl(22 92% 60%)"          :
    service.type === "PARK"     ? "#15803d"                   :
    service.type === "GROOMING" ? "#be185d"                   :
    cat.color;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 px-3"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div
        className="pointer-events-auto overflow-hidden rounded-[20px] border border-white/50 bg-white/95 shadow-[0_16px_48px_-16px_rgba(0,0,0,0.36)] backdrop-blur-2xl"
        onTouchStart={(e) => { touchStartX.current = e.touches[0]?.clientX ?? null; }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(dx) > 44) goTo(activeIdx + (dx < 0 ? 1 : -1));
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-0.5">
          <span className="h-[3px] w-8 rounded-full bg-slate-200" />
        </div>

        {/* Fila 1: avatar · nombre · open · nav */}
        <div className="flex items-center gap-2.5 px-3.5 pt-1.5 pb-2">
          <div
            className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: service.imageUrl ? "transparent" : cat.color }}
          >
            {service.imageUrl
              ? <img src={service.imageUrl} alt={service.name} className="h-full w-full object-cover" />
              : service.name.slice(0, 1)
            }
            {service.isEmergency24x7 && (
              <span className="absolute bottom-0 left-0 right-0 bg-red-600 py-px text-center text-[6px] font-black tracking-wider text-white">24/7</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-[13px] font-bold text-slate-800">{service.name}</p>
              {service.isOpenNow !== null && (
                <span className={`shrink-0 rounded-full px-1.5 py-px text-[9px] font-bold leading-none ${
                  service.isOpenNow ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                }`}>{service.isOpenNow ? "Abierto" : "Cerrado"}</span>
              )}
            </div>
            <p className="mt-px flex items-center gap-1 text-[10px] text-slate-400">
              <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
              {typeLabel(service.type)}
              {service.district && <><span className="opacity-30">·</span><span className="truncate">{service.district}</span></>}
              {service.rating !== null && <><span className="opacity-30">·</span><span className="font-semibold text-amber-500">★{service.rating.toFixed(1)}</span></>}
              {service.distanceKm !== null && <><span className="opacity-30">·</span><span className="font-semibold">{service.distanceKm.toFixed(1)} km</span></>}
            </p>
          </div>

          {/* Nav compacto */}
          <div className="flex shrink-0 items-center gap-0.5">
            <button type="button" onClick={() => goTo(activeIdx - 1)} disabled={activeIdx === 0}
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 active:bg-slate-100 disabled:opacity-25">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <polyline points="10 13 5 8 10 3"/>
              </svg>
            </button>
            <span className="min-w-[28px] text-center text-[10px] font-bold tabular-nums text-slate-400">
              {activeIdx + 1}/{services.length}
            </span>
            <button type="button" onClick={() => goTo(activeIdx + 1)} disabled={activeIdx === services.length - 1}
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 active:bg-slate-100 disabled:opacity-25">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <polyline points="6 3 11 8 6 13"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Fila 2: producto+precio (si hay) + CTA — todo en una línea */}
        <div className="flex items-center gap-2 border-t border-slate-100/80 px-3.5 py-2.5">
          {service.type === "SHOP" && service.matchedProduct ? (
            <>
              {service.matchedProduct.imageUrl && (
                <img src={service.matchedProduct.imageUrl} alt={service.matchedProduct.title}
                  className="h-8 w-8 shrink-0 rounded-lg object-cover border border-amber-100 bg-amber-50" />
              )}
              <p className="min-w-0 flex-1 truncate text-[11px] text-slate-500">{service.matchedProduct.title}</p>
              <span className="shrink-0 text-[15px] font-bold text-[hsl(22_92%_50%)]">
                ${Math.round(service.matchedProduct.priceCents / 100).toLocaleString("es-CL")}
              </span>
            </>
          ) : (
            <div className="flex-1" />
          )}

          {ctaHref && (
            service.type === "PARK" ? (
              <a href={ctaHref} target="_blank" rel="noopener noreferrer"
                className="shrink-0 rounded-xl px-3.5 py-1.5 text-[12px] font-bold text-white"
                style={{ backgroundColor: ctaBg }}>
                {ctaLabel}
              </a>
            ) : (
              <Link href={ctaHref}
                className="shrink-0 rounded-xl px-3.5 py-1.5 text-[12px] font-bold text-white"
                style={{ backgroundColor: ctaBg }}>
                {ctaLabel}
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────── */
export default function ExplorePage() {
  const params = useSearchParams();
  const typingText = useTypingPlaceholder(SEARCH_PHRASES);

  const [search, setSearch]             = useState(params.get("q") ?? "");
  const [inputValue, setInputValue]     = useState(params.get("q") ?? "");
  const [inputFocused, setInputFocused] = useState(false);
  const [selectedType, setSelectedType] = useState<MapServiceType | null>(null);
  const [openNow, setOpenNow]           = useState(false);
  const [withDiscount, setWithDiscount] = useState(params.get("withDiscount") === "1");
  const [services, setServices]         = useState<MapServicePoint[]>([]);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [mobileTab, setMobileTab]       = useState<"map" | "list">("map");
  const [retryKey, setRetryKey]         = useState(0);
  const [resultKey, setResultKey]       = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);
    setError(null);

    void listMapServices({
      q: search || undefined,
      types: selectedType ? [selectedType] : undefined,
      openNow,
      withDiscount,
      radiusKm: 15,
      sortBy: "distance",
      limit: 100
    })
      .then((res) => {
        if (ctrl.signal.aborted) return;
        setServices(res.items);
        setSelectedId(res.items[0]?.id ?? null);
        setResultKey((k) => k + 1);
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Error");
      })
      .finally(() => { if (!ctrl.signal.aborted) setIsLoading(false); });

    return () => ctrl.abort();
  }, [search, selectedType, openNow, withDiscount, retryKey]);

  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    listRef.current.querySelector(`[data-id="${selectedId}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedId) ?? null,
    [services, selectedId]
  );

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(inputValue.trim());
    inputRef.current?.blur();
  }

  function clearSearch() {
    setInputValue("");
    setSearch("");
  }

  const activeFilters = [openNow, withDiscount, selectedType !== null, !!search].filter(Boolean).length;

  /* ─── Shared panel header ───────────────────────────────────── */
  const PanelHeader = (compact = false) => (
    <div className={`sticky top-0 z-10 bg-white/96 backdrop-blur-sm ${compact ? "" : ""}`}>

      {/* Category section */}
      <div className="px-4 pt-4 pb-3">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          ¿Qué quieres explorar?
        </p>
        <CategoryGrid selectedType={selectedType} onSelect={setSelectedType} />
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-slate-100" />

      {/* Search bar */}
      <div className="px-4 pt-3 pb-2">
        <form onSubmit={submitSearch}>
          <div className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 transition-all duration-200 ${
            inputFocused
              ? "border-[hsl(var(--secondary)/0.4)] bg-white shadow-[0_0_0_3px_hsl(var(--secondary)/0.07)]"
              : "border-slate-200 bg-slate-50"
          }`}>
            <span className="shrink-0 text-slate-400 transition-colors duration-200" style={inputFocused ? { color: "hsl(var(--secondary))" } : {}}>
              <IcoSearch />
            </span>
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder={inputFocused ? "Buscar lugares, marcas..." : (typingText || (SEARCH_PHRASES[0] ?? ""))}
              className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
            />
            {inputValue && (
              <button
                type="button"
                onClick={clearSearch}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500 transition hover:bg-slate-300"
              >
                <IcoX />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Secondary filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto px-4 pb-2.5" style={{ scrollbarWidth: "none" }}>
        {[
          { label: "Abierto ahora", active: openNow, toggle: () => setOpenNow((v) => !v), activeColor: "bg-emerald-600 text-white" },
          { label: "Con descuento", active: withDiscount, toggle: () => setWithDiscount((v) => !v), activeColor: "bg-orange-600 text-white" },
        ].map(({ label, active, toggle, activeColor }) => (
          <button
            key={label}
            onClick={toggle}
            className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all duration-150 ${
              active ? activeColor + " shadow-sm" : "border border-slate-200 bg-white text-slate-500 hover:border-slate-300"
            }`}
          >
            {active && <span className="h-1.5 w-1.5 rounded-full bg-white/70" />}
            {label}
          </button>
        ))}
      </div>

      {/* Results count + clear */}
      {(services.length > 0 || activeFilters > 0 || isLoading) && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2">
          <span className="text-[11px] font-semibold text-slate-400">
            {isLoading ? "Buscando..." : `${services.length} lugar${services.length !== 1 ? "es" : ""}`}
          </span>
          {activeFilters > 0 && (
            <button
              onClick={() => { setOpenNow(false); setWithDiscount(false); setSelectedType(null); clearSearch(); }}
              className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 transition hover:bg-slate-200"
            >
              Limpiar <IcoX />
            </button>
          )}
        </div>
      )}
    </div>
  );

  /* ─── Result list ───────────────────────────────────────────── */
  const ResultList = (
    <div ref={listRef} className="flex-1 overflow-y-auto">
      {isLoading ? (
        Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
      ) : error ? (
        <ErrorState onRetry={() => setRetryKey((k) => k + 1)} />
      ) : services.length === 0 ? (
        <EmptyState query={search} onClear={clearSearch} />
      ) : (
        <div key={resultKey}>
          {services.map((s, i) => (
            <div key={s.id} data-id={s.id}>
              <ServiceCard
                service={s}
                selected={selectedId === s.id}
                onSelect={() => setSelectedId(s.id)}
                animIndex={i}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ─── Layout ─────────────────────────────────────────────────── */
  return (
    <>
      {/* Keyframe animations injected inline */}
      <style>{`
        @keyframes exploreCardIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .explore-card {
          animation: exploreCardIn 0.22s ease both;
        }
        @keyframes catChipIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        .category-chip {
          animation: catChipIn 0.18s ease both;
        }
      `}</style>

      <div className="flex flex-1 w-full overflow-hidden">

        {/* Desktop sidebar */}
        <aside className="hidden w-[360px] shrink-0 flex-col overflow-hidden border-r border-slate-200 shadow-[4px_0_30px_-8px_rgba(0,0,0,0.08)] lg:flex">
          <div className="flex flex-1 flex-col bg-white overflow-hidden">
            {PanelHeader()}
            {ResultList}
          </div>
        </aside>

        {/* Mobile */}
        <div className="flex flex-1 flex-col overflow-hidden lg:hidden">

          {/* Header — 3 zonas claras, separadas */}
          <div className="shrink-0 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">

            {/* Zona 1: buscador */}
            <div className="px-4 pt-4 pb-3">
              <form onSubmit={submitSearch}>
                <div className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 transition-all ${
                  inputFocused
                    ? "border-[hsl(var(--secondary)/0.4)] bg-white shadow-[0_0_0_3px_hsl(var(--secondary)/0.07)]"
                    : "border-slate-200 bg-slate-50"
                }`}>
                  <span className="shrink-0 text-slate-400"><IcoSearch /></span>
                  <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    placeholder={inputFocused ? "Buscar lugares, marcas..." : (typingText || (SEARCH_PHRASES[0] ?? ""))}
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
                  />
                  {inputValue && (
                    <button type="button" onClick={clearSearch}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                      <IcoX />
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Zona 2: categorías + filtros */}
            <div className="flex gap-2 overflow-x-auto px-4 pb-3" style={{ scrollbarWidth: "none" }}>
              {CATEGORIES.map((cat) => {
                const active = cat.type ? selectedType === cat.type : selectedType === null;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.label}
                    onClick={() => setSelectedType(cat.type ?? null)}
                    style={active ? { backgroundColor: cat.color } : {}}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 transition-all duration-200 active:scale-95 ${
                      active ? "text-white shadow-sm" : "border border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    <Icon />
                    <span className="text-[11px] font-semibold">{cat.label}</span>
                  </button>
                );
              })}

              <div className="mx-0.5 my-1 w-px shrink-0 self-stretch bg-slate-150" style={{ backgroundColor: "#e8ecf0" }} />

              <button onClick={() => setOpenNow((v) => !v)}
                className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                  openNow ? "bg-emerald-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-500"
                }`}>
                {openNow && <span className="h-1.5 w-1.5 rounded-full bg-white/70" />}
                Abierto
              </button>

              <button onClick={() => setWithDiscount((v) => !v)}
                className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                  withDiscount ? "bg-orange-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-500"
                }`}>
                {withDiscount && <span className="h-1.5 w-1.5 rounded-full bg-white/70" />}
                Descuento
              </button>
            </div>

            {/* Zona 3: vista Mapa / Lista — tab ligero, separado */}
            <div className="flex border-t border-slate-100">
              {(["map", "list"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setMobileTab(tab)}
                  className={`relative flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-colors ${
                    mobileTab === tab ? "text-slate-800" : "text-slate-400"
                  }`}
                >
                  {tab === "map" ? <><IcoMapTab /> Mapa</> : <><IcoListTab /> Lista{!isLoading && services.length > 0 && <span className="ml-0.5 text-[10px] font-normal text-slate-400">({services.length})</span>}</>}
                  {mobileTab === tab && (
                    <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] rounded-full bg-slate-700" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Contenido — mapa limpio o lista */}
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            {mobileTab === "map" ? (
              <MapCanvas
                accessToken={MAPBOX_TOKEN}
                points={services}
                selectedPointId={selectedId}
                onSelectPoint={setSelectedId}
                className="flex-1 min-h-[56vh]"
                borderless
              />
            ) : (
              <div className="flex-1 overflow-y-auto bg-slate-50 pb-[calc(5rem+env(safe-area-inset-bottom))]">
                {/* Results count row */}
                {!isLoading && !error && (
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-[12px] font-semibold text-slate-400">
                      {services.length > 0
                        ? `${services.length} lugar${services.length !== 1 ? "es" : ""}${search ? ` para "${search}"` : ""}`
                        : ""}
                    </span>
                    {(openNow || withDiscount || selectedType !== null || !!search) && (
                      <button
                        onClick={() => { setOpenNow(false); setWithDiscount(false); setSelectedType(null); clearSearch(); }}
                        className="flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500"
                      >
                        Limpiar <IcoX />
                      </button>
                    )}
                  </div>
                )}
                {isLoading
                  ? <div className="pt-3">{Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="mx-3 mb-3 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_2px_14px_-4px_rgba(0,0,0,0.08)]">
                        <SkeletonRow />
                      </div>
                    ))}</div>
                  : error ? <ErrorState onRetry={() => setRetryKey((k) => k + 1)} />
                  : services.length === 0 ? <EmptyState query={search} onClear={clearSearch} />
                  : <div key={resultKey} className="pt-1">{services.map((s, i) => (
                      <div key={s.id} data-id={s.id}>
                        <MobileServiceCard service={s} onSelect={() => setSelectedId(s.id)} animIndex={i} />
                      </div>
                    ))}</div>
                }
              </div>
            )}

            {/* Mobile map card — single card con nav prev/next */}
            {mobileTab === "map" && services.length > 0 && (
              <MobileMapCard
                services={services}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
          </div>
        </div>

        {/* Desktop map */}
        <div className="relative hidden flex-1 overflow-hidden lg:block">
          <MapCanvas
            accessToken={MAPBOX_TOKEN}
            points={services}
            selectedPointId={selectedId}
            onSelectPoint={setSelectedId}
            className="h-full w-full"
            borderless
          />

          {!isLoading && services.length > 0 && (
            <div className="pointer-events-none absolute left-4 top-4 z-10">
              <div className="rounded-full border border-white/15 bg-black/50 px-4 py-1.5 text-[12px] font-semibold text-white shadow-lg backdrop-blur-md">
                {services.length} lugar{services.length !== 1 ? "es" : ""} en el área
              </div>
            </div>
          )}

          {isLoading && (
            <div className="pointer-events-none absolute left-4 top-4 z-10">
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-4 py-1.5 text-[12px] font-semibold text-white backdrop-blur-md">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white" />
                Buscando...
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

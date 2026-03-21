"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MapCanvas } from "@/components/map/map-canvas";
import { listMapServices } from "@/features/map/map-api";
import type { MapServicePoint, MapServiceType } from "@/features/map/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/* ─── Geolocation hook ───────────────────────────────────────── */
function useUserLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<"idle" | "asking" | "granted" | "denied">("idle");
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current || typeof navigator === "undefined" || !navigator.geolocation) return;
    asked.current = true;
    setStatus("asking");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("granted");
      },
      () => {
        setStatus("denied");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 }
    );
  }, []);

  return { location, status };
}

/* ─── Typing placeholder ─────────────────────────────────────── */
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
      timeout = setTimeout(() => setDeleting(true), 2200);
    } else if (deleting && text === "") {
      setDeleting(false);
      setPhraseIdx((p) => (p + 1) % phrases.length);
    } else if (deleting) {
      timeout = setTimeout(() => setText((t) => t.slice(0, -1)), 28);
    } else if (current) {
      timeout = setTimeout(() => setText(current.slice(0, text.length + 1)), 48);
    }
    return () => clearTimeout(timeout);
  }, [text, deleting, phraseIdx, phrases]);

  return text;
}

/* ─── Category palette ───────────────────────────────────────── */
type Category = { label: string; type?: MapServiceType; accent: string; icon: () => JSX.Element };

function IcAll() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>;
}
function IcVet() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><path d="M12 2C8.13 2 5 5.13 5 9c0 3.1 1.7 5.8 4.2 7.2L8 21h8l-1.2-4.8A8 8 0 0 0 19 9c0-3.87-3.13-7-7-7z"/><line x1="12" y1="7" x2="12" y2="13"/><line x1="9" y1="10" x2="15" y2="10"/></svg>;
}
function IcShop() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
}
function IcGrooming() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>;
}
function IcWalk() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><circle cx="12" cy="5" r="2"/><path d="M6 20l3-6 2 3 2-7 3 4"/><path d="M3 12c3-3 5-4 9-4"/></svg>;
}
function IcPark() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><path d="M17 14c1.66 0 3-1.34 3-3 0-1.27-.8-2.36-1.93-2.8.17-.38.26-.8.26-1.2a3.5 3.5 0 0 0-6.58-1.65A3.5 3.5 0 0 0 6 8.5c0 .19.01.37.04.55A3 3 0 0 0 7 14"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/></svg>;
}
function IcHotel() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}

const CATEGORIES: Category[] = [
  { label: "Todo",         accent: "#18181b", icon: IcAll },
  { label: "Veterinarias", type: "VET",       accent: "#0d9488", icon: IcVet },
  { label: "Tiendas",      type: "SHOP",      accent: "#d97706", icon: IcShop },
  { label: "Peluquerías",  type: "GROOMING",  accent: "#db2777", icon: IcGrooming },
  { label: "Paseos",       type: "CAREGIVER", accent: "#2563eb", icon: IcWalk },
  { label: "Parques",      type: "PARK",      accent: "#16a34a", icon: IcPark },
  { label: "Hoteles",      type: "HOTEL",     accent: "#7c3aed", icon: IcHotel },
];

/* ─── Helpers ────────────────────────────────────────────────── */
function typeLabel(t: MapServiceType): string {
  const m: Record<MapServiceType, string> = { VET: "Veterinaria", CAREGIVER: "Paseador", SHOP: "Tienda", GROOMING: "Peluquería", HOTEL: "Hotel", PARK: "Parque", LOST_PET: "Alerta" };
  return m[t] ?? t;
}
function priceText(s: MapServicePoint): string {
  if (s.priceFrom) return `$${s.priceFrom.toLocaleString("es-CL")}`;
  return s.priceInfo[0] ?? "";
}
function catFor(t: MapServiceType) { return CATEGORIES.find((c) => c.type === t) ?? CATEGORIES[0]!; }
function mapsUrl(lat: number, lng: number, name: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_name=${encodeURIComponent(name)}`;
}
function serviceHref(s: MapServicePoint): string | null {
  if (s.type === "SHOP") return `/explore/shop/${s.sourceId}`;
  if (s.type === "VET") return `/explore/vet/${s.sourceId}`;
  if (s.type === "GROOMING") return `/explore/groomer/${s.sourceId}`;
  if (s.type === "PARK") return mapsUrl(s.latitude, s.longitude, s.name);
  return s.bookingUrl ?? s.profileUrl ?? null;
}
function serviceCtaLabel(t: MapServiceType) {
  if (t === "SHOP") return "Ver tienda";
  if (t === "PARK") return "Cómo llegar";
  return "Reservar";
}

/* ─── Icons ──────────────────────────────────────────────────── */
function IcoSearch() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px] shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function IcoX() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function IcoStar() { return <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="h-3 w-3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>; }
function IcoPhone() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l.98-.98a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>; }
function IcoNav() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>; }
function IcoMap() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>; }
function IcoList() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>; }
function IcoTag() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>; }
function IcoChevL() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><polyline points="10 13 5 8 10 3"/></svg>; }
function IcoChevR() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><polyline points="6 3 11 8 6 13"/></svg>; }

/* ─── CTA button (dark, premium) ─────────────────────────────── */
function CtaBtn({ service, expand = false }: { service: MapServicePoint; expand?: boolean }) {
  const href = serviceHref(service);
  if (!href) return null;
  const label = serviceCtaLabel(service.type);
  const isExt = service.type === "PARK";
  const cls = `inline-flex items-center justify-center gap-2 rounded-full bg-zinc-900 text-white text-[13px] font-semibold tracking-[-0.01em] transition-all duration-200 hover:bg-zinc-800 active:scale-[0.97] ${
    expand ? "flex-1 py-3 px-5" : "py-2.5 px-5"
  }`;

  if (isExt) {
    return <a href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className={cls}>{expand && <IcoNav />}{label}</a>;
  }
  return <Link href={href} onClick={(e) => e.stopPropagation()} className={cls}>{label}</Link>;
}

/* ─── Call button ─────────────────────────────────────────────── */
function CallBtn({ phone, expand = false }: { phone: string; expand?: boolean }) {
  return (
    <a href={`tel:${phone}`} onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white text-zinc-700 text-[13px] font-semibold tracking-[-0.01em] transition-all duration-200 hover:bg-zinc-50 active:scale-[0.97] ${
        expand ? "py-3 px-5" : "py-2.5 px-5"
      }`}>
      <IcoPhone />
      {expand && <span>Llamar</span>}
    </a>
  );
}

/* ─── Skeleton ────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-zinc-100" />
      <div className="flex-1 space-y-2.5">
        <div className="h-3 w-3/5 animate-pulse rounded-full bg-zinc-100" />
        <div className="h-2.5 w-2/5 animate-pulse rounded-full bg-zinc-100" />
      </div>
    </div>
  );
}

/* ─── Empty ───────────────────────────────────────────────────── */
function Empty({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center px-10 py-24 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-50">
        <IcoSearch />
      </div>
      <p className="text-[15px] font-semibold tracking-tight text-zinc-900">
        {query ? `Sin resultados para "${query}"` : "Sin resultados"}
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
        Prueba con otra categoría o amplía tu búsqueda
      </p>
      {query && (
        <button onClick={onClear} className="mt-6 rounded-full bg-zinc-100 px-5 py-2.5 text-[12px] font-semibold text-zinc-600 transition hover:bg-zinc-200">
          Limpiar búsqueda
        </button>
      )}
    </div>
  );
}

/* ─── Error ───────────────────────────────────────────────────── */
function ErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center px-10 py-24 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-8 w-8 text-red-400">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/>
        </svg>
      </div>
      <p className="text-[15px] font-semibold tracking-tight text-zinc-900">Error de conexión</p>
      <p className="mt-2 text-[13px] text-zinc-400">No pudimos cargar los resultados</p>
      <button onClick={onRetry} className="mt-6 rounded-full bg-zinc-900 px-5 py-2.5 text-[12px] font-semibold text-white transition hover:bg-zinc-800">
        Reintentar
      </button>
    </div>
  );
}

/* ─── Avatar ──────────────────────────────────────────────────── */
function Avatar({ service, size = 48 }: { service: MapServicePoint; size?: number }) {
  const cat = catFor(service.type);
  const cls = `relative flex shrink-0 items-center justify-center overflow-hidden text-white font-semibold`;
  const radius = size >= 48 ? "rounded-2xl" : "rounded-xl";
  return (
    <div className={`${cls} ${radius}`}
      style={{ width: size, height: size, fontSize: size * 0.38, backgroundColor: service.imageUrl ? "transparent" : cat.accent }}>
      {service.imageUrl
        ? <img src={service.imageUrl} alt={service.name} className="h-full w-full object-cover" />
        : service.name.slice(0, 1)
      }
      {service.isEmergency24x7 && (
        <span className="absolute bottom-0 left-0 right-0 bg-red-600 py-px text-center text-[7px] font-black tracking-wider text-white">24/7</span>
      )}
    </div>
  );
}

/* ─── Open badge ──────────────────────────────────────────────── */
function OpenBadge({ isOpen }: { isOpen: boolean | null }) {
  if (isOpen === null) return null;
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none tracking-wide ${
      isOpen ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400"
    }`}>
      {isOpen ? "Abierto" : "Cerrado"}
    </span>
  );
}

/* ─── Meta line (type · district · rating · distance) ─────────── */
function MetaLine({ service }: { service: MapServicePoint }) {
  const cat = catFor(service.type);
  const price = priceText(service);
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="flex items-center gap-1.5 text-[12px] text-zinc-400">
        <span className="inline-block h-[6px] w-[6px] shrink-0 rounded-full" style={{ backgroundColor: cat.accent }} />
        {typeLabel(service.type)}
      </span>
      {(service.district ?? service.address) && (
        <span className="text-[12px] text-zinc-300">{service.district ?? service.address}</span>
      )}
      {service.rating !== null && (
        <span className="flex items-center gap-0.5 text-[12px] font-medium text-amber-500">
          <IcoStar /> {service.rating.toFixed(1)}
        </span>
      )}
      {price && <span className="text-[12px] font-medium text-zinc-500">{price}</span>}
      {service.discountLabel && (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">{service.discountLabel}</span>
      )}
      {service.distanceKm !== null && (
        <span className="ml-auto text-[11px] font-medium tabular-nums text-zinc-400">{service.distanceKm.toFixed(1)} km</span>
      )}
    </div>
  );
}

/* ─── Product match row ───────────────────────────────────────── */
function ProductMatch({ product }: { product: NonNullable<MapServicePoint["matchedProduct"]> }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-amber-50/70 p-3">
      {product.imageUrl
        ? <img src={product.imageUrl} alt={product.title} className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-amber-200/60" />
        : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><IcoTag /></span>
      }
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-zinc-700">{product.title}</p>
        <p className="text-[11px] text-zinc-400">Disponible</p>
      </div>
      <span className="shrink-0 text-[15px] font-bold tabular-nums text-zinc-900">
        ${Math.round(product.priceCents / 100).toLocaleString("es-CL")}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Desktop Service Card
   ═══════════════════════════════════════════════════════════════ */
function ServiceCard({ service, selected, onSelect, animIndex }: {
  service: MapServicePoint; selected: boolean; onSelect: () => void; animIndex: number;
}) {
  return (
    <article
      onClick={onSelect}
      style={{ animationDelay: `${Math.min(animIndex * 30, 300)}ms` }}
      className={`explore-card cursor-pointer transition-all duration-200 ${
        selected ? "bg-zinc-50/80" : "hover:bg-zinc-50/50"
      }`}
    >
      <div className="flex items-start gap-3.5 px-5 py-4">
        <Avatar service={service} size={44} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[14px] font-semibold tracking-tight text-zinc-900">{service.name}</p>
            <OpenBadge isOpen={service.isOpenNow} />
          </div>

          <MetaLine service={service} />

          {service.type === "SHOP" && service.matchedProduct && (
            <div className="mt-2">
              <ProductMatch product={service.matchedProduct} />
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <CtaBtn service={service} />
            {service.phone && service.type !== "PARK" && <CallBtn phone={service.phone} />}
          </div>
        </div>
      </div>

      <div className="mx-5 border-b border-zinc-100" />
    </article>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Mobile List Card
   ═══════════════════════════════════════════════════════════════ */
function MobileCard({ service, onSelect, animIndex }: {
  service: MapServicePoint; onSelect: () => void; animIndex: number;
}) {
  return (
    <article
      onClick={onSelect}
      style={{ animationDelay: `${Math.min(animIndex * 30, 300)}ms` }}
      className="explore-card mx-4 mb-3 overflow-hidden rounded-[20px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)] ring-1 ring-zinc-100/80 active:scale-[0.985] transition-all duration-150 cursor-pointer"
    >
      <div className="flex items-start gap-4 p-4">
        <Avatar service={service} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[15px] font-semibold tracking-tight leading-snug text-zinc-900">{service.name}</p>
            <OpenBadge isOpen={service.isOpenNow} />
          </div>
          <MetaLine service={service} />
        </div>
      </div>

      {service.type === "SHOP" && service.matchedProduct && (
        <div className="mx-4 mb-3">
          <ProductMatch product={service.matchedProduct} />
        </div>
      )}

      <div className="flex items-center gap-2.5 border-t border-zinc-100 px-4 py-3">
        <CtaBtn service={service} expand />
        {service.phone && service.type !== "PARK" && <CallBtn phone={service.phone} expand />}
      </div>
    </article>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Mobile Map Bottom Card
   ═══════════════════════════════════════════════════════════════ */
function MapBottomCard({ services, selectedId, onSelect }: {
  services: MapServicePoint[]; selectedId: string | null; onSelect: (id: string) => void;
}) {
  const rawIdx = selectedId ? services.findIndex((s) => s.id === selectedId) : 0;
  const idx = rawIdx < 0 ? 0 : rawIdx;
  const s = services[idx] ?? null;
  const touchX = useRef<number | null>(null);
  if (!s) return null;

  const cat = catFor(s.type);
  const go = (i: number) => {
    const next = services[Math.max(0, Math.min(i, services.length - 1))];
    if (next) onSelect(next.id);
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
      <div
        className="pointer-events-auto overflow-hidden rounded-[22px] bg-white/90 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.04] backdrop-blur-2xl backdrop-saturate-150"
        onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null; }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 44) go(idx + (dx < 0 ? 1 : -1));
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <span className="h-[3px] w-9 rounded-full bg-zinc-300/60" />
        </div>

        {/* Info row */}
        <div className="flex items-center gap-3 px-4 pb-3">
          <Avatar service={s} size={44} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-[14px] font-semibold tracking-tight text-zinc-900">{s.name}</p>
              <OpenBadge isOpen={s.isOpenNow} />
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span className="inline-block h-[5px] w-[5px] shrink-0 rounded-full" style={{ backgroundColor: cat.accent }} />
              {typeLabel(s.type)}
              {s.district && <><span className="opacity-30">·</span>{s.district}</>}
              {s.rating !== null && <><span className="opacity-30">·</span><span className="font-medium text-amber-500">★ {s.rating.toFixed(1)}</span></>}
              {s.distanceKm !== null && <><span className="opacity-30">·</span><span className="font-medium">{s.distanceKm.toFixed(1)} km</span></>}
            </p>
          </div>

          {/* Paginator */}
          <div className="flex shrink-0 items-center gap-0.5">
            <button type="button" onClick={() => go(idx - 1)} disabled={idx === 0}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 active:bg-zinc-100 disabled:opacity-20 transition">
              <IcoChevL />
            </button>
            <span className="min-w-[32px] text-center text-[10px] font-bold tabular-nums text-zinc-400">
              {idx + 1}/{services.length}
            </span>
            <button type="button" onClick={() => go(idx + 1)} disabled={idx === services.length - 1}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 active:bg-zinc-100 disabled:opacity-20 transition">
              <IcoChevR />
            </button>
          </div>
        </div>

        {/* Product match */}
        {s.type === "SHOP" && s.matchedProduct && (
          <div className="mx-4 mb-2.5">
            <ProductMatch product={s.matchedProduct} />
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-2 border-t border-zinc-100/80 px-4 py-3">
          <CtaBtn service={s} expand />
          {s.phone && s.type !== "PARK" && <CallBtn phone={s.phone} />}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Category Bar — desktop: horizontal pills, mobile: wrap grid
   ═══════════════════════════════════════════════════════════════ */
function CategoryBar({ selected, onSelect, wrap = false }: { selected: MapServiceType | null; onSelect: (t: MapServiceType | null) => void; wrap?: boolean }) {
  const containerCls = wrap
    ? "flex flex-wrap gap-2 px-4 py-3"
    : "flex gap-1.5 overflow-x-auto px-5 py-3";

  return (
    <div className={containerCls} style={wrap ? undefined : { scrollbarWidth: "none" }}>
      {CATEGORIES.map((cat) => {
        const active = cat.type ? selected === cat.type : selected === null;
        const Icon = cat.icon;
        return (
          <button
            key={cat.label}
            type="button"
            onClick={() => onSelect(cat.type ?? null)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 transition-all duration-200 active:scale-95 ${
              wrap ? "" : "shrink-0"
            } ${
              active
                ? "bg-zinc-900 text-white shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                : "bg-white text-zinc-500 ring-1 ring-zinc-200/80 hover:ring-zinc-300 hover:text-zinc-700"
            }`}
          >
            <Icon />
            <span className="text-[12px] font-semibold tracking-[-0.01em]">{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════════ */
export default function ExplorePage() {
  const params = useSearchParams();
  const typingText = useTypingPlaceholder(SEARCH_PHRASES);
  const { location: userLocation } = useUserLocation();

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
      lat: userLocation?.lat,
      lng: userLocation?.lng,
      radiusKm: 15,
      sortBy: "distance",
      limit: 100
    })
      .then((res) => {
        if (ctrl.signal.aborted) return;
        setServices(res.items.filter((s) => s.type !== "LOST_PET"));
        setSelectedId(null);
        setResultKey((k) => k + 1);
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Error");
      })
      .finally(() => { if (!ctrl.signal.aborted) setIsLoading(false); });

    return () => ctrl.abort();
  }, [search, selectedType, openNow, withDiscount, retryKey, userLocation]);

  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    listRef.current.querySelector(`[data-id="${selectedId}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

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

  /* ─── Search bar ──────────────────────────────────────────────── */
  const SearchBar = (
    <form onSubmit={submitSearch}>
      <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-300 ${
        inputFocused
          ? "border-zinc-300 bg-white shadow-[0_0_0_4px_rgba(0,0,0,0.03)]"
          : "border-zinc-200/80 bg-zinc-50/80"
      }`}>
        <span className={`shrink-0 transition-colors duration-200 ${inputFocused ? "text-zinc-900" : "text-zinc-400"}`}>
          <IcoSearch />
        </span>
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder={inputFocused ? "Buscar lugares, marcas..." : (typingText || (SEARCH_PHRASES[0] ?? ""))}
          className="min-w-0 flex-1 bg-transparent text-[14px] text-zinc-900 outline-none placeholder:text-zinc-400 tracking-[-0.01em]"
        />
        {inputValue && (
          <button type="button" onClick={clearSearch}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-500 transition hover:bg-zinc-300">
            <IcoX />
          </button>
        )}
      </div>
    </form>
  );

  /* ─── Filter pills ────────────────────────────────────────────── */
  const FilterPills = (
    <div className="flex items-center gap-2 overflow-x-auto px-5 pb-3" style={{ scrollbarWidth: "none" }}>
      <button onClick={() => setOpenNow((v) => !v)}
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold transition-all duration-200 ${
          openNow ? "bg-emerald-600 text-white shadow-sm" : "bg-white text-zinc-500 ring-1 ring-zinc-200/80 hover:ring-zinc-300"
        }`}>
        {openNow && <span className="h-1.5 w-1.5 rounded-full bg-white/80" />}
        Abierto ahora
      </button>
      <button onClick={() => setWithDiscount((v) => !v)}
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold transition-all duration-200 ${
          withDiscount ? "bg-amber-600 text-white shadow-sm" : "bg-white text-zinc-500 ring-1 ring-zinc-200/80 hover:ring-zinc-300"
        }`}>
        {withDiscount && <span className="h-1.5 w-1.5 rounded-full bg-white/80" />}
        Con descuento
      </button>
      {activeFilters > 0 && (
        <button onClick={() => { setOpenNow(false); setWithDiscount(false); setSelectedType(null); clearSearch(); }}
          className="flex shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-3 py-2 text-[12px] font-semibold text-zinc-500 transition hover:bg-zinc-200">
          Limpiar <IcoX />
        </button>
      )}
    </div>
  );

  /* ─── Result count ────────────────────────────────────────────── */
  const ResultCount = (
    <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-2.5">
      <span className="text-[12px] font-medium text-zinc-400 tracking-wide">
        {isLoading ? "Buscando..." : `${services.length} resultado${services.length !== 1 ? "s" : ""}`}
      </span>
    </div>
  );

  /* ─── Desktop panel header ────────────────────────────────────── */
  const PanelHeader = (
    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md">
      <div className="px-5 pt-5 pb-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">Explorar</p>
      </div>

      <CategoryBar selected={selectedType} onSelect={setSelectedType} />

      <div className="px-5 pb-3">
        {SearchBar}
      </div>

      {FilterPills}

      {(services.length > 0 || isLoading) && ResultCount}
    </div>
  );

  /* ─── Desktop result list ─────────────────────────────────────── */
  const ResultList = (
    <div ref={listRef} className="flex-1 overflow-y-auto">
      {isLoading ? (
        Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)
      ) : error ? (
        <ErrorView onRetry={() => setRetryKey((k) => k + 1)} />
      ) : services.length === 0 ? (
        <Empty query={search} onClear={clearSearch} />
      ) : (
        <div key={resultKey}>
          {services.map((s, i) => (
            <div key={s.id} data-id={s.id}>
              <ServiceCard service={s} selected={selectedId === s.id} onSelect={() => setSelectedId(s.id)} animIndex={i} />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════
     Layout
     ═══════════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{`
        @keyframes exploreCardIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .explore-card {
          animation: exploreCardIn 0.25s ease both;
        }
        @media (max-width: 1023px) {
          .mapboxgl-ctrl-bottom-left,
          .mapboxgl-ctrl-bottom-right {
            margin-bottom: calc(12rem + env(safe-area-inset-bottom));
          }
        }
        /* Premium Mapbox controls */
        .mapboxgl-ctrl-group {
          border-radius: 12px !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
          border: 1px solid rgba(0,0,0,0.06) !important;
          overflow: hidden;
        }
        .mapboxgl-ctrl-group button {
          width: 36px !important;
          height: 36px !important;
        }
      `}</style>

      <div className="flex flex-1 w-full overflow-hidden bg-white">

        {/* ── Desktop sidebar ────────────────────────────────────── */}
        <aside className="hidden w-[380px] shrink-0 flex-col overflow-hidden border-r border-zinc-100 lg:flex">
          <div className="flex flex-1 flex-col bg-white overflow-hidden">
            {PanelHeader}
            {ResultList}
          </div>
        </aside>

        {/* ── Mobile ─────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden lg:hidden">

          <div className="shrink-0 bg-white">
            {/* Search */}
            <div className="px-4 pt-4 pb-2">
              {SearchBar}
            </div>

            {/* Categories — wrap grid so all are visible */}
            <CategoryBar selected={selectedType} onSelect={setSelectedType} wrap />

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto px-4 pb-3" style={{ scrollbarWidth: "none" }}>
              <button onClick={() => setOpenNow((v) => !v)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all ${
                  openNow ? "bg-emerald-600 text-white" : "bg-white text-zinc-500 ring-1 ring-zinc-200/80"
                }`}>
                {openNow && <span className="h-1.5 w-1.5 rounded-full bg-white/80" />}
                Abierto
              </button>
              <button onClick={() => setWithDiscount((v) => !v)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all ${
                  withDiscount ? "bg-amber-600 text-white" : "bg-white text-zinc-500 ring-1 ring-zinc-200/80"
                }`}>
                {withDiscount && <span className="h-1.5 w-1.5 rounded-full bg-white/80" />}
                Descuento
              </button>
              {activeFilters > 0 && (
                <button onClick={() => { setOpenNow(false); setWithDiscount(false); setSelectedType(null); clearSearch(); }}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-500">
                  Limpiar <IcoX />
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-t border-zinc-100">
              {(["map", "list"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setMobileTab(tab)}
                  className={`relative flex flex-1 items-center justify-center gap-2 py-3 text-[13px] font-semibold tracking-[-0.01em] transition-colors ${
                    mobileTab === tab ? "text-zinc-900" : "text-zinc-400"
                  }`}
                >
                  {tab === "map" ? <><IcoMap /> Mapa</> : <><IcoList /> Lista {!isLoading && services.length > 0 && <span className="text-[11px] font-normal text-zinc-400">({services.length})</span>}</>}
                  {mobileTab === tab && (
                    <span className="absolute bottom-0 left-[15%] right-[15%] h-[2px] rounded-full bg-zinc-900" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            {mobileTab === "map" ? (
              <MapCanvas
                accessToken={MAPBOX_TOKEN}
                points={services}
                selectedPointId={selectedId}
                onSelectPoint={setSelectedId}
                userLocation={userLocation}
                center={userLocation}
                className="flex-1 min-h-[56vh]"
                borderless
                minZoom={8}
                maxZoom={17}
              />
            ) : (
              <div className="flex-1 overflow-y-auto bg-zinc-50/50 pb-[calc(5rem+env(safe-area-inset-bottom))]">
                {!isLoading && !error && services.length > 0 && (
                  <div className="flex items-center justify-between px-5 py-3">
                    <span className="text-[12px] font-medium text-zinc-400">
                      {services.length} resultado{services.length !== 1 ? "s" : ""}{search ? ` para "${search}"` : ""}
                    </span>
                  </div>
                )}
                {isLoading
                  ? <div className="pt-2">{Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="mx-4 mb-3 rounded-[20px] bg-white ring-1 ring-zinc-100 overflow-hidden"><Skeleton /></div>
                    ))}</div>
                  : error ? <ErrorView onRetry={() => setRetryKey((k) => k + 1)} />
                  : services.length === 0 ? <Empty query={search} onClear={clearSearch} />
                  : <div key={resultKey} className="pt-1">{services.map((s, i) => (
                      <div key={s.id} data-id={s.id}>
                        <MobileCard service={s} onSelect={() => setSelectedId(s.id)} animIndex={i} />
                      </div>
                    ))}</div>
                }
              </div>
            )}

            {mobileTab === "map" && services.length > 0 && (
              <MapBottomCard services={services} selectedId={selectedId} onSelect={setSelectedId} />
            )}
          </div>
        </div>

        {/* ── Desktop map ────────────────────────────────────────── */}
        <div className="relative hidden flex-1 overflow-hidden lg:block">
          <MapCanvas
            accessToken={MAPBOX_TOKEN}
            points={services}
            selectedPointId={selectedId}
            onSelectPoint={setSelectedId}
            userLocation={userLocation}
            center={userLocation}
            className="h-full w-full"
            borderless
            minZoom={8}
            maxZoom={17}
          />

          {!isLoading && services.length > 0 && (
            <div className="pointer-events-none absolute left-4 top-4 z-10">
              <div className="rounded-full bg-white/90 px-4 py-2 text-[12px] font-semibold text-zinc-700 shadow-[0_2px_12px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04] backdrop-blur-md">
                {services.length} resultado{services.length !== 1 ? "s" : ""} en el área
              </div>
            </div>
          )}

          {isLoading && (
            <div className="pointer-events-none absolute left-4 top-4 z-10">
              <div className="flex items-center gap-2.5 rounded-full bg-white/90 px-4 py-2 text-[12px] font-semibold text-zinc-700 shadow-[0_2px_12px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04] backdrop-blur-md">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-900" />
                Buscando...
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

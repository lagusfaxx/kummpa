"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MapCanvas } from "@/components/map/map-canvas";
import { listMapServices } from "@/features/map/map-api";
import type { MapServicePoint, MapServiceType } from "@/features/map/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/* ─── Geolocation ────────────────────────────────────────────── */
function useUserLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current || typeof navigator === "undefined" || !navigator.geolocation) return;
    asked.current = true;
    navigator.geolocation.getCurrentPosition(
      (p) => setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 }
    );
  }, []);
  return location;
}

/* ─── Typing placeholder ─────────────────────────────────────── */
const PHRASES = [
  "Royal Canin cerca de ti...",
  "Peluquería para Golden Retriever...",
  "Hill's Science Diet...",
  "Tiendas con Purina Pro Plan...",
  "Paseadores en Ñuñoa...",
  "Veterinaria 24 horas...",
  "Alimento húmedo para gatos...",
  "Baño y corte express...",
];

function useTypingPlaceholder() {
  const [text, setText] = useState(PHRASES[0] ?? "");
  const [idx, setIdx] = useState(0);
  const [del, setDel] = useState(false);
  useEffect(() => {
    const cur = PHRASES[idx] ?? "";
    let t: ReturnType<typeof setTimeout>;
    if (!del && text === cur) t = setTimeout(() => setDel(true), 2200);
    else if (del && text === "") { setDel(false); setIdx((i) => (i + 1) % PHRASES.length); }
    else if (del) t = setTimeout(() => setText((s) => s.slice(0, -1)), 28);
    else t = setTimeout(() => setText(cur.slice(0, text.length + 1)), 48);
    return () => clearTimeout(t!);
  }, [text, del, idx]);
  return text;
}

/* ─── Category system ────────────────────────────────────────── */
type Cat = { label: string; type?: MapServiceType; color: string; bg: string; text: string; lightBg: string; lightText: string; icon: () => JSX.Element };

function IcAll() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>; }
function IcVet() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]"><path d="M12 2C8.13 2 5 5.13 5 9c0 3.1 1.7 5.8 4.2 7.2L8 21h8l-1.2-4.8A8 8 0 0 0 19 9c0-3.87-3.13-7-7-7z"/><line x1="12" y1="7" x2="12" y2="13"/><line x1="9" y1="10" x2="15" y2="10"/></svg>; }
function IcShop() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>; }
function IcGroom() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>; }
function IcWalk() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]"><circle cx="12" cy="5" r="2"/><path d="M6 20l3-6 2 3 2-7 3 4"/><path d="M3 12c3-3 5-4 9-4"/></svg>; }
function IcPark() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]"><path d="M17 14c1.66 0 3-1.34 3-3 0-1.27-.8-2.36-1.93-2.8.17-.38.26-.8.26-1.2a3.5 3.5 0 0 0-6.58-1.65A3.5 3.5 0 0 0 6 8.5c0 .19.01.37.04.55A3 3 0 0 0 7 14"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/></svg>; }
function IcHotel() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }

const CATS: Cat[] = [
  { label: "Todo",         color: "#475569", bg: "bg-slate-600",    text: "text-white", lightBg: "bg-slate-50",    lightText: "text-slate-600",  icon: IcAll },
  { label: "Veterinarias", type: "VET",       color: "#0d9488", bg: "bg-teal-600",     text: "text-white", lightBg: "bg-teal-50",     lightText: "text-teal-700",   icon: IcVet },
  { label: "Tiendas",      type: "SHOP",      color: "#d97706", bg: "bg-amber-600",    text: "text-white", lightBg: "bg-amber-50",    lightText: "text-amber-700",  icon: IcShop },
  { label: "Peluquerías",  type: "GROOMING",  color: "#db2777", bg: "bg-pink-600",     text: "text-white", lightBg: "bg-pink-50",     lightText: "text-pink-700",   icon: IcGroom },
  { label: "Paseos",       type: "CAREGIVER", color: "#2563eb", bg: "bg-blue-600",     text: "text-white", lightBg: "bg-blue-50",     lightText: "text-blue-700",   icon: IcWalk },
  { label: "Parques",      type: "PARK",      color: "#16a34a", bg: "bg-green-600",    text: "text-white", lightBg: "bg-green-50",    lightText: "text-green-700",  icon: IcPark },
  { label: "Hoteles",      type: "HOTEL",     color: "#7c3aed", bg: "bg-violet-600",   text: "text-white", lightBg: "bg-violet-50",   lightText: "text-violet-700", icon: IcHotel },
];

function catFor(t: MapServiceType) { return CATS.find((c) => c.type === t) ?? CATS[0]!; }
function typeLabel(t: MapServiceType) {
  return ({ VET: "Veterinaria", CAREGIVER: "Paseador", SHOP: "Tienda", GROOMING: "Peluquería", HOTEL: "Hotel", PARK: "Parque", LOST_PET: "Alerta" } as Record<string,string>)[t] ?? t;
}
function priceText(s: MapServicePoint) { return s.priceFrom ? `$${s.priceFrom.toLocaleString("es-CL")}` : (s.priceInfo[0] ?? ""); }
function mapsUrl(lat: number, lng: number, name: string) { return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_name=${encodeURIComponent(name)}`; }
function serviceHref(s: MapServicePoint) {
  if (s.type === "SHOP") return `/explore/shop/${s.sourceId}`;
  if (s.type === "VET") return `/explore/vet/${s.sourceId}`;
  if (s.type === "GROOMING") return `/explore/groomer/${s.sourceId}`;
  if (s.type === "PARK") return mapsUrl(s.latitude, s.longitude, s.name);
  return s.bookingUrl ?? s.profileUrl ?? null;
}
function ctaLabel(t: MapServiceType) { return t === "SHOP" ? "Ver tienda" : t === "PARK" ? "Cómo llegar" : "Reservar"; }

/* ─── Icons ──────────────────────────────────────────────────── */
function IcoSearch() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function IcoX() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function IcoStar() { return <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>; }
function IcoPhone() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l.98-.98a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>; }
function IcoNav() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>; }
function IcoMap() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>; }
function IcoList() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>; }
function IcoPin() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
function IcoTag() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>; }
function IcoChevL() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><polyline points="10 13 5 8 10 3"/></svg>; }
function IcoChevR() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><polyline points="6 3 11 8 6 13"/></svg>; }

/* ─── CTA colored by category ────────────────────────────────── */
function CtaBtn({ service, expand = false }: { service: MapServicePoint; expand?: boolean }) {
  const href = serviceHref(service);
  if (!href) return null;
  const cat = catFor(service.type);
  const cls = `inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-[13px] transition-all hover:opacity-90 active:scale-[0.97] text-white ${expand ? "flex-1 py-3 px-5" : "py-2.5 px-4"}`;
  const props = { className: cls, style: { backgroundColor: cat.color }, onClick: (e: React.MouseEvent) => e.stopPropagation() };
  if (service.type === "PARK") return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{expand && <IcoNav />}{ctaLabel(service.type)}</a>;
  return <Link href={href} {...props}>{ctaLabel(service.type)}</Link>;
}

function CallBtn({ phone, expand = false }: { phone: string; expand?: boolean }) {
  return <a href={`tel:${phone}`} onClick={(e) => e.stopPropagation()}
    className={`inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white text-slate-600 font-semibold text-[13px] transition-all hover:bg-slate-50 active:scale-[0.97] ${expand ? "py-3 px-5" : "py-2.5 px-4"}`}>
    <IcoPhone />{expand && "Llamar"}
  </a>;
}

/* ─── Subcomponents ──────────────────────────────────────────── */
function Avatar({ service, size = 48 }: { service: MapServicePoint; size?: number }) {
  const cat = catFor(service.type);
  return (
    <div className="relative flex shrink-0 items-center justify-center overflow-hidden text-white font-bold rounded-2xl"
      style={{ width: size, height: size, fontSize: size * 0.36, backgroundColor: service.imageUrl ? "#f1f5f9" : cat.color }}>
      {service.imageUrl ? <img src={service.imageUrl} alt="" className="h-full w-full object-cover" /> : service.name.slice(0, 1)}
      {service.isEmergency24x7 && <span className="absolute bottom-0 inset-x-0 bg-red-500 text-center text-[7px] font-black text-white py-px">24/7</span>}
    </div>
  );
}

function OpenBadge({ isOpen }: { isOpen: boolean | null }) {
  if (isOpen === null) return null;
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold leading-none ${isOpen ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{isOpen ? "Abierto" : "Cerrado"}</span>;
}

function InfoBadges({ service }: { service: MapServicePoint }) {
  const cat = catFor(service.type);
  const price = priceText(service);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {/* Type badge with color */}
      <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: cat.color + "14", color: cat.color }}>
        {typeLabel(service.type)}
      </span>
      {/* Distance */}
      {service.distanceKm !== null && (
        <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
          <IcoPin />{service.distanceKm.toFixed(1)} km
        </span>
      )}
      {/* Price */}
      {price && (
        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
          {price}
        </span>
      )}
      {/* Rating */}
      {service.rating !== null && (
        <span className="inline-flex items-center gap-0.5 rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
          <IcoStar />{service.rating.toFixed(1)}
        </span>
      )}
      {/* Discount */}
      {service.discountLabel && (
        <span className="rounded-lg bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">{service.discountLabel}</span>
      )}
    </div>
  );
}

function ProductRow({ product }: { product: NonNullable<MapServicePoint["matchedProduct"]> }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-2.5">
      {product.imageUrl
        ? <img src={product.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-amber-200" />
        : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600"><IcoTag /></span>}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-slate-700">{product.title}</p>
        <p className="text-[10px] text-slate-400">Disponible</p>
      </div>
      <span className="shrink-0 text-[15px] font-bold tabular-nums text-amber-700">${Math.round(product.priceCents / 100).toLocaleString("es-CL")}</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5">
      <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-slate-100" />
      <div className="flex-1 space-y-2"><div className="h-3.5 w-3/5 animate-pulse rounded bg-slate-100" /><div className="h-3 w-2/5 animate-pulse rounded bg-slate-100" /></div>
    </div>
  );
}

function Empty({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center px-8 py-20 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><IcoSearch /></div>
      <p className="text-[15px] font-bold text-slate-800">{query ? `Sin resultados para "${query}"` : "Sin resultados"}</p>
      <p className="mt-1.5 text-[13px] text-slate-400">Prueba otra categoría o amplía tu búsqueda</p>
      {query && <button onClick={onClear} className="mt-5 rounded-xl bg-slate-100 px-5 py-2.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-200">Limpiar</button>}
    </div>
  );
}

function ErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center px-8 py-20 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-400">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-7 w-7"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg>
      </div>
      <p className="text-[15px] font-bold text-slate-800">Error de conexión</p>
      <p className="mt-1.5 text-[13px] text-slate-400">No pudimos cargar los resultados</p>
      <button onClick={onRetry} className="mt-5 rounded-xl bg-red-500 px-5 py-2.5 text-[12px] font-semibold text-white hover:bg-red-600">Reintentar</button>
    </div>
  );
}

/* ═══ Desktop Card ═══════════════════════════════════════════════ */
function DesktopCard({ service, selected, onSelect, i }: { service: MapServicePoint; selected: boolean; onSelect: () => void; i: number }) {
  const cat = catFor(service.type);
  return (
    <article onClick={onSelect} style={{ animationDelay: `${Math.min(i * 25, 250)}ms` }}
      className={`explore-card relative cursor-pointer transition-all ${selected ? "bg-slate-50" : "hover:bg-slate-50/60"}`}>
      {/* Color accent bar */}
      {selected && <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full" style={{ backgroundColor: cat.color }} />}

      <div className="flex gap-3.5 px-4 py-3.5">
        <Avatar service={service} size={46} />
        <div className="min-w-0 flex-1">
          {/* Row 1: name + open */}
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[14px] font-bold text-slate-800">{service.name}</p>
            <OpenBadge isOpen={service.isOpenNow} />
          </div>
          {/* Row 2: location */}
          <p className="mt-0.5 truncate text-[12px] text-slate-400">
            {service.district ?? service.address ?? ""}
          </p>
          {/* Row 3: badges (type, distance, price, rating) */}
          <InfoBadges service={service} />
          {/* Product */}
          {service.type === "SHOP" && service.matchedProduct && <div className="mt-2"><ProductRow product={service.matchedProduct} /></div>}
          {/* Actions */}
          <div className="mt-2.5 flex items-center gap-2">
            <CtaBtn service={service} />
            {service.phone && service.type !== "PARK" && <CallBtn phone={service.phone} />}
          </div>
        </div>
      </div>
      <div className="mx-4 border-b border-slate-100" />
    </article>
  );
}

/* ═══ Mobile List Card ═══════════════════════════════════════════ */
function MobileCard({ service, onSelect, i }: { service: MapServicePoint; onSelect: () => void; i: number }) {
  const cat = catFor(service.type);
  const price = priceText(service);
  return (
    <article onClick={onSelect} style={{ animationDelay: `${Math.min(i * 25, 250)}ms` }}
      className="explore-card mx-4 mb-3.5 overflow-hidden rounded-[1.25rem] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.12)] active:scale-[0.985] transition-all cursor-pointer">
      {/* Colored gradient header */}
      <div className="relative h-[5px]" style={{ background: `linear-gradient(90deg, ${cat.color}, ${cat.color}88)` }} />

      <div className="p-4 pb-3">
        {/* Top row: avatar + info */}
        <div className="flex gap-3.5">
          <Avatar service={service} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[15px] font-bold leading-snug text-slate-800">{service.name}</p>
              <OpenBadge isOpen={service.isOpenNow} />
            </div>
            <p className="mt-0.5 truncate text-[12px] text-slate-400">{service.district ?? service.address ?? ""}</p>
          </div>
        </div>

        {/* Colorful info row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: cat.color + "18", color: cat.color }}>
            <cat.icon />{typeLabel(service.type)}
          </span>
          {service.distanceKm !== null && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600">
              <IcoPin />{service.distanceKm.toFixed(1)} km
            </span>
          )}
          {service.rating !== null && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-600">
              <IcoStar />{service.rating.toFixed(1)}
            </span>
          )}
          {price && (
            <span className="ml-auto text-[14px] font-bold tabular-nums" style={{ color: cat.color }}>
              {price}
            </span>
          )}
        </div>

        {service.discountLabel && (
          <div className="mt-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-3 py-1 text-[10px] font-bold text-white shadow-sm">
              <IcoTag />{service.discountLabel}
            </span>
          </div>
        )}
      </div>

      {service.type === "SHOP" && service.matchedProduct && <div className="mx-4 mb-3"><ProductRow product={service.matchedProduct} /></div>}

      <div className="flex gap-2.5 border-t px-4 py-3" style={{ borderColor: cat.color + "18" }}>
        <CtaBtn service={service} expand />
        {service.phone && service.type !== "PARK" && <CallBtn phone={service.phone} expand />}
      </div>
    </article>
  );
}

/* ═══ Mobile Map Bottom Carousel ════════════════════════════════ */
function MapBottomCard({ services, selectedId, onSelect }: { services: MapServicePoint[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedId || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-card-id="${selectedId}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selectedId]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0" style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}>
      <div
        ref={scrollRef}
        className="pointer-events-auto flex gap-2.5 overflow-x-auto px-3 pb-1"
        style={{ scrollbarWidth: "none", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
      >
        {services.map((s) => {
          const cat = catFor(s.type);
          const active = selectedId === s.id;
          const href = serviceHref(s);
          return (
            <div
              key={s.id}
              data-card-id={s.id}
              onClick={() => onSelect(s.id)}
              className={`flex w-[260px] shrink-0 cursor-pointer items-center gap-3 rounded-2xl bg-white px-3.5 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all ${active ? "ring-2" : "ring-1 ring-black/5"}`}
              style={{ scrollSnapAlign: "center", ...(active ? { ringColor: cat.color, boxShadow: `0 4px 20px rgba(0,0,0,0.15), 0 0 0 2px ${cat.color}` } : {}) }}
            >
              <Avatar service={s} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-slate-800">{s.name}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-px text-[9px] font-bold" style={{ backgroundColor: cat.color + "18", color: cat.color }}>
                    {typeLabel(s.type)}
                  </span>
                  {s.distanceKm !== null && <span className="text-[10px] font-semibold text-blue-600">{s.distanceKm.toFixed(1)} km</span>}
                  {s.rating !== null && <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500"><IcoStar />{s.rating.toFixed(1)}</span>}
                </div>
              </div>
              {href && (
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  {s.type === "PARK"
                    ? <a href={href} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-xl text-white" style={{ backgroundColor: cat.color }}><IcoNav /></a>
                    : <Link href={href} className="flex h-8 w-8 items-center justify-center rounded-xl text-white" style={{ backgroundColor: cat.color }}><IcoChevR /></Link>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══ Category Grid (mobile: wrap, desktop: scroll) ══════════════ */
function CategoryBar({ selected, onSelect, wrap = false }: { selected: MapServiceType | null; onSelect: (t: MapServiceType | null) => void; wrap?: boolean }) {
  return (
    <div className={wrap ? "flex flex-wrap gap-2 px-4 py-3" : "flex gap-2 overflow-x-auto px-4 py-3"} style={wrap ? undefined : { scrollbarWidth: "none" }}>
      {CATS.map((cat) => {
        const active = cat.type ? selected === cat.type : selected === null;
        const Icon = cat.icon;
        return (
          <button key={cat.label} onClick={() => onSelect(cat.type ?? null)}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[12px] font-bold transition-all active:scale-95 ${wrap ? "" : "shrink-0"} ${
              active
                ? `${cat.bg} ${cat.text} shadow-md`
                : `${cat.lightBg} ${cat.lightText} ring-1 ring-black/5`
            }`}>
            <Icon />{cat.label}
          </button>
        );
      })}
    </div>
  );
}

/* ═══ Page ════════════════════════════════════════════════════════ */
export default function ExplorePage() {
  const params = useSearchParams();
  const typingText = useTypingPlaceholder();
  const userLocation = useUserLocation();

  const [search, setSearch] = useState(params.get("q") ?? "");
  const [inputValue, setInputValue] = useState(params.get("q") ?? "");
  const [inputFocused, setInputFocused] = useState(false);
  const [selectedType, setSelectedType] = useState<MapServiceType | null>(null);
  const [openNow, setOpenNow] = useState(false);
  const [withDiscount, setWithDiscount] = useState(params.get("withDiscount") === "1");
  const [services, setServices] = useState<MapServicePoint[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"map" | "list">("map");
  const [retryKey, setRetryKey] = useState(0);
  const [resultKey, setResultKey] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true); setError(null);
    void listMapServices({ q: search || undefined, types: selectedType ? [selectedType] : undefined, openNow, withDiscount, lat: userLocation?.lat, lng: userLocation?.lng, radiusKm: 15, sortBy: "distance", limit: 100 })
      .then((r) => { if (!ctrl.signal.aborted) { setServices(r.items.filter((s) => s.type !== "LOST_PET")); setSelectedId(null); setResultKey((k) => k + 1); } })
      .catch((e) => { if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : "Error"); })
      .finally(() => { if (!ctrl.signal.aborted) setIsLoading(false); });
    return () => ctrl.abort();
  }, [search, selectedType, openNow, withDiscount, retryKey, userLocation]);

  useEffect(() => {
    if (selectedId && listRef.current) listRef.current.querySelector(`[data-id="${selectedId}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  const submitSearch = (e: React.FormEvent) => { e.preventDefault(); setSearch(inputValue.trim()); inputRef.current?.blur(); };
  const clearSearch = () => { setInputValue(""); setSearch(""); };
  const activeFilters = [openNow, withDiscount, selectedType !== null, !!search].filter(Boolean).length;

  /* ─ Search bar ─ */
  const SearchInput = (
    <form onSubmit={submitSearch}>
      <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all ${inputFocused ? "border-teal-300 bg-white shadow-[0_0_0_3px_rgba(13,148,136,0.10)]" : "border-slate-200 bg-white shadow-sm"}`}>
        <span className={`shrink-0 ${inputFocused ? "text-teal-600" : "text-slate-400"}`}><IcoSearch /></span>
        <input ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)}
          placeholder={inputFocused ? "Buscar lugares, marcas, productos..." : typingText}
          className="min-w-0 flex-1 bg-transparent text-[14px] text-slate-800 outline-none placeholder:text-slate-400" />
        {inputValue && <button type="button" onClick={clearSearch} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300"><IcoX /></button>}
      </div>
    </form>
  );

  /* ─ Filter pills ─ */
  const Filters = (
    <div className="flex items-center gap-2 overflow-x-auto px-4 pb-3" style={{ scrollbarWidth: "none" }}>
      <button onClick={() => setOpenNow((v) => !v)}
        className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[12px] font-bold transition-all active:scale-95 ${openNow ? "bg-emerald-500 text-white shadow-md" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"}`}>
        <span className={`h-2 w-2 rounded-full ${openNow ? "bg-white animate-pulse" : "bg-emerald-400"}`} />Abierto ahora
      </button>
      <button onClick={() => setWithDiscount((v) => !v)}
        className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[12px] font-bold transition-all active:scale-95 ${withDiscount ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md" : "bg-red-50 text-red-600 ring-1 ring-red-100"}`}>
        <IcoTag />Con descuento
      </button>
      {activeFilters > 0 && <button onClick={() => { setOpenNow(false); setWithDiscount(false); setSelectedType(null); clearSearch(); }}
        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2.5 text-[12px] font-bold text-slate-500 hover:bg-slate-200 active:scale-95">Limpiar <IcoX /></button>}
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes exploreCardIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        .explore-card { animation: exploreCardIn .22s ease both }
        @media (max-width:1023px) { .mapboxgl-ctrl-bottom-left,.mapboxgl-ctrl-bottom-right { margin-bottom:calc(5.5rem + env(safe-area-inset-bottom)) } }
        .mapboxgl-ctrl-group { border-radius:12px!important; box-shadow:0 2px 8px rgba(0,0,0,.08)!important; border:1px solid rgba(0,0,0,.06)!important; overflow:hidden }
        .mapboxgl-ctrl-group button { width:36px!important; height:36px!important }
      `}</style>

      <div className="flex flex-1 w-full overflow-hidden bg-white">

        {/* ── Desktop Sidebar ──────────────────────────────── */}
        <aside className="hidden w-[380px] shrink-0 flex-col overflow-hidden border-r border-slate-200 lg:flex">
          <div className="flex flex-1 flex-col bg-white overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100">
              <div className="px-4 pt-4 pb-2">{SearchInput}</div>
              <CategoryBar selected={selectedType} onSelect={setSelectedType} />
              {Filters}
              <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100">
                <span className="text-[12px] font-semibold text-slate-400">{isLoading ? "Buscando..." : `${services.length} resultado${services.length !== 1 ? "s" : ""}`}</span>
                {activeFilters > 0 && <button onClick={() => { setOpenNow(false); setWithDiscount(false); setSelectedType(null); clearSearch(); }} className="text-[11px] font-semibold text-blue-500 hover:text-blue-600">Limpiar filtros</button>}
              </div>
            </div>
            {/* List */}
            <div ref={listRef} className="flex-1 overflow-y-auto">
              {isLoading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)
                : error ? <ErrorView onRetry={() => setRetryKey((k) => k + 1)} />
                : services.length === 0 ? <Empty query={search} onClear={clearSearch} />
                : <div key={resultKey}>{services.map((s, i) => <div key={s.id} data-id={s.id}><DesktopCard service={s} selected={selectedId === s.id} onSelect={() => setSelectedId(s.id)} i={i} /></div>)}</div>}
            </div>
          </div>
        </aside>

        {/* ── Mobile ───────────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden lg:hidden">
          <div className="shrink-0 border-b border-slate-100" style={{ background: "linear-gradient(180deg, #f8fafb 0%, #ffffff 100%)" }}>
            <div className="px-4 pt-4 pb-2">{SearchInput}</div>
            <CategoryBar selected={selectedType} onSelect={setSelectedType} wrap />
            {Filters}
            {/* Tabs */}
            <div className="flex border-t border-slate-100">
              {(["map", "list"] as const).map((tab) => (
                <button key={tab} onClick={() => setMobileTab(tab)}
                  className={`relative flex flex-1 items-center justify-center gap-2 py-3 text-[13px] font-bold transition-colors ${mobileTab === tab ? "text-slate-800" : "text-slate-400"}`}>
                  {tab === "map" ? <><IcoMap /> Mapa</> : <><IcoList /> Lista {!isLoading && services.length > 0 && <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: selectedType ? catFor(selectedType).color + "18" : "#f1f5f9", color: selectedType ? catFor(selectedType).color : "#64748b" }}>{services.length}</span>}</>}
                  {mobileTab === tab && <span className="absolute bottom-0 left-[15%] right-[15%] h-[3px] rounded-full" style={{ backgroundColor: selectedType ? catFor(selectedType).color : "#0d9488" }} />}
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            {mobileTab === "map" ? (
              <MapCanvas accessToken={MAPBOX_TOKEN} points={services} selectedPointId={selectedId} onSelectPoint={setSelectedId} userLocation={userLocation} center={userLocation} className="flex-1 min-h-[56vh]" borderless minZoom={8} maxZoom={17} />
            ) : (
              <div className="flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))]" style={{ background: "linear-gradient(180deg, #f1f5f9 0%, #f8fafc 100%)" }}>
                {!isLoading && !error && services.length > 0 && (
                  <div className="flex items-center gap-2 px-5 py-3">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: selectedType ? catFor(selectedType).color : "#0d9488" }} />
                    <span className="text-[12px] font-bold text-slate-500">
                      {services.length} resultado{services.length !== 1 ? "s" : ""}{search ? ` para "${search}"` : ""}
                    </span>
                  </div>
                )}
                {isLoading ? <div className="pt-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="mx-4 mb-3.5 rounded-[1.25rem] bg-white shadow-sm overflow-hidden"><Skeleton /></div>)}</div>
                  : error ? <ErrorView onRetry={() => setRetryKey((k) => k + 1)} />
                  : services.length === 0 ? <Empty query={search} onClear={clearSearch} />
                  : <div key={resultKey} className="pt-1">{services.map((s, i) => <div key={s.id} data-id={s.id}><MobileCard service={s} onSelect={() => setSelectedId(s.id)} i={i} /></div>)}</div>}
              </div>
            )}
            {mobileTab === "map" && services.length > 0 && <MapBottomCard services={services} selectedId={selectedId} onSelect={setSelectedId} />}
          </div>
        </div>

        {/* ── Desktop Map ──────────────────────────────────── */}
        <div className="relative hidden flex-1 overflow-hidden lg:block">
          <MapCanvas accessToken={MAPBOX_TOKEN} points={services} selectedPointId={selectedId} onSelectPoint={setSelectedId} userLocation={userLocation} center={userLocation} className="h-full w-full" borderless minZoom={8} maxZoom={17} />
          {!isLoading && services.length > 0 && (
            <div className="pointer-events-none absolute left-4 top-4 z-10">
              <div className="rounded-xl bg-white/95 px-4 py-2 text-[12px] font-semibold text-slate-700 shadow-md ring-1 ring-black/5 backdrop-blur-sm">
                {services.length} resultado{services.length !== 1 ? "s" : ""} en el área
              </div>
            </div>
          )}
          {isLoading && (
            <div className="pointer-events-none absolute left-4 top-4 z-10">
              <div className="flex items-center gap-2 rounded-xl bg-white/95 px-4 py-2 text-[12px] font-semibold text-slate-700 shadow-md ring-1 ring-black/5 backdrop-blur-sm">
                <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />Buscando...
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

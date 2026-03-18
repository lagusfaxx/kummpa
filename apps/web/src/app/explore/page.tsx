"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapCanvas } from "@/components/map/map-canvas";
import { listMapServices } from "@/features/map/map-api";
import type { MapServicePoint, MapServiceType } from "@/features/map/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/* ─── Category definitions ───────────────────────────────────── */
type Category = {
  label: string;
  type?: MapServiceType;
  dot: string;
  activeCls: string;
};

const CATEGORIES: Category[] = [
  { label: "Todo",        dot: "#475569", activeCls: "bg-slate-800 text-white"   },
  { label: "Veterinarias",type: "VET",       dot: "#0f766e", activeCls: "bg-teal-700 text-white"   },
  { label: "Peluquerías", type: "GROOMING",  dot: "#be185d", activeCls: "bg-pink-700 text-white"   },
  { label: "Paseos",      type: "CAREGIVER", dot: "#0369a1", activeCls: "bg-blue-700 text-white"   },
  { label: "Tiendas",     type: "SHOP",      dot: "#b45309", activeCls: "bg-amber-700 text-white"  },
  { label: "Hoteles",     type: "HOTEL",     dot: "#6d28d9", activeCls: "bg-violet-700 text-white" },
  { label: "Parques",     type: "PARK",      dot: "#15803d", activeCls: "bg-green-700 text-white"  },
];

const INACTIVE_CLS = "bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700";

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

/* ─── Icons ──────────────────────────────────────────────────── */
function IcoSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px] shrink-0">
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

/* ─── Skeleton ────────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-100" />
      <div className="flex-1 space-y-1.5">
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
        <button
          onClick={onClear}
          className="mt-5 rounded-full bg-slate-100 px-5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
        >
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
      <button
        onClick={onRetry}
        className="mt-5 rounded-full bg-slate-100 px-5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
      >
        Intentar de nuevo
      </button>
    </div>
  );
}

/* ─── Service card ────────────────────────────────────────────── */
function ServiceCard({
  service, selected, onSelect
}: {
  service: MapServicePoint;
  selected: boolean;
  onSelect: () => void;
}) {
  const cat = categoryFor(service.type);
  const price = priceText(service);

  return (
    <article
      onClick={onSelect}
      className={`relative cursor-pointer transition-all duration-150 ${
        selected
          ? "bg-white shadow-[0_2px_16px_-2px_rgba(0,0,0,0.10)]"
          : "hover:bg-slate-50/70"
      }`}
    >
      {/* Left accent bar on selected */}
      {selected && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full"
          style={{ backgroundColor: cat.dot }}
        />
      )}

      {/* Card body */}
      <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3">
        {/* Avatar */}
        <div
          className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-bold text-white"
          style={{ backgroundColor: service.imageUrl ? "transparent" : cat.dot }}
        >
          {service.imageUrl ? (
            <img src={service.imageUrl} alt={service.name} className="h-full w-full object-cover" />
          ) : (
            service.name.slice(0, 1)
          )}
          {service.isEmergency24x7 && (
            <span className="absolute bottom-0 left-0 right-0 bg-red-600 py-px text-center text-[7px] font-black tracking-wider text-white">
              24/7
            </span>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          {/* Row 1: name + status */}
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[13px] font-semibold leading-tight text-slate-800">
              {service.name}
            </p>
            {service.isOpenNow !== null && (
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                service.isOpenNow
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-100 text-slate-400"
              }`}>
                {service.isOpenNow ? "Abierto" : "Cerrado"}
              </span>
            )}
          </div>

          {/* Row 2: type + location */}
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-400">
            <span
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: cat.dot }}
            />
            {typeLabel(service.type)}
            {(service.district ?? service.address) && (
              <><span className="opacity-40">·</span>{service.district ?? service.address}</>
            )}
          </p>

          {/* Row 3: meta (rating + price + discount + distance) */}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {service.rating !== null && (
              <span className="flex items-center gap-0.5 text-[11px] font-semibold text-amber-500">
                <IcoStar /> {service.rating.toFixed(1)}
              </span>
            )}
            {price && (
              <span className="text-[11px] font-medium text-slate-500">{price}</span>
            )}
            {service.discountLabel && (
              <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[9px] font-bold text-orange-600">
                {service.discountLabel}
              </span>
            )}
            {service.distanceKm !== null && (
              <span className="ml-auto shrink-0 text-[10px] font-medium text-slate-400">
                {service.distanceKm.toFixed(1)} km
              </span>
            )}
          </div>
        </div>

        {/* Right arrow */}
        {!selected && (
          <div className="mt-1 shrink-0 text-slate-300">
            <IcoChev />
          </div>
        )}
      </div>

      {/* Expanded CTAs */}
      {selected && (
        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 pb-3 pl-[68px]">
          {service.bookingUrl && (
            <Link
              href={service.bookingUrl}
              onClick={(e) => e.stopPropagation()}
              className="rounded-full bg-[hsl(var(--primary))] px-4 py-1.5 text-[11px] font-bold text-white transition hover:opacity-90"
            >
              Reservar
            </Link>
          )}
          {service.phone && (
            <a
              href={`tel:${service.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <IcoPhone /> Llamar
            </a>
          )}
          {service.profileUrl && (
            <Link
              href={service.profileUrl}
              onClick={(e) => e.stopPropagation()}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ver ficha
            </Link>
          )}
        </div>
      )}
    </article>
  );
}

/* ─── Category strip ──────────────────────────────────────────── */
function CategoryStrip({
  selectedType, onSelect
}: {
  selectedType: MapServiceType | null;
  onSelect: (t: MapServiceType | null) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      {CATEGORIES.map((cat) => {
        const active = cat.type ? selectedType === cat.type : selectedType === null;
        return (
          <button
            key={cat.label}
            type="button"
            onClick={() => onSelect(cat.type ?? null)}
            className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
              active ? cat.activeCls + " shadow-sm" : INACTIVE_CLS
            }`}
          >
            {!active && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: cat.dot }}
              />
            )}
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────── */
export default function ExplorePage() {
  const params = useSearchParams();

  const [search, setSearch]             = useState(params.get("q") ?? "");
  const [inputValue, setInputValue]     = useState(params.get("q") ?? "");
  const [selectedType, setSelectedType] = useState<MapServiceType | null>(null);
  const [openNow, setOpenNow]           = useState(false);
  const [withDiscount, setWithDiscount] = useState(params.get("withDiscount") === "1");
  const [services, setServices]         = useState<MapServicePoint[]>([]);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [mobileTab, setMobileTab]       = useState<"map" | "list">("map");
  const [retryKey, setRetryKey]         = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

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
  }

  function clearSearch() {
    setInputValue("");
    setSearch("");
  }

  /* Active filter count */
  const activeFilters = [openNow, withDiscount, selectedType !== null].filter(Boolean).length;

  /* ─── Panel ─────────────────────────────────────────────────── */
  const Panel = (
    <div className="flex h-full flex-col bg-white">

      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm">

        {/* Search row */}
        <div className="px-4 pt-4 pb-3">
          <form onSubmit={submitSearch}>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400">
                <IcoSearch />
              </span>
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Veterinarias, peluquerías, parques..."
                className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-[13px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[hsl(var(--secondary)/0.5)] focus:bg-white focus:shadow-[0_0_0_3px_hsl(var(--secondary)/0.08)]"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 text-white transition hover:bg-slate-400"
                >
                  <IcoX />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Quick filters */}
        <div className="flex items-center gap-1.5 px-4 pb-3">
          <button
            onClick={() => setOpenNow((v) => !v)}
            className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
              openNow ? "bg-emerald-600 text-white shadow-sm" : INACTIVE_CLS
            }`}
          >
            {openNow && <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/70" />}
            Abierto ahora
          </button>
          <button
            onClick={() => setWithDiscount((v) => !v)}
            className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
              withDiscount ? "bg-orange-600 text-white shadow-sm" : INACTIVE_CLS
            }`}
          >
            {withDiscount && <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/70" />}
            Con descuento
          </button>
        </div>

        {/* Categories */}
        <div className="px-4 pb-3">
          <CategoryStrip selectedType={selectedType} onSelect={setSelectedType} />
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2">
          <span className="text-[11px] font-semibold text-slate-400">
            {isLoading
              ? "Buscando..."
              : error
              ? "Sin resultados"
              : `${services.length} lugar${services.length !== 1 ? "es" : ""}`}
          </span>
          <div className="flex items-center gap-2">
            {activeFilters > 0 && (
              <button
                onClick={() => { setOpenNow(false); setWithDiscount(false); setSelectedType(null); clearSearch(); }}
                className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 transition hover:bg-slate-200"
              >
                Limpiar ({activeFilters}) <IcoX />
              </button>
            )}
            {search && (
              <span className="max-w-[100px] truncate rounded-full bg-[hsl(var(--primary)/0.08)] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--primary))]">
                «{search}»
              </span>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)
        ) : error ? (
          <ErrorState onRetry={() => setRetryKey((k) => k + 1)} />
        ) : services.length === 0 ? (
          <EmptyState query={search} onClear={clearSearch} />
        ) : (
          services.map((s) => (
            <div key={s.id} data-id={s.id}>
              <ServiceCard
                service={s}
                selected={selectedId === s.id}
                onSelect={() => setSelectedId(s.id)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );

  /* ─── Layout ─────────────────────────────────────────────────── */
  return (
    <div className="flex h-full w-full overflow-hidden">

      {/* Desktop sidebar */}
      <aside className="hidden w-[360px] shrink-0 flex-col overflow-hidden border-r border-slate-200 shadow-[4px_0_30px_-8px_rgba(0,0,0,0.10)] lg:flex">
        {Panel}
      </aside>

      {/* Mobile */}
      <div className="flex flex-1 flex-col overflow-hidden lg:hidden">

        {/* Mobile sticky header */}
        <div className="border-b border-slate-200 bg-white/95 backdrop-blur-sm">
          <div className="px-3 pt-3 pb-2">
            <form onSubmit={submitSearch} className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <IcoSearch />
              </span>
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Veterinarias, peluquerías, parques..."
                className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-[13px] outline-none focus:border-[hsl(var(--secondary)/0.5)] focus:bg-white"
              />
              {inputValue && (
                <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 text-white">
                  <IcoX />
                </button>
              )}
            </form>
            <div className="mt-2 flex items-center gap-1.5">
              <button
                onClick={() => setOpenNow((v) => !v)}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${openNow ? "bg-emerald-600 text-white" : INACTIVE_CLS}`}
              >
                Abierto ahora
              </button>
              <button
                onClick={() => setWithDiscount((v) => !v)}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${withDiscount ? "bg-orange-600 text-white" : INACTIVE_CLS}`}
              >
                Con descuento
              </button>
            </div>
            <div className="mt-2">
              <CategoryStrip selectedType={selectedType} onSelect={setSelectedType} />
            </div>
          </div>

          {/* Segmented tabs */}
          <div className="mx-3 mb-3 flex overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-0.5">
            {(["map", "list"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-[10px] py-1.5 text-xs font-semibold transition-all ${
                  mobileTab === tab
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                {tab === "map" ? <><IcoMapTab /> Mapa</> : <><IcoListTab /> Lista {!isLoading && `(${services.length})`}</>}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile content */}
        <div className="relative flex-1 overflow-hidden">
          {mobileTab === "map" ? (
            <MapCanvas
              accessToken={MAPBOX_TOKEN}
              points={services}
              selectedPointId={selectedId}
              onSelectPoint={(id) => { setSelectedId(id); setMobileTab("list"); }}
              className="h-full w-full"
              borderless
            />
          ) : (
            <div className="h-full overflow-y-auto bg-white">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                : error
                ? <ErrorState onRetry={() => setRetryKey((k) => k + 1)} />
                : services.length === 0
                ? <EmptyState query={search} onClear={clearSearch} />
                : services.map((s) => (
                    <div key={s.id} data-id={s.id}>
                      <ServiceCard service={s} selected={selectedId === s.id} onSelect={() => setSelectedId(s.id)} />
                    </div>
                  ))
              }
            </div>
          )}

          {/* Mobile bottom sheet */}
          {mobileTab === "map" && selectedService && (
            <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white px-5 pt-3 pb-safe-bottom shadow-[0_-8px_40px_-4px_rgba(0,0,0,0.15)]">
              {/* Drag handle */}
              <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-slate-200" />
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-base font-bold text-white"
                  style={{ backgroundColor: categoryFor(selectedService.type).dot }}
                >
                  {selectedService.imageUrl
                    ? <img src={selectedService.imageUrl} alt="" className="h-full w-full object-cover" />
                    : selectedService.name.slice(0, 1)
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-slate-800">{selectedService.name}</p>
                  <p className="mt-0.5 text-[12px] text-slate-400">
                    {typeLabel(selectedService.type)}
                    {selectedService.distanceKm !== null && <> · {selectedService.distanceKm.toFixed(1)} km</>}
                    {priceText(selectedService) && <> · {priceText(selectedService)}</>}
                  </p>
                </div>
                {selectedService.isOpenNow !== null && (
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                    selectedService.isOpenNow ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {selectedService.isOpenNow ? "Abierto" : "Cerrado"}
                  </span>
                )}
              </div>
              <div className="mt-4 flex gap-2 pb-2">
                {selectedService.bookingUrl && (
                  <Link href={selectedService.bookingUrl} className="flex-1 rounded-2xl bg-[hsl(var(--primary))] py-3 text-center text-[13px] font-bold text-white">
                    Reservar
                  </Link>
                )}
                {selectedService.phone && (
                  <a href={`tel:${selectedService.phone}`} className="flex-1 rounded-2xl border border-slate-200 py-3 text-center text-[13px] font-semibold text-slate-700">
                    Llamar
                  </a>
                )}
                <button onClick={() => setMobileTab("list")} className="rounded-2xl border border-slate-200 px-5 py-3 text-[13px] font-semibold text-slate-700">
                  Lista
                </button>
              </div>
            </div>
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

        {/* Floating badge */}
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
  );
}

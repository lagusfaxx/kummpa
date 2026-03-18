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
  activeBg: string;
  activeText: string;
};

const CATEGORIES: Category[] = [
  { label: "Todo",         dot: "#64748b", activeBg: "bg-slate-700",   activeText: "text-white" },
  { label: "Vets",         type: "VET",       dot: "#0f766e", activeBg: "bg-teal-700",   activeText: "text-white" },
  { label: "Peluquerías",  type: "GROOMING",  dot: "#be185d", activeBg: "bg-pink-700",   activeText: "text-white" },
  { label: "Paseos",       type: "CAREGIVER", dot: "#0369a1", activeBg: "bg-blue-700",   activeText: "text-white" },
  { label: "Tiendas",      type: "SHOP",      dot: "#b45309", activeBg: "bg-amber-700",  activeText: "text-white" },
  { label: "Hoteles",      type: "HOTEL",     dot: "#6d28d9", activeBg: "bg-violet-700", activeText: "text-white" },
  { label: "Parques",      type: "PARK",      dot: "#15803d", activeBg: "bg-green-700",  activeText: "text-white" },
];

/* ─── Helpers ─────────────────────────────────────────────────── */
function typeLabel(type: MapServiceType): string {
  const map: Record<MapServiceType, string> = {
    VET: "Veterinaria", CAREGIVER: "Paseador", SHOP: "Pet shop",
    GROOMING: "Peluquería", HOTEL: "Hotel", PARK: "Parque", LOST_PET: "Alerta"
  };
  return map[type] ?? type;
}

function priceText(s: MapServicePoint): string {
  if (s.priceFrom) return `Desde $${s.priceFrom.toLocaleString("es-CL")}`;
  return s.priceInfo[0] ?? "";
}

function categoryFor(type: MapServiceType): Category {
  return CATEGORIES.find((c) => c.type === type) ?? CATEGORIES[0]!;
}

/* ─── SVG icons ───────────────────────────────────────────────── */
function IcoSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function IcoX() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
function IcoMap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
      <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  );
}
function IcoList() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  );
}
function IcoStar() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="h-3 w-3">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}
function IcoPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l.98-.98a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  );
}
function IcoChevRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

/* ─── Loading skeleton ────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="flex gap-3 px-4 py-3.5 border-b border-[hsl(var(--border)/0.4)]">
      <div className="h-14 w-14 shrink-0 animate-pulse rounded-2xl bg-[hsl(var(--muted))]" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="h-3.5 animate-pulse rounded-full bg-[hsl(var(--muted))] w-2/3" />
        <div className="h-2.5 animate-pulse rounded-full bg-[hsl(var(--muted))] w-1/2" />
        <div className="h-2.5 animate-pulse rounded-full bg-[hsl(var(--muted))] w-1/3" />
      </div>
    </div>
  );
}

/* ─── Empty state ─────────────────────────────────────────────── */
function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--muted))]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-[hsl(var(--muted-foreground)/0.5)]">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          <line x1="11" y1="8" x2="11" y2="14"/>
          <line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
      </div>
      <p className="font-semibold text-[hsl(var(--foreground))]">
        {query ? `Sin resultados para "${query}"` : "No hay resultados"}
      </p>
      <p className="mt-1.5 max-w-[200px] text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
        Prueba otra categoría o amplía tu búsqueda
      </p>
    </div>
  );
}

/* ─── Error state ─────────────────────────────────────────────── */
function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-red-400">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <p className="font-semibold">No pudimos cargar los resultados</p>
      <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">Verifica tu conexión e intenta de nuevo</p>
    </div>
  );
}

/* ─── Result card ─────────────────────────────────────────────── */
function ServiceCard({
  service,
  selected,
  onSelect
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
      className={`cursor-pointer border-b border-[hsl(var(--border)/0.5)] px-4 py-3.5 transition-all ${
        selected
          ? "bg-white shadow-[0_1px_8px_hsl(var(--foreground)/0.06)]"
          : "hover:bg-white/70"
      }`}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div
          className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-lg font-bold text-white"
          style={{ backgroundColor: service.imageUrl ? "transparent" : cat.dot }}
        >
          {service.imageUrl ? (
            <img src={service.imageUrl} alt={service.name} className="h-full w-full object-cover" />
          ) : (
            <span>{service.name.slice(0, 1)}</span>
          )}
          {service.isEmergency24x7 && (
            <span className="absolute bottom-0 left-0 right-0 bg-red-600 py-0.5 text-center text-[8px] font-bold text-white tracking-wide">
              24/7
            </span>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[0.875rem] font-semibold leading-snug">{service.name}</p>
            {service.isOpenNow !== null && (
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                service.isOpenNow
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}>
                {service.isOpenNow ? "Abierto" : "Cerrado"}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))]">
            <span
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: cat.dot }}
            />
            <span>{typeLabel(service.type)}</span>
            {(service.address || service.district) && (
              <>
                <span className="opacity-40">·</span>
                <span className="truncate">{service.district ?? service.address}</span>
              </>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {service.distanceKm !== null && (
              <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
                {service.distanceKm.toFixed(1)} km
              </span>
            )}
            {price && (
              <span className="text-[11px] font-semibold text-[hsl(var(--foreground)/0.7)]">{price}</span>
            )}
            {service.rating !== null && (
              <span className="flex items-center gap-0.5 text-[11px] font-semibold text-amber-500">
                <IcoStar /> {service.rating.toFixed(1)}
              </span>
            )}
            {service.discountLabel && (
              <span className="rounded-full bg-[hsl(var(--accent)/0.12)] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--accent))]">
                {service.discountLabel}
              </span>
            )}
          </div>
        </div>

        {/* Chevron (not selected) */}
        {!selected && (
          <div className="flex shrink-0 items-center self-center text-[hsl(var(--muted-foreground)/0.4)]">
            <IcoChevRight />
          </div>
        )}
      </div>

      {/* Expanded CTAs */}
      {selected && (
        <div className="mt-3 flex flex-wrap gap-2 pl-[68px]">
          {service.bookingUrl && (
            <Link
              href={service.bookingUrl}
              onClick={(e) => e.stopPropagation()}
              className="rounded-full bg-[hsl(var(--primary))] px-4 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:opacity-90"
            >
              Reservar
            </Link>
          )}
          {service.phone && (
            <a
              href={`tel:${service.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-white px-3.5 py-1.5 text-[11px] font-semibold shadow-sm transition hover:bg-[hsl(var(--muted))]"
            >
              <IcoPhone /> Llamar
            </a>
          )}
          {service.profileUrl && (
            <Link
              href={service.profileUrl}
              onClick={(e) => e.stopPropagation()}
              className="rounded-full border border-[hsl(var(--border))] bg-white px-3.5 py-1.5 text-[11px] font-semibold shadow-sm transition hover:bg-[hsl(var(--muted))]"
            >
              Ver ficha
            </Link>
          )}
        </div>
      )}
    </article>
  );
}

/* ─── Category pills strip ────────────────────────────────────── */
function CategoryStrip({
  selectedType,
  onSelect
}: {
  selectedType: MapServiceType | null;
  onSelect: (t: MapServiceType | null) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
      {CATEGORIES.map((cat) => {
        const active = cat.type ? selectedType === cat.type : selectedType === null;
        return (
          <button
            key={cat.label}
            type="button"
            onClick={() => onSelect(cat.type ?? null)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
              active
                ? `${cat.activeBg} ${cat.activeText} shadow-sm`
                : "bg-white border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--secondary)/0.3)] hover:text-[hsl(var(--foreground))]"
            }`}
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${active ? "bg-white/60" : ""}`}
              style={active ? {} : { backgroundColor: cat.dot }}
            />
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────── */
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
  const listRef = useRef<HTMLDivElement>(null);

  /* fetch */
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
        setError(err instanceof Error ? err.message : "Error desconocido");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setIsLoading(false);
      });

    return () => ctrl.abort();
  }, [search, selectedType, openNow, withDiscount]);

  /* scroll to selected card */
  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-id="${selectedId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

  /* ── Sidebar panel ───────────────────────────────────────────── */
  const Sidebar = (
    <div className="flex h-full flex-col bg-[hsl(var(--background))]">

      {/* Sticky header: search + categories */}
      <div className="sticky top-0 z-10 border-b border-[hsl(var(--border)/0.6)] bg-[hsl(var(--background)/0.96)] backdrop-blur-md">

        {/* Panel title */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div>
            <h1 className="text-base font-bold">Explorar</h1>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
              Servicios y lugares cerca de ti
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(openNow || withDiscount) && (
              <span className="rounded-full bg-[hsl(var(--secondary)/0.12)] px-2.5 py-0.5 text-[10px] font-bold text-[hsl(var(--secondary))]">
                Filtros activos
              </span>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-3">
          <form onSubmit={submitSearch}>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-[hsl(var(--muted-foreground)/0.6)]">
                <IcoSearch />
              </span>
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Veterinarias, peluquerías, parques..."
                className="h-11 w-full rounded-2xl border border-[hsl(var(--border))] bg-white pl-10 pr-10 text-sm shadow-sm outline-none transition focus:border-[hsl(var(--secondary)/0.5)] focus:shadow-md"
              />
              {inputValue ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3.5 rounded-full p-0.5 text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
                >
                  <IcoX />
                </button>
              ) : null}
            </div>
          </form>
        </div>

        {/* Quick filters */}
        <div className="flex items-center gap-2 px-4 pb-3">
          <button
            type="button"
            onClick={() => setOpenNow((v) => !v)}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
              openNow
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm"
                : "border-[hsl(var(--border))] bg-white text-[hsl(var(--muted-foreground))] hover:bg-white/80"
            }`}
          >
            Abierto ahora
          </button>
          <button
            type="button"
            onClick={() => setWithDiscount((v) => !v)}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
              withDiscount
                ? "border-orange-300 bg-orange-50 text-orange-800 shadow-sm"
                : "border-[hsl(var(--border))] bg-white text-[hsl(var(--muted-foreground))] hover:bg-white/80"
            }`}
          >
            Con descuento
          </button>
        </div>

        {/* Category strip */}
        <div className="px-4 pb-3">
          <CategoryStrip selectedType={selectedType} onSelect={setSelectedType} />
        </div>
      </div>

      {/* Results count bar */}
      <div className="flex items-center justify-between border-b border-[hsl(var(--border)/0.4)] px-5 py-2.5">
        <p className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
          {isLoading
            ? "Buscando..."
            : error
            ? "No se pudieron cargar"
            : `${services.length} lugar${services.length !== 1 ? "es" : ""} encontrado${services.length !== 1 ? "s" : ""}`}
        </p>
        {search && !isLoading && (
          <button
            onClick={clearSearch}
            className="flex items-center gap-1 rounded-full bg-[hsl(var(--primary)/0.08)] px-2.5 py-0.5 text-[10px] font-bold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.14)] transition"
          >
            «{search}» <IcoX />
          </button>
        )}
      </div>

      {/* Results list */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
          </>
        ) : error ? (
          <ErrorState />
        ) : services.length === 0 ? (
          <EmptyState query={search} />
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

  /* ── Layout ── */
  return (
    <div className="flex h-full w-full overflow-hidden">

      {/* Desktop sidebar */}
      <aside className="hidden w-[380px] shrink-0 flex-col overflow-hidden border-r border-[hsl(var(--border)/0.6)] shadow-[1px_0_8px_hsl(var(--foreground)/0.04)] lg:flex">
        {Sidebar}
      </aside>

      {/* Mobile: tabs + content */}
      <div className="flex flex-1 flex-col overflow-hidden lg:hidden">

        {/* Mobile sticky header */}
        <div className="border-b border-[hsl(var(--border)/0.6)] bg-[hsl(var(--background)/0.96)] backdrop-blur-md">
          <div className="p-3 pb-2">
            <form onSubmit={submitSearch} className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground)/0.6)]">
                <IcoSearch />
              </span>
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Veterinarias, peluquerías, parques..."
                className="h-11 w-full rounded-2xl border border-[hsl(var(--border))] bg-white pl-10 pr-10 text-sm shadow-sm outline-none focus:border-[hsl(var(--secondary)/0.5)]"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
                >
                  <IcoX />
                </button>
              )}
            </form>

            {/* Mobile quick filters */}
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpenNow((v) => !v)}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                  openNow ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-[hsl(var(--border))] bg-white text-[hsl(var(--muted-foreground))]"
                }`}
              >
                Abierto ahora
              </button>
              <button
                type="button"
                onClick={() => setWithDiscount((v) => !v)}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                  withDiscount ? "border-orange-300 bg-orange-50 text-orange-800" : "border-[hsl(var(--border))] bg-white text-[hsl(var(--muted-foreground))]"
                }`}
              >
                Con descuento
              </button>
            </div>

            {/* Mobile category strip */}
            <div className="mt-2">
              <CategoryStrip selectedType={selectedType} onSelect={setSelectedType} />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-t border-[hsl(var(--border)/0.5)]">
            {(["map", "list"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMobileTab(tab)}
                className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition ${
                  mobileTab === tab
                    ? "border-b-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                    : "text-[hsl(var(--muted-foreground))]"
                }`}
              >
                {tab === "map"
                  ? <><IcoMap /> Mapa</>
                  : <><IcoList /> Lista {!isLoading && `(${services.length})`}</>
                }
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
            <div className="h-full overflow-y-auto">
              {isLoading ? (
                [1,2,3].map((i) => <SkeletonCard key={i} />)
              ) : error ? (
                <ErrorState />
              ) : services.length === 0 ? (
                <EmptyState query={search} />
              ) : (
                services.map((s) => (
                  <div key={s.id} data-id={s.id}>
                    <ServiceCard service={s} selected={selectedId === s.id} onSelect={() => setSelectedId(s.id)} />
                  </div>
                ))
              )}
            </div>
          )}

          {/* Mobile bottom sheet for selected service */}
          {mobileTab === "map" && selectedService && (
            <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t border-[hsl(var(--border)/0.6)] bg-white/96 px-5 pt-4 pb-6 shadow-2xl backdrop-blur-sm">
              {/* Handle */}
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[hsl(var(--border))]" />
              <div className="flex gap-3">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white"
                  style={{ backgroundColor: categoryFor(selectedService.type).dot }}
                >
                  {selectedService.imageUrl
                    ? <img src={selectedService.imageUrl} alt={selectedService.name} className="h-full w-full rounded-2xl object-cover" />
                    : selectedService.name.slice(0, 1)
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{selectedService.name}</p>
                  <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                    {typeLabel(selectedService.type)}
                    {selectedService.distanceKm !== null && <> · {selectedService.distanceKm.toFixed(1)} km</>}
                    {priceText(selectedService) && <> · {priceText(selectedService)}</>}
                  </p>
                </div>
                {selectedService.isOpenNow !== null && (
                  <span className={`shrink-0 self-start rounded-full px-2.5 py-1 text-[10px] font-bold ${
                    selectedService.isOpenNow ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {selectedService.isOpenNow ? "Abierto" : "Cerrado"}
                  </span>
                )}
              </div>
              <div className="mt-4 flex gap-2.5">
                {selectedService.bookingUrl && (
                  <Link href={selectedService.bookingUrl} className="flex-1 rounded-full bg-[hsl(var(--primary))] py-2.5 text-center text-xs font-bold text-white shadow-sm">
                    Reservar
                  </Link>
                )}
                {selectedService.phone && (
                  <a href={`tel:${selectedService.phone}`} className="flex-1 rounded-full border border-[hsl(var(--border))] py-2.5 text-center text-xs font-semibold">
                    Llamar
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setMobileTab("list")}
                  className="rounded-full border border-[hsl(var(--border))] px-5 py-2.5 text-xs font-semibold"
                >
                  Ver lista
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

        {/* Floating result count badge */}
        {!isLoading && services.length > 0 && (
          <div className="pointer-events-none absolute left-4 top-4">
            <div className="rounded-full border border-white/20 bg-black/40 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-sm shadow-lg">
              {services.length} lugar{services.length !== 1 ? "es" : ""} en el mapa
            </div>
          </div>
        )}

        {/* Loading overlay on map */}
        {isLoading && (
          <div className="pointer-events-none absolute left-4 top-4">
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
              <div className="h-2 w-2 animate-ping rounded-full bg-white opacity-75" />
              Buscando...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

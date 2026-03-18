"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapCanvas } from "@/components/map/map-canvas";
import { listMapServices } from "@/features/map/map-api";
import type { MapServicePoint, MapServiceType } from "@/features/map/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/* ─── Category definitions ───────────────────────────────────── */
type Category = { label: string; type?: MapServiceType; color: string; dot: string };

const CATEGORIES: Category[] = [
  { label: "Todo",         color: "bg-slate-100 text-slate-700 border-slate-200",       dot: "#64748b" },
  { label: "Veterinarias", type: "VET",       color: "bg-teal-50 text-teal-800 border-teal-200",        dot: "#0f766e" },
  { label: "Peluquerías",  type: "GROOMING",  color: "bg-pink-50 text-pink-800 border-pink-200",        dot: "#be185d" },
  { label: "Paseos",       type: "CAREGIVER", color: "bg-blue-50 text-blue-800 border-blue-200",        dot: "#0369a1" },
  { label: "Tiendas",      type: "SHOP",      color: "bg-amber-50 text-amber-800 border-amber-200",     dot: "#b45309" },
  { label: "Hoteles",      type: "HOTEL",     color: "bg-violet-50 text-violet-800 border-violet-200",  dot: "#6d28d9" },
  { label: "Parques",      type: "PARK",      color: "bg-green-50 text-green-800 border-green-200",     dot: "#15803d" },
];

/* ─── Helpers ─────────────────────────────────────────────────── */
function typeLabel(type: MapServiceType): string {
  const map: Record<MapServiceType, string> = {
    VET: "Veterinaria", CAREGIVER: "Paseador / cuidador", SHOP: "Tienda",
    GROOMING: "Peluquería", HOTEL: "Hotel", PARK: "Parque", LOST_PET: "Mascota perdida"
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
function IcoSliders() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
      <circle cx="8" cy="6" r="2" fill="currentColor" stroke="none"/>
      <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/>
      <circle cx="10" cy="18" r="2" fill="currentColor" stroke="none"/>
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
      className={`cursor-pointer border-b border-[hsl(var(--border)/0.6)] p-4 transition-colors hover:bg-white/60 ${
        selected ? "bg-white shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="flex gap-3">
        {/* Image or placeholder */}
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[hsl(var(--muted))]">
          {service.imageUrl ? (
            <img src={service.imageUrl} alt={service.name} className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-xl font-bold text-white"
              style={{ backgroundColor: cat.dot }}
            >
              {service.name.slice(0, 1)}
            </div>
          )}
          {service.isEmergency24x7 && (
            <span className="absolute bottom-0 left-0 right-0 bg-red-600 py-0.5 text-center text-[9px] font-bold text-white">24/7</span>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-semibold leading-tight">{service.name}</p>
            {service.isOpenNow !== null && (
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                service.isOpenNow ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
              }`}>
                {service.isOpenNow ? "Abierto" : "Cerrado"}
              </span>
            )}
          </div>

          <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
            <span
              className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle"
              style={{ backgroundColor: cat.dot }}
            />
            {typeLabel(service.type)}
            {(service.address || service.district) && (
              <> · {service.address ?? service.district}</>
            )}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {service.distanceKm !== null && (
              <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                {service.distanceKm.toFixed(1)} km
              </span>
            )}
            {price && (
              <span className="text-[11px] font-medium text-[hsl(var(--foreground)/0.75)]">{price}</span>
            )}
            {service.rating !== null && (
              <span className="flex items-center gap-0.5 text-[11px] text-amber-600">
                <IcoStar /> {service.rating.toFixed(1)}
              </span>
            )}
            {service.discountLabel && (
              <span className="rounded-full bg-[hsl(var(--accent)/0.15)] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--accent))]">
                {service.discountLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action row */}
      {selected && (
        <div className="mt-3 flex flex-wrap gap-2 pl-[76px]">
          {service.bookingUrl && (
            <Link
              href={service.bookingUrl}
              onClick={(e) => e.stopPropagation()}
              className="rounded-full bg-[hsl(var(--primary))] px-3.5 py-1.5 text-[11px] font-bold text-white transition hover:opacity-90"
            >
              Reservar
            </Link>
          )}
          {service.phone && (
            <a
              href={`tel:${service.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-white px-3 py-1.5 text-[11px] font-semibold transition hover:bg-[hsl(var(--muted))]"
            >
              <IcoPhone /> Llamar
            </a>
          )}
          {service.profileUrl && (
            <Link
              href={service.profileUrl}
              onClick={(e) => e.stopPropagation()}
              className="rounded-full border border-[hsl(var(--border))] bg-white px-3 py-1.5 text-[11px] font-semibold transition hover:bg-[hsl(var(--muted))]"
            >
              Ver ficha
            </Link>
          )}
        </div>
      )}
    </article>
  );
}

/* ─── Empty state ─────────────────────────────────────────────── */
function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="text-5xl">🔍</div>
      <p className="mt-4 font-semibold">Sin resultados</p>
      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
        {query ? `No encontramos nada para "${query}".` : "Prueba cambiando la categoría o amplía el radio."}
      </p>
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
  const [showFilters, setShowFilters]   = useState(false);
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
        setError(err instanceof Error ? err.message : "Error al cargar.");
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

  /* ── Sidebar panel ── */
  const Sidebar = (
    <div className="flex h-full flex-col bg-[hsl(var(--background)/0.98)] backdrop-blur-sm">

      {/* Search bar */}
      <div className="border-b border-[hsl(var(--border)/0.7)] p-3">
        <form onSubmit={submitSearch} className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]">
              <IcoSearch />
            </span>
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Veterinaria, peluquería, parque…"
              className="h-10 w-full rounded-xl border border-[hsl(var(--border))] bg-white/80 pl-9 pr-8 text-sm outline-none focus:border-[hsl(var(--secondary)/0.5)] focus:ring-0"
            />
            {inputValue && (
              <button type="button" onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                <IcoX />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((f) => !f)}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
              showFilters || openNow || withDiscount
                ? "border-[hsl(var(--secondary)/0.5)] bg-[hsl(var(--secondary)/0.08)] text-[hsl(var(--secondary))]"
                : "border-[hsl(var(--border))] bg-white/80 text-[hsl(var(--muted-foreground))]"
            }`}
            aria-label="Filtros"
          >
            <IcoSliders />
          </button>
        </form>

        {/* Quick filters */}
        {showFilters && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOpenNow((v) => !v)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                openNow ? "border-green-300 bg-green-50 text-green-800" : "border-[hsl(var(--border))] bg-white/80 text-[hsl(var(--muted-foreground))]"
              }`}
            >
              Abierto ahora
            </button>
            <button
              type="button"
              onClick={() => setWithDiscount((v) => !v)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                withDiscount ? "border-orange-300 bg-orange-50 text-orange-800" : "border-[hsl(var(--border))] bg-white/80 text-[hsl(var(--muted-foreground))]"
              }`}
            >
              Con descuento
            </button>
          </div>
        )}
      </div>

      {/* Category pills */}
      <div className="border-b border-[hsl(var(--border)/0.7)] px-3 py-2.5">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map((cat) => {
            const active = cat.type ? selectedType === cat.type : selectedType === null;
            return (
              <button
                key={cat.label}
                type="button"
                onClick={() => setSelectedType(cat.type ?? null)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                  active ? cat.color + " border-opacity-60 font-bold shadow-sm" : "border-[hsl(var(--border))] bg-white/60 text-[hsl(var(--muted-foreground))] hover:bg-white"
                }`}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: cat.dot }}
                />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between border-b border-[hsl(var(--border)/0.5)] px-4 py-2">
        <p className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
          {isLoading ? "Buscando…" : error ? "Error al cargar" : `${services.length} resultado${services.length !== 1 ? "s" : ""}`}
        </p>
        {search && (
          <span className="rounded-full bg-[hsl(var(--primary)/0.08)] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--primary))]">
            «{search}»
          </span>
        )}
      </div>

      {/* Results list */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3 border-b border-[hsl(var(--border)/0.5)] p-4">
                <div className="h-16 w-16 shrink-0 animate-pulse rounded-xl bg-[hsl(var(--muted))]" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 animate-pulse rounded-full bg-[hsl(var(--muted))] w-3/4" />
                  <div className="h-2.5 animate-pulse rounded-full bg-[hsl(var(--muted))] w-1/2" />
                  <div className="h-2.5 animate-pulse rounded-full bg-[hsl(var(--muted))] w-1/3" />
                </div>
              </div>
            ))}
          </div>
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
      <aside className="hidden w-[370px] shrink-0 flex-col overflow-hidden border-r border-[hsl(var(--border)/0.7)] lg:flex">
        {Sidebar}
      </aside>

      {/* Mobile: tabs + content */}
      <div className="flex flex-1 flex-col overflow-hidden lg:hidden">
        {/* Mobile search + tabs */}
        <div className="border-b border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.98)]">
          <div className="p-3">
            <form onSubmit={submitSearch} className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]">
                  <IcoSearch />
                </span>
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Busca veterinarias, parques, paseos…"
                  className="h-10 w-full rounded-xl border border-[hsl(var(--border))] bg-white/80 pl-9 pr-8 text-sm outline-none focus:border-[hsl(var(--secondary)/0.5)]"
                />
                {inputValue && (
                  <button type="button" onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]">
                    <IcoX />
                  </button>
                )}
              </div>
            </form>

            {/* Mobile category pills */}
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
              {CATEGORIES.map((cat) => {
                const active = cat.type ? selectedType === cat.type : selectedType === null;
                return (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => setSelectedType(cat.type ?? null)}
                    className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${
                      active ? cat.color + " shadow-sm" : "border-[hsl(var(--border))] bg-white/60 text-[hsl(var(--muted-foreground))]"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: cat.dot }} />
                    {cat.label}
                  </button>
                );
              })}
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
                {tab === "map" ? <><IcoMap /> Mapa</> : <><IcoList /> Lista ({services.length})</>}
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
                [1,2,3].map((i) => <div key={i} className="h-20 animate-pulse border-b border-[hsl(var(--border)/0.5)] m-3 rounded-xl bg-[hsl(var(--muted))]" />)
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

          {/* Mobile selected service bottom card */}
          {mobileTab === "map" && selectedService && (
            <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-[hsl(var(--border))] bg-white/95 p-4 shadow-2xl backdrop-blur-sm">
              <div className="flex gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
                  style={{ backgroundColor: categoryFor(selectedService.type).dot }}
                >
                  {selectedService.name.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{selectedService.name}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {typeLabel(selectedService.type)}
                    {selectedService.distanceKm !== null && <> · {selectedService.distanceKm.toFixed(1)} km</>}
                    {priceText(selectedService) && <> · {priceText(selectedService)}</>}
                  </p>
                </div>
                {selectedService.isOpenNow !== null && (
                  <span className={`shrink-0 self-start rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    selectedService.isOpenNow ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {selectedService.isOpenNow ? "Abierto" : "Cerrado"}
                  </span>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                {selectedService.bookingUrl && (
                  <Link href={selectedService.bookingUrl} className="flex-1 rounded-full bg-[hsl(var(--primary))] py-2.5 text-center text-xs font-bold text-white">
                    Reservar
                  </Link>
                )}
                {selectedService.phone && (
                  <a href={`tel:${selectedService.phone}`} className="flex-1 rounded-full border border-[hsl(var(--border))] py-2.5 text-center text-xs font-semibold">
                    Llamar
                  </a>
                )}
                <button type="button" onClick={() => setMobileTab("list")} className="rounded-full border border-[hsl(var(--border))] px-4 py-2.5 text-xs font-semibold">
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

        {/* Results badge on map */}
        {!isLoading && services.length > 0 && (
          <div className="pointer-events-none absolute left-4 top-4">
            <div className="rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
              {services.length} resultados en el mapa
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

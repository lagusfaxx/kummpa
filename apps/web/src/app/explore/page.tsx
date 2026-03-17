"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { MapCanvas } from "@/components/map/map-canvas";
import { listMapServices } from "@/features/map/map-api";
import type { MapServicePoint, MapServiceType } from "@/features/map/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

const SERVICE_CATEGORIES: { type: MapServiceType; label: string; icon: string }[] = [
  { type: "VET", label: "Veterinaria", icon: "🩺" },
  { type: "GROOMING", label: "Peluqueria", icon: "✂️" },
  { type: "SHOP", label: "Tienda", icon: "🛒" },
  { type: "HOTEL", label: "Hotel", icon: "🏨" },
  { type: "CAREGIVER", label: "Cuidador", icon: "🐕" },
  { type: "PARK", label: "Parque", icon: "🌳" },
];

export default function ExplorePage() {
  const [q, setQ] = useState("");
  const [types, setTypes] = useState<MapServiceType[]>([]);
  const [openNow, setOpenNow] = useState(false);
  const [withDiscount, setWithDiscount] = useState(false);
  const [radiusKm, setRadiusKm] = useState(15);
  const [priceMax, setPriceMax] = useState("");
  const [services, setServices] = useState<MapServicePoint[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"split" | "list" | "map">("split");

  useEffect(() => {
    void (async () => {
      try {
        const data = await listMapServices({ q: q || undefined, types, openNow, withDiscount, radiusKm, priceMax: priceMax ? Number(priceMax) : undefined, sortBy: "distance", limit: 80 });
        setServices(data.items);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo explorar");
      }
    })();
  }, [q, types, openNow, withDiscount, radiusKm, priceMax]);

  const toggleType = (type: MapServiceType) => {
    setTypes((prev) => prev.includes(type) ? prev.filter((v) => v !== type) : [...prev, type]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Explorar</h1>
        <div className="flex gap-2">
          <button type="button" className={`rounded-lg px-3 py-1.5 text-xs font-medium ${viewMode === "split" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`} onClick={() => setViewMode("split")}>Dividido</button>
          <button type="button" className={`rounded-lg px-3 py-1.5 text-xs font-medium ${viewMode === "list" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`} onClick={() => setViewMode("list")}>Lista</button>
          <button type="button" className={`rounded-lg px-3 py-1.5 text-xs font-medium ${viewMode === "map" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`} onClick={() => setViewMode("map")}>Mapa</button>
        </div>
      </div>

      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" /></svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar servicios, productos y lugares..."
          className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-base shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {SERVICE_CATEGORIES.map((cat) => (
          <button
            key={cat.type}
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${types.includes(cat.type) ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}
            onClick={() => toggleType(cat.type)}
          >
            <span>{cat.icon}</span> {cat.label}
          </button>
        ))}
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-slate-300"
          onClick={() => setShowFilters((v) => !v)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M3 4h18M7 8h10M10 12h4" /></svg>
          Filtros
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={openNow} onChange={(e) => setOpenNow(e.target.checked)} className="rounded" />
            Abierto ahora
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={withDiscount} onChange={(e) => setWithDiscount(e.target.checked)} className="rounded" />
            Con descuento
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            Distancia
            <input value={String(radiusKm)} onChange={(e) => setRadiusKm(Number(e.target.value) || 15)} className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm" />
            km
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            Precio max
            <input value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="$" className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm" />
          </label>
        </div>
      )}

      {error && <InlineBanner tone="error">{error}</InlineBanner>}

      <div className={viewMode === "list" ? "" : viewMode === "map" ? "" : "grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]"}>
        {viewMode !== "map" && (
          <div className="space-y-2 overflow-y-auto" style={viewMode === "split" ? { maxHeight: "600px" } : undefined}>
            <p className="text-xs font-medium text-slate-500">{services.length} resultados · ordenados por cercanía</p>
            {services.map((service) => (
              <article
                key={service.id}
                className={`cursor-pointer rounded-xl border p-3 transition hover:shadow-sm ${selectedId === service.id ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"}`}
                onClick={() => setSelectedId(service.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{service.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{service.distanceKm?.toFixed(1) ?? "-"} km · {service.rating?.toFixed(1) ?? "-"} ⭐ · {service.isOpenNow ? "Abierto" : "Cerrado"}</p>
                  </div>
                  {service.hasDiscount && (
                    <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      {service.discountLabel ?? "Descuento"}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-700">
                  {service.priceFrom ? `Desde $${service.priceFrom}` : "Precio por confirmar"}
                </p>
                <div className="mt-2 flex gap-2">
                  {service.bookingUrl && (
                    <Link href={service.bookingUrl} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800">
                      Reservar
                    </Link>
                  )}
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    onClick={(e) => { e.stopPropagation(); setSelectedId(service.id); setViewMode("split"); }}
                  >
                    Ver en mapa
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        {viewMode !== "list" && (
          <MapCanvas accessToken={MAPBOX_TOKEN} points={services} selectedPointId={selectedId} onSelectPoint={setSelectedId} className="h-[600px] rounded-xl" />
        )}
      </div>
    </div>
  );
}

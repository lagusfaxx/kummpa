"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { MapCanvas } from "@/components/map/map-canvas";
import { listMapServices } from "@/features/map/map-api";
import type { MapServicePoint, MapServiceType } from "@/features/map/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

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

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Explorar</h1>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar servicios, productos y lugares" />
      <div className="flex flex-wrap gap-2">
        {(["VET", "GROOMING", "SHOP", "HOTEL"] as MapServiceType[]).map((type) => (
          <button key={type} type="button" className="btn btn-outline text-xs" onClick={() => setTypes((prev) => (prev.includes(type) ? prev.filter((v) => v !== type) : [...prev, type]))}>{type}</button>
        ))}
        <label className="text-sm"><input type="checkbox" checked={openNow} onChange={(e) => setOpenNow(e.target.checked)} /> Abierto ahora</label>
        <label className="text-sm"><input type="checkbox" checked={withDiscount} onChange={(e) => setWithDiscount(e.target.checked)} /> Con descuento</label>
        <input value={String(radiusKm)} onChange={(e) => setRadiusKm(Number(e.target.value) || 15)} placeholder="Distancia km" className="w-28" />
        <input value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="Precio max" className="w-28" />
      </div>
      {error && <InlineBanner tone="error">{error}</InlineBanner>}
      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-2">
          {services.map((service) => (
            <article key={service.id} className="card p-3">
              <p className="font-semibold">{service.name}</p>
              <p className="text-xs text-slate-600">{service.distanceKm?.toFixed(1) ?? "-"} km · {service.rating?.toFixed(1) ?? "-"} ⭐</p>
              <p className="text-xs">{service.priceFrom ? `$${service.priceFrom}` : "Precio por confirmar"} · {service.discountLabel ?? "sin descuento"}</p>
              <div className="mt-2 flex gap-2">
                <button className="btn btn-outline text-xs" onClick={() => setSelectedId(service.id)}>Ver en mapa</button>
                {service.bookingUrl ? <Link href={service.bookingUrl} className="btn btn-primary text-xs">Reservar</Link> : null}
              </div>
            </article>
          ))}
        </div>
        <MapCanvas accessToken={MAPBOX_TOKEN} points={services} selectedPointId={selectedId} onSelectPoint={setSelectedId} className="h-[560px]" />
      </div>
    </div>
  );
}

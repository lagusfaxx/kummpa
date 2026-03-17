"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { MapCanvas } from "@/components/map/map-canvas";
import { listMapServices } from "@/features/map/map-api";
import type { MapServicePoint, MapServiceType } from "@/features/map/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const CATEGORY_ITEMS: Array<{ label: string; type?: MapServiceType; query?: string }> = [
  { label: "Todo" },
  { label: "Veterinarias", type: "VET", query: "veterinaria" },
  { label: "Peluquerias", type: "GROOMING", query: "peluqueria" },
  { label: "Paseos", type: "CAREGIVER", query: "paseo" },
  { label: "Tiendas", type: "SHOP", query: "tienda pet" },
  { label: "Hoteles", type: "HOTEL", query: "hotel mascotas" },
  { label: "Parques", type: "PARK", query: "parque" }
];

function typeLabel(type: MapServiceType) {
  if (type === "VET") return "Veterinaria";
  if (type === "CAREGIVER") return "Paseo / cuidador";
  if (type === "SHOP") return "Tienda";
  if (type === "GROOMING") return "Peluqueria";
  if (type === "HOTEL") return "Hotel";
  if (type === "PARK") return "Parque";
  return "Alerta";
}

function priceLabel(service: MapServicePoint) {
  if (service.priceFrom) return `Desde $${service.priceFrom.toLocaleString("es-CL")}`;
  return service.priceInfo[0] ?? "Consultar precio";
}

export default function ExplorePage() {
  const params = useSearchParams();
  const qParam = params.get("q") ?? "";
  const discountParam = params.get("withDiscount") === "1";

  const [search, setSearch] = useState(qParam);
  const [district, setDistrict] = useState("");
  const [selectedType, setSelectedType] = useState<MapServiceType | null>(null);
  const [openNow, setOpenNow] = useState(false);
  const [withDiscount, setWithDiscount] = useState(discountParam);
  const [radiusKm, setRadiusKm] = useState(10);
  const [priceMax, setPriceMax] = useState("");
  const [services, setServices] = useState<MapServicePoint[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSearch(qParam);
  }, [qParam]);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await listMapServices({
          q: search || undefined,
          district: district || undefined,
          types: selectedType ? [selectedType] : undefined,
          openNow,
          withDiscount,
          radiusKm,
          priceMax: priceMax ? Number(priceMax) : undefined,
          sortBy: "distance",
          limit: 80
        });

        if (!controller.signal.aborted) {
          setServices(response.items);
          setSelectedId((current) => current ?? response.items[0]?.id ?? null);
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar explorar.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [district, openNow, priceMax, radiusKm, search, selectedType, withDiscount]);

  const selectedService = useMemo(
    () => services.find((item) => item.id === selectedId) ?? services[0] ?? null,
    [services, selectedId]
  );

  const highlighted = useMemo(() => services.slice(0, 3), [services]);

  return (
    <div className="space-y-6">
      <section className="kumpa-panel overflow-hidden p-6 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_340px] xl:items-start">
          <div>
            <span className="kumpa-eyebrow">Explorar</span>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Busca cualquier cosa para tu mascota.
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[hsl(var(--muted-foreground))]">
              Todo vive aqui: servicios, productos, lugares y mapa. Si buscas una marca como Bravery o una categoria como peluqueria, el listado y el mapa muestran exactamente lo mismo.
            </p>

            <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_260px_160px]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Busca veterinarias, comida, bravery, peluqueria, paseos..."
                className="!min-h-[3.6rem]"
              />
              <input
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
                placeholder="Comuna o sector"
                className="!min-h-[3.6rem]"
              />
              <button type="button" className="btn btn-primary" onClick={() => setSearch((value) => value.trim())}>
                Buscar
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {CATEGORY_ITEMS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setSelectedType(item.type ?? null);
                    if (item.query) setSearch(item.query);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    (!item.type && selectedType === null) || selectedType === item.type
                      ? "bg-[hsl(var(--primary))] text-white"
                      : "border border-[hsl(var(--border))] bg-white text-[hsl(var(--foreground))]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <aside className="card p-5">
            <span className="kumpa-eyebrow">Filtros</span>
            <div className="mt-4 grid gap-3">
              <label className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                <input type="checkbox" checked={openNow} onChange={(event) => setOpenNow(event.target.checked)} />
                Abierto ahora
              </label>
              <label className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                <input type="checkbox" checked={withDiscount} onChange={(event) => setWithDiscount(event.target.checked)} />
                Con descuento
              </label>
              <select value={String(radiusKm)} onChange={(event) => setRadiusKm(Number(event.target.value))}>
                {[5, 10, 15, 20, 30].map((value) => (
                  <option key={value} value={value}>{value} km</option>
                ))}
              </select>
              <input value={priceMax} onChange={(event) => setPriceMax(event.target.value)} placeholder="Precio maximo" />
            </div>
          </aside>
        </div>
      </section>

      {error ? <InlineBanner tone="error">{error}</InlineBanner> : null}

      <section className="grid gap-4 xl:grid-cols-3">
        {highlighted.map((service) => (
          <article key={service.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">{service.name}</p>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{typeLabel(service.type)} · {service.distanceKm?.toFixed(1) ?? "-"} km</p>
              </div>
              {service.discountLabel ? <span className="rounded-full bg-[hsl(var(--accent))] px-3 py-1 text-xs font-bold text-white">{service.discountLabel}</span> : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-[hsl(var(--muted-foreground))]">
              <span className="kumpa-chip">{priceLabel(service)}</span>
              <span className="kumpa-chip">{service.rating?.toFixed(1) ?? "-"} ★</span>
              <span className="kumpa-chip">{service.isOpenNow ? "Abierto" : "Cerrado"}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn btn-outline text-xs" onClick={() => setSelectedId(service.id)}>Ver en mapa</button>
              {service.bookingUrl ? <Link href={service.bookingUrl} className="btn btn-primary text-xs">Reservar</Link> : null}
            </div>
          </article>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
        <section className="space-y-3 lg:order-2">
          <div className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{services.length} resultados</p>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Ordenados por cercania.</p>
              </div>
              {selectedService ? <span className="kumpa-chip">Seleccionado: {selectedService.name}</span> : null}
            </div>
          </div>

          {isLoading ? (
            <article className="card p-5 text-sm text-[hsl(var(--muted-foreground))]">Cargando resultados...</article>
          ) : services.length === 0 ? (
            <article className="card p-6 text-center">
              <h2 className="text-2xl font-bold">No encontramos resultados utiles</h2>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Prueba otra comuna, otra categoria o busca algo mas especifico como una marca de alimento.
              </p>
            </article>
          ) : (
            services.map((service) => (
              <article
                key={service.id}
                className={`card overflow-hidden p-0 ${selectedId === service.id ? "border-[hsl(var(--secondary))] shadow-[0_18px_40px_hsl(var(--secondary)/0.18)]" : ""}`}
              >
                <div className="grid gap-0 sm:grid-cols-[112px_minmax(0,1fr)]">
                  {service.imageUrl ? (
                    <img src={service.imageUrl} alt={service.name} className="h-full min-h-[112px] w-full object-cover" />
                  ) : (
                    <div className="flex min-h-[112px] items-center justify-center bg-[hsl(var(--muted))] text-2xl font-semibold">
                      {service.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold leading-tight">{service.name}</p>
                        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                          {typeLabel(service.type)} · {service.address || service.district || service.city || "Sin direccion"}
                        </p>
                      </div>
                      {service.discountLabel ? (
                        <span className="rounded-full bg-[hsl(var(--accent))] px-3 py-1 text-xs font-bold text-white">{service.discountLabel}</span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                      <span className="kumpa-chip">{service.distanceKm?.toFixed(1) ?? "-"} km</span>
                      <span className="kumpa-chip">{priceLabel(service)}</span>
                      <span className="kumpa-chip">{service.rating?.toFixed(1) ?? "-"} ★</span>
                      <span className="kumpa-chip">{service.isOpenNow ? "Abierto" : "Cerrado"}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" className="btn btn-outline text-xs" onClick={() => setSelectedId(service.id)}>Ver en mapa</button>
                      {service.bookingUrl ? <Link href={service.bookingUrl} className="btn btn-primary text-xs">Reservar</Link> : null}
                      {service.phone ? <a href={`tel:${service.phone}`} className="btn btn-outline text-xs">Llamar</a> : null}
                      {service.profileUrl ? <Link href={service.profileUrl} className="btn btn-outline text-xs">Ver ficha</Link> : null}
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>

        <section className="lg:order-1">
          <MapCanvas
            accessToken={MAPBOX_TOKEN}
            points={services}
            selectedPointId={selectedId}
            onSelectPoint={setSelectedId}
            className="h-[620px]"
          />
        </section>
      </div>
    </div>
  );
}

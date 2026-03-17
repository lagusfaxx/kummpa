"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { EmptyState } from "@/components/feedback/empty-state";
import { SurfaceSkeleton } from "@/components/feedback/skeleton";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { PageIntro } from "@/components/layout/page-intro";
import { MapCanvas } from "@/components/map/map-canvas";
import { useAuth } from "@/features/auth/auth-context";
import { listBenefits } from "@/features/benefits/benefits-api";
import type { BenefitItem, BenefitProviderType } from "@/features/benefits/types";
import { listMapServices } from "@/features/map/map-api";
import type { MapServicePoint, MapServiceType, MapSortBy } from "@/features/map/types";
import { listMarketplaceListings } from "@/features/marketplace/marketplace-api";
import type { MarketplaceListing } from "@/features/marketplace/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

interface ExploreCategoryPreset {
  id: string;
  label: string;
  types?: MapServiceType[];
  service?: string;
  emergencyOnly?: boolean;
  atHomeOnly?: boolean;
  withDiscount?: boolean;
  providerType?: BenefitProviderType;
}

const CATEGORY_PRESETS: ExploreCategoryPreset[] = [
  { id: "vet", label: "Veterinarias", types: ["VET"], providerType: "VET" },
  { id: "grooming", label: "Peluquerias", types: ["GROOMING"], providerType: "GROOMING" },
  { id: "caregiver", label: "Cuidadores", types: ["CAREGIVER"], providerType: "CAREGIVER" },
  { id: "hotel", label: "Hoteles y guarderias", types: ["HOTEL"], providerType: "HOTEL" },
  { id: "shop", label: "Tiendas pet", types: ["SHOP"], providerType: "SHOP" },
  { id: "park", label: "Parques", types: ["PARK"] },
  { id: "pharmacy", label: "Farmacias veterinarias", types: ["VET", "SHOP"], service: "farmacia" },
  { id: "emergency", label: "Urgencias 24/7", types: ["VET"], emergencyOnly: true, providerType: "VET" },
  { id: "home", label: "A domicilio", atHomeOnly: true },
  { id: "discount", label: "Con descuentos", withDiscount: true }
];

function formatMoney(cents?: number | null, currencyCode = "CLP") {
  if (cents === null || cents === undefined) return null;
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(cents);
}

function formatDistance(distanceKm?: number | null) {
  if (distanceKm === null || distanceKm === undefined) return null;
  return `${distanceKm.toFixed(1)} km`;
}

function serviceCategoryLabel(type: MapServiceType) {
  if (type === "VET") return "Veterinaria";
  if (type === "GROOMING") return "Peluqueria";
  if (type === "CAREGIVER") return "Cuidador";
  if (type === "HOTEL") return "Hotel o guarderia";
  if (type === "SHOP") return "Tienda pet";
  if (type === "PARK") return "Parque";
  return "Alerta";
}

function savingsCopy(discountLabel?: string | null) {
  if (!discountLabel) return "Oferta activa";
  if (discountLabel.toLowerCase().includes("ahorra")) return discountLabel;
  return `Ahorra ${discountLabel}`;
}

function serviceSmartChips(service: MapServicePoint) {
  const chips: string[] = [];
  if (service.isOpenNow) chips.push("rapido");
  if ((service.priceFrom ?? 0) > 0 && (service.priceFrom ?? 0) <= 20000) chips.push("economico");
  if ((service.rating ?? 0) >= 4.6 || service.reviewsCount >= 20) chips.push("popular");
  if (service.hasDiscount) chips.push("con descuento");
  return chips.slice(0, 3);
}

export default function MapPage() {
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("vet");
  const [queryText, setQueryText] = useState("");
  const [district, setDistrict] = useState("");
  const [openNow, setOpenNow] = useState(false);
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [withDiscount, setWithDiscount] = useState(false);
  const [atHomeOnly, setAtHomeOnly] = useState(false);
  const [sortBy, setSortBy] = useState<MapSortBy>("rating");
  const [radiusKm, setRadiusKm] = useState(20);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<MapServicePoint[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [benefits, setBenefits] = useState<BenefitItem[]>([]);
  const [products, setProducts] = useState<MarketplaceListing[]>([]);

  const selectedPreset =
    CATEGORY_PRESETS.find((item) => item.id === selectedCategoryId) ?? CATEGORY_PRESETS[0]!;

  const finalFilters = useMemo(
    () => ({
      openNow,
      emergencyOnly: emergencyOnly || selectedPreset.emergencyOnly,
      withDiscount: withDiscount || selectedPreset.withDiscount,
      atHomeOnly: atHomeOnly || selectedPreset.atHomeOnly
    }),
    [atHomeOnly, emergencyOnly, openNow, selectedPreset, withDiscount]
  );

  const topToday = useMemo(
    () =>
      [...services]
        .sort((left, right) => {
          const rightScore =
            Number(right.hasDiscount) * 5 +
            Number(right.isOpenNow) * 3 +
            (right.rating ?? 0);
          const leftScore =
            Number(left.hasDiscount) * 5 +
            Number(left.isOpenNow) * 3 +
            (left.rating ?? 0);
          return rightScore - leftScore;
        })
        .slice(0, 3),
    [services]
  );

  const bestRated = useMemo(
    () =>
      [...services]
        .filter((service) => service.rating !== null)
        .sort((left, right) => (right.rating ?? 0) - (left.rating ?? 0))
        .slice(0, 1)[0] ?? null,
    [services]
  );

  const cheapest = useMemo(
    () =>
      [...services]
        .filter((service) => service.priceFrom !== null)
        .sort((left, right) => (left.priceFrom ?? 0) - (right.priceFrom ?? 0))
        .slice(0, 1)[0] ?? null,
    [services]
  );

  const discountedSpotlight = useMemo(
    () => services.find((service) => service.hasDiscount) ?? null,
    [services]
  );

  const loadExplore = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [serviceRows, benefitRows, productRows] = await Promise.all([
        listMapServices({
          q: queryText || undefined,
          district: district || undefined,
          service: selectedPreset.service,
          types: selectedPreset.types,
          openNow: finalFilters.openNow,
          emergencyOnly: finalFilters.emergencyOnly,
          withDiscount: finalFilters.withDiscount,
          atHomeOnly: finalFilters.atHomeOnly,
          sortBy,
          priceMin: priceMin ? Number(priceMin) : undefined,
          priceMax: priceMax ? Number(priceMax) : undefined,
          lat: location?.lat,
          lng: location?.lng,
          radiusKm: location ? radiusKm : undefined,
          limit: 50
        }),
        accessToken
          ? listBenefits(accessToken, {
              providerType: selectedPreset.providerType,
              featuredOnly: true,
              validOnly: true,
              limit: 4
            })
          : Promise.resolve([]),
        accessToken
          ? listMarketplaceListings(accessToken, {
              sortBy: location ? "distance" : "recent",
              lat: location?.lat,
              lng: location?.lng,
              radiusKm: location ? radiusKm : undefined,
              limit: 6
            })
          : Promise.resolve([])
      ]);

      setServices(serviceRows.items);
      setSelectedPointId(serviceRows.items[0]?.id ?? null);
      setBenefits(benefitRows);
      setProducts(productRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar explorar.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadExplore();
  }, [accessToken, selectedCategoryId, queryText, district, finalFilters, sortBy, radiusKm, priceMin, priceMax, location]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadExplore();
  };

  const handleUseMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setError("Tu navegador no soporta geolocalizacion.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (locationError) => {
        setError(locationError.message || "No fue posible obtener tu ubicacion.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Explorar"
        title="Todo lo que necesitas cerca para tu mascota"
        description="Mapa, listado, filtros utiles, descuentos visibles, tiendas pet y beneficios por zona en una sola experiencia."
        tone="care"
        metrics={[
          { value: String(services.length), label: "resultados" },
          { value: String(benefits.length), label: "beneficios" },
          { value: String(products.length), label: "productos" },
          { value: location ? `${radiusKm} km` : "sin zona", label: "radio" }
        ]}
      />

      {error && <InlineBanner tone="error">{error}</InlineBanner>}

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="kumpa-highlight-card p-5">
          <p className="kumpa-eyebrow">Lo mejor cerca de ti hoy</p>
          <h2 className="mt-3 text-xl font-semibold">
            {topToday[0]?.name ?? "Ajusta tu zona para descubrir destacados"}
          </h2>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            {topToday[0]
              ? `${serviceCategoryLabel(topToday[0].type)} · ${
                  formatDistance(topToday[0].distanceKm) ?? "cerca"
                }`
              : "Explorar mejora cuando tenemos comuna, radio o categoria activa."}
          </p>
          {topToday[0]?.hasDiscount ? (
            <div className="mt-4">
              <span className="kumpa-offer-badge">{savingsCopy(topToday[0].discountLabel)}</span>
            </div>
          ) : null}
        </article>

        <article className="card p-5">
          <p className="kumpa-eyebrow">Mejor valorados</p>
          <h2 className="mt-3 text-xl font-semibold">
            {bestRated?.name ?? "Sin ranking todavia"}
          </h2>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            {bestRated
              ? `${bestRated.rating?.toFixed(1)} estrellas y ${bestRated.reviewsCount} resenas`
              : "Activa mas resultados para ver el mejor puntuado."}
          </p>
        </article>

        <article className="card p-5">
          <p className="kumpa-eyebrow">Mas baratos y con promo</p>
          <h2 className="mt-3 text-xl font-semibold">
            {cheapest?.name ?? discountedSpotlight?.name ?? "Sin datos suficientes"}
          </h2>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            {cheapest?.priceFrom !== null
              ? `Precio desde ${formatMoney(cheapest?.priceFrom)}`
              : discountedSpotlight?.discountLabel
                ? savingsCopy(discountedSpotlight.discountLabel)
                : "Activa filtros para encontrar opciones economicas."}
          </p>
        </article>
      </section>

      <form onSubmit={handleSubmit} className="kumpa-soft-section p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
          <input
            value={queryText}
            onChange={(event) => setQueryText(event.target.value)}
            placeholder="Buscar veterinarias, peluquerias, hoteles o servicios..."
          />
          <input
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
            placeholder="Comuna o zona"
          />
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as MapSortBy)}>
            <option value="rating">Mejor calificados</option>
            <option value="distance">Mas cerca</option>
            <option value="relevance">Relevancia</option>
            <option value="recent">Mas recientes</option>
          </select>
          <button type="submit" className="btn btn-primary">
            Buscar
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORY_PRESETS.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategoryId(category.id)}
              className={`kumpa-chip ${selectedCategoryId === category.id ? "kumpa-chip-active" : ""}`}
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={openNow} onChange={(event) => setOpenNow(event.target.checked)} />
            Abierto ahora
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={emergencyOnly} onChange={(event) => setEmergencyOnly(event.target.checked)} />
            Urgencias 24/7
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={withDiscount} onChange={(event) => setWithDiscount(event.target.checked)} />
            Con descuento
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={atHomeOnly} onChange={(event) => setAtHomeOnly(event.target.checked)} />
            A domicilio
          </label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input value={priceMin} onChange={(event) => setPriceMin(event.target.value)} placeholder="Precio desde" />
          <input value={priceMax} onChange={(event) => setPriceMax(event.target.value)} placeholder="Precio hasta" />
          <div className="flex gap-2">
            <select value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))}>
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={20}>20 km</option>
              <option value={50}>50 km</option>
            </select>
            <button type="button" onClick={handleUseMyLocation} className="btn btn-outline">
              {location ? "Actualizar ubicacion" : "Usar mi ubicacion"}
            </button>
          </div>
        </div>
      </form>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_390px]">
        <div className="space-y-4">
          <MapCanvas
            accessToken={MAPBOX_TOKEN}
            points={services}
            selectedPointId={selectedPointId}
            onSelectPoint={setSelectedPointId}
            className="h-[360px] w-full rounded-[1.8rem] lg:h-[640px]"
          />

          {!isLoading && services.length === 0 && (
            <EmptyState
              eyebrow="Explorar"
              title="No encontramos servicios con estos filtros"
              description="Prueba una categoria mas amplia, baja el filtro de precio o activa una zona cercana para descubrir opciones utiles."
              highlights={[
                "veterinarias mejor valoradas",
                "peluquerias economicas",
                "servicios con descuento",
                "lugares abiertos ahora"
              ]}
            />
          )}
        </div>

        <aside className="space-y-4 xl:max-h-[640px] xl:overflow-y-auto xl:pr-1">
          {isLoading ? (
            <>
              <SurfaceSkeleton blocks={4} />
              <SurfaceSkeleton blocks={4} />
            </>
          ) : (
            services.map((service) => (
              <article
                key={service.id}
                className={`card p-4 ${selectedPointId === service.id ? "kumpa-focus-ring" : ""}`}
              >
                <div className="flex gap-3">
                  <div className="h-28 w-28 overflow-hidden rounded-[1.35rem] bg-[hsl(var(--muted))]">
                    {service.imageUrl ? (
                      <img src={service.imageUrl} alt={service.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                        {serviceCategoryLabel(service.type)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="truncate text-lg font-semibold">{service.name}</h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          {serviceCategoryLabel(service.type)}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${service.isOpenNow ? "kumpa-status-success" : "kumpa-status-warning"}`}>
                        {service.isOpenNow ? "Abierto" : "Cerrado"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                      {service.address ?? "Direccion no informada"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {serviceSmartChips(service).map((chip) => (
                        <span key={`${service.id}-${chip}`} className="kumpa-chip">
                          {chip}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                      {formatDistance(service.distanceKm) && <span>{formatDistance(service.distanceKm)}</span>}
                      {service.rating !== null && <span>{service.rating.toFixed(1)} estrellas</span>}
                      {service.reviewsCount > 0 && <span>{service.reviewsCount} resenas</span>}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-lg font-bold text-[hsl(var(--primary))]">
                        {formatMoney(service.priceFrom) ?? "Consultar"}
                      </span>
                      {service.hasDiscount && (
                        <span className="kumpa-offer-badge">
                          {savingsCopy(service.discountLabel)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/appointments" className="btn btn-primary text-xs">
                    Reservar
                  </Link>
                  {service.phone && (
                    <a href={`tel:${service.phone.replace(/\s+/g, "")}`} className="btn btn-outline text-xs">
                      Llamar
                    </a>
                  )}
                  <Link href="/appointments" className="btn btn-outline text-xs">
                    Ver mas
                  </Link>
                </div>
              </article>
            ))
          )}
        </aside>
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <SectionHeader title="Beneficios y descuentos" description="Promociones que realmente ayudan a decidir mas rapido dentro de explorar." />
          <div className="grid gap-4 md:grid-cols-2">
            {benefits.length === 0 ? (
              <div className="card p-5 text-sm text-[hsl(var(--muted-foreground))]">
                Inicia sesion para ver beneficios activos y convenios por zona.
              </div>
            ) : (
              benefits.map((benefit) => (
                <article key={benefit.id} className="kumpa-highlight-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{benefit.title}</h3>
                      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{benefit.summary}</p>
                    </div>
                    {benefit.discountLabel && (
                      <span className="kumpa-offer-badge">
                        {savingsCopy(benefit.discountLabel)}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {benefit.location.district ? (
                      <span className="kumpa-chip">{benefit.location.district}</span>
                    ) : null}
                    <span className="kumpa-chip">
                      {benefit.validity.daysRemaining} dias
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <SectionHeader title="Tiendas y productos" description="Alimento, higiene, accesorios, salud y productos destacados con ubicacion o delivery." />
          <div className="grid gap-4 md:grid-cols-2">
            {products.length === 0 ? (
              <div className="card p-5 text-sm text-[hsl(var(--muted-foreground))]">
                Inicia sesion para ver productos y tiendas destacadas.
              </div>
            ) : (
              products.map((product) => (
                <article key={product.id} className="card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">{product.title}</h3>
                      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        {product.district ?? "Marketplace pet"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[hsl(var(--primary))]">
                      {formatMoney(product.priceCents, "CLP")}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
                    {product.description.slice(0, 90)}
                    {product.description.length > 90 ? "..." : ""}
                  </p>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  title,
  description
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h2 className="kumpa-section-title">{title}</h2>
      {description && <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{description}</p>}
    </div>
  );
}

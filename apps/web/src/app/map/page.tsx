"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { PageIntro } from "@/components/layout/page-intro";
import { MapCanvas } from "@/components/map/map-canvas";
import { listMapServices, listMapSuggestions } from "@/features/map/map-api";
import type {
  MapServicePoint,
  MapServiceType,
  MapServicesQuery,
  MapServicesResponse,
  MapSuggestion,
  MapSortBy
} from "@/features/map/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

const MAP_CATEGORIES: Array<{ type: MapServiceType; label: string; icon: string }> = [
  { type: "VET", label: "Veterinarias", icon: "🏥" },
  { type: "GROOMING", label: "Peluquerias", icon: "✂️" },
  { type: "HOTEL", label: "Hoteles", icon: "🏨" },
  { type: "CAREGIVER", label: "Cuidadores", icon: "🐕" },
  { type: "SHOP", label: "Tiendas", icon: "🛒" },
  { type: "PARK", label: "Parques", icon: "🌳" }
];

function formatDistance(distanceKm: number | null) {
  if (distanceKm === null) return null;
  return `${distanceKm.toFixed(1)} km`;
}

function formatRating(value: number | null, reviewsCount: number) {
  if (value === null) return null;
  if (reviewsCount > 0) return `${value.toFixed(1)} (${reviewsCount})`;
  return value.toFixed(1);
}

interface LocationPoint {
  lat: number;
  lng: number;
}

function ServiceCard({
  point,
  selected,
  onSelect
}: {
  point: MapServicePoint;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const rating = formatRating(point.rating, point.reviewsCount);
  const distance = formatDistance(point.distanceKm);

  return (
    <article
      onClick={() => onSelect(point.id)}
      className={`card cursor-pointer p-4 transition-all ${
        selected
          ? "border-[hsl(var(--secondary))] ring-2 ring-[hsl(var(--secondary))]"
          : "hover:border-[hsl(var(--secondary))/50]"
      }`}
    >
      <div className="flex gap-3">
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-[hsl(var(--muted))]">
          {point.imageUrl ? (
            <img
              src={point.imageUrl}
              alt={point.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl">
              {MAP_CATEGORIES.find((c) => c.type === point.type)?.icon || "📍"}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-semibold">{point.name}</h3>
            {point.isEmergency24x7 && (
              <span className="flex-shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                24/7
              </span>
            )}
          </div>
          {point.address && (
            <p className="truncate text-sm text-[hsl(var(--muted-foreground))]">
              {point.address}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            {rating && (
              <span className="flex items-center gap-1">
                <span className="text-amber-500">★</span>
                {rating}
              </span>
            )}
            {distance && (
              <span className="text-[hsl(var(--muted-foreground))]">{distance}</span>
            )}
            {point.isOpenNow !== null && (
              <span
                className={point.isOpenNow ? "text-emerald-600" : "text-[hsl(var(--muted-foreground))]"}
              >
                {point.isOpenNow ? "Abierto" : "Cerrado"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        {point.bookingUrl ? (
          <Link
            href={point.bookingUrl}
            onClick={(e) => e.stopPropagation()}
            className="btn btn-secondary flex-1"
          >
            Reservar
          </Link>
        ) : (
          <Link
            href={`/appointments?providerType=${point.type}&providerId=${point.id}`}
            onClick={(e) => e.stopPropagation()}
            className="btn btn-secondary flex-1"
          >
            Reservar
          </Link>
        )}
        {point.phone && (
          <a
            href={`tel:${point.phone.replace(/\s+/g, "")}`}
            onClick={(e) => e.stopPropagation()}
            className="btn btn-outline"
          >
            Llamar
          </a>
        )}
      </div>
    </article>
  );
}

export default function MapPage() {
  const [queryText, setQueryText] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<MapServiceType[]>([]);
  const [openNow, setOpenNow] = useState(false);
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [sortBy, setSortBy] = useState<MapSortBy>("relevance");
  const [radiusKm, setRadiusKm] = useState(20);
  const [location, setLocation] = useState<LocationPoint | null>(null);

  const [data, setData] = useState<MapServicesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MapSuggestion[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const points = data?.items ?? [];
  const filteredPoints = useMemo(() => {
    if (selectedTypes.length === 0) return points;
    return points.filter((p) => selectedTypes.includes(p.type));
  }, [points, selectedTypes]);

  // Parse URL params on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    const typesParam = params.get("types");
    if (typesParam) {
      setSelectedTypes(typesParam.split(",") as MapServiceType[]);
    }

    if (params.get("openNow") === "true") setOpenNow(true);
    if (params.get("emergencyOnly") === "true") setEmergencyOnly(true);
  }, []);

  const buildQuery = (nextLocation?: LocationPoint | null): MapServicesQuery => {
    const activeLocation = nextLocation !== undefined ? nextLocation : location;
    return {
      q: queryText.trim() || undefined,
      types: selectedTypes.length > 0 ? selectedTypes : undefined,
      openNow,
      emergencyOnly,
      sortBy,
      radiusKm: activeLocation ? radiusKm : undefined,
      lat: activeLocation?.lat,
      lng: activeLocation?.lng,
      limit: 100
    };
  };

  const runSearch = async (locationOverride?: LocationPoint | null) => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await listMapServices(buildQuery(locationOverride));
      setData(payload);
      setSelectedPointId(
        (current) =>
          (current && payload.items.some((p) => p.id === current) ? current : payload.items[0]?.id) ??
          null
      );
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "No se pudo cargar servicios.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const needle = queryText.trim();
    if (needle.length < 2) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(() => {
      void listMapSuggestions({ q: needle, limit: 5 })
        .then((result) => setSuggestions(result.items))
        .catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(timeout);
  }, [queryText]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuggestions([]);
    void runSearch();
  };

  const handleUseMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setError("Tu navegador no soporta geolocalizacion.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        setLocation(nextLocation);
        setSortBy("distance");
        void runSearch(nextLocation);
      },
      (locationError) => setError(locationError.message || "No fue posible obtener tu ubicacion."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const toggleType = (type: MapServiceType) => {
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type]
    );
  };

  const pickSuggestion = (suggestion: MapSuggestion) => {
    setQueryText(suggestion.value);
    setSuggestions([]);
    void runSearch();
  };

  return (
    <div className="space-y-4">
      <PageIntro
        title="Servicios cerca"
        description="Encuentra veterinarias, peluquerias, hoteles y mas para tu mascota"
      />

      {error && <InlineBanner tone="error">{error}</InlineBanner>}

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Buscar servicios, zonas..."
              className="w-full pr-10"
            />
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg">
                {suggestions.map((s) => (
                  <button
                    key={`${s.kind}-${s.value}`}
                    type="button"
                    onClick={() => pickSuggestion(s)}
                    className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-[hsl(var(--muted))]"
                  >
                    <span>{s.value}</span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">{s.kind}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="submit" disabled={isLoading} className="btn btn-primary">
            Buscar
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${showFilters ? "btn-secondary" : "btn-outline"}`}
          >
            Filtros
          </button>
        </div>
      </form>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {MAP_CATEGORIES.map((cat) => (
          <button
            key={cat.type}
            type="button"
            onClick={() => {
              toggleType(cat.type);
              void runSearch();
            }}
            className={`btn whitespace-nowrap ${
              selectedTypes.includes(cat.type) ? "btn-secondary" : "btn-outline"
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="card p-4">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={openNow}
                onChange={(e) => {
                  setOpenNow(e.target.checked);
                  void runSearch();
                }}
              />
              Abierto ahora
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={emergencyOnly}
                onChange={(e) => {
                  setEmergencyOnly(e.target.checked);
                  void runSearch();
                }}
              />
              Urgencias 24/7
            </label>
            <div className="flex items-center gap-2">
              <label className="text-sm">Ordenar:</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as MapSortBy);
                  void runSearch();
                }}
                className="min-h-0 w-auto py-1.5 text-sm"
              >
                <option value="relevance">Relevancia</option>
                <option value="distance">Distancia</option>
                <option value="rating">Calificacion</option>
              </select>
            </div>
            {location && (
              <div className="flex items-center gap-2">
                <label className="text-sm">Radio:</label>
                <select
                  value={radiusKm}
                  onChange={(e) => {
                    setRadiusKm(Number(e.target.value));
                    void runSearch();
                  }}
                  className="min-h-0 w-auto py-1.5 text-sm"
                >
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={20}>20 km</option>
                  <option value={50}>50 km</option>
                </select>
              </div>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={handleUseMyLocation} className="btn btn-outline">
              {location ? "Actualizar ubicacion" : "Usar mi ubicacion"}
            </button>
            {location && (
              <button
                type="button"
                onClick={() => {
                  setLocation(null);
                  void runSearch(null);
                }}
                className="btn btn-ghost"
              >
                Quitar ubicacion
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results count */}
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        {filteredPoints.length} {filteredPoints.length === 1 ? "resultado" : "resultados"}
        {location && " cerca de ti"}
      </p>

      {/* Map and results layout */}
      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        {/* Map */}
        <div className="order-2 lg:order-1">
          <MapCanvas
            accessToken={MAPBOX_TOKEN}
            points={filteredPoints}
            selectedPointId={selectedPointId}
            onSelectPoint={setSelectedPointId}
            className="h-[400px] w-full rounded-2xl lg:h-[600px]"
          />
        </div>

        {/* Results list */}
        <div className="order-1 space-y-3 lg:order-2 lg:max-h-[600px] lg:overflow-y-auto">
          {isLoading ? (
            <div className="card p-6 text-center text-[hsl(var(--muted-foreground))]">
              Buscando servicios...
            </div>
          ) : filteredPoints.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-[hsl(var(--muted-foreground))]">
                No encontramos servicios con estos filtros.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedTypes([]);
                  setOpenNow(false);
                  setEmergencyOnly(false);
                  void runSearch();
                }}
                className="btn btn-outline mt-3"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            filteredPoints.map((point) => (
              <ServiceCard
                key={point.id}
                point={point}
                selected={selectedPointId === point.id}
                onSelect={setSelectedPointId}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

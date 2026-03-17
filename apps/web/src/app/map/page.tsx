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
const MAP_TYPES: MapServiceType[] = [
  "VET",
  "CAREGIVER",
  "SHOP",
  "GROOMING",
  "HOTEL",
  "PARK",
  "LOST_PET"
];
const RADIUS_OPTIONS = [5, 10, 20, 35, 50];

function mapTypeLabel(type: MapServiceType) {
  if (type === "VET") return "Veterinaria";
  if (type === "CAREGIVER") return "Cuidador";
  if (type === "SHOP") return "Pet shop";
  if (type === "GROOMING") return "Peluqueria";
  if (type === "HOTEL") return "Hotel";
  if (type === "PARK") return "Parque";
  return "Perdida";
}

function typeBadgeClass(type: MapServiceType) {
  if (type === "VET") return "bg-brand-50 text-brand-700";
  if (type === "CAREGIVER") return "bg-sky-100 text-sky-700";
  if (type === "SHOP") return "bg-accent-50 text-accent-700";
  if (type === "GROOMING") return "bg-pink-100 text-pink-700";
  if (type === "HOTEL") return "bg-violet-100 text-violet-700";
  if (type === "PARK") return "bg-lime-100 text-lime-700";
  return "bg-rose-100 text-rose-700";
}

function formatDistance(distanceKm: number | null) {
  if (distanceKm === null) return "Sin distancia";
  return `${distanceKm.toFixed(1)} km`;
}

function formatPrice(value: number | null) {
  if (value === null) return "Sin precio";
  return `Desde $${value.toLocaleString("es-CL")}`;
}

function formatRating(value: number | null, reviewsCount: number) {
  if (value === null) return "Sin calificacion";
  if (reviewsCount > 0) return `${value.toFixed(1)} (${reviewsCount})`;
  return value.toFixed(1);
}

function sortLabel(value: MapSortBy) {
  if (value === "distance") return "Distancia";
  if (value === "recent") return "Reciente";
  if (value === "rating") return "Calificacion";
  return "Relevancia";
}

interface LocationPoint {
  lat: number;
  lng: number;
}

function ResultCard({
  point,
  selected,
  onSelect,
  onOpenProfile
}: {
  point: MapServicePoint;
  selected: boolean;
  onSelect: (id: string) => void;
  onOpenProfile: (point: MapServicePoint) => void;
}) {
  return (
    <article
      className={`rounded-2xl border p-3 ${selected ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-900"}`}
    >
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {point.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={point.imageUrl} alt={point.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-500">
              Sin foto
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${selected ? "bg-white/20 text-white" : typeBadgeClass(point.type)}`}>
              {mapTypeLabel(point.type)}
            </span>
            {point.isEmergency24x7 && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${selected ? "bg-red-500/30 text-red-100" : "bg-red-100 text-red-700"}`}>
                24/7
              </span>
            )}
          </div>
          <h3 className="truncate text-sm font-bold">{point.name}</h3>
          {point.address && <p className={`truncate text-xs ${selected ? "text-slate-200" : "text-slate-500"}`}>{point.address}</p>}
        </div>
      </div>

      <div className={`mt-2 grid grid-cols-2 gap-2 text-[11px] ${selected ? "text-slate-200" : "text-slate-600"}`}>
        <p>{formatDistance(point.distanceKm)}</p>
        <p>{formatRating(point.rating, point.reviewsCount)}</p>
        <p>{formatPrice(point.priceFrom)}</p>
        <p>{point.isOpenNow === null ? "Horario N/A" : point.isOpenNow ? "Abierto ahora" : "Cerrado ahora"}</p>
      </div>

      {point.services.length > 0 && (
        <p className={`mt-2 text-[11px] ${selected ? "text-slate-200" : "text-slate-600"}`}>
          Servicios: {point.services.slice(0, 3).join(", ")}
        </p>
      )}
      {point.discountLabel && (
        <p className={`text-[11px] ${selected ? "text-emerald-200" : "text-emerald-700"}`}>{point.discountLabel}</p>
      )}

      <div className="mt-2 grid grid-cols-3 gap-2">
        {point.bookingUrl ? (
          <Link href={point.bookingUrl} className={`inline-flex min-h-10 items-center justify-center rounded-lg text-[11px] font-semibold ${selected ? "bg-white text-slate-900" : "bg-slate-900 text-white"}`}>
            Reservar
          </Link>
        ) : (
          <button type="button" disabled className={`inline-flex min-h-10 items-center justify-center rounded-lg text-[11px] font-semibold ${selected ? "bg-white/20 text-slate-200" : "bg-slate-100 text-slate-400"}`}>
            Reservar
          </button>
        )}

        <button
          type="button"
          onClick={() => onOpenProfile(point)}
          className={`inline-flex min-h-10 items-center justify-center rounded-lg border text-[11px] font-semibold ${selected ? "border-white/60 text-white" : "border-slate-300 text-slate-700"}`}
        >
          Ver perfil
        </button>

        {point.phone ? (
          <a
            href={`tel:${point.phone.replace(/\s+/g, "")}`}
            className={`inline-flex min-h-10 items-center justify-center rounded-lg border text-[11px] font-semibold ${selected ? "border-white/60 text-white" : "border-slate-300 text-slate-700"}`}
          >
            Contactar
          </a>
        ) : (
          <button type="button" disabled className={`inline-flex min-h-10 items-center justify-center rounded-lg border text-[11px] font-semibold ${selected ? "border-white/30 text-slate-300" : "border-slate-200 text-slate-400"}`}>
            Contactar
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onSelect(point.id)}
        className={`mt-2 w-full rounded-lg px-3 py-2 text-[11px] font-semibold ${selected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"}`}
      >
        Centrar en mapa
      </button>
    </article>
  );
}

export default function MapPage() {
  const [queryText, setQueryText] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<MapServiceType[]>(MAP_TYPES);
  const [openNow, setOpenNow] = useState(false);
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [withDiscount, setWithDiscount] = useState(false);
  const [atHomeOnly, setAtHomeOnly] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [includeLostPets, setIncludeLostPets] = useState(true);
  const [sortBy, setSortBy] = useState<MapSortBy>("relevance");
  const [radiusKm, setRadiusKm] = useState(20);
  const [minRating, setMinRating] = useState(0);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [location, setLocation] = useState<LocationPoint | null>(null);

  const [data, setData] = useState<MapServicesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [profilePoint, setProfilePoint] = useState<MapServicePoint | null>(null);
  const [mobileSheetExpanded, setMobileSheetExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<MapSuggestion[]>([]);

  const points = data?.items ?? [];
  const countsSummary = useMemo(
    () =>
      data
        ? [
            { label: "Vets", value: data.meta.countsByType.VET },
            { label: "Cuid.", value: data.meta.countsByType.CAREGIVER },
            { label: "Tiendas", value: data.meta.countsByType.SHOP },
            { label: "Peluq.", value: data.meta.countsByType.GROOMING },
            { label: "Hoteles", value: data.meta.countsByType.HOTEL },
            { label: "Parques", value: data.meta.countsByType.PARK },
            { label: "Perdidas", value: data.meta.countsByType.LOST_PET }
          ]
        : [],
    [data]
  );

  const buildQueryFromState = (nextLocation?: LocationPoint | null): MapServicesQuery => {
    const activeLocation = nextLocation !== undefined ? nextLocation : location;
    return {
      q: queryText.trim() || undefined,
      service: serviceFilter.trim() || undefined,
      city: city.trim() || undefined,
      district: district.trim() || undefined,
      types: selectedTypes,
      openNow,
      emergencyOnly,
      withDiscount,
      atHomeOnly,
      featuredOnly,
      includeLostPets,
      minRating: minRating > 0 ? minRating : undefined,
      priceMin: priceMin.trim() ? Number(priceMin) : undefined,
      priceMax: priceMax.trim() ? Number(priceMax) : undefined,
      sortBy,
      radiusKm: activeLocation ? radiusKm : undefined,
      lat: activeLocation?.lat,
      lng: activeLocation?.lng,
      limit: 220
    };
  };

  const runSearch = async (locationOverride?: LocationPoint | null) => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await listMapServices(buildQueryFromState(locationOverride));
      setData(payload);
      setSelectedPointId((current) => current && payload.items.some((point) => point.id === current) ? current : payload.items[0]?.id ?? null);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "No se pudo cargar mapa pet.");
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
      void listMapSuggestions({ q: needle, limit: 8 })
        .then((result) => setSuggestions(result.items))
        .catch(() => setSuggestions([]));
    }, 220);
    return () => clearTimeout(timeout);
  }, [queryText]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
        void runSearch(nextLocation);
      },
      (locationError) => setError(locationError.message || "No fue posible obtener tu ubicacion."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const pickSuggestion = (suggestion: MapSuggestion) => {
    if (suggestion.kind === "city") setCity(suggestion.value);
    else if (suggestion.kind === "district") setDistrict(suggestion.value);
    else if (suggestion.kind === "service") setServiceFilter(suggestion.value);
    else setQueryText(suggestion.value);
    setSuggestions([]);
  };

  const toggleType = (type: MapServiceType) =>
    setSelectedTypes((current) => {
      if (current.includes(type)) {
        return current.length === 1 ? current : current.filter((item) => item !== type);
      }
      return [...current, type];
    });

  return (
    <div className="space-y-4">
      <PageIntro
        eyebrow="Descubrimiento"
        title="Mapa pet"
        description="Explora servicios pet, veterinarias, tiendas, parques y alertas con clustering, filtros avanzados y una experiencia optimizada para movil."
        tone="community"
        metrics={
          data
            ? [
                { value: String(data.meta.total), label: "resultados" },
                { value: String(selectedTypes.length), label: "tipos activos" }
              ]
            : undefined
        }
      />

      {error && <InlineBanner tone="error">{error}</InlineBanner>}

      <form onSubmit={handleSubmit} className="kumpa-panel space-y-3 p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="relative text-sm font-semibold text-slate-700 md:col-span-2 lg:col-span-2">
            Busqueda
            <input value={queryText} onChange={(event) => setQueryText(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Zona, direccion, veterinaria..." />
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+0.2rem)] z-20 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                {suggestions.map((suggestion) => (
                  <button key={`${suggestion.kind}-${suggestion.value}`} type="button" onClick={() => pickSuggestion(suggestion)} className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50">
                    <span>{suggestion.value}</span>
                    <span className="text-xs text-slate-500">{suggestion.kind}</span>
                  </button>
                ))}
              </div>
            )}
          </label>
          <label className="text-sm font-semibold text-slate-700">Servicio
            <input value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-semibold text-slate-700">Orden
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as MapSortBy)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="relevance">Relevancia</option><option value="distance">Distancia</option><option value="rating">Calificacion</option><option value="recent">Reciente</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">Ciudad
            <input value={city} onChange={(event) => setCity(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-semibold text-slate-700">Comuna
            <input value={district} onChange={(event) => setDistrict(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-semibold text-slate-700">Rating min
            <select value={minRating} onChange={(event) => setMinRating(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value={0}>Sin filtro</option><option value={3}>3.0+</option><option value={3.5}>3.5+</option><option value={4}>4.0+</option><option value={4.5}>4.5+</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">Precio min
            <input inputMode="numeric" value={priceMin} onChange={(event) => setPriceMin(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-semibold text-slate-700">Precio max
            <input inputMode="numeric" value={priceMax} onChange={(event) => setPriceMax(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">{MAP_TYPES.map((type) => <button key={type} type="button" onClick={() => toggleType(type)} className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${selectedTypes.includes(type) ? "border-accent-200 bg-accent-500 text-slate-950 shadow-[0_10px_20px_rgba(255,159,28,0.16)]" : "border-slate-300 bg-white text-slate-700"}`}>{mapTypeLabel(type)}</button>)}</div>
        <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-3 lg:grid-cols-4">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={openNow} onChange={(event) => setOpenNow(event.target.checked)} />Abierto ahora</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={emergencyOnly} onChange={(event) => setEmergencyOnly(event.target.checked)} />Urgencias 24/7</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={withDiscount} onChange={(event) => setWithDiscount(event.target.checked)} />Con descuento</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={atHomeOnly} onChange={(event) => setAtHomeOnly(event.target.checked)} />A domicilio</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={featuredOnly} onChange={(event) => setFeaturedOnly(event.target.checked)} />Destacados</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={includeLostPets} onChange={(event) => setIncludeLostPets(event.target.checked)} />Incluir perdidas</label>
          <label className="text-sm font-semibold text-slate-700">Radio
            <select value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} disabled={!location} className="ml-2 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs">{RADIUS_OPTIONS.map((option) => <option key={option} value={option}>{option} km</option>)}</select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={isLoading} className="kumpa-button-accent">{isLoading ? "Buscando..." : "Aplicar filtros"}</button>
          <button type="button" onClick={handleUseMyLocation} className="kumpa-button-secondary">Usar mi ubicacion</button>
          {location && <button type="button" onClick={() => { setLocation(null); void runSearch(null); }} className="kumpa-button-secondary">Quitar ubicacion</button>}
        </div>
        <div className="grid gap-2 text-xs text-slate-600 md:grid-cols-4 lg:grid-cols-7">{countsSummary.map((item) => <p key={item.label} className="rounded-lg bg-slate-50 px-2 py-1"><span className="font-semibold text-slate-900">{item.value}</span> {item.label}</p>)}</div>
      </form>

      <div className="md:hidden">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200">
          <MapCanvas accessToken={MAPBOX_TOKEN} points={points} selectedPointId={selectedPointId} onSelectPoint={setSelectedPointId} className="h-[66vh] w-full rounded-none border-0" />
          <section className={`absolute inset-x-0 bottom-0 z-20 rounded-t-2xl border-t border-slate-200 bg-white/95 shadow-xl transition-transform ${mobileSheetExpanded ? "translate-y-0" : "translate-y-[62%]"}`}>
            <button type="button" onClick={() => setMobileSheetExpanded((value) => !value)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold">
              <span>{data ? `${data.meta.returned}/${data.meta.total}` : "0/0"} resultados ({sortLabel(sortBy)})</span><span>{mobileSheetExpanded ? "Ocultar" : "Ver lista"}</span>
            </button>
            <div className="max-h-[45vh] space-y-2 overflow-y-auto p-3">{points.map((point) => <ResultCard key={point.id} point={point} selected={point.id === selectedPointId} onSelect={setSelectedPointId} onOpenProfile={setProfilePoint} />)}</div>
          </section>
        </div>
      </div>

      <div className="hidden gap-4 md:grid md:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="kumpa-panel space-y-2 p-3">
          <div className="flex items-center justify-between px-1"><h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Listado</h2><span className="text-xs text-slate-500">{data ? `${data.meta.returned}/${data.meta.total}` : "0/0"}</span></div>
          <div className="max-h-[74vh] space-y-2 overflow-y-auto pr-1">{points.map((point) => <ResultCard key={point.id} point={point} selected={point.id === selectedPointId} onSelect={setSelectedPointId} onOpenProfile={setProfilePoint} />)}</div>
        </aside>
        <section className="space-y-3">
          <MapCanvas accessToken={MAPBOX_TOKEN} points={points} selectedPointId={selectedPointId} onSelectPoint={setSelectedPointId} className="h-[74vh] w-full" />
          <div className="kumpa-panel p-4 text-xs text-slate-600"><p>Mapa client-side con clustering y coordenadas [lng, lat].</p>{data?.meta.referenceLocation && <p className="mt-2">Ubicacion activa: {data.meta.referenceLocation.radiusKm} km.</p>}</div>
        </section>
      </div>

      {profilePoint && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-900/50 p-3 md:items-center md:justify-center">
          <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{mapTypeLabel(profilePoint.type)}</p><h2 className="text-lg font-black text-slate-900">{profilePoint.name}</h2>{profilePoint.subtitle && <p className="text-sm text-slate-600">{profilePoint.subtitle}</p>}</div>
              <button type="button" onClick={() => setProfilePoint(null)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">Cerrar</button>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              {profilePoint.address && <p><span className="font-semibold">Direccion:</span> {profilePoint.address}</p>}
              <p><span className="font-semibold">Distancia:</span> {formatDistance(profilePoint.distanceKm)}</p>
              <p><span className="font-semibold">Calificacion:</span> {formatRating(profilePoint.rating, profilePoint.reviewsCount)}</p>
              <p><span className="font-semibold">Precio:</span> {formatPrice(profilePoint.priceFrom)}</p>
              {profilePoint.openingHours.length > 0 && <p><span className="font-semibold">Horarios:</span> {profilePoint.openingHours.join(" | ")}</p>}
              {profilePoint.services.length > 0 && <p><span className="font-semibold">Servicios:</span> {profilePoint.services.join(", ")}</p>}
              {profilePoint.description && <p><span className="font-semibold">Descripcion:</span> {profilePoint.description}</p>}
              {profilePoint.discountLabel && <p className="text-emerald-700"><span className="font-semibold">Descuento:</span> {profilePoint.discountLabel}</p>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {profilePoint.bookingUrl && <Link href={profilePoint.bookingUrl} className="kumpa-button-accent">Reservar</Link>}
              {profilePoint.phone && <a href={`tel:${profilePoint.phone.replace(/\s+/g, "")}`} className="kumpa-button-secondary">Llamar</a>}
              <button type="button" onClick={() => { setSelectedPointId(profilePoint.id); setMobileSheetExpanded(false); setProfilePoint(null); }} className="kumpa-button-secondary">Ver en mapa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


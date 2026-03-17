"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { EmptyState } from "@/components/feedback/empty-state";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { PageIntro } from "@/components/layout/page-intro";
import { MapCanvas } from "@/components/map/map-canvas";
import {
  reverseGeocodeLocation,
  searchAddressSuggestions,
  type GeocodingSuggestion
} from "@/features/map/geocoding";
import { useAuth } from "@/features/auth/auth-context";
import {
  createLostPetSighting,
  getLostPetAlert,
  updateLostPetAlert
} from "@/features/lost-pets/lost-pets-api";
import { lostPetAlertToMapPoints } from "@/features/lost-pets/map-points";
import type {
  LostPetAlertDetail,
  LostPetAlertStatus
} from "@/features/lost-pets/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

type SightingLocationMode = "current" | "search" | "pin";

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function statusLabel(status: LostPetAlertStatus) {
  if (status === "ACTIVE") return "Activa";
  if (status === "FOUND") return "Encontrada";
  return "Cerrada";
}

function statusTone(status: LostPetAlertStatus) {
  if (status === "ACTIVE") return "bg-rose-50 text-rose-700 border-rose-200";
  if (status === "FOUND") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function defaultSightingDateTime() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function LostPetDetailPage() {
  const params = useParams<{ id: string }>();
  const alertId = typeof params.id === "string" ? params.id : "";
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;

  const [alert, setAlert] = useState<LostPetAlertDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedMapPointId, setSelectedMapPointId] = useState<string | null>(null);

  const [sightingAt, setSightingAt] = useState(defaultSightingDateTime());
  const [locationMode, setLocationMode] = useState<SightingLocationMode>("current");
  const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [addressQuery, setAddressQuery] = useState("");
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodingSuggestion[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [comment, setComment] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const mapPoints = useMemo(
    () => (alert ? lostPetAlertToMapPoints(alert) : []),
    [alert]
  );

  const loadDetail = async () => {
    if (!accessToken || !alertId) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = await getLostPetAlert(accessToken, alertId);
      setAlert(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la alerta.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
  }, [accessToken, alertId]);

  useEffect(() => {
    if (!alert) return;
    setSelectedMapPointId((current) => current ?? `last-seen-${alert.id}`);
  }, [alert]);

  const resolveAddress = async (lat: number, lng: number) => {
    const resolved = await reverseGeocodeLocation(lat, lng).catch(() => null);
    if (resolved) {
      setAddress(resolved);
      setAddressQuery(resolved);
    }
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError("Tu dispositivo no permite usar ubicacion actual.");
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setPickedLocation(nextLocation);
        await resolveAddress(nextLocation.lat, nextLocation.lng);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setError("No se pudo obtener tu ubicacion actual.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000
      }
    );
  };

  const handleSearchAddress = async () => {
    if (!addressQuery.trim()) return;
    setIsSearchingAddress(true);
    setError(null);

    try {
      const rows = await searchAddressSuggestions(addressQuery, 5);
      setSuggestions(rows);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "No se pudo buscar la direccion.");
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleSuggestionSelect = (suggestion: GeocodingSuggestion) => {
    setPickedLocation({ lat: suggestion.lat, lng: suggestion.lng });
    setAddress(suggestion.address);
    setAddressQuery(suggestion.address);
    setSuggestions([]);
  };

  const handleMapPick = async (location: { lat: number; lng: number }) => {
    setPickedLocation(location);
    await resolveAddress(location.lat, location.lng);
  };

  const handleStatusChange = async (status: LostPetAlertStatus) => {
    if (!accessToken || !alert) return;

    setIsWorking(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateLostPetAlert(accessToken, alert.id, { status });
      setAlert(updated);
      setSuccess(`Caso actualizado a ${statusLabel(status).toLowerCase()}.`);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "No se pudo actualizar el estado.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleSightingSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !alert || !pickedLocation) {
      setError("Debes confirmar una ubicacion del avistamiento antes de publicar.");
      return;
    }

    setIsWorking(true);
    setError(null);
    setSuccess(null);

    try {
      await createLostPetSighting(accessToken, alert.id, {
        sightingAt: new Date(sightingAt).toISOString(),
        lat: pickedLocation.lat,
        lng: pickedLocation.lng,
        address: address || undefined,
        comment: comment || undefined,
        photoUrl: photoUrl || undefined
      });

      setComment("");
      setPhotoUrl("");
      setSuggestions([]);
      setSightingAt(defaultSightingDateTime());
      setSuccess("Avistamiento publicado correctamente.");
      await loadDetail();
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "No se pudo reportar el avistamiento.");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <AuthGate>
      <div className="space-y-6">
        <PageIntro
          eyebrow="Alertas"
          title={alert ? `Ayuda a encontrar a ${alert.pet.name}` : "Detalle de alerta"}
          description="El detalle prioriza ubicacion, difusion y avistamientos de forma clara. La accion principal es ayudar rapido, no completar un formulario tecnico."
          tone="alert"
          metrics={[
            { value: String(alert?.sightings.length ?? 0), label: "avistamientos" },
            { value: `${alert?.searchRadiusKm ?? 0} km`, label: "radio de difusion" },
            { value: statusLabel(alert?.status ?? "ACTIVE"), label: "estado" },
            {
              value: alert?.medicalPriority ? "Alta" : "Normal",
              label: "prioridad medica"
            }
          ]}
          actions={
            <>
              <Link href="/lost-pets" className="btn btn-outline">
                Volver a alertas
              </Link>
              <a href="#report-sighting" className="btn btn-primary">
                Yo la vi
              </a>
            </>
          }
        />

        {error ? <InlineBanner tone="error">{error}</InlineBanner> : null}
        {success ? <InlineBanner tone="success">{success}</InlineBanner> : null}

        {isLoading || !alert ? (
          <section className="card p-6 text-sm text-[hsl(var(--muted-foreground))]">
            Cargando alerta...
          </section>
        ) : (
          <>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_360px]">
              <section className="card p-5">
                <p className="kumpa-eyebrow">Mapa del caso</p>
                <h2 className="mt-2 text-xl font-semibold">Ultima ubicacion y avistamientos</h2>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  Reune la ultima ubicacion conocida y los reportes comunitarios para entender mejor el recorrido.
                </p>
                <MapCanvas
                  accessToken={MAPBOX_TOKEN}
                  points={mapPoints}
                  selectedPointId={selectedMapPointId}
                  onSelectPoint={setSelectedMapPointId}
                  center={{
                    lat: alert.lastSeenLat,
                    lng: alert.lastSeenLng
                  }}
                  className="mt-4 h-[48vh] w-full"
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="kumpa-chip">
                    Ultima vez vista: {formatDate(alert.lastSeenAt)}
                  </span>
                  <span className="kumpa-chip">
                    {alert.sightings.length} avistamientos
                  </span>
                  {alert.lastSeenAddress ? (
                    <span className="kumpa-chip">{alert.lastSeenAddress}</span>
                  ) : null}
                </div>
              </section>

              <aside className="space-y-4">
                <section className="card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="kumpa-eyebrow">Caso activo</p>
                      <h2 className="mt-2 text-xl font-semibold">{alert.pet.name}</h2>
                      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        {alert.pet.species} | {alert.pet.breed}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(alert.status)}`}>
                      {statusLabel(alert.status)}
                    </span>
                  </div>
                  {alert.description ? (
                    <p className="mt-3 text-sm leading-6 text-[hsl(var(--foreground))]">
                      {alert.description}
                    </p>
                  ) : null}
                  {alert.emergencyNotes ? (
                    <div className="mt-4 rounded-[1.3rem] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      {alert.emergencyNotes}
                    </div>
                  ) : null}
                  <div className="mt-4 space-y-3">
                    <div className="kumpa-metric">
                      <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                        Zona
                      </p>
                      <p className="mt-2 text-sm font-semibold">
                        {alert.lastSeenAddress || "Ubicacion aproximada en mapa"}
                      </p>
                    </div>
                    <div className="kumpa-metric">
                      <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                        Como ayudar
                      </p>
                      <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                        Comparte la alerta, abre el mapa, reporta un avistamiento y usa el perfil publico para difundir.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={`/lost-pets/public/${alert.shareToken}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline"
                    >
                      Ver perfil publico
                    </a>
                    <a href="#report-sighting" className="btn btn-primary">
                      Reportar avistamiento
                    </a>
                  </div>
                </section>

                <section className="card p-5">
                  <p className="kumpa-eyebrow">Gestion del caso</p>
                  <h2 className="mt-2 text-xl font-semibold">Acciones del duenio</h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {alert.permissions.canCloseAlert && alert.status === "ACTIVE" ? (
                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => {
                          void handleStatusChange("FOUND");
                        }}
                        className="btn btn-primary"
                      >
                        Marcar encontrada
                      </button>
                    ) : null}
                    {alert.permissions.canCloseAlert && alert.status !== "CLOSED" ? (
                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => {
                          void handleStatusChange("CLOSED");
                        }}
                        className="btn btn-outline"
                      >
                        Cerrar caso
                      </button>
                    ) : null}
                    {alert.permissions.canEditAlert && alert.status !== "ACTIVE" ? (
                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => {
                          void handleStatusChange("ACTIVE");
                        }}
                        className="btn btn-outline"
                      >
                        Reabrir alerta
                      </button>
                    ) : null}
                  </div>
                </section>
              </aside>
            </div>

            <section id="report-sighting" className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_360px]">
              <section className="card p-5">
                <p className="kumpa-eyebrow">Yo la vi</p>
                <h2 className="mt-2 text-xl font-semibold">Reportar avistamiento sin coordenadas manuales</h2>
                {!alert.permissions.canReportSighting ? (
                  <div className="mt-4 rounded-[1.4rem] bg-[hsl(var(--muted)/0.7)] p-4 text-sm text-[hsl(var(--muted-foreground))]">
                    Esta alerta ya no recibe nuevos avistamientos porque el caso no esta activo.
                  </div>
                ) : (
                  <form onSubmit={(event) => void handleSightingSubmit(event)} className="mt-4 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setLocationMode("current")}
                        className={`kumpa-chip ${locationMode === "current" ? "kumpa-chip-active" : ""}`}
                      >
                        Usar mi ubicacion
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocationMode("search")}
                        className={`kumpa-chip ${locationMode === "search" ? "kumpa-chip-active" : ""}`}
                      >
                        Buscar direccion
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocationMode("pin")}
                        className={`kumpa-chip ${locationMode === "pin" ? "kumpa-chip-active" : ""}`}
                      >
                        Mover pin en mapa
                      </button>
                    </div>

                    {locationMode === "current" ? (
                      <div className="rounded-[1.4rem] border border-[hsl(var(--border))] bg-white/70 p-4">
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          Usa la ubicacion actual del telefono para registrar rapido donde la viste.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            void handleUseCurrentLocation();
                          }}
                          className="btn btn-primary mt-4"
                        >
                          {isLocating ? "Buscando ubicacion..." : "Usar mi ubicacion"}
                        </button>
                      </div>
                    ) : null}

                    {locationMode === "search" ? (
                      <div className="rounded-[1.4rem] border border-[hsl(var(--border))] bg-white/70 p-4">
                        <div className="flex gap-2">
                          <input
                            value={addressQuery}
                            onChange={(event) => setAddressQuery(event.target.value)}
                            placeholder="Busca calle, comuna o referencia"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              void handleSearchAddress();
                            }}
                            className="btn btn-outline"
                          >
                            {isSearchingAddress ? "Buscando..." : "Buscar"}
                          </button>
                        </div>
                        {suggestions.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {suggestions.map((suggestion) => (
                              <button
                                key={suggestion.id}
                                type="button"
                                onClick={() => handleSuggestionSelect(suggestion)}
                                className="block w-full rounded-[1.2rem] border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.45)] px-4 py-3 text-left"
                              >
                                <p className="text-sm font-semibold">{suggestion.label}</p>
                                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                                  {suggestion.address}
                                </p>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="rounded-[1.4rem] border border-[hsl(var(--border))] bg-white/70 p-4">
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {locationMode === "pin"
                          ? "Toca el mapa para dejar el pin exacto del avistamiento."
                          : "Tambien puedes ajustar manualmente el punto del avistamiento en el mapa."}
                      </p>
                      <MapCanvas
                        accessToken={MAPBOX_TOKEN}
                        points={mapPoints}
                        selectedPointId={selectedMapPointId}
                        onSelectPoint={setSelectedMapPointId}
                        pickedLocation={pickedLocation}
                        onPickLocation={(location) => {
                          void handleMapPick(location);
                        }}
                        center={pickedLocation ?? { lat: alert.lastSeenLat, lng: alert.lastSeenLng }}
                        className="mt-4 h-[38vh] w-full"
                      />
                    </div>

                    <label className="block text-sm font-semibold text-[hsl(var(--foreground))]">
                      Fecha y hora aproximada
                      <input
                        type="datetime-local"
                        value={sightingAt}
                        onChange={(event) => setSightingAt(event.target.value)}
                        className="mt-2"
                      />
                    </label>

                    <label className="block text-sm font-semibold text-[hsl(var(--foreground))]">
                      Direccion o referencia
                      <input
                        value={address}
                        onChange={(event) => setAddress(event.target.value)}
                        placeholder="Ejemplo: frente a la plaza, esquina del supermercado"
                        className="mt-2"
                      />
                    </label>

                    <label className="block text-sm font-semibold text-[hsl(var(--foreground))]">
                      Que viste
                      <textarea
                        rows={3}
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        placeholder="Cuenta si estaba sola, corriendo, con collar o si parecia lesionada."
                        className="mt-2"
                      />
                    </label>

                    <label className="block text-sm font-semibold text-[hsl(var(--foreground))]">
                      URL de foto opcional
                      <input
                        type="url"
                        value={photoUrl}
                        onChange={(event) => setPhotoUrl(event.target.value)}
                        placeholder="Si tienes una foto o video publico, puedes pegar el enlace."
                        className="mt-2"
                      />
                    </label>

                    <button type="submit" disabled={isWorking} className="btn btn-primary">
                      {isWorking ? "Publicando..." : "Publicar avistamiento"}
                    </button>
                  </form>
                )}
              </section>

              <aside className="space-y-4">
                <section className="card p-5">
                  <p className="kumpa-eyebrow">Resumen del avistamiento</p>
                  <div className="mt-4 space-y-3">
                    <div className="kumpa-metric">
                      <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                        Ubicacion elegida
                      </p>
                      <p className="mt-2 text-sm">
                        {pickedLocation
                          ? `${pickedLocation.lat.toFixed(5)}, ${pickedLocation.lng.toFixed(5)}`
                          : "Aun no eliges una ubicacion"}
                      </p>
                    </div>
                    <div className="kumpa-metric">
                      <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                        Referencia
                      </p>
                      <p className="mt-2 text-sm">
                        {address || "Agrega una direccion o una referencia facil de reconocer"}
                      </p>
                    </div>
                    <div className="kumpa-metric">
                      <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                        Fecha y hora
                      </p>
                      <p className="mt-2 text-sm">{formatDate(new Date(sightingAt).toISOString())}</p>
                    </div>
                  </div>
                </section>

                <section className="card p-5">
                  <p className="kumpa-eyebrow">Como ayudar mejor</p>
                  <div className="mt-3 space-y-3 text-sm leading-6 text-[hsl(var(--foreground))]">
                    <p>Comparte la alerta si reconoces la zona o el recorrido.</p>
                    <p>Si la vuelves a ver, actualiza la ubicacion para afinar la busqueda.</p>
                    <p>Si esta herida o en riesgo, mencionalo en el comentario.</p>
                  </div>
                </section>
              </aside>
            </section>

            <section className="card p-5">
              <p className="kumpa-eyebrow">Historial</p>
              <h2 className="mt-2 text-xl font-semibold">Avistamientos reportados</h2>
              {alert.sightings.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    title="Todavia no hay avistamientos reportados"
                    description="Cuando alguien la vea, el caso se ira enriqueciendo con nuevas ubicaciones y comentarios utiles."
                  />
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  {alert.sightings.map((sighting) => (
                    <article
                      key={sighting.id}
                      className="rounded-[1.4rem] border border-[hsl(var(--border))] bg-white/70 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">
                            {formatDate(sighting.sightingAt)} | {sighting.reporter?.fullName ?? "Usuario"}
                          </p>
                          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                            {sighting.address || `${sighting.lat}, ${sighting.lng}`}
                          </p>
                        </div>
                        {sighting.photoUrl ? (
                          <a
                            href={sighting.photoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline text-xs"
                          >
                            Ver foto
                          </a>
                        ) : null}
                      </div>
                      {sighting.comment ? (
                        <p className="mt-3 text-sm leading-6 text-[hsl(var(--foreground))]">
                          {sighting.comment}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AuthGate>
  );
}

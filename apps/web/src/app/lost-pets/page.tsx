"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { EmptyState } from "@/components/feedback/empty-state";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { SurfaceSkeleton } from "@/components/feedback/skeleton";
import { PageIntro } from "@/components/layout/page-intro";
import { MapCanvas } from "@/components/map/map-canvas";
import { useAuth } from "@/features/auth/auth-context";
import { listLostPetAlerts, listNearbyLostPetAlerts } from "@/features/lost-pets/lost-pets-api";
import type { LostPetAlert, LostPetAlertStatus } from "@/features/lost-pets/types";
import { useToast } from "@/features/ui/toast-context";
import type { MapServicePoint } from "@/features/map/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function formatDistance(value?: number | null) {
  if (value === null || value === undefined) return null;
  return `${value.toFixed(1)} km`;
}

function alertToMapPoint(alert: LostPetAlert): MapServicePoint {
  return {
    id: alert.id,
    sourceId: alert.id,
    type: "LOST_PET",
    name: alert.pet.name,
    subtitle: alert.lastSeenAddress ?? "Ultima ubicacion registrada",
    description: alert.description ?? null,
    latitude: alert.lastSeenLat,
    longitude: alert.lastSeenLng,
    address: alert.lastSeenAddress ?? null,
    city: alert.owner.city ?? null,
    district: null,
    phone: alert.owner.phone ?? null,
    imageUrl: alert.pet.primaryPhotoUrl ?? null,
    services: [],
    openingHours: [],
    priceInfo: [],
    priceFrom: null,
    hasDiscount: false,
    discountLabel: null,
    isEmergency24x7: false,
    isOpenNow: null,
    medicalPriority: alert.medicalPriority,
    supportsAtHome: false,
    isFeatured: alert.medicalPriority,
    rating: null,
    reviewsCount: 0,
    distanceKm: alert.distanceKm ?? null,
    bookingUrl: null,
    profileUrl: null,
    createdAt: alert.createdAt
  };
}

export default function LostPetsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.tokens.accessToken;

  const [alerts, setAlerts] = useState<LostPetAlert[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"nearby" | "all" | "mine">("nearby");
  const [statusFilter, setStatusFilter] = useState<LostPetAlertStatus | "">("");
  const [radiusKm, setRadiusKm] = useState(20);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const points = useMemo(() => alerts.map(alertToMapPoint), [alerts]);
  const activeAlerts = alerts.filter((alert) => alert.status === "ACTIVE");

  const loadAlerts = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);

    try {
      const rows =
        filter === "nearby" && location
          ? await listNearbyLostPetAlerts(accessToken, {
              lat: location.lat,
              lng: location.lng,
              radiusKm,
              limit: 50
            })
          : await listLostPetAlerts(accessToken, {
              mine: filter === "mine",
              status: statusFilter || undefined,
              activeOnly: !statusFilter && filter !== "mine",
              limit: 50
            });

      setAlerts(rows);
      setSelectedPointId(rows[0]?.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar alertas.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    if (filter === "nearby" && !location && typeof navigator !== "undefined") {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          setFilter("all");
        },
        { enableHighAccuracy: true, timeout: 7000, maximumAge: 600000 }
      );
      return;
    }

    void loadAlerts();
  }, [accessToken, filter, statusFilter, radiusKm, location]);

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
        setFilter("nearby");
      },
      (locationError) => {
        setError(locationError.message || "No fue posible obtener tu ubicacion.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleShareAlert = async (alert: LostPetAlert) => {
    const shareUrl = `${window.location.origin}/lost-pets/public/${alert.shareToken}`;
    const canNativeShare = typeof navigator.share === "function";

    try {
      if (canNativeShare) {
        await navigator.share({
          title: `Alerta por ${alert.pet.name}`,
          text: `Ayuda a difundir esta alerta pet.`,
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }

      showToast({
        tone: "success",
        title: "Alerta lista para compartir",
        description: canNativeShare
          ? "Se abrio el panel de compartir."
          : "El link se copio al portapapeles."
      });
    } catch {
      setError("No se pudo compartir esta alerta.");
    }
  };

  return (
    <AuthGate>
      <div className="space-y-6">
        <PageIntro
          eyebrow="Alertas"
          title="Actua rapido cuando una mascota se pierde"
          description="Alertas activas cerca de ti, mapa de reportes, tus publicaciones y acciones claras para ayudar sin una interfaz burocratica."
          tone="alert"
          metrics={[
            { value: String(activeAlerts.length), label: "activas" },
            { value: String(alerts.length), label: "en pantalla" },
            { value: String(radiusKm), label: "km de radio" },
            { value: filter === "mine" ? "mis alertas" : filter === "nearby" ? "cerca de mi" : "todas", label: "modo" }
          ]}
          actions={
            <>
              <Link href="/lost-pets/report" className="btn btn-primary">
                Reportar mascota perdida
              </Link>
              <button
                type="button"
                onClick={() => {
                  document.getElementById("alert-list")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="btn btn-outline"
              >
                Vi una mascota
              </button>
            </>
          }
        />

        {error && <InlineBanner tone="error">{error}</InlineBanner>}

        <section className="kumpa-soft-section p-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilter("nearby")}
              className={`kumpa-chip ${filter === "nearby" ? "kumpa-chip-active" : ""}`}
            >
              Alertas activas cerca de mi
            </button>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`kumpa-chip ${filter === "all" ? "kumpa-chip-active" : ""}`}
            >
              Todas las alertas
            </button>
            <button
              type="button"
              onClick={() => setFilter("mine")}
              className={`kumpa-chip ${filter === "mine" ? "kumpa-chip-active" : ""}`}
            >
              Mis alertas
            </button>
            <button type="button" onClick={handleUseMyLocation} className="btn btn-outline">
              {location ? "Actualizar mi ubicacion" : "Usar mi ubicacion"}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as LostPetAlertStatus | "")}>
              <option value="">Solo activas</option>
              <option value="ACTIVE">Activas</option>
              <option value="FOUND">Encontradas</option>
              <option value="CLOSED">Cerradas</option>
            </select>

            {filter === "nearby" && (
              <select value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))}>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={20}>20 km</option>
                <option value={50}>50 km</option>
              </select>
            )}
          </div>
        </section>

        {isLoading ? (
          <>
            <SurfaceSkeleton blocks={5} />
            <SurfaceSkeleton blocks={4} />
          </>
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-3">
              <article className="kumpa-urgent-card rounded-[1.7rem] p-5 lg:col-span-2">
                <p className="kumpa-eyebrow">Perdidas cerca de ti</p>
                <h2 className="mt-3 text-2xl font-semibold">
                  {activeAlerts[0]
                    ? `${activeAlerts[0].pet.name} necesita ayuda ahora`
                    : "No hay alertas activas cercanas en este momento"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  {activeAlerts[0]
                    ? `${activeAlerts[0].lastSeenAddress ?? "Zona cercana"} · ${
                        formatDistance(activeAlerts[0].distanceKm) ?? "distancia estimada"
                      }`
                    : "Seguiremos destacando aqui los casos activos con mayor urgencia."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/lost-pets/report" className="btn btn-primary">
                    Reportar mascota perdida
                  </Link>
                  {activeAlerts[0] ? (
                    <Link
                      href={`/lost-pets/${activeAlerts[0].id}#report-sighting`}
                      className="btn btn-secondary"
                    >
                      Yo la vi
                    </Link>
                  ) : null}
                </div>
              </article>

              <article className="card p-5">
                <p className="kumpa-eyebrow">Ayuda inmediata</p>
                <div className="mt-4 space-y-3 text-sm">
                  <p>Comparte la alerta si reconoces la zona o el recorrido.</p>
                  <p>Usa el mapa para ubicar la ultima zona conocida.</p>
                  <p>Si la viste, reporta el punto al instante desde &quot;Yo la vi&quot;.</p>
                </div>
              </article>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_390px]">
              <MapCanvas
                accessToken={MAPBOX_TOKEN}
                points={points}
                selectedPointId={selectedPointId}
                onSelectPoint={setSelectedPointId}
                className="h-[360px] w-full rounded-[1.8rem] lg:h-[620px]"
              />

              <aside className="space-y-4 xl:max-h-[620px] xl:overflow-y-auto xl:pr-1">
                {alerts.slice(0, 6).map((alert) => (
                  <article
                    key={alert.id}
                    className={`${alert.status === "ACTIVE" ? "kumpa-urgent-card" : "card"} rounded-[1.6rem] p-4 ${
                      selectedPointId === alert.id ? "kumpa-focus-ring" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="h-28 w-28 overflow-hidden rounded-[1.35rem] bg-[hsl(var(--muted))]">
                        {alert.pet.primaryPhotoUrl ? (
                          <img src={alert.pet.primaryPhotoUrl} alt={alert.pet.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-[hsl(var(--muted-foreground))]">
                            {alert.pet.name.slice(0, 1)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                          <h3 className="truncate text-lg font-semibold">{alert.pet.name}</h3>
                          <p className="text-sm text-[hsl(var(--muted-foreground))]">
                            {alert.lastSeenAddress ?? "Zona no informada"}
                          </p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${alert.medicalPriority ? "bg-red-600 text-white" : "kumpa-status-warning"}`}>
                          {alert.medicalPriority ? "Urgente" : "Activa"}
                        </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {formatDistance(alert.distanceKm) ? (
                            <span className="kumpa-chip">{formatDistance(alert.distanceKm)}</span>
                          ) : null}
                          <span className="kumpa-chip">{alert.stats.sightingsCount} avistamientos</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                          <span>{formatDate(alert.lastSeenAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/lost-pets/${alert.id}#report-sighting`} className="btn btn-secondary">
                        Yo la vi
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          void handleShareAlert(alert);
                        }}
                        className="btn btn-outline text-xs"
                      >
                        Compartir
                      </button>
                      <Link href={`/lost-pets/${alert.id}`} className="btn btn-outline text-xs">
                        Ver detalle
                      </Link>
                    </div>
                  </article>
                ))}
              </aside>
            </section>

            <section id="alert-list" className="space-y-4">
              <h2 className="kumpa-section-title">Alertas en detalle</h2>

              {alerts.length === 0 ? (
                <EmptyState
                  eyebrow="Alertas"
                  title="No hay alertas para esta vista"
                  description={
                    filter === "mine"
                      ? "Todavia no has publicado alertas."
                      : filter === "nearby"
                        ? "No encontramos mascotas perdidas cerca de tu ubicacion."
                        : "No hay alertas activas con estos filtros."
                  }
                />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {alerts.map((alert) => (
                    <article key={alert.id} className="card p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-semibold">{alert.pet.name}</h3>
                          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                            {alert.lastSeenAddress ?? "Zona no informada"}
                          </p>
                        </div>
                        <span className="rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 text-xs font-semibold">
                          {alert.status}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                        <p>Fecha: {formatDate(alert.lastSeenAt)}</p>
                        <p>Difusion: {alert.broadcastEnabled ? "Comunitaria activa" : "Solo registro"}</p>
                        <p>Radio: {alert.searchRadiusKm} km</p>
                        <p>Ayuda recibida: {alert.stats.sightingsCount} avistamientos</p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={`/lost-pets/${alert.id}#report-sighting`} className="btn btn-secondary text-xs">
                          Yo la vi
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            void handleShareAlert(alert);
                          }}
                          className="btn btn-outline text-xs"
                        >
                          Compartir
                        </button>
                        <Link href={`/lost-pets/${alert.id}`} className="btn btn-outline text-xs">
                          Ver detalle
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="kumpa-soft-section p-5">
              <h2 className="kumpa-section-title">Como ayudar</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="card p-4">
                  <p className="font-semibold">Compartir alerta</p>
                  <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                    Difunde el link publico en grupos, redes y contactos cercanos.
                  </p>
                </div>
                <div className="card p-4">
                  <p className="font-semibold">Reportar avistamiento</p>
                  <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                    Si viste una mascota, deja hora, lugar y observaciones desde la alerta.
                  </p>
                </div>
                <div className="card p-4">
                  <p className="font-semibold">Abrir mapa</p>
                  <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                    Revisa reportes cercanos y ubica rapidamente la ultima zona conocida.
                  </p>
                </div>
                <div className="card p-4">
                  <p className="font-semibold">Contactar al tutor</p>
                  <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                    Si la alerta lo permite, usa el detalle para informar con datos utiles y precisos.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </AuthGate>
  );
}

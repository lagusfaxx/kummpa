"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { PageIntro } from "@/components/layout/page-intro";
import { useAuth } from "@/features/auth/auth-context";
import { listLostPetAlerts, listNearbyLostPetAlerts } from "@/features/lost-pets/lost-pets-api";
import type { LostPetAlert, LostPetAlertStatus } from "@/features/lost-pets/types";

function statusLabel(status: LostPetAlertStatus) {
  if (status === "ACTIVE") return "Activa";
  if (status === "FOUND") return "Encontrada";
  return "Cerrada";
}

function statusClass(status: LostPetAlertStatus) {
  if (status === "ACTIVE") return "bg-rose-100 text-rose-700";
  if (status === "FOUND") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

export default function LostPetsPage() {
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;

  const [alerts, setAlerts] = useState<LostPetAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<LostPetAlertStatus | "">("");
  const [mine, setMine] = useState(false);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [radiusKm, setRadiusKm] = useState(20);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const loadAlerts = async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);
    try {
      const data =
        nearbyOnly && location
          ? await listNearbyLostPetAlerts(accessToken, {
              lat: location.lat,
              lng: location.lng,
              radiusKm,
              limit: 100
            })
          : await listLostPetAlerts(accessToken, {
              q: q || undefined,
              status: status || undefined,
              mine,
              activeOnly: !status
            });
      setAlerts(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar alertas.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const handleFilter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadAlerts();
  };

  const handleUseMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setError("Tu navegador no soporta geolocalizacion.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setLocation(next);
        setNearbyOnly(true);
      },
      (locationError) => {
        setError(locationError.message || "No fue posible obtener tu ubicacion.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000
      }
    );
  };

  return (
    <AuthGate>
      <div className="space-y-4">
        <PageIntro
          eyebrow="Urgencia"
          title="Mascotas perdidas"
          description="Gestiona alertas geolocalizadas, avistamientos y seguimiento de casos con una lectura visual mas inmediata para situaciones criticas."
          tone="alert"
          actions={
            <Link href="/lost-pets/report" className="kumpa-button-alert">
              Reportar perdida
            </Link>
          }
          metrics={[
            { value: String(alerts.length), label: "alertas" },
            { value: nearbyOnly ? "Si" : "No", label: "modo cerca" }
          ]}
        />

        <section className="kumpa-panel p-4">
          <form onSubmit={handleFilter} className="grid gap-3 sm:grid-cols-3">
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Buscar por mascota o zona"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as LostPetAlertStatus | "")}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Solo activas</option>
              <option value="ACTIVE">Activas</option>
              <option value="FOUND">Encontradas</option>
              <option value="CLOSED">Cerradas</option>
            </select>
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={mine}
                onChange={(event) => setMine(event.target.checked)}
              />
              Solo mis alertas
            </label>
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={nearbyOnly}
                onChange={(event) => setNearbyOnly(event.target.checked)}
                disabled={!location}
              />
              Solo cerca de mi
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Radio (km)
              <input
                type="number"
                min={1}
                max={200}
                value={radiusKm}
                onChange={(event) => setRadiusKm(Number(event.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                disabled={!nearbyOnly}
              />
            </label>
            <div className="sm:col-span-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="kumpa-button-secondary"
                >
                  Aplicar filtros
                </button>
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  className="kumpa-button-secondary"
                >
                  Usar mi ubicacion
                </button>
                {location && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocation(null);
                      setNearbyOnly(false);
                    }}
                    className="kumpa-button-secondary"
                  >
                    Quitar ubicacion
                  </button>
                )}
              </div>
              {location && (
                <p className="mt-2 text-xs text-slate-500">
                  Ubicacion activa: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </p>
              )}
              {nearbyOnly && (
                <p className="mt-1 text-xs text-slate-500">
                  Modo cerca de mi: se muestran alertas activas con difusion comunitaria.
                </p>
              )}
            </div>
          </form>
        </section>

        {error && <InlineBanner tone="error">{error}</InlineBanner>}

        {isLoading ? (
          <div className="kumpa-panel p-6 text-sm text-slate-600">
            Cargando alertas...
          </div>
        ) : alerts.length === 0 ? (
          <div className="kumpa-panel p-6 text-sm text-slate-600">
            No hay alertas para los filtros seleccionados.
          </div>
        ) : (
          <div className="grid gap-3">
            {alerts.map((alert) => (
              <article key={alert.id} className="kumpa-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{alert.pet.name}</h2>
                    <p className="text-sm text-slate-600">
                      {alert.pet.species} - {alert.pet.breed}
                    </p>
                    <p className="text-xs text-slate-500">
                      Ultima vez vista: {formatDate(alert.lastSeenAt)}
                    </p>
                    {alert.lastSeenAddress && (
                      <p className="text-xs text-slate-500">Zona: {alert.lastSeenAddress}</p>
                    )}
                    <p className="text-xs text-slate-500">
                      Avistamientos: {alert.stats.sightingsCount} | Radio: {alert.searchRadiusKm} km
                    </p>
                    {alert.distanceKm !== null && alert.distanceKm !== undefined && (
                      <p className="text-xs text-slate-500">Distancia: {alert.distanceKm.toFixed(1)} km</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusClass(alert.status)}`}>
                      {statusLabel(alert.status)}
                    </span>
                    {alert.medicalPriority && (
                      <span className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                        Prioridad medica
                      </span>
                    )}
                  </div>
                </div>
                {alert.description && (
                  <p className="mt-2 text-sm text-slate-700">{alert.description}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/lost-pets/${alert.id}`}
                    className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700"
                  >
                    Ver detalle
                  </Link>
                  <Link
                    href={`/map?types=LOST_PET&focus=${alert.id}`}
                    className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700"
                  >
                    Ver en mapa
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AuthGate>
  );
}


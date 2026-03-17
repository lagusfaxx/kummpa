"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { PageIntro } from "@/components/layout/page-intro";
import { useAuth } from "@/features/auth/auth-context";
import { listLostPetAlerts, listNearbyLostPetAlerts } from "@/features/lost-pets/lost-pets-api";
import type { LostPetAlert, LostPetAlertStatus } from "@/features/lost-pets/types";

function statusConfig(status: LostPetAlertStatus) {
  if (status === "ACTIVE") return { label: "Perdida", color: "bg-red-100 text-red-700" };
  if (status === "FOUND") return { label: "Encontrada", color: "bg-emerald-100 text-emerald-700" };
  return { label: "Cerrada", color: "bg-slate-100 text-slate-600" };
}

function formatTimeAgo(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffHours < 1) return "Hace menos de 1 hora";
  if (diffHours < 24) return `Hace ${diffHours} horas`;
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} dias`;
  return date.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function AlertCard({ alert }: { alert: LostPetAlert }) {
  const status = statusConfig(alert.status);

  return (
    <article className="card overflow-hidden">
      <div className="flex">
        {/* Pet image */}
        <div className="relative h-32 w-32 flex-shrink-0 bg-[hsl(var(--muted))] sm:h-40 sm:w-40">
          {alert.pet.avatarUrl ? (
            <img
              src={alert.pet.avatarUrl}
              alt={alert.pet.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl">🐾</div>
          )}
          {alert.status === "ACTIVE" && (
            <div className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
              URGENTE
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">{alert.pet.name}</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {alert.pet.species} {alert.pet.breed && `· ${alert.pet.breed}`}
              </p>
            </div>
            <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
              {status.label}
            </span>
          </div>

          <div className="mt-2 flex-1">
            {alert.lastSeenAddress && (
              <p className="text-sm">
                📍 {alert.lastSeenAddress}
              </p>
            )}
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {formatTimeAgo(alert.lastSeenAt)}
            </p>
            {alert.distanceKm !== null && alert.distanceKm !== undefined && (
              <p className="text-sm text-[hsl(var(--secondary))]">
                {alert.distanceKm.toFixed(1)} km de ti
              </p>
            )}
          </div>

          <div className="mt-2 flex items-center gap-2">
            {alert.medicalPriority && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                Necesita medicacion
              </span>
            )}
            {alert.stats.sightingsCount > 0 && (
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                {alert.stats.sightingsCount} avistamientos
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex border-t border-[hsl(var(--border))]">
        <Link
          href={`/lost-pets/${alert.id}`}
          className="flex flex-1 items-center justify-center gap-1 py-3 text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]"
        >
          Ver detalle
        </Link>
        <div className="w-px bg-[hsl(var(--border))]" />
        <Link
          href={`/map?types=LOST_PET&focus=${alert.id}`}
          className="flex flex-1 items-center justify-center gap-1 py-3 text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]"
        >
          Ver en mapa
        </Link>
        {alert.status === "ACTIVE" && (
          <>
            <div className="w-px bg-[hsl(var(--border))]" />
            <Link
              href={`/lost-pets/${alert.id}/sighting`}
              className="flex flex-1 items-center justify-center gap-1 py-3 text-sm font-medium text-[hsl(var(--secondary))] transition-colors hover:bg-[hsl(var(--muted))]"
            >
              Reportar avistamiento
            </Link>
          </>
        )}
      </div>
    </article>
  );
}

export default function LostPetsPage() {
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;

  const [alerts, setAlerts] = useState<LostPetAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<"all" | "nearby" | "mine">("all");
  const [statusFilter, setStatusFilter] = useState<LostPetAlertStatus | "">("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(20);

  const loadAlerts = async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);
    try {
      let data: LostPetAlert[];

      if (filter === "nearby" && location) {
        data = await listNearbyLostPetAlerts(accessToken, {
          lat: location.lat,
          lng: location.lng,
          radiusKm,
          limit: 50
        });
      } else {
        data = await listLostPetAlerts(accessToken, {
          status: statusFilter || undefined,
          mine: filter === "mine",
          activeOnly: !statusFilter && filter !== "mine"
        });
      }
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
  }, [accessToken, filter, statusFilter]);

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
        setFilter("nearby");
      },
      (locationError) => {
        setError(locationError.message || "No fue posible obtener tu ubicacion.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const activeAlerts = alerts.filter((a) => a.status === "ACTIVE");

  return (
    <AuthGate>
      <div className="space-y-4">
        <PageIntro
          title="Mascotas perdidas"
          description="Ayuda a reunir familias reportando o buscando mascotas perdidas"
          actions={
            <Link href="/lost-pets/report" className="btn btn-primary">
              Reportar perdida
            </Link>
          }
        />

        {error && <InlineBanner tone="error">{error}</InlineBanner>}

        {/* Stats banner */}
        {activeAlerts.length > 0 && (
          <div className="card flex items-center justify-between bg-red-50 p-4">
            <div>
              <p className="text-2xl font-bold text-red-700">{activeAlerts.length}</p>
              <p className="text-sm text-red-600">mascotas necesitan ayuda</p>
            </div>
            <Link href="#alerts" className="btn btn-outline border-red-200 text-red-700">
              Ver alertas activas
            </Link>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`btn ${filter === "all" ? "btn-primary" : "btn-outline"}`}
          >
            Todas las alertas
          </button>
          <button
            type="button"
            onClick={handleUseMyLocation}
            className={`btn ${filter === "nearby" ? "btn-primary" : "btn-outline"}`}
          >
            Cerca de mi
          </button>
          <button
            type="button"
            onClick={() => setFilter("mine")}
            className={`btn ${filter === "mine" ? "btn-primary" : "btn-outline"}`}
          >
            Mis alertas
          </button>
        </div>

        {/* Secondary filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as LostPetAlertStatus | "")}
            className="min-h-0 w-auto py-2 text-sm"
          >
            <option value="">Solo activas</option>
            <option value="ACTIVE">Activas</option>
            <option value="FOUND">Encontradas</option>
            <option value="CLOSED">Cerradas</option>
          </select>

          {filter === "nearby" && location && (
            <div className="flex items-center gap-2">
              <label className="text-sm">Radio:</label>
              <select
                value={radiusKm}
                onChange={(e) => {
                  setRadiusKm(Number(e.target.value));
                  void loadAlerts();
                }}
                className="min-h-0 w-auto py-2 text-sm"
              >
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={20}>20 km</option>
                <option value={50}>50 km</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setLocation(null);
                  setFilter("all");
                }}
                className="text-sm text-[hsl(var(--muted-foreground))] hover:underline"
              >
                Quitar ubicacion
              </button>
            </div>
          )}
        </div>

        {/* Alerts list */}
        <section id="alerts" className="space-y-3">
          {isLoading ? (
            <div className="card p-6 text-center text-[hsl(var(--muted-foreground))]">
              Buscando alertas...
            </div>
          ) : alerts.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-lg font-semibold">No hay alertas</p>
              <p className="mt-1 text-[hsl(var(--muted-foreground))]">
                {filter === "mine"
                  ? "No tienes alertas registradas."
                  : filter === "nearby"
                    ? "No hay mascotas perdidas cerca de tu ubicacion."
                    : "No hay alertas activas en este momento."}
              </p>
              {filter !== "all" && (
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className="btn btn-outline mt-3"
                >
                  Ver todas las alertas
                </button>
              )}
            </div>
          ) : (
            alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
          )}
        </section>

        {/* Help section */}
        <section className="card p-4">
          <h2 className="font-semibold">Como puedes ayudar</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-[hsl(var(--muted))] p-3">
              <p className="text-2xl">👀</p>
              <p className="mt-1 font-medium">Reporta avistamientos</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Si ves una mascota perdida, reportalo
              </p>
            </div>
            <div className="rounded-lg bg-[hsl(var(--muted))] p-3">
              <p className="text-2xl">📢</p>
              <p className="mt-1 font-medium">Comparte alertas</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Difunde en redes sociales y grupos
              </p>
            </div>
            <div className="rounded-lg bg-[hsl(var(--muted))] p-3">
              <p className="text-2xl">🗺️</p>
              <p className="mt-1 font-medium">Revisa el mapa</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Mira si hay mascotas perdidas en tu zona
              </p>
            </div>
          </div>
        </section>
      </div>
    </AuthGate>
  );
}

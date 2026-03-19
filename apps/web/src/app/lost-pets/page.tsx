"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { MapCanvas } from "@/components/map/map-canvas";
import { useAuth } from "@/features/auth/auth-context";
import { listLostPetAlerts, listNearbyLostPetAlerts } from "@/features/lost-pets/lost-pets-api";
import type { LostPetAlert, LostPetAlertStatus } from "@/features/lost-pets/types";
import { useToast } from "@/features/ui/toast-context";
import type { MapServicePoint } from "@/features/map/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

/* ─── helpers ────────────────────────────────────────────────── */
function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `hace ${d}d`;
  if (h > 0) return `hace ${h}h`;
  if (m > 0) return `hace ${m}m`;
  return "ahora";
}

function isLast24h(value: string) {
  return Date.now() - new Date(value).getTime() < 86400000;
}

function alertToMapPoint(alert: LostPetAlert): MapServicePoint {
  return {
    id: alert.id,
    sourceId: alert.id,
    type: "LOST_PET",
    name: alert.pet.name,
    subtitle: alert.lastSeenAddress ?? "Última ubicación",
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
    createdAt: alert.createdAt,
  };
}

/* ─── status badge ───────────────────────────────────────────── */
function StatusBadge({ alert }: { alert: LostPetAlert }) {
  if (alert.medicalPriority && alert.status === "ACTIVE")
    return (
      <span className="flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
        Urgente
      </span>
    );
  if (alert.status === "ACTIVE")
    return (
      <span className="flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
        Perdida
      </span>
    );
  if (alert.status === "FOUND")
    return (
      <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
        Encontrada
      </span>
    );
  return (
    <span className="rounded-full bg-slate-400 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
      Cerrada
    </span>
  );
}

/* ─── compact alert card ─────────────────────────────────────── */
function AlertCard({
  alert,
  active,
  onSelect,
  onShare,
}: {
  alert: LostPetAlert;
  active: boolean;
  onSelect: () => void;
  onShare: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (active && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [active]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border transition-all duration-150 overflow-hidden ${
        active
          ? "border-orange-400 ring-2 ring-orange-300 bg-orange-50"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div className="flex gap-0">
        {/* photo */}
        <div className="h-24 w-24 shrink-0 bg-slate-100 overflow-hidden">
          {alert.pet.primaryPhotoUrl ? (
            <img
              src={alert.pet.primaryPhotoUrl}
              alt={alert.pet.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-300">
              {alert.pet.name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        {/* content */}
        <div className="min-w-0 flex-1 px-3 py-2.5">
          <div className="flex items-start justify-between gap-1">
            <p className="truncate text-sm font-bold text-slate-800">{alert.pet.name}</p>
            <StatusBadge alert={alert} />
          </div>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">
            {alert.pet.species} · {alert.pet.breed}
          </p>
          <p className="mt-1 truncate text-[11px] text-slate-500">
            📍 {alert.lastSeenAddress ?? "Zona no informada"}
          </p>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">
            <span>🕐 {timeAgo(alert.lastSeenAt)}</span>
            {alert.distanceKm != null && (
              <span>· {alert.distanceKm.toFixed(1)} km</span>
            )}
            {alert.stats.sightingsCount > 0 && (
              <span>· 👁 {alert.stats.sightingsCount}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ─── selected alert detail strip ───────────────────────────── */
function SelectedAlertPanel({
  alert,
  onShare,
  onClose,
}: {
  alert: LostPetAlert;
  onShare: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute bottom-4 left-4 right-4 z-20 rounded-2xl border border-orange-200 bg-white/95 shadow-2xl backdrop-blur-sm overflow-hidden">
      <div className="flex gap-0">
        {alert.pet.primaryPhotoUrl ? (
          <img
            src={alert.pet.primaryPhotoUrl}
            alt={alert.pet.name}
            className="h-28 w-28 shrink-0 object-cover"
          />
        ) : (
          <div className="flex h-28 w-28 shrink-0 items-center justify-center bg-orange-50 text-3xl font-bold text-orange-300">
            {alert.pet.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex-1 p-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-slate-800">{alert.pet.name}</p>
                <StatusBadge alert={alert} />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {alert.pet.species} · {alert.pet.breed}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                📍 {alert.lastSeenAddress ?? "Zona no informada"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Visto {timeAgo(alert.lastSeenAt)}
                {alert.distanceKm != null && ` · ${alert.distanceKm.toFixed(1)} km`}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href={`/lost-pets/${alert.id}#report-sighting`}
              className="rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-600"
            >
              👁 La vi
            </Link>
            <Link
              href={`/lost-pets/${alert.id}`}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver detalle
            </Link>
            <button
              type="button"
              onClick={onShare}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Compartir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── main page ──────────────────────────────────────────────── */
type Tab = "active" | "found" | "all" | "mine";

export default function LostPetsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.tokens.accessToken;

  const [alerts, setAlerts] = useState<LostPetAlert[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("active");
  const [nearby, setNearby] = useState(false);
  const [last24h, setLast24h] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState(false);

  const statusForTab: Record<Tab, LostPetAlertStatus | undefined> = {
    active: "ACTIVE",
    found: "FOUND",
    all: undefined,
    mine: undefined,
  };

  const filteredAlerts = useMemo(() => {
    let rows = alerts;
    if (last24h) rows = rows.filter((a) => isLast24h(a.lastSeenAt));
    return rows;
  }, [alerts, last24h]);

  const points = useMemo(() => filteredAlerts.map(alertToMapPoint), [filteredAlerts]);
  const selectedAlert = filteredAlerts.find((a) => a.id === selectedId) ?? null;

  const loadAlerts = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const rows =
        nearby && location
          ? await listNearbyLostPetAlerts(accessToken, {
              lat: location.lat,
              lng: location.lng,
              radiusKm: 20,
              limit: 60,
            })
          : await listLostPetAlerts(accessToken, {
              mine: tab === "mine",
              status: statusForTab[tab],
              activeOnly: tab === "active",
              limit: 60,
            });
      setAlerts(rows);
      setSelectedId(rows[0]?.id ?? null);
    } catch {
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) { setIsLoading(false); return; }
    void loadAlerts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, tab, nearby, location]);

  const requestLocation = () => {
    if (!("geolocation" in navigator)) { setGeoError(true); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearby(true);
        setGeoError(false);
      },
      () => setGeoError(true),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleNearbyToggle = () => {
    if (nearby) {
      setNearby(false);
    } else if (location) {
      setNearby(true);
    } else {
      requestLocation();
    }
  };

  const handleShare = async (alert: LostPetAlert) => {
    const url = `${window.location.origin}/lost-pets/public/${alert.shareToken}`;
    const canShare = typeof navigator.share === "function";
    try {
      if (canShare) {
        await navigator.share({ title: `Alerta: ${alert.pet.name}`, text: "Ayuda a difundir esta alerta.", url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      showToast({ tone: "success", title: "Alerta lista para compartir", description: canShare ? "Panel de compartir abierto." : "Link copiado al portapapeles." });
    } catch { /* cancelled */ }
  };

  /* ── filter chips ── */
  const chipBase = "rounded-full px-3 py-1 text-xs font-semibold border transition-colors";
  const chipOn = "bg-slate-800 text-white border-slate-800";
  const chipOff = "bg-white text-slate-600 border-slate-200 hover:border-slate-400";

  const tabs: { id: Tab; label: string }[] = [
    { id: "active", label: "🔴 Perdidas" },
    { id: "found", label: "✅ Resueltas" },
    { id: "all", label: "Todas" },
    { id: "mine", label: "Mis alertas" },
  ];

  const activeCount = alerts.filter((a) => a.status === "ACTIVE").length;

  return (
    <AuthGate>
      {/* ── full-bleed incident map layout ── */}
      <div className="flex h-full flex-col overflow-hidden">

        {/* ── top action bar ── */}
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2.5 scrollbar-hide">
          {/* tab filters */}
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); setNearby(false); }}
              className={`${chipBase} ${tab === t.id && !nearby ? chipOn : chipOff} shrink-0`}
            >
              {t.label}
            </button>
          ))}

          <div className="mx-1 h-5 w-px shrink-0 bg-slate-200" />

          {/* nearby */}
          <button
            type="button"
            onClick={handleNearbyToggle}
            className={`${chipBase} ${nearby ? chipOn : chipOff} shrink-0`}
          >
            📍 Cerca de mí
          </button>

          {/* 24h */}
          <button
            type="button"
            onClick={() => setLast24h((v) => !v)}
            className={`${chipBase} ${last24h ? chipOn : chipOff} shrink-0`}
          >
            🕐 24h
          </button>

          {geoError && (
            <span className="shrink-0 text-[11px] text-red-500">
              Geolocalización no disponible
            </span>
          )}

          <div className="ml-auto shrink-0 pl-3">
            {activeCount > 0 && (
              <span className="mr-3 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                {activeCount} activa{activeCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* ── main split layout ── */}
        <div className="flex min-h-0 flex-1 overflow-hidden">

          {/* ── LEFT: incident list ── */}
          <div className="hidden w-[360px] shrink-0 flex-col border-r border-slate-200 bg-slate-50 xl:flex">
            <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
              <p className="text-sm font-bold text-slate-700">
                {isLoading ? "Cargando…" : `${filteredAlerts.length} alerta${filteredAlerts.length !== 1 ? "s" : ""}`}
              </p>
              <Link
                href="/lost-pets/report"
                className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700"
              >
                + Reportar pérdida
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
                ))
              ) : filteredAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <span className="text-4xl">🐾</span>
                  <p className="text-sm font-semibold text-slate-500">
                    {tab === "mine" ? "Aún no tienes alertas" : "Sin alertas para este filtro"}
                  </p>
                  <Link
                    href="/lost-pets/report"
                    className="mt-1 rounded-full bg-orange-500 px-4 py-1.5 text-xs font-bold text-white"
                  >
                    Reportar mascota perdida
                  </Link>
                </div>
              ) : (
                filteredAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    active={selectedId === alert.id}
                    onSelect={() => setSelectedId(alert.id)}
                    onShare={() => void handleShare(alert)}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── RIGHT: map ── */}
          <div className="relative flex-1">
            <MapCanvas
              accessToken={MAPBOX_TOKEN}
              points={points}
              selectedPointId={selectedId}
              onSelectPoint={setSelectedId}
              className="h-full w-full"
            />

            {/* selected alert overlay (desktop) */}
            {selectedAlert && (
              <div className="hidden xl:block">
                <SelectedAlertPanel
                  alert={selectedAlert}
                  onShare={() => void handleShare(selectedAlert)}
                  onClose={() => setSelectedId(null)}
                />
              </div>
            )}

            {/* map FAB: reportar (mobile) */}
            <Link
              href="/lost-pets/report"
              className="xl:hidden absolute bottom-5 right-4 z-20 flex items-center gap-2 rounded-full bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-red-700"
            >
              🐾 Reportar pérdida
            </Link>
          </div>
        </div>

        {/* ── MOBILE: scrollable alert list below map ── */}
        <div className="xl:hidden shrink-0 border-t border-slate-200 bg-white">
          {/* mobile filter bar */}
          <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTab(t.id); setNearby(false); }}
                className={`${chipBase} ${tab === t.id && !nearby ? chipOn : chipOff} shrink-0`}
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleNearbyToggle}
              className={`${chipBase} ${nearby ? chipOn : chipOff} shrink-0`}
            >
              📍 Cerca
            </button>
            <button
              type="button"
              onClick={() => setLast24h((v) => !v)}
              className={`${chipBase} ${last24h ? chipOn : chipOff} shrink-0`}
            >
              🕐 24h
            </button>
          </div>

          {/* mobile alert list (horizontal scroll) */}
          <div className="flex gap-3 overflow-x-auto px-4 pb-4 pt-1 scrollbar-hide">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 w-64 shrink-0 animate-pulse rounded-2xl bg-slate-200" />
                ))
              : filteredAlerts.length === 0
              ? (
                <div className="flex w-full items-center justify-center py-6 text-sm text-slate-400">
                  Sin alertas — <Link href="/lost-pets/report" className="ml-1 font-bold text-orange-500">Reportar</Link>
                </div>
              )
              : filteredAlerts.map((alert) => (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => setSelectedId(alert.id)}
                    className={`shrink-0 w-64 rounded-2xl border text-left overflow-hidden ${
                      selectedId === alert.id
                        ? "border-orange-400 ring-2 ring-orange-300"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex h-20">
                      <div className="w-20 shrink-0 bg-slate-100 overflow-hidden">
                        {alert.pet.primaryPhotoUrl ? (
                          <img src={alert.pet.primaryPhotoUrl} alt={alert.pet.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xl font-bold text-slate-300">
                            {alert.pet.name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 px-2.5 py-2">
                        <div className="flex items-center justify-between gap-1">
                          <p className="truncate text-xs font-bold text-slate-800">{alert.pet.name}</p>
                          <StatusBadge alert={alert} />
                        </div>
                        <p className="mt-0.5 truncate text-[10px] text-slate-500">
                          📍 {alert.lastSeenAddress ?? "Zona no informada"}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-400">{timeAgo(alert.lastSeenAt)}</p>
                        <div className="mt-1.5 flex gap-1.5">
                          <Link
                            href={`/lost-pets/${alert.id}#report-sighting`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white"
                          >
                            La vi
                          </Link>
                          <Link
                            href={`/lost-pets/${alert.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                          >
                            Detalle
                          </Link>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
          </div>
        </div>
      </div>
    </AuthGate>
  );
}

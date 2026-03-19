"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent
} from "react";
import { AuthGate } from "@/components/auth/auth-gate";
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
  updateLostPetAlert,
  uploadSightingPhoto
} from "@/features/lost-pets/lost-pets-api";
import { lostPetAlertToMapPoints } from "@/features/lost-pets/map-points";
import type {
  LostPetAlertDetail,
  LostPetAlertStatus,
  LostPetSighting
} from "@/features/lost-pets/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

type LocationMode = "current" | "search" | "pin";
type ModalStep = 1 | 2;

function fmtDate(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

function statusLabel(s: LostPetAlertStatus) {
  if (s === "ACTIVE") return "Activa";
  if (s === "FOUND") return "Encontrada";
  return "Cerrada";
}

function statusStyle(s: LostPetAlertStatus) {
  if (s === "ACTIVE") return "bg-rose-100 text-rose-700 border border-rose-200";
  if (s === "FOUND") return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  return "bg-slate-100 text-slate-600 border border-slate-200";
}

function defaultDT() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/* ─── Share helper ───────────────────────────────────────── */
function shareAlert(alert: LostPetAlertDetail) {
  const url = `${window.location.origin}/lost-pets/public/${alert.shareToken}`;
  const text = `¡Ayuda a encontrar a ${alert.pet.name}! Última vez visto en: ${alert.lastSeenAddress ?? "ver mapa"}`;
  if (typeof navigator !== "undefined" && navigator.share) {
    void navigator.share({ title: `Alerta: ${alert.pet.name}`, text, url });
  } else {
    void navigator.clipboard.writeText(`${text} ${url}`);
  }
}

/* ─── Sighting card ──────────────────────────────────────── */
function SightingCard({ sighting }: { sighting: LostPetSighting }) {
  return (
    <article className="flex gap-4 rounded-[1.4rem] border border-[hsl(var(--border))] bg-white/70 p-4">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(6_80%_95%)]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(6 70% 50%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            {fmtDate(sighting.sightingAt)}
            {sighting.reporter ? ` · ${sighting.reporter.fullName}` : ""}
          </p>
          {sighting.photoUrl ? (
            <a
              href={sighting.photoUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 overflow-hidden rounded-[1rem]"
            >
              <Image
                src={sighting.photoUrl}
                alt="Foto del avistamiento"
                width={64}
                height={64}
                className="h-16 w-16 object-cover"
                unoptimized
              />
            </a>
          ) : null}
        </div>
        {sighting.address ? (
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{sighting.address}</p>
        ) : null}
        {sighting.comment ? (
          <p className="mt-2 text-sm leading-6 text-[hsl(var(--foreground))]">{sighting.comment}</p>
        ) : null}
      </div>
    </article>
  );
}

/* ─── "Yo la vi" modal ───────────────────────────────────── */
interface SightingModalProps {
  alert: LostPetAlertDetail;
  accessToken: string;
  mapPoints: ReturnType<typeof lostPetAlertToMapPoints>;
  onClose: () => void;
  onSuccess: () => void;
}

function SightingModal({ alert, accessToken, mapPoints, onClose, onSuccess }: SightingModalProps) {
  const [step, setStep] = useState<ModalStep>(1);
  const [locationMode, setLocationMode] = useState<LocationMode>("current");
  const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [addressQuery, setAddressQuery] = useState("");
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodingSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [sightingAt, setSightingAt] = useState(defaultDT());
  const [comment, setComment] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedMapPointId = `last-seen-${alert.id}`;

  const resolveAddress = async (lat: number, lng: number) => {
    const resolved = await reverseGeocodeLocation(lat, lng).catch(() => null);
    if (resolved) { setAddress(resolved); setAddressQuery(resolved); }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) { setFormError("Tu dispositivo no soporta geolocalización."); return; }
    setIsLocating(true);
    setFormError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPickedLocation(loc);
        await resolveAddress(loc.lat, loc.lng);
        setIsLocating(false);
      },
      () => { setIsLocating(false); setFormError("No se pudo obtener tu ubicación."); },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  const handleSearchAddress = async () => {
    if (!addressQuery.trim()) return;
    setIsSearching(true);
    setFormError(null);
    try {
      const rows = await searchAddressSuggestions(addressQuery, 5);
      setSuggestions(rows);
    } catch {
      setFormError("No se pudo buscar la dirección.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSuggestionSelect = (s: GeocodingSuggestion) => {
    setPickedLocation({ lat: s.lat, lng: s.lng });
    setAddress(s.address);
    setAddressQuery(s.address);
    setSuggestions([]);
  };

  const handleMapPick = async (loc: { lat: number; lng: number }) => {
    setPickedLocation(loc);
    await resolveAddress(loc.lat, loc.lng);
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canGoToStep2 = Boolean(pickedLocation);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pickedLocation) { setFormError("Debes elegir una ubicación."); return; }
    setIsSubmitting(true);
    setFormError(null);
    try {
      let photoUrl: string | undefined;
      if (photoFile) {
        photoUrl = await uploadSightingPhoto(accessToken, alert.id, photoFile);
      }
      await createLostPetSighting(accessToken, alert.id, {
        sightingAt: new Date(sightingAt).toISOString(),
        lat: pickedLocation.lat,
        lng: pickedLocation.lng,
        address: address || undefined,
        comment: comment || undefined,
        photoUrl
      });
      onSuccess();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo publicar el avistamiento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-lg flex-col rounded-t-[2rem] bg-[hsl(var(--card))] shadow-2xl sm:rounded-[2rem] sm:mx-4"
        style={{ maxHeight: "92dvh" }}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4">
          <div>
            <p className="kumpa-eyebrow">Yo la vi</p>
            <h2 className="mt-0.5 text-lg font-semibold">
              {step === 1 ? "¿Dónde la viste?" : "¿Cuándo y qué observaste?"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className={`h-2 w-6 rounded-full transition-colors ${step === 1 ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--muted))]"}`} />
              <span className={`h-2 w-6 rounded-full transition-colors ${step === 2 ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--muted))]"}`} />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--muted)/0.6)] hover:bg-[hsl(var(--muted))]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {formError ? (
            <div className="rounded-[1.2rem] bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}

          {/* STEP 1: Location */}
          {step === 1 ? (
            <>
              <div className="flex flex-wrap gap-2">
                {(["current", "search", "pin"] as LocationMode[]).map((mode) => {
                  const labels: Record<LocationMode, string> = {
                    current: "Usar mi ubicación",
                    search: "Buscar dirección",
                    pin: "Mover pin en mapa"
                  };
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setLocationMode(mode)}
                      className={`kumpa-chip ${locationMode === mode ? "kumpa-chip-active" : ""}`}
                    >
                      {labels[mode]}
                    </button>
                  );
                })}
              </div>

              {locationMode === "current" ? (
                <div className="rounded-[1.4rem] border border-[hsl(var(--border))] bg-white/70 p-4">
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Usa el GPS de tu dispositivo para marcar rápidamente el punto.
                  </p>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="btn btn-primary mt-3"
                  >
                    {isLocating ? "Buscando…" : "Usar mi ubicación actual"}
                  </button>
                  {pickedLocation && address ? (
                    <p className="mt-3 text-sm font-medium text-emerald-700">{address}</p>
                  ) : null}
                </div>
              ) : null}

              {locationMode === "search" ? (
                <div className="rounded-[1.4rem] border border-[hsl(var(--border))] bg-white/70 p-4 space-y-3">
                  <div className="flex gap-2">
                    <input
                      value={addressQuery}
                      onChange={(e) => setAddressQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleSearchAddress(); } }}
                      placeholder="Calle, comuna, referencia…"
                      className="flex-1"
                    />
                    <button type="button" onClick={() => void handleSearchAddress()} className="btn btn-outline">
                      {isSearching ? "…" : "Buscar"}
                    </button>
                  </div>
                  {suggestions.length > 0 ? (
                    <div className="space-y-1.5">
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSuggestionSelect(s)}
                          className="block w-full rounded-[1.2rem] border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] px-4 py-3 text-left"
                        >
                          <p className="text-sm font-semibold">{s.label}</p>
                          <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{s.address}</p>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {pickedLocation && address ? (
                    <p className="text-sm font-medium text-emerald-700">{address}</p>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-[1.4rem] border border-[hsl(var(--border))] bg-white/70 p-3">
                <p className="mb-2 text-xs text-[hsl(var(--muted-foreground))]">
                  {locationMode === "pin"
                    ? "Toca el mapa para marcar el punto exacto."
                    : "También puedes ajustar el punto tocando el mapa."}
                </p>
                <MapCanvas
                  accessToken={MAPBOX_TOKEN}
                  points={mapPoints}
                  selectedPointId={selectedMapPointId}
                  onSelectPoint={() => {}}
                  pickedLocation={pickedLocation}
                  onPickLocation={(loc) => { void handleMapPick(loc); }}
                  center={pickedLocation ?? { lat: alert.lastSeenLat, lng: alert.lastSeenLng }}
                  className="h-[32vh] w-full"
                />
              </div>
            </>
          ) : null}

          {/* STEP 2: Details */}
          {step === 2 ? (
            <form id="sighting-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <label className="block text-sm font-semibold">
                Fecha y hora aproximada
                <input
                  type="datetime-local"
                  value={sightingAt}
                  onChange={(e) => setSightingAt(e.target.value)}
                  className="mt-1.5 w-full"
                />
              </label>

              <label className="block text-sm font-semibold">
                Dirección o referencia
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Frente a la plaza, esquina del supermercado…"
                  className="mt-1.5 w-full"
                />
              </label>

              <label className="block text-sm font-semibold">
                ¿Qué viste?
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Estaba sola, con collar, corriendo, parecía asustada…"
                  className="mt-1.5 w-full"
                />
              </label>

              <div>
                <p className="text-sm font-semibold">Foto opcional</p>
                {photoPreview ? (
                  <div className="mt-2 relative inline-block">
                    <Image
                      src={photoPreview}
                      alt="Preview"
                      width={160}
                      height={160}
                      className="h-40 w-40 rounded-[1.2rem] object-cover"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 flex items-center gap-2 rounded-[1.2rem] border border-dashed border-[hsl(var(--border))] bg-white/60 px-4 py-3 text-sm text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition-colors"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    Subir foto o tomar desde cámara
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </div>
            </form>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-[hsl(var(--border))] px-5 py-4">
          {step === 1 ? (
            <>
              <button type="button" onClick={onClose} className="btn btn-outline flex-1">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { if (canGoToStep2) { setStep(2); setFormError(null); } else { setFormError("Elige una ubicación antes de continuar."); } }}
                className="btn btn-primary flex-1"
              >
                Siguiente
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { setStep(1); setFormError(null); }} className="btn btn-outline flex-1">
                Atrás
              </button>
              <button
                type="submit"
                form="sighting-form"
                disabled={isSubmitting}
                className="btn btn-primary flex-1"
              >
                {isSubmitting ? "Publicando…" : "Publicar avistamiento"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────── */
export default function LostPetDetailPage() {
  const params = useParams<{ id: string }>();
  const alertId = typeof params.id === "string" ? params.id : "";
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken ?? "";

  const [alert, setAlert] = useState<LostPetAlertDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [ownerWorking, setOwnerWorking] = useState(false);
  const [ownerSuccess, setOwnerSuccess] = useState<string | null>(null);
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const mapPoints = useMemo(
    () => (alert ? lostPetAlertToMapPoints(alert) : []),
    [alert]
  );

  const loadDetail = async () => {
    if (!accessToken || !alertId) return;
    setIsLoading(true);
    setPageError(null);
    try {
      const data = await getLostPetAlert(accessToken, alertId);
      setAlert(data);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "No se pudo cargar la alerta.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadDetail(); }, [accessToken, alertId]);

  const handleStatusChange = async (status: LostPetAlertStatus) => {
    if (!accessToken || !alert) return;
    setOwnerWorking(true);
    setOwnerError(null);
    setOwnerSuccess(null);
    try {
      const updated = await updateLostPetAlert(accessToken, alert.id, { status });
      setAlert(updated);
      setOwnerSuccess(`Caso actualizado a ${statusLabel(status).toLowerCase()}.`);
    } catch (err) {
      setOwnerError(err instanceof Error ? err.message : "No se pudo actualizar el estado.");
    } finally {
      setOwnerWorking(false);
    }
  };

  const handleShare = () => {
    if (!alert) return;
    shareAlert(alert);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSightingSuccess = async () => {
    setShowModal(false);
    await loadDetail();
  };

  return (
    <AuthGate>
      <div className="mx-auto max-w-2xl space-y-4 pb-10">

        {/* Back link */}
        <div className="flex items-center gap-2 pt-1">
          <Link href="/lost-pets" className="flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Alertas
          </Link>
        </div>

        {/* Page error */}
        {pageError ? (
          <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {pageError}
          </div>
        ) : null}

        {/* Loading skeleton */}
        {isLoading ? (
          <div className="card p-6 text-sm text-[hsl(var(--muted-foreground))] animate-pulse">
            Cargando alerta…
          </div>
        ) : null}

        {!isLoading && alert ? (
          <>
            {/* ── HERO CARD ── */}
            <section className="card overflow-hidden">
              {/* Pet photo */}
              <div className="relative h-56 w-full bg-gradient-to-br from-[hsl(6_60%_92%)] to-[hsl(22_80%_88%)]">
                {alert.pet.primaryPhotoUrl ? (
                  <Image
                    src={alert.pet.primaryPhotoUrl}
                    alt={alert.pet.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="hsl(6 50% 60%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="4" r="2" /><circle cx="18" cy="8" r="2" /><circle cx="20" cy="16" r="2" />
                      <path d="M9 10C9 10 6 10 4 14C2 18 5 22 11 22C17 22 20 18 18 14C16 10 13 10 13 10" />
                    </svg>
                  </div>
                )}
                {/* Status badge overlay */}
                <div className="absolute right-3 top-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold shadow-sm ${statusStyle(alert.status)}`}>
                    {statusLabel(alert.status)}
                  </span>
                </div>
                {alert.medicalPriority ? (
                  <div className="absolute left-3 top-3">
                    <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                      Prioridad médica
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Info */}
              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold">{alert.pet.name}</h1>
                    <p className="mt-0.5 text-sm text-[hsl(var(--muted-foreground))]">
                      {alert.pet.species}
                      {alert.pet.breed ? ` · ${alert.pet.breed}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="kumpa-chip">
                      Visto: {fmtDate(alert.lastSeenAt)}
                    </span>
                    {alert.lastSeenAddress ? (
                      <span className="kumpa-chip">{alert.lastSeenAddress}</span>
                    ) : null}
                  </div>
                </div>

                {alert.description ? (
                  <p className="mt-4 text-sm leading-6 text-[hsl(var(--foreground))]">
                    {alert.description}
                  </p>
                ) : null}

                {alert.emergencyNotes ? (
                  <div className="mt-4 rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {alert.emergencyNotes}
                  </div>
                ) : null}

                <p className="mt-4 text-xs text-[hsl(var(--muted-foreground))]">
                  {alert.sightings.length === 0
                    ? "Aún no hay avistamientos reportados"
                    : `${alert.sightings.length} avistamiento${alert.sightings.length > 1 ? "s" : ""} reportado${alert.sightings.length > 1 ? "s" : ""}`}
                </p>
              </div>
            </section>

            {/* ── MAP ── */}
            <section className="card p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                Última ubicación conocida
              </p>
              <MapCanvas
                accessToken={MAPBOX_TOKEN}
                points={mapPoints}
                selectedPointId={`last-seen-${alert.id}`}
                onSelectPoint={() => {}}
                center={{ lat: alert.lastSeenLat, lng: alert.lastSeenLng }}
                className="h-[42vh] w-full"
              />
            </section>

            {/* ── CTA BAR ── */}
            {alert.status === "ACTIVE" ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="btn btn-primary flex flex-1 items-center justify-center gap-2"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  Yo la vi
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="btn btn-outline flex items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  {copied ? "¡Copiado!" : "Compartir"}
                </button>
                <a
                  href={`/lost-pets/public/${alert.shareToken}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline flex items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Perfil público
                </a>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleShare}
                  className="btn btn-outline flex items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  {copied ? "¡Copiado!" : "Compartir"}
                </button>
                <a
                  href={`/lost-pets/public/${alert.shareToken}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline flex items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Perfil público
                </a>
              </div>
            )}

            {/* ── SIGHTINGS HISTORY ── */}
            <section className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="kumpa-eyebrow">Historial</p>
                  <h2 className="mt-1 text-lg font-semibold">Avistamientos reportados</h2>
                </div>
                {alert.status === "ACTIVE" ? (
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="text-sm font-semibold text-[hsl(var(--primary))] hover:underline"
                  >
                    + Reportar
                  </button>
                ) : null}
              </div>

              {alert.sightings.length === 0 ? (
                <div className="mt-4 rounded-[1.4rem] bg-[hsl(var(--muted)/0.5)] px-5 py-8 text-center">
                  <p className="text-sm font-medium">Aún no hay avistamientos</p>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    Cuando la comunidad reporte, aparecerán aquí en orden cronológico.
                  </p>
                  {alert.status === "ACTIVE" ? (
                    <button
                      type="button"
                      onClick={() => setShowModal(true)}
                      className="btn btn-primary mt-4"
                    >
                      Soy el primero en reportar
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {alert.sightings.map((s) => (
                    <SightingCard key={s.id} sighting={s} />
                  ))}
                </div>
              )}
            </section>

            {/* ── OWNER ACTIONS ── */}
            {(alert.permissions.canCloseAlert || alert.permissions.canEditAlert) ? (
              <section className="card p-5">
                <p className="kumpa-eyebrow">Gestión del caso</p>
                <h2 className="mt-1 text-lg font-semibold">Acciones del dueño</h2>

                {ownerError ? (
                  <div className="mt-3 rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {ownerError}
                  </div>
                ) : null}
                {ownerSuccess ? (
                  <div className="mt-3 rounded-[1.2rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {ownerSuccess}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {alert.permissions.canCloseAlert && alert.status === "ACTIVE" ? (
                    <button
                      type="button"
                      disabled={ownerWorking}
                      onClick={() => { void handleStatusChange("FOUND"); }}
                      className="btn btn-primary"
                    >
                      Marcar encontrada
                    </button>
                  ) : null}
                  {alert.permissions.canCloseAlert && alert.status !== "CLOSED" ? (
                    <button
                      type="button"
                      disabled={ownerWorking}
                      onClick={() => { void handleStatusChange("CLOSED"); }}
                      className="btn btn-outline"
                    >
                      Cerrar caso
                    </button>
                  ) : null}
                  {alert.permissions.canEditAlert && alert.status !== "ACTIVE" ? (
                    <button
                      type="button"
                      disabled={ownerWorking}
                      onClick={() => { void handleStatusChange("ACTIVE"); }}
                      className="btn btn-outline"
                    >
                      Reabrir alerta
                    </button>
                  ) : null}
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>

      {/* ── YO LA VI MODAL ── */}
      {showModal && alert && alert.permissions.canReportSighting ? (
        <SightingModal
          alert={alert}
          accessToken={accessToken}
          mapPoints={mapPoints}
          onClose={() => setShowModal(false)}
          onSuccess={() => { void handleSightingSuccess(); }}
        />
      ) : null}
    </AuthGate>
  );
}

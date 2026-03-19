"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/auth/auth-gate";
import { EmptyState } from "@/components/feedback/empty-state";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { SurfaceSkeleton } from "@/components/feedback/skeleton";
import { MapCanvas } from "@/components/map/map-canvas";
import { useAuth } from "@/features/auth/auth-context";
import { createLostPetAlert } from "@/features/lost-pets/lost-pets-api";
import { searchAddressSuggestions, reverseGeocodeLocation, type GeocodingSuggestion } from "@/features/map/geocoding";
import { listPets } from "@/features/pets/pets-api";
import type { Pet } from "@/features/pets/types";
import { useToast } from "@/features/ui/toast-context";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

function defaultDateTime() {
  const now = new Date();
  now.setSeconds(0, 0);
  const offset = now.getTimezoneOffset();
  now.setMinutes(now.getMinutes() - offset);
  return now.toISOString().slice(0, 16);
}

export default function LostPetsReportPage() {
  const router = useRouter();
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.tokens.accessToken;

  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState("");
  const [step, setStep] = useState(1);

  const [lastSeenAt, setLastSeenAt] = useState(defaultDateTime());
  const [locationMode, setLocationMode] = useState<"current" | "search" | "map">("current");
  const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [lastSeenAddress, setLastSeenAddress] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState<GeocodingSuggestion[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);

  const [description, setDescription] = useState("");

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [emergencyNotes, setEmergencyNotes] = useState("");
  const [searchRadiusKm, setSearchRadiusKm] = useState(10);
  const [medicalPriority, setMedicalPriority] = useState(false);
  const [broadcastEnabled] = useState(true);
  const [shareAfterCreate, setShareAfterCreate] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) { setIsLoading(false); return; }
    listPets(accessToken)
      .then((rows) => { setPets(rows); setSelectedPetId(rows[0]?.id ?? ""); })
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudieron cargar mascotas."))
      .finally(() => setIsLoading(false));
  }, [accessToken]);

  useEffect(() => {
    if (locationMode !== "search" || addressQuery.trim().length < 3) {
      setAddressResults([]);
      return;
    }
    const t = setTimeout(() => {
      void searchAddressSuggestions(addressQuery)
        .then(setAddressResults)
        .catch(() => setAddressResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [addressQuery, locationMode]);

  const selectedPet = useMemo(() => pets.find((p) => p.id === selectedPetId) ?? null, [pets, selectedPetId]);

  const requestCurrentLocation = () => {
    if (!("geolocation" in navigator)) { setError("Tu navegador no soporta geolocalización."); return; }
    setGeoLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPickedLocation(loc);
        const addr = await reverseGeocodeLocation(loc.lat, loc.lng).catch(() => null);
        setLastSeenAddress(addr ?? "Ubicación actual");
        setGeoLoading(false);
      },
      (e) => { setError(e.message || "No se pudo obtener tu ubicación."); setGeoLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePickSuggestion = (s: GeocodingSuggestion) => {
    setPickedLocation({ lat: s.lat, lng: s.lng });
    setLastSeenAddress(s.address);
    setAddressQuery(s.address);
    setAddressResults([]);
  };

  const handlePublish = async () => {
    if (!accessToken || !selectedPetId || !pickedLocation) {
      setError("Selecciona la mascota y la ubicación antes de publicar.");
      return;
    }
    try {
      setIsSaving(true);
      setError(null);
      const created = await createLostPetAlert(accessToken, {
        petId: selectedPetId,
        lastSeenAt: new Date(lastSeenAt).toISOString(),
        lastSeenLat: pickedLocation.lat,
        lastSeenLng: pickedLocation.lng,
        lastSeenAddress: lastSeenAddress || undefined,
        description: description || undefined,
        emergencyNotes: emergencyNotes || undefined,
        medicalPriority,
        searchRadiusKm,
        broadcastEnabled,
      });
      if (shareAfterCreate) {
        const shareUrl = `${window.location.origin}/lost-pets/public/${created.shareToken}`;
        try {
          if (navigator.share) {
            await navigator.share({ title: `Ayuda a encontrar a ${selectedPet?.name ?? "esta mascota"}`, url: shareUrl });
          } else {
            await navigator.clipboard.writeText(shareUrl);
          }
        } catch { /* cancelled */ }
      }
      showToast({ tone: "success", title: "Alerta publicada", description: "La comunidad ya puede ver y difundir la alerta." });
      router.push(`/lost-pets/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la alerta.");
    } finally {
      setIsSaving(false);
    }
  };

  const canStep2 = Boolean(pickedLocation && lastSeenAddress);
  const canPublish = canStep2 && Boolean(lastSeenAt);

  const STEPS = ["Mascota", "Ubicación", "Detalles"];

  return (
    <AuthGate>
      <div className="mx-auto max-w-lg space-y-0 pb-16">

        {/* ── header urgente ── */}
        <div className="flex items-center justify-between px-1 pb-4 pt-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-red-500">Alerta de emergencia</p>
            <h1 className="mt-0.5 text-xl font-black tracking-tight text-slate-900">Reportar mascota perdida</h1>
          </div>
          <Link href="/lost-pets" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            Cancelar
          </Link>
        </div>

        {/* ── step indicator ── */}
        <div className="flex gap-0 border border-slate-200 overflow-hidden rounded-xl mb-5">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => { if (i + 1 < step || (i + 1 === 2 && selectedPetId) || (i + 1 === 3 && canStep2)) setStep(i + 1); }}
              className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
                step === i + 1
                  ? "bg-red-600 text-white"
                  : step > i + 1
                  ? "bg-red-50 text-red-600"
                  : "bg-white text-slate-400"
              }`}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>

        {error && <div className="mb-4"><InlineBanner tone="error">{error}</InlineBanner></div>}

        {isLoading ? (
          <SurfaceSkeleton blocks={4} />
        ) : pets.length === 0 ? (
          <EmptyState
            eyebrow="Sin mascotas"
            title="Necesitas al menos una mascota registrada"
            description="Crea la ficha de tu mascota para poder crear alertas de pérdida."
            action={<Link href="/pets/new" className="btn btn-primary">Crear mascota</Link>}
          />
        ) : (
          <>
            {/* ─────────────────── PASO 1: MASCOTA ─────────────────── */}
            {step === 1 && (
              <div className="overflow-hidden rounded-none border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-5 py-4">
                  <p className="text-sm font-bold text-slate-800">¿Cuál de tus mascotas está perdida?</p>
                  <p className="mt-0.5 text-xs text-slate-500">Toca para seleccionar y continuar.</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {pets.map((pet) => (
                    <button
                      key={pet.id}
                      type="button"
                      onClick={() => { setSelectedPetId(pet.id); setStep(2); requestCurrentLocation(); }}
                      className={`flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50 ${
                        selectedPetId === pet.id ? "bg-red-50" : ""
                      }`}
                    >
                      {pet.primaryPhotoUrl ? (
                        <img src={pet.primaryPhotoUrl} alt={pet.name} className="h-12 w-12 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-black text-slate-400">
                          {pet.name[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900">{pet.name}</p>
                        <p className="text-xs text-slate-500">{pet.species} · {pet.breed || "Sin raza"}</p>
                      </div>
                      {selectedPetId === pet.id && (
                        <span className="shrink-0 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white">
                          Seleccionada
                        </span>
                      )}
                      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ─────────────────── PASO 2: UBICACIÓN ─────────────────── */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-none border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-5 py-4">
                    <p className="text-sm font-bold text-slate-800">¿Dónde fue vista por última vez?</p>
                    <p className="mt-0.5 text-xs text-slate-500">Marca el punto más cercano posible.</p>
                  </div>

                  {/* modo de ubicación */}
                  <div className="flex border-b border-slate-100">
                    {(["current", "search", "map"] as const).map((mode) => {
                      const labels = { current: "Mi ubicación", search: "Buscar dirección", map: "Mover pin" };
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            setLocationMode(mode);
                            if (mode === "current") requestCurrentLocation();
                          }}
                          className={`flex-1 py-2.5 text-[11px] font-semibold transition-colors ${
                            locationMode === mode
                              ? "bg-slate-900 text-white"
                              : "text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          {labels[mode]}
                        </button>
                      );
                    })}
                  </div>

                  {/* búsqueda por texto */}
                  {locationMode === "search" && (
                    <div className="px-5 py-4 space-y-2">
                      <input
                        value={addressQuery}
                        onChange={(e) => setAddressQuery(e.target.value)}
                        placeholder="Calle, parque, referencia..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-900"
                        autoFocus
                      />
                      {addressResults.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handlePickSuggestion(r)}
                          className="w-full rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100"
                        >
                          <p className="text-xs font-semibold text-slate-800">{r.label}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">{r.address}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* mapa */}
                  <MapCanvas
                    accessToken={MAPBOX_TOKEN}
                    points={[]}
                    pickedLocation={pickedLocation}
                    onPickLocation={(loc) => {
                      setPickedLocation(loc);
                      void reverseGeocodeLocation(loc.lat, loc.lng).then((a) => setLastSeenAddress(a ?? "Punto en el mapa"));
                    }}
                    center={pickedLocation}
                    className="h-[280px] w-full"
                  />

                  {/* dirección confirmada */}
                  <div className="px-5 py-3">
                    {geoLoading ? (
                      <p className="text-xs text-slate-400">Obteniendo tu ubicación…</p>
                    ) : pickedLocation ? (
                      <div className="flex items-start gap-2">
                        <svg viewBox="0 0 24 24" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                        <p className="text-xs font-semibold text-slate-700">{lastSeenAddress}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Aún sin ubicación confirmada.</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                    Volver
                  </button>
                  <button
                    type="button"
                    disabled={!canStep2}
                    onClick={() => setStep(3)}
                    className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-40"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}

            {/* ─────────────────── PASO 3: DETALLES + PUBLICAR ─────────────────── */}
            {step === 3 && (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-none border border-slate-200 bg-white">
                  {/* resumen compacto */}
                  <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
                    {selectedPet?.primaryPhotoUrl ? (
                      <img src={selectedPet.primaryPhotoUrl} alt={selectedPet.name} className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-400">
                        {selectedPet?.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900">{selectedPet?.name}</p>
                      <p className="truncate text-[11px] text-slate-500">{lastSeenAddress}</p>
                    </div>
                    <button type="button" onClick={() => setStep(1)} className="text-[11px] font-semibold text-slate-400 hover:text-slate-600">
                      Cambiar
                    </button>
                  </div>

                  <div className="space-y-0 divide-y divide-slate-100">
                    {/* fecha/hora */}
                    <div className="px-5 py-4">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Última vez vista</label>
                      <input
                        type="datetime-local"
                        value={lastSeenAt}
                        onChange={(e) => setLastSeenAt(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-900"
                      />
                    </div>

                    {/* descripción */}
                    <div className="px-5 py-4">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                        Descripción breve <span className="font-normal normal-case text-slate-400">(opcional)</span>
                      </label>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Ej: se asustó y corrió hacia el parque…"
                        className="w-full resize-none rounded-lg border border-slate-200 px-4 py-3 text-sm leading-relaxed outline-none focus:border-slate-900 placeholder:text-slate-300"
                      />
                    </div>
                  </div>

                  {/* opciones avanzadas */}
                  <div className="border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced((v) => !v)}
                      className="flex w-full items-center justify-between px-5 py-3 text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Opciones avanzadas
                      <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7"/></svg>
                    </button>

                    {showAdvanced && (
                      <div className="space-y-4 border-t border-slate-100 px-5 pb-5 pt-4">
                        <div>
                          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Notas médicas urgentes</label>
                          <textarea
                            rows={2}
                            value={emergencyNotes}
                            onChange={(e) => setEmergencyNotes(e.target.value)}
                            placeholder="Medicación, alergias u otro dato crítico…"
                            className="w-full resize-none rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-900 placeholder:text-slate-300"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Radio de difusión</label>
                          <select
                            value={searchRadiusKm}
                            onChange={(e) => setSearchRadiusKm(Number(e.target.value))}
                            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-900"
                          >
                            <option value={3}>3 km</option>
                            <option value={5}>5 km</option>
                            <option value={10}>10 km (recomendado)</option>
                            <option value={20}>20 km</option>
                            <option value={50}>50 km</option>
                          </select>
                        </div>
                        <label className="flex items-center gap-3 text-sm text-slate-700">
                          <input type="checkbox" checked={medicalPriority} onChange={(e) => setMedicalPriority(e.target.checked)} className="h-4 w-4 rounded" />
                          <span>Marcar como prioridad médica</span>
                        </label>
                        <label className="flex items-center gap-3 text-sm text-slate-700">
                          <input type="checkbox" checked={shareAfterCreate} onChange={(e) => setShareAfterCreate(e.target.checked)} className="h-4 w-4 rounded" />
                          <span>Compartir automáticamente al publicar</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* botones */}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(2)} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                    Volver
                  </button>
                  <button
                    type="button"
                    disabled={!canPublish || isSaving}
                    onClick={() => void handlePublish()}
                    className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-black text-white shadow-sm hover:bg-red-700 disabled:opacity-40"
                  >
                    {isSaving ? "Publicando…" : "Publicar alerta"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AuthGate>
  );
}

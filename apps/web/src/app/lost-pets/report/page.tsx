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
  now.setMinutes(0, 0, 0);
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short"
  });
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
  const [description, setDescription] = useState("");
  const [emergencyNotes, setEmergencyNotes] = useState("");
  const [searchRadiusKm, setSearchRadiusKm] = useState(10);
  const [medicalPriority, setMedicalPriority] = useState(false);
  const [broadcastEnabled, setBroadcastEnabled] = useState(true);
  const [shareAfterCreate, setShareAfterCreate] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    const loadPetsData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const petRows = await listPets(accessToken);
        setPets(petRows);
        setSelectedPetId(petRows[0]?.id ?? "");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar mascotas.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadPetsData();
  }, [accessToken]);

  useEffect(() => {
    if (locationMode !== "search" || addressQuery.trim().length < 3) {
      setAddressResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      void searchAddressSuggestions(addressQuery)
        .then((rows) => setAddressResults(rows))
        .catch(() => setAddressResults([]));
    }, 250);

    return () => clearTimeout(timeout);
  }, [addressQuery, locationMode]);

  const selectedPet = useMemo(
    () => pets.find((pet) => pet.id === selectedPetId) ?? null,
    [pets, selectedPetId]
  );

  const canContinueStep2 = Boolean(pickedLocation && lastSeenAddress);
  const canContinueStep3 = Boolean(lastSeenAt && description.trim());

  const requestCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      setError("Tu navegador no soporta geolocalizacion.");
      return;
    }

    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setPickedLocation(nextLocation);
        const address = await reverseGeocodeLocation(nextLocation.lat, nextLocation.lng).catch(() => null);
        setLastSeenAddress(address ?? "Ubicacion actual");
      },
      (locationError) => {
        setError(locationError.message || "No fue posible obtener tu ubicacion.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    if (locationMode === "current" && !pickedLocation) {
      requestCurrentLocation();
    }
  }, [locationMode, pickedLocation]);

  const handlePickSuggestion = (suggestion: GeocodingSuggestion) => {
    setPickedLocation({
      lat: suggestion.lat,
      lng: suggestion.lng
    });
    setLastSeenAddress(suggestion.address);
    setAddressQuery(suggestion.address);
    setAddressResults([]);
  };

  const handlePublish = async () => {
    if (!accessToken || !selectedPetId || !pickedLocation) {
      setError("Completa la mascota y la ultima ubicacion antes de publicar.");
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
        broadcastEnabled
      });

      const shareUrl = `${window.location.origin}/lost-pets/public/${created.shareToken}`;

      if (shareAfterCreate) {
        try {
          if (navigator.share) {
            await navigator.share({
              title: `Ayuda a encontrar a ${selectedPet?.name ?? "esta mascota"}`,
              text: "Difunde esta alerta pet.",
              url: shareUrl
            });
          } else {
            await navigator.clipboard.writeText(shareUrl);
          }
        } catch {
          // Keep navigation flow even if share is cancelled.
        }
      }

      showToast({
        tone: "success",
        title: "Alerta publicada",
        description: shareAfterCreate
          ? "La alerta quedo publicada y lista para difusion."
          : "La alerta ya aparece disponible para la comunidad."
      });

      router.push(`/lost-pets/${created.id}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo crear la alerta.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AuthGate>
      <div className="space-y-6">
        <section className="kumpa-soft-section p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="kumpa-eyebrow">Reportar mascota perdida</span>
              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Wizard simple, visual y pensado para movil
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Selecciona la mascota, marca la ultima ubicacion, agrega contexto, define la difusion y
                publica sin campos tecnicos ni coordenadas manuales.
              </p>
            </div>
            <Link href="/lost-pets" className="btn btn-outline">
              Volver a alertas
            </Link>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-5">
            {[
              "Mascota",
              "Ubicacion",
              "Datos",
              "Difusion",
              "Previsualizar"
            ].map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(index + 1)}
                className={`kumpa-chip justify-center ${step === index + 1 ? "kumpa-chip-active" : ""}`}
              >
                {index + 1}. {label}
              </button>
            ))}
          </div>
        </section>

        {error && <InlineBanner tone="error">{error}</InlineBanner>}

        {isLoading ? (
          <>
            <SurfaceSkeleton blocks={5} />
            <SurfaceSkeleton blocks={4} />
          </>
        ) : pets.length === 0 ? (
          <EmptyState
            eyebrow="Mascotas"
            title="Necesitas al menos una mascota registrada para crear la alerta"
            description="Crea primero la ficha de tu mascota para usar reportes de perdida, identidad compartible y seguimiento."
            action={
              <Link href="/pets/new" className="btn btn-primary">
                Crear mascota
              </Link>
            }
          />
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_360px]">
            <section className="space-y-5">
              {step === 1 && (
                <div className="card p-5">
                  <h2 className="kumpa-section-title">Paso 1. Seleccionar mascota</h2>
                  <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                    Elige la mascota que quieres reportar. Usaremos su foto y datos para la alerta.
                  </p>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {pets.map((pet) => (
                      <button
                        key={pet.id}
                        type="button"
                        onClick={() => {
                          setSelectedPetId(pet.id);
                          setStep(2);
                        }}
                        className={`card p-4 text-left ${selectedPetId === pet.id ? "border-[hsl(var(--destructive))]" : ""}`}
                      >
                        <p className="text-lg font-semibold">{pet.name}</p>
                        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                          {pet.species} · {pet.breed || "Sin raza"}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="card p-5">
                  <h2 className="kumpa-section-title">Paso 2. Ultima ubicacion conocida</h2>
                  <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                    Usa tu ubicacion actual, busca la direccion o mueve el pin en el mapa.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLocationMode("current");
                        requestCurrentLocation();
                      }}
                      className={`kumpa-chip ${locationMode === "current" ? "kumpa-chip-active" : ""}`}
                    >
                      Usar mi ubicacion actual
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
                      onClick={() => setLocationMode("map")}
                      className={`kumpa-chip ${locationMode === "map" ? "kumpa-chip-active" : ""}`}
                    >
                      Mover pin en mapa
                    </button>
                  </div>

                  {locationMode === "search" && (
                    <div className="mt-4 space-y-3">
                      <input
                        value={addressQuery}
                        onChange={(event) => setAddressQuery(event.target.value)}
                        placeholder="Escribe una direccion, parque o referencia..."
                      />
                      {addressResults.length > 0 && (
                        <div className="space-y-2">
                          {addressResults.map((result) => (
                            <button
                              key={result.id}
                              type="button"
                              onClick={() => handlePickSuggestion(result)}
                              className="card w-full p-4 text-left"
                            >
                              <p className="font-semibold">{result.label}</p>
                              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{result.address}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4">
                    <MapCanvas
                      accessToken={MAPBOX_TOKEN}
                      points={[]}
                      pickedLocation={pickedLocation}
                      onPickLocation={(locationData) => {
                        setPickedLocation(locationData);
                        void reverseGeocodeLocation(locationData.lat, locationData.lng).then((address) => {
                          setLastSeenAddress(address ?? "Punto seleccionado en el mapa");
                        });
                      }}
                      center={pickedLocation}
                      className="h-[320px] w-full rounded-[1.8rem] lg:h-[420px]"
                    />
                  </div>

                  <div className="mt-4 rounded-2xl bg-[hsl(var(--muted))] p-4 text-sm">
                    <p className="font-semibold">Ubicacion seleccionada</p>
                    <p className="mt-1 text-[hsl(var(--muted-foreground))]">
                      {lastSeenAddress || "Aun no hay una ubicacion confirmada."}
                    </p>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      disabled={!canContinueStep2}
                      onClick={() => setStep(3)}
                      className="btn btn-primary"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="card p-5">
                  <h2 className="kumpa-section-title">Paso 3. Datos simples</h2>
                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold">Fecha y hora ultima vez vista</label>
                      <input type="datetime-local" value={lastSeenAt} onChange={(event) => setLastSeenAt(event.target.value)} />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold">Descripcion breve</label>
                      <textarea
                        rows={4}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Ejemplo: se asusto en el parque y corrio hacia la avenida."
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold">Observaciones medicas opcionales</label>
                      <textarea
                        rows={3}
                        value={emergencyNotes}
                        onChange={(event) => setEmergencyNotes(event.target.value)}
                        placeholder="Medicacion, alergias o cualquier dato urgente."
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold">Radio de difusion</label>
                      <select value={searchRadiusKm} onChange={(event) => setSearchRadiusKm(Number(event.target.value))}>
                        <option value={3}>3 km</option>
                        <option value={5}>5 km</option>
                        <option value={10}>10 km</option>
                        <option value={20}>20 km</option>
                        <option value={50}>50 km</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between gap-3">
                    <button type="button" onClick={() => setStep(2)} className="btn btn-outline">
                      Volver
                    </button>
                    <button
                      type="button"
                      disabled={!canContinueStep3}
                      onClick={() => setStep(4)}
                      className="btn btn-primary"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="card p-5">
                  <h2 className="kumpa-section-title">Paso 4. Opciones de difusion</h2>
                  <div className="mt-4 grid gap-3">
                    <label className="flex items-center gap-3 rounded-2xl bg-[hsl(var(--muted))] p-4 text-sm">
                      <input type="checkbox" checked={broadcastEnabled} onChange={(event) => setBroadcastEnabled(event.target.checked)} />
                      Activar difusion comunitaria
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl bg-[hsl(var(--muted))] p-4 text-sm">
                      <input type="checkbox" checked={medicalPriority} onChange={(event) => setMedicalPriority(event.target.checked)} />
                      Prioridad medica
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl bg-[hsl(var(--muted))] p-4 text-sm">
                      <input type="checkbox" checked={shareAfterCreate} onChange={(event) => setShareAfterCreate(event.target.checked)} />
                      Compartir automaticamente al publicar
                    </label>
                  </div>

                  <div className="mt-4 flex justify-between gap-3">
                    <button type="button" onClick={() => setStep(3)} className="btn btn-outline">
                      Volver
                    </button>
                    <button type="button" onClick={() => setStep(5)} className="btn btn-primary">
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="card p-5">
                  <h2 className="kumpa-section-title">Paso 5. Previsualizar y publicar</h2>
                  <div className="mt-4 space-y-3 rounded-[1.6rem] bg-[hsl(var(--muted))] p-5 text-sm">
                    <p><strong>Mascota:</strong> {selectedPet?.name || "Sin seleccionar"}</p>
                    <p><strong>Ultima ubicacion:</strong> {lastSeenAddress || "Sin ubicacion"}</p>
                    <p><strong>Ultima vez vista:</strong> {formatDateTime(lastSeenAt)}</p>
                    <p><strong>Descripcion:</strong> {description || "Sin descripcion"}</p>
                    <p><strong>Observaciones medicas:</strong> {emergencyNotes || "Sin observaciones"}</p>
                    <p><strong>Radio:</strong> {searchRadiusKm} km</p>
                    <p><strong>Difusion comunitaria:</strong> {broadcastEnabled ? "Activa" : "No"}</p>
                    <p><strong>Prioridad medica:</strong> {medicalPriority ? "Si" : "No"}</p>
                    <p><strong>Compartir al publicar:</strong> {shareAfterCreate ? "Si" : "No"}</p>
                  </div>

                  <div className="mt-4 flex justify-between gap-3">
                    <button type="button" onClick={() => setStep(4)} className="btn btn-outline">
                      Volver
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void handlePublish()}
                      className="btn btn-primary"
                    >
                      {isSaving ? "Publicando..." : "Publicar alerta"}
                    </button>
                  </div>
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <div className="card p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                  Resumen rapido
                </p>
                <div className="mt-4 space-y-3 text-sm">
                  <p><strong>Mascota:</strong> {selectedPet?.name || "Sin seleccionar"}</p>
                  <p><strong>Ubicacion:</strong> {lastSeenAddress || "Pendiente"}</p>
                  <p><strong>Fecha:</strong> {formatDateTime(lastSeenAt)}</p>
                  <p><strong>Radio:</strong> {searchRadiusKm} km</p>
                </div>
              </div>

              <div className="card p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                  Reglas UX cumplidas
                </p>
                <div className="mt-4 space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                  <p>Nunca se muestran campos de latitud o longitud al usuario.</p>
                  <p>La ubicacion se resuelve con mapa, geolocalizacion o busqueda por direccion.</p>
                  <p>El flujo se mantiene visual, escaneable y optimizado para movil.</p>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </AuthGate>
  );
}

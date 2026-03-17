"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/features/auth/auth-context";
import { createLostPetAlert } from "@/features/lost-pets/lost-pets-api";
import { listPets } from "@/features/pets/pets-api";
import type { Pet } from "@/features/pets/types";

function getDefaultDateTime() {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

export default function LostPetsReportPage() {
  const router = useRouter();
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;

  const [pets, setPets] = useState<Pet[]>([]);
  const [petId, setPetId] = useState("");
  const [lastSeenAt, setLastSeenAt] = useState(getDefaultDateTime());
  const [lastSeenLat, setLastSeenLat] = useState("");
  const [lastSeenLng, setLastSeenLng] = useState("");
  const [lastSeenAddress, setLastSeenAddress] = useState("");
  const [description, setDescription] = useState("");
  const [emergencyNotes, setEmergencyNotes] = useState("");
  const [medicalPriority, setMedicalPriority] = useState(false);
  const [searchRadiusKm, setSearchRadiusKm] = useState(10);
  const [broadcastEnabled, setBroadcastEnabled] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPets = async () => {
      if (!accessToken) return;
      setIsLoading(true);
      setError(null);

      try {
        const data = await listPets(accessToken);
        setPets(data);
        setPetId(data[0]?.id ?? "");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar mascotas.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadPets();
  }, [accessToken]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;

    if (!petId || !lastSeenLat || !lastSeenLng) {
      setError("Debes seleccionar mascota y coordenadas de ultima ubicacion.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const created = await createLostPetAlert(accessToken, {
        petId,
        lastSeenAt: new Date(lastSeenAt).toISOString(),
        lastSeenLat: Number(lastSeenLat),
        lastSeenLng: Number(lastSeenLng),
        lastSeenAddress: lastSeenAddress || undefined,
        description: description || undefined,
        emergencyNotes: emergencyNotes || undefined,
        medicalPriority,
        searchRadiusKm,
        broadcastEnabled
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
      <div className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Reportar mascota perdida</h1>
            <p className="text-sm text-slate-600">
              Crea una alerta comunitaria con ultima ubicacion y prioridad medica.
            </p>
          </div>
          <Link
            href="/lost-pets"
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700"
          >
            Volver
          </Link>
        </header>

        {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Cargando formulario...
          </div>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Mascota
                <select
                  value={petId}
                  onChange={(event) => setPetId(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Selecciona una mascota</option>
                  {pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name} - {pet.species}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Fecha/hora ultima vez vista
                <input
                  type="datetime-local"
                  value={lastSeenAt}
                  onChange={(event) => setLastSeenAt(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Latitud
                <input
                  value={lastSeenLat}
                  onChange={(event) => setLastSeenLat(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="-33.4489"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Longitud
                <input
                  value={lastSeenLng}
                  onChange={(event) => setLastSeenLng(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="-70.6693"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                Direccion/zona
                <input
                  value={lastSeenAddress}
                  onChange={(event) => setLastSeenAddress(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Parque Bustamante, Providencia"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                Descripcion de perdida
                <textarea
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                Observaciones medicas
                <textarea
                  rows={2}
                  value={emergencyNotes}
                  onChange={(event) => setEmergencyNotes(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Radio de busqueda (km)
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={searchRadiusKm}
                  onChange={(event) => setSearchRadiusKm(Number(event.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <div className="flex flex-col justify-end gap-2 text-sm text-slate-700">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={medicalPriority}
                    onChange={(event) => setMedicalPriority(event.target.checked)}
                  />
                  Prioridad medica
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={broadcastEnabled}
                    onChange={(event) => setBroadcastEnabled(event.target.checked)}
                  />
                  Activar difusion comunitaria
                </label>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isSaving ? "Guardando..." : "Publicar alerta"}
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </AuthGate>
  );
}

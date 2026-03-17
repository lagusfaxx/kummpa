"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AuthGate } from "@/components/auth/auth-gate";
import { EmptyState } from "@/components/feedback/empty-state";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { SurfaceSkeleton } from "@/components/feedback/skeleton";
import { useAuth } from "@/features/auth/auth-context";
import { getPet, updatePetVisibility } from "@/features/pets/pets-api";
import type { Pet } from "@/features/pets/types";
import { useToast } from "@/features/ui/toast-context";

export default function PetDetailsPage() {
  const params = useParams<{ id: string }>();
  const petId = typeof params.id === "string" ? params.id : "";
  const { session } = useAuth();
  const { showToast } = useToast();
  const [pet, setPet] = useState<Pet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = session?.tokens.accessToken;
    if (!accessToken || !petId) {
      return;
    }

    const fetchPet = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getPet(accessToken, petId);
        setPet(data);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar la mascota.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchPet();
  }, [petId, session?.tokens.accessToken]);

  const handleVisibility = async () => {
    const accessToken = session?.tokens.accessToken;
    if (!accessToken || !pet) {
      return;
    }

    try {
      const updated = await updatePetVisibility(accessToken, pet.id, !pet.isPublic);
      setPet(updated);
      showToast({
        tone: "success",
        title: updated.isPublic ? "Perfil publico activado" : "Perfil privado activado",
        description: updated.isPublic
          ? "El link compartible de esta mascota ya esta disponible."
          : "La mascota dejo de mostrarse de forma publica."
      });
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "No se pudo cambiar visibilidad.");
    }
  };

  return (
    <AuthGate>
      <div className="space-y-4">
        {error && <InlineBanner tone="error">{error}</InlineBanner>}

        {isLoading ? (
          <SurfaceSkeleton blocks={5} />
        ) : !pet ? (
          <EmptyState
            eyebrow="Mascota"
            title="Mascota no encontrada"
            description="La ficha solicitada no existe, fue archivada o ya no pertenece a esta cuenta."
          />
        ) : (
          <>
            <header className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">{pet.name}</h1>
                  <p className="text-sm text-slate-600">
                    {pet.species} · {pet.breed} · {pet.ageYears ?? "?"} anos
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Estado: {pet.isPublic ? "Publico" : "Privado"} · token: {pet.shareToken}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/pets/${pet.id}/vaccines`}
                    className="inline-flex min-h-11 items-center rounded-2xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition active:scale-[0.98]"
                  >
                    Carnet vacunas
                  </Link>
                  <Link
                    href={`/pets/${pet.id}/public-profile`}
                    className="inline-flex min-h-11 items-center rounded-2xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition active:scale-[0.98]"
                  >
                    Perfil publico
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      void handleVisibility();
                    }}
                    className="inline-flex min-h-11 items-center rounded-2xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition active:scale-[0.98]"
                  >
                    {pet.isPublic ? "Marcar privado" : "Marcar publico"}
                  </button>
                  <Link
                    href={`/pets/${pet.id}/edit`}
                    className="inline-flex min-h-11 items-center rounded-2xl bg-slate-900 px-3 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(15,23,42,0.18)] transition active:scale-[0.98]"
                  >
                    Editar
                  </Link>
                  <Link
                    href={`/pets/${pet.id}/identity`}
                    className="inline-flex min-h-11 items-center rounded-2xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition active:scale-[0.98]"
                  >
                    QR/NFC
                  </Link>
                </div>
              </div>
            </header>

            <section className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur">
              <h2 className="text-lg font-bold text-slate-900">Ficha de identidad</h2>
              <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <div>
                  <dt className="font-semibold">Sexo</dt>
                  <dd>{pet.sex}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Tamano</dt>
                  <dd>{pet.size}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Peso</dt>
                  <dd>{pet.weightKg ?? "-"} kg</dd>
                </div>
                <div>
                  <dt className="font-semibold">Microchip</dt>
                  <dd>{pet.microchipNumber ?? "-"}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Esterilizado</dt>
                  <dd>{pet.isSterilized ? "Si" : "No"}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Color</dt>
                  <dd>{pet.color ?? "-"}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur">
              <h2 className="text-lg font-bold text-slate-900">Salud y contactos</h2>
              <div className="mt-3 grid gap-2 text-sm text-slate-700">
                <p>
                  <span className="font-semibold">Alergias:</span> {pet.allergies ?? "-"}
                </p>
                <p>
                  <span className="font-semibold">Enfermedades:</span> {pet.diseases ?? "-"}
                </p>
                <p>
                  <span className="font-semibold">Medicamentos:</span> {pet.medications ?? "-"}
                </p>
                <p>
                  <span className="font-semibold">Alimentacion:</span> {pet.feeding ?? "-"}
                </p>
                <p>
                  <span className="font-semibold">Veterinaria habitual:</span> {pet.usualVetName ?? "-"}
                </p>
                <p>
                  <span className="font-semibold">Contacto emergencia:</span>{" "}
                  {pet.emergencyContactName ?? "-"} {pet.emergencyContactPhone ? `(${pet.emergencyContactPhone})` : ""}
                </p>
                <p>
                  <span className="font-semibold">Notas:</span> {pet.generalNotes ?? "-"}
                </p>
              </div>
            </section>

            {pet.isPublic && (
              <section className="rounded-[1.75rem] border border-brand-200 bg-brand-50/90 p-4 text-sm text-brand-800 shadow-sm">
                Enlace publico:{" "}
                <a href={pet.shareUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
                  {pet.shareUrl}
                </a>
              </section>
            )}
          </>
        )}
      </div>
    </AuthGate>
  );
}

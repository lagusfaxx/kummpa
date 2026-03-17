"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGate } from "@/components/auth/auth-gate";
import { EmptyState } from "@/components/feedback/empty-state";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { SurfaceSkeleton } from "@/components/feedback/skeleton";
import { PageIntro } from "@/components/layout/page-intro";
import { useAuth } from "@/features/auth/auth-context";
import { deletePet, listPets, updatePetVisibility } from "@/features/pets/pets-api";
import type { Pet } from "@/features/pets/types";
import { useToast } from "@/features/ui/toast-context";

export default function PetsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = session?.tokens.accessToken;
    if (!accessToken) {
      return;
    }

    const fetchPets = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await listPets(accessToken);
        setPets(data);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar tus mascotas.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchPets();
  }, [session?.tokens.accessToken]);

  const handleDelete = async (petId: string) => {
    const accessToken = session?.tokens.accessToken;
    if (!accessToken) {
      return;
    }

    const confirmed = window.confirm("¿Eliminar esta mascota? Esta accion se puede revertir desde admin.");
    if (!confirmed) {
      return;
    }

    try {
      setWorkingId(`delete-${petId}`);
      await deletePet(accessToken, petId);
      setPets((current) => current.filter((pet) => pet.id !== petId));
      showToast({
        tone: "success",
        title: "Mascota archivada",
        description: "La mascota fue retirada de tu lista visible."
      });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar la mascota.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleToggleVisibility = async (pet: Pet) => {
    const accessToken = session?.tokens.accessToken;
    if (!accessToken) {
      return;
    }

    try {
      setWorkingId(`visibility-${pet.id}`);
      const updated = await updatePetVisibility(accessToken, pet.id, !pet.isPublic);
      setPets((current) => current.map((item) => (item.id === pet.id ? updated : item)));
      showToast({
        tone: "success",
        title: updated.isPublic ? "Perfil publico activado" : "Perfil privado activado",
        description: updated.isPublic
          ? "La mascota ya puede compartirse con link publico."
          : "La mascota ya no se muestra de forma publica."
      });
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "No se pudo actualizar visibilidad.");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <AuthGate>
      <div className="space-y-4">
        <PageIntro
          eyebrow="Identidad pet"
          title="Mis mascotas"
          description="Gestiona perfiles, visibilidad publica y enlaces compartibles desde una experiencia visual alineada con la marca de Kumpa."
          tone="health"
          actions={
            <Link href="/pets/new" className="kumpa-button-primary">
              Nueva mascota
            </Link>
          }
        />

        {error && <InlineBanner tone="error">{error}</InlineBanner>}

        {isLoading ? (
          <div className="grid gap-3">
            <SurfaceSkeleton blocks={4} />
            <SurfaceSkeleton blocks={4} />
          </div>
        ) : pets.length === 0 ? (
          <EmptyState
            eyebrow="Mascotas"
            title="Aun no tienes mascotas registradas"
            description="Crea la primera ficha para empezar a usar carnet, reservas, identidad digital y alertas."
            action={
              <Link
                href="/pets/new"
                className="kumpa-button-primary"
              >
                Crear primera mascota
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3">
            {pets.map((pet) => (
              <article
                key={pet.id}
                className="kumpa-panel p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{pet.name}</h2>
                    <p className="text-sm text-slate-600">
                      {pet.species} · {pet.breed}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {pet.isPublic ? "Publico" : "Privado"} · token: {pet.shareToken}
                    </p>
                    {pet.isPublic && (
                      <a
                        href={pet.shareUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs font-semibold text-brand-700 underline"
                      >
                        Ver perfil publico
                      </a>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={workingId === `visibility-${pet.id}`}
                      onClick={() => {
                        void handleToggleVisibility(pet);
                      }}
                      className="kumpa-button-secondary px-3 text-xs"
                    >
                      {workingId === `visibility-${pet.id}`
                        ? "Guardando..."
                        : pet.isPublic
                          ? "Marcar privado"
                          : "Marcar publico"}
                    </button>
                    <Link
                      href={`/pets/${pet.id}`}
                      className="kumpa-button-secondary px-3 text-xs"
                    >
                      Ver
                    </Link>
                    <Link
                      href={`/pets/${pet.id}/vaccines`}
                      className="kumpa-button-secondary px-3 text-xs"
                    >
                      Carnet
                    </Link>
                    <Link
                      href={`/pets/${pet.id}/edit`}
                      className="kumpa-button-secondary px-3 text-xs"
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      disabled={workingId === `delete-${pet.id}`}
                      onClick={() => {
                        void handleDelete(pet.id);
                      }}
                      className="kumpa-button-alert px-3 text-xs"
                    >
                      {workingId === `delete-${pet.id}` ? "Archivando..." : "Eliminar"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AuthGate>
  );
}


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

    const confirmed = window.confirm("¿Eliminar esta mascota?");
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
        description: "La mascota fue retirada de tu lista."
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
        title: updated.isPublic ? "Perfil publico" : "Perfil privado",
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
      <div className="space-y-6">
        <PageIntro
          title="Mis mascotas"
          description="Gestiona perfiles, carnet de vacunas y enlaces compartibles."
          actions={
            <Link href="/pets/new" className="btn btn-primary">
              Nueva mascota
            </Link>
          }
        />

        {error && <InlineBanner tone="error">{error}</InlineBanner>}

        {isLoading ? (
          <div className="grid gap-4">
            <SurfaceSkeleton blocks={4} />
            <SurfaceSkeleton blocks={4} />
          </div>
        ) : pets.length === 0 ? (
          <EmptyState
            title="Sin mascotas registradas"
            description="Crea tu primera mascota para usar carnet, identidad y alertas."
            action={
              <Link href="/pets/new" className="btn btn-primary">
                Crear mascota
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pets.map((pet) => (
              <article key={pet.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-lg font-semibold">
                      {pet.name}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {pet.species} · {pet.breed}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      pet.isPublic
                        ? "bg-secondary/10 text-secondary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {pet.isPublic ? "Publico" : "Privado"}
                  </span>
                </div>

                {pet.isPublic && pet.shareUrl && (
                  <a
                    href={pet.shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex text-sm font-medium text-secondary hover:underline"
                  >
                    Ver perfil publico
                  </a>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/pets/${pet.id}`} className="btn btn-outline text-xs">
                    Ver
                  </Link>
                  <Link href={`/pets/${pet.id}/vaccines`} className="btn btn-outline text-xs">
                    Carnet
                  </Link>
                  <Link href={`/pets/${pet.id}/edit`} className="btn btn-outline text-xs">
                    Editar
                  </Link>
                </div>

                <div className="mt-3 flex gap-2 border-t border-border pt-3">
                  <button
                    type="button"
                    disabled={workingId === `visibility-${pet.id}`}
                    onClick={() => {
                      void handleToggleVisibility(pet);
                    }}
                    className="btn btn-ghost flex-1 text-xs"
                  >
                    {workingId === `visibility-${pet.id}`
                      ? "..."
                      : pet.isPublic
                        ? "Ocultar"
                        : "Publicar"}
                  </button>
                  <button
                    type="button"
                    disabled={workingId === `delete-${pet.id}`}
                    onClick={() => {
                      void handleDelete(pet.id);
                    }}
                    className="btn btn-ghost flex-1 text-xs text-destructive"
                  >
                    {workingId === `delete-${pet.id}` ? "..." : "Eliminar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AuthGate>
  );
}

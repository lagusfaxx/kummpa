"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { EmptyState } from "@/components/feedback/empty-state";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { SurfaceSkeleton } from "@/components/feedback/skeleton";
import { PageIntro } from "@/components/layout/page-intro";
import { useAuth } from "@/features/auth/auth-context";
import { deletePet, listPets, updatePetVisibility } from "@/features/pets/pets-api";
import type { Pet } from "@/features/pets/types";
import { useToast } from "@/features/ui/toast-context";
import { getVaccineCard } from "@/features/vaccines/vaccines-api";
import type { PetVaccineCard } from "@/features/vaccines/types";

interface PetCardState {
  pet: Pet;
  vaccineCard: PetVaccineCard | null;
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short"
  });
}

function vaccineStatusLabel(card: PetVaccineCard | null) {
  if (!card) return "Carnet pendiente";
  if (card.summary.overallStatus === "OVERDUE") return "Urgente";
  if (card.summary.overallStatus === "DUE_SOON") return "Pendiente";
  return "Al dia";
}

function vaccineFeatureLabel(card: PetVaccineCard | null) {
  if (!card) return "Sin carnet digital cargado";
  if (card.summary.overallStatus === "OVERDUE") return "Vacuna vencida";
  if (card.summary.overallStatus === "DUE_SOON") return "Proxima vacuna";
  return "Carnet al dia";
}

function vaccineStatusTone(card: PetVaccineCard | null) {
  if (!card) return "kumpa-status-warning";
  if (card.summary.overallStatus === "OVERDUE") return "kumpa-status-danger";
  if (card.summary.overallStatus === "DUE_SOON") return "kumpa-status-warning";
  return "kumpa-status-success";
}

function petTimeline(card: PetVaccineCard | null, pet: Pet) {
  return [
    card?.history[0]?.appliedAt
      ? `Ultima vacuna ${formatDate(card.history[0].appliedAt)}`
      : "Sin vacuna registrada",
    card?.upcoming[0]?.nextDoseAt
      ? `Proxima dosis ${formatDate(card.upcoming[0].nextDoseAt)}`
      : "Sin proxima dosis pendiente",
    pet.healthStatus || "Estado general sin alertas"
  ];
}

export default function PetsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.tokens.accessToken;

  const [pets, setPets] = useState<PetCardState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const loadPetsData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const petRows = await listPets(accessToken);
        const enriched = await Promise.all(
          petRows.map(async (pet) => {
            try {
              const vaccineCard = await getVaccineCard(accessToken, pet.id);
              return { pet, vaccineCard };
            } catch {
              return { pet, vaccineCard: null };
            }
          })
        );
        setPets(enriched);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar tus mascotas.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadPetsData();
  }, [accessToken]);

  const totals = useMemo(() => {
    return {
      total: pets.length,
      overdue: pets.filter((item) => item.vaccineCard?.summary.overallStatus === "OVERDUE").length,
      dueSoon: pets.filter((item) => item.vaccineCard?.summary.overallStatus === "DUE_SOON").length,
      publicProfiles: pets.filter((item) => item.pet.isPublic).length
    };
  }, [pets]);

  const handleCopyProfile = async (pet: Pet) => {
    try {
      await navigator.clipboard.writeText(pet.shareUrl);
      showToast({
        tone: "success",
        title: "Link copiado",
        description: "El perfil publico de la mascota quedo listo para compartir."
      });
    } catch {
      setError("No se pudo copiar el perfil publico.");
    }
  };

  const handleToggleVisibility = async (pet: Pet) => {
    if (!accessToken) return;

    try {
      setWorkingId(`visibility-${pet.id}`);
      const updated = await updatePetVisibility(accessToken, pet.id, !pet.isPublic);
      setPets((current) =>
        current.map((item) => (item.pet.id === pet.id ? { ...item, pet: updated } : item))
      );
      showToast({
        tone: "success",
        title: updated.isPublic ? "Perfil publico activado" : "Perfil privado activado",
        description: updated.isPublic
          ? "Ahora puedes compartir la identidad de tu mascota."
          : "La mascota dejo de mostrarse de forma publica."
      });
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "No se pudo actualizar visibilidad.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleArchive = async (pet: Pet) => {
    if (!accessToken) return;
    const confirmed = window.confirm(`Archivar a ${pet.name}?`);
    if (!confirmed) return;

    try {
      setWorkingId(`delete-${pet.id}`);
      await deletePet(accessToken, pet.id);
      setPets((current) => current.filter((item) => item.pet.id !== pet.id));
      showToast({
        tone: "success",
        title: "Mascota archivada",
        description: "Puedes volver a crearla o restaurar su informacion mas adelante."
      });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo archivar la mascota.");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <AuthGate>
      <div className="space-y-6">
        <PageIntro
          eyebrow="Mis mascotas"
          title="Perfiles, vacunas e identidad con mas contexto emocional"
          description="Cada mascota muestra foto protagonista, estado rapido, carnet como feature central y una linea simple de salud para decidir rapido."
          tone="care"
          metrics={[
            { value: String(totals.total), label: "mascotas" },
            { value: String(totals.overdue), label: "urgentes" },
            { value: String(totals.dueSoon), label: "pendientes" },
            { value: String(totals.publicProfiles), label: "compartibles" }
          ]}
          actions={
            <Link href="/pets/new" className="btn btn-primary">
              Agregar mascota
            </Link>
          }
        />

        {error ? <InlineBanner tone="error">{error}</InlineBanner> : null}

        {isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <SurfaceSkeleton blocks={5} />
            <SurfaceSkeleton blocks={5} />
            <SurfaceSkeleton blocks={5} />
          </div>
        ) : pets.length === 0 ? (
          <EmptyState
            eyebrow="Mis mascotas"
            title="Tu primera mascota convierte Kumpa en una herramienta realmente util"
            description="Al crearla desbloqueas carnet digital, vacunas y recordatorios, alertas de perdida, identidad compartible y reservas asociadas."
            highlights={[
              "Carnet digital",
              "Vacunas y recordatorios",
              "Alertas de perdida",
              "Identidad compartible",
              "Reservas asociadas"
            ]}
            action={
              <Link href="/pets/new" className="btn btn-primary">
                Crear mi primera mascota
              </Link>
            }
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {pets.map((item) => (
              <article key={item.pet.id} className="card overflow-hidden p-0">
                <div className="relative h-52 overflow-hidden bg-[hsl(var(--muted))]">
                  {item.pet.primaryPhotoUrl ? (
                    <img
                      src={item.pet.primaryPhotoUrl}
                      alt={item.pet.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl font-semibold text-[hsl(var(--muted-foreground))]">
                      {item.pet.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,hsl(164_27%_13%_/_0.82))] p-4 text-white">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <h2 className="truncate text-2xl font-semibold">{item.pet.name}</h2>
                        <p className="mt-1 text-sm text-white/80">
                          {item.pet.species} | {item.pet.breed || "Sin raza"} | {item.pet.ageYears ?? "?"} anos
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${vaccineStatusTone(item.vaccineCard)}`}>
                        {vaccineStatusLabel(item.vaccineCard)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 p-5">
                  <div className="rounded-[1.4rem] border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.45)] p-4">
                    <p className="kumpa-eyebrow">Carnet digital</p>
                    <p className="mt-3 text-lg font-semibold">{vaccineFeatureLabel(item.vaccineCard)}</p>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                      {item.vaccineCard?.upcoming[0]?.nextDoseAt
                        ? `Proxima dosis ${formatDate(item.vaccineCard.upcoming[0].nextDoseAt)}`
                        : "Sin dosis pendiente por ahora"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold">Timeline simple de salud</p>
                    <div className="mt-3 space-y-2">
                      {petTimeline(item.vaccineCard, item.pet).map((entry) => (
                        <div
                          key={`${item.pet.id}-${entry}`}
                          className="flex items-center gap-3 rounded-[1rem] bg-[hsl(var(--muted)/0.35)] px-3 py-3 text-sm"
                        >
                          <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--secondary))]" />
                          <span>{entry}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Link href={`/pets/${item.pet.id}/vaccines`} className="btn btn-primary text-xs">
                      Ver carnet
                    </Link>
                    <Link href={`/pets/${item.pet.id}`} className="btn btn-outline text-xs">
                      Ver perfil
                    </Link>
                    <Link href={`/pets/${item.pet.id}/edit`} className="btn btn-outline text-xs">
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        void handleCopyProfile(item.pet);
                      }}
                      className="btn btn-outline text-xs"
                    >
                      Compartir perfil
                    </button>
                    <Link href={`/pets/${item.pet.id}/identity`} className="btn btn-outline text-xs">
                      Ver QR / identidad
                    </Link>
                    <Link href={`/pets/${item.pet.id}/vaccines`} className="btn btn-outline text-xs">
                      Historial medico
                    </Link>
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-[hsl(var(--border))] pt-4">
                    <button
                      type="button"
                      disabled={workingId === `visibility-${item.pet.id}`}
                      onClick={() => {
                        void handleToggleVisibility(item.pet);
                      }}
                      className="btn btn-ghost text-xs"
                    >
                      {item.pet.isPublic ? "Marcar privado" : "Activar perfil publico"}
                    </button>
                    <button
                      type="button"
                      disabled={workingId === `delete-${item.pet.id}`}
                      onClick={() => {
                        void handleArchive(item.pet);
                      }}
                      className="btn btn-ghost text-xs text-[hsl(var(--destructive))]"
                    >
                      Archivar
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

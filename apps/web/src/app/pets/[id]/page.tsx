"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AuthGate } from "@/components/auth/auth-gate";
import { EmptyState } from "@/components/feedback/empty-state";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { SurfaceSkeleton } from "@/components/feedback/skeleton";
import { useAuth } from "@/features/auth/auth-context";
import { listLostPetAlerts } from "@/features/lost-pets/lost-pets-api";
import type { LostPetAlert } from "@/features/lost-pets/types";
import { getPet, getPetPublicIdentity, updatePetVisibility } from "@/features/pets/pets-api";
import type { Pet, PetPublicIdentityManaged } from "@/features/pets/types";
import { useToast } from "@/features/ui/toast-context";
import { getVaccineCard } from "@/features/vaccines/vaccines-api";
import type { PetVaccineCard } from "@/features/vaccines/types";

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function healthStatusTone(card: PetVaccineCard | null) {
  if (!card) return "bg-slate-100 text-slate-700";
  if (card.summary.overallStatus === "OVERDUE") return "bg-red-100 text-red-700";
  if (card.summary.overallStatus === "DUE_SOON") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-700";
}

function healthStatusLabel(card: PetVaccineCard | null) {
  if (!card) return "Sin carnet";
  if (card.summary.overallStatus === "OVERDUE") return "Vacuna vencida";
  if (card.summary.overallStatus === "DUE_SOON") return "Proxima vacuna";
  return "Vacunas al dia";
}

export default function PetDetailsPage() {
  const params = useParams<{ id: string }>();
  const petId = typeof params.id === "string" ? params.id : "";
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.tokens.accessToken;

  const [pet, setPet] = useState<Pet | null>(null);
  const [vaccineCard, setVaccineCard] = useState<PetVaccineCard | null>(null);
  const [identity, setIdentity] = useState<PetPublicIdentityManaged | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<LostPetAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !petId) return;

    const loadPetPage = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [petData, vaccineData, identityData, alertData] = await Promise.all([
          getPet(accessToken, petId),
          getVaccineCard(accessToken, petId).catch(() => null),
          getPetPublicIdentity(accessToken, petId).catch(() => null),
          listLostPetAlerts(accessToken, { petId, activeOnly: true, limit: 5 }).catch(() => [])
        ]);

        setPet(petData);
        setVaccineCard(vaccineData);
        setIdentity(identityData);
        setActiveAlerts(alertData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la mascota.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadPetPage();
  }, [accessToken, petId]);

  const certificateLinks = useMemo(
    () => vaccineCard?.history.filter((record) => record.certificateUrl).slice(0, 3) ?? [],
    [vaccineCard]
  );

  const handleVisibility = async () => {
    if (!accessToken || !pet) return;

    try {
      const updated = await updatePetVisibility(accessToken, pet.id, !pet.isPublic);
      setPet(updated);
      showToast({
        tone: "success",
        title: updated.isPublic ? "Perfil publico activado" : "Perfil privado activado",
        description: updated.isPublic
          ? "Ahora puedes compartir la ficha e identidad de tu mascota."
          : "La mascota dejo de mostrarse de forma publica."
      });
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "No se pudo actualizar visibilidad.");
    }
  };

  return (
    <AuthGate>
      <div className="space-y-5">
        {error && <InlineBanner tone="error">{error}</InlineBanner>}

        {isLoading ? (
          <>
            <SurfaceSkeleton blocks={5} />
            <div className="grid gap-4 xl:grid-cols-2">
              <SurfaceSkeleton blocks={4} />
              <SurfaceSkeleton blocks={4} />
            </div>
          </>
        ) : !pet ? (
          <EmptyState
            eyebrow="Mascota"
            title="No encontramos esta mascota"
            description="La ficha solicitada no existe, fue archivada o ya no pertenece a esta cuenta."
          />
        ) : (
          <>
            <section className="kumpa-soft-section overflow-hidden p-5 sm:p-6">
              <div className="grid gap-5 lg:grid-cols-[140px_minmax(0,1fr)]">
                <div className="h-36 w-36 overflow-hidden rounded-[1.8rem] bg-[hsl(var(--muted))]">
                  {pet.primaryPhotoUrl ? (
                    <img src={pet.primaryPhotoUrl} alt={pet.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl font-semibold text-[hsl(var(--muted-foreground))]">
                      {pet.name.slice(0, 1)}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="kumpa-eyebrow">Resumen</span>
                      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                        {pet.name}
                      </h1>
                      <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                        {pet.species} · {pet.breed || "Sin raza"} · {pet.ageYears ?? "?"} anos
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${healthStatusTone(vaccineCard)}`}>
                      {healthStatusLabel(vaccineCard)}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="kumpa-metric">
                      <p className="text-xl font-bold">{vaccineCard?.summary.totalVaccines ?? 0}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                        vacunas
                      </p>
                    </div>
                    <div className="kumpa-metric">
                      <p className="text-xl font-bold">{activeAlerts.length}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                        alertas activas
                      </p>
                    </div>
                    <div className="kumpa-metric">
                      <p className="text-xl font-bold">{pet.isPublic ? "ON" : "OFF"}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                        perfil compartible
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link href={`/pets/${pet.id}/edit`} className="btn btn-primary">
                      Editar mascota
                    </Link>
                    <Link href={`/pets/${pet.id}/vaccines`} className="btn btn-outline">
                      Ver carnet
                    </Link>
                    <Link href={`/pets/${pet.id}/identity`} className="btn btn-outline">
                      Ver QR / NFC
                    </Link>
                    <button type="button" onClick={() => void handleVisibility()} className="btn btn-outline">
                      {pet.isPublic ? "Marcar privado" : "Activar perfil publico"}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-2">
              <section className="card p-5">
                <h2 className="kumpa-section-title">Resumen</h2>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <p><strong>Sexo:</strong> {pet.sex}</p>
                  <p><strong>Tamano:</strong> {pet.size}</p>
                  <p><strong>Peso:</strong> {pet.weightKg ?? "-"} kg</p>
                  <p><strong>Microchip:</strong> {pet.microchipNumber ?? "-"}</p>
                  <p><strong>Esterilizado:</strong> {pet.isSterilized ? "Si" : "No"}</p>
                  <p><strong>Color:</strong> {pet.color ?? "-"}</p>
                  <p><strong>Veterinaria habitual:</strong> {pet.usualVetName ?? "-"}</p>
                  <p><strong>Contacto emergencia:</strong> {pet.emergencyContactPhone ?? "-"}</p>
                </div>
                <div className="mt-4 rounded-2xl bg-[hsl(var(--muted))] p-4 text-sm">
                  <p className="font-semibold">Estado general</p>
                  <p className="mt-1 text-[hsl(var(--muted-foreground))]">
                    {pet.healthStatus || pet.generalNotes || "Sin observaciones importantes registradas."}
                  </p>
                </div>
              </section>

              <section className="card p-5">
                <h2 className="kumpa-section-title">Carnet de vacunacion</h2>
                {vaccineCard ? (
                  <>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="kumpa-metric">
                        <p className="text-xl font-bold">{vaccineCard.summary.upToDateCount}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                          al dia
                        </p>
                      </div>
                      <div className="kumpa-metric">
                        <p className="text-xl font-bold">{vaccineCard.summary.dueSoonCount}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                          por vencer
                        </p>
                      </div>
                      <div className="kumpa-metric">
                        <p className="text-xl font-bold">{vaccineCard.summary.overdueCount}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                          vencidas
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-[hsl(var(--muted))] p-4 text-sm">
                      <p className="font-semibold">
                        {vaccineCard.upcoming[0]?.vaccineName || "Sin proxima dosis registrada"}
                      </p>
                      <p className="mt-1 text-[hsl(var(--muted-foreground))]">
                        {vaccineCard.upcoming[0]?.nextDoseAt
                          ? `Fecha sugerida ${formatDate(vaccineCard.upcoming[0].nextDoseAt)}`
                          : "Puedes agregar vacunas o recordatorios desde el carnet completo."}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">
                    Aun no hay informacion de carnet para esta mascota.
                  </p>
                )}
                <div className="mt-4">
                  <Link href={`/pets/${pet.id}/vaccines`} className="btn btn-outline">
                    Abrir carnet completo
                  </Link>
                </div>
              </section>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <section className="card p-5">
                <h2 className="kumpa-section-title">Historial</h2>
                <div className="mt-4 space-y-3">
                  {vaccineCard?.history.slice(0, 4).map((record) => (
                    <article key={record.id} className="rounded-2xl bg-[hsl(var(--muted))] p-4 text-sm">
                      <p className="font-semibold">{record.vaccineName}</p>
                      <p className="mt-1 text-[hsl(var(--muted-foreground))]">
                        Aplicada {formatDate(record.appliedAt)}
                        {record.nextDoseAt ? ` · Proxima ${formatDate(record.nextDoseAt)}` : ""}
                      </p>
                      {record.providerName && (
                        <p className="mt-1 text-[hsl(var(--muted-foreground))]">{record.providerName}</p>
                      )}
                    </article>
                  ))}
                  {(!vaccineCard || vaccineCard.history.length === 0) && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      Aun no hay historial registrado.
                    </p>
                  )}
                </div>
              </section>

              <section className="card p-5">
                <h2 className="kumpa-section-title">Identidad QR / NFC</h2>
                {identity ? (
                  <>
                    <div className="mt-4 rounded-2xl bg-[hsl(var(--muted))] p-4 text-sm">
                      <p className="font-semibold">
                        Estado de emergencia: {identity.identity.emergencyStatus}
                      </p>
                      <p className="mt-1 text-[hsl(var(--muted-foreground))]">
                        URL publica lista para compartir y QR descargable para collar o ficha de emergencia.
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a href={identity.identity.urls.publicUrl} target="_blank" rel="noreferrer" className="btn btn-outline">
                        Ver perfil publico
                      </a>
                      <a href={identity.identity.urls.qrImageUrl} target="_blank" rel="noreferrer" className="btn btn-outline">
                        Descargar QR
                      </a>
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">
                    Configura la identidad digital para compartir datos utiles cuando alguien encuentre a tu mascota.
                  </p>
                )}
                <div className="mt-4">
                  <Link href={`/pets/${pet.id}/identity`} className="btn btn-primary">
                    Gestionar identidad
                  </Link>
                </div>
              </section>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <section className="card p-5">
                <h2 className="kumpa-section-title">Alertas</h2>
                <div className="mt-4 space-y-3">
                  {activeAlerts.length === 0 ? (
                    <div className="rounded-2xl bg-[hsl(var(--muted))] p-4 text-sm text-[hsl(var(--muted-foreground))]">
                      No hay alertas activas para esta mascota.
                    </div>
                  ) : (
                    activeAlerts.map((alert) => (
                      <article key={alert.id} className="rounded-2xl bg-[hsl(var(--muted))] p-4 text-sm">
                        <p className="font-semibold">{alert.lastSeenAddress || "Ultima ubicacion registrada"}</p>
                        <p className="mt-1 text-[hsl(var(--muted-foreground))]">
                          Reportada el {formatDate(alert.lastSeenAt)}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link href={`/lost-pets/${alert.id}`} className="btn btn-outline text-xs">
                            Ver alerta
                          </Link>
                          <Link href={`/lost-pets/${alert.id}#report-sighting`} className="btn btn-secondary text-xs">
                            Reportar avistamiento
                          </Link>
                        </div>
                      </article>
                    ))
                  )}
                </div>
                <div className="mt-4">
                  <Link href="/lost-pets/report" className="btn btn-outline">
                    Crear alerta nueva
                  </Link>
                </div>
              </section>

              <section className="card p-5">
                <h2 className="kumpa-section-title">Documentos</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-2xl bg-[hsl(var(--muted))] p-4">
                    <p className="font-semibold">Perfil compartible</p>
                    <p className="mt-1 text-[hsl(var(--muted-foreground))]">
                      {pet.isPublic ? "Activo y listo para compartir." : "Actualmente privado."}
                    </p>
                    {pet.isPublic && (
                      <a href={pet.shareUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-semibold text-[hsl(var(--primary))]">
                        Abrir perfil publico
                      </a>
                    )}
                  </div>

                  {vaccineCard && (
                    <div className="rounded-2xl bg-[hsl(var(--muted))] p-4">
                      <p className="font-semibold">Impresion del carnet</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a href={vaccineCard.share.printableSheetUrl} target="_blank" rel="noreferrer" className="btn btn-outline text-xs">
                          Hoja imprimible
                        </a>
                        <a href={vaccineCard.share.printableCardUrl} target="_blank" rel="noreferrer" className="btn btn-outline text-xs">
                          Tarjeta
                        </a>
                      </div>
                    </div>
                  )}

                  {certificateLinks.length > 0 && (
                    <div className="rounded-2xl bg-[hsl(var(--muted))] p-4">
                      <p className="font-semibold">Documentos medicos recientes</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {certificateLinks.map((record) => (
                          <a
                            key={record.id}
                            href={record.certificateUrl!}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline text-xs"
                          >
                            {record.vaccineName}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </AuthGate>
  );
}

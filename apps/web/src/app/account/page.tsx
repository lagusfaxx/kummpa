"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { SurfaceSkeleton } from "@/components/feedback/skeleton";
import { PageIntro } from "@/components/layout/page-intro";
import { useAuth } from "@/features/auth/auth-context";
import { listAppointments } from "@/features/appointments/appointments-api";
import type { AppointmentRecord } from "@/features/appointments/types";
import { getMyProfile } from "@/features/profiles/profiles-api";
import type { MyProfile } from "@/features/profiles/types";

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function appointmentStatusLabel(status: AppointmentRecord["status"]) {
  if (status === "CONFIRMED") return "Confirmada";
  if (status === "PENDING") return "Pendiente";
  if (status === "COMPLETED") return "Completada";
  if (status === "CANCELLED") return "Cancelada";
  if (status === "REJECTED") return "Rechazada";
  return "Reagendada";
}

export default function AccountPage() {
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [profileRow, appointmentRows] = await Promise.all([
          getMyProfile(accessToken),
          listAppointments(accessToken, { limit: 12, view: "owner" })
        ]);
        setProfile(profileRow);
        setAppointments(appointmentRows);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar tu cuenta.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [accessToken]);

  const metrics = useMemo(() => {
    return [
      { value: String(appointments.length), label: "reservas" },
      { value: String(appointments.filter((item) => item.status === "CONFIRMED").length), label: "confirmadas" },
      { value: profile?.user.role ?? "OWNER", label: "rol" },
      { value: profile?.user.city ?? "-", label: "ciudad" }
    ];
  }, [appointments, profile?.user.city, profile?.user.role]);

  return (
    <AuthGate>
      <div className="space-y-6">
        <PageIntro
          eyebrow="Cuenta"
          title="Tu perfil e historial viven aqui"
          description="Reservar ya no es una seccion aparte. Desde cuenta ves historial, perfil y configuracion; desde explorar encuentras y reservas lo nuevo."
          tone="default"
          metrics={metrics}
        />

        {error ? <InlineBanner tone="error">{error}</InlineBanner> : null}

        {isLoading ? (
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <SurfaceSkeleton blocks={5} />
            <SurfaceSkeleton blocks={6} />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="card p-5">
              <span className="kumpa-eyebrow">Perfil</span>
              <h2 className="mt-3 text-2xl font-bold">{profile?.user.firstName || session?.user.firstName || "Mi cuenta"}</h2>
              <div className="mt-4 grid gap-3 text-sm">
                <div className="rounded-[1.2rem] border border-[hsl(var(--border))] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Correo</p>
                  <p className="mt-2 font-medium">{profile?.user.email || session?.user.email || "-"}</p>
                </div>
                <div className="rounded-[1.2rem] border border-[hsl(var(--border))] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Telefono</p>
                  <p className="mt-2 font-medium">{profile?.user.phone || "No configurado"}</p>
                </div>
                <div className="rounded-[1.2rem] border border-[hsl(var(--border))] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Ciudad</p>
                  <p className="mt-2 font-medium">{profile?.user.city || "No configurada"}</p>
                </div>
              </div>
            </section>

            <section className="card p-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <span className="kumpa-eyebrow">Historial</span>
                  <h2 className="mt-3 text-2xl font-bold">Reservas recientes</h2>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {appointments.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-[hsl(var(--border))] p-5 text-sm text-[hsl(var(--muted-foreground))]">
                    Aun no tienes reservas. Todo parte buscando desde explorar.
                  </div>
                ) : (
                  appointments.map((appointment) => (
                    <article key={appointment.id} className="rounded-[1.2rem] border border-[hsl(var(--border))] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{appointment.provider.providerName || appointment.appointmentService?.title || appointment.serviceTypeLabel}</p>
                          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{formatDate(appointment.scheduledAt)}</p>
                        </div>
                        <span className="kumpa-chip">{appointmentStatusLabel(appointment.status)}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                        {appointment.pet?.name ? <span className="kumpa-chip">{appointment.pet.name}</span> : null}
                        {appointment.appointmentService?.title ? <span className="kumpa-chip">{appointment.appointmentService.title}</span> : <span className="kumpa-chip">{appointment.serviceTypeLabel}</span>}
                        {appointment.appointmentService?.priceCents ? <span className="kumpa-chip">Desde $ {(appointment.appointmentService.priceCents / 100).toLocaleString("es-CL")}</span> : null}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </AuthGate>
  );
}

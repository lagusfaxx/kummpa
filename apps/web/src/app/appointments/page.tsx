"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { EmptyState } from "@/components/feedback/empty-state";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { PageIntro } from "@/components/layout/page-intro";
import {
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  listAppointments,
  rejectAppointment
} from "@/features/appointments/appointments-api";
import type { AppointmentRecord } from "@/features/appointments/types";
import { useAuth } from "@/features/auth/auth-context";
import { useToast } from "@/features/ui/toast-context";

const providerRoles = new Set(["VET", "CAREGIVER", "SHOP", "ADMIN"]);

function formatDateLabel(isoValue: string) {
  return new Date(isoValue).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function formatMoney(priceCents?: number | null, currencyCode = "CLP") {
  if (priceCents === null || priceCents === undefined) return null;
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(priceCents);
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    CONFIRMED: "bg-emerald-100 text-emerald-800",
    CANCELLED: "bg-red-100 text-red-800",
    COMPLETED: "bg-blue-100 text-blue-800",
    REJECTED: "bg-slate-100 text-slate-600"
  };
  return styles[status] || "bg-slate-100 text-slate-600";
}

// Categories for browsing providers
const serviceCategories = [
  {
    id: "VET",
    title: "Veterinarias",
    description: "Consultas, vacunas, urgencias",
    icon: "🏥",
    href: "/map?types=VET",
    color: "bg-emerald-50 border-emerald-200"
  },
  {
    id: "GROOMING",
    title: "Peluquerias",
    description: "Bano, corte, estetica",
    icon: "✂️",
    href: "/map?types=GROOMING",
    color: "bg-pink-50 border-pink-200"
  },
  {
    id: "HOTEL",
    title: "Hoteles y Guarderias",
    description: "Alojamiento, cuidado diurno",
    icon: "🏨",
    href: "/map?types=HOTEL",
    color: "bg-blue-50 border-blue-200"
  },
  {
    id: "CAREGIVER",
    title: "Cuidadores",
    description: "Paseos, cuidado en casa",
    icon: "🐕",
    href: "/map?types=CAREGIVER",
    color: "bg-amber-50 border-amber-200"
  },
  {
    id: "SHOP",
    title: "Tiendas Pet",
    description: "Alimentos, accesorios",
    icon: "🛒",
    href: "/map?types=SHOP",
    color: "bg-violet-50 border-violet-200"
  }
];

export default function AppointmentsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.tokens.accessToken;
  const isProvider = providerRoles.has(session?.user.role ?? "");

  const [ownerAppointments, setOwnerAppointments] = useState<AppointmentRecord[]>([]);
  const [providerAppointments, setProviderAppointments] = useState<AppointmentRecord[]>([]);
  const [view, setView] = useState<"browse" | "my-appointments" | "provider">("browse");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const appointments = view === "provider" ? providerAppointments : ownerAppointments;
  const upcomingAppointments = ownerAppointments.filter(
    (a) => a.status === "CONFIRMED" || a.status === "PENDING"
  );

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    try {
      const [ownerData, providerData] = await Promise.all([
        listAppointments(accessToken, { view: "owner", limit: 50 }),
        isProvider
          ? listAppointments(accessToken, { view: "provider", limit: 50 })
          : Promise.resolve([])
      ]);

      setOwnerAppointments(ownerData);
      setProviderAppointments(providerData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar reservas.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, isProvider]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const runAction = async (
    appointmentId: string,
    successTitle: string,
    fn: () => Promise<unknown>
  ) => {
    setWorkingId(appointmentId);
    setError(null);
    try {
      await fn();
      await loadData();
      showToast({
        tone: "success",
        title: successTitle,
        description: "La reserva se actualizo correctamente."
      });
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No se pudo actualizar.");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <AuthGate>
      <div className="space-y-6">
        <PageIntro
          title="Agenda"
          description="Encuentra servicios para tu mascota y gestiona tus reservas"
        />

        {error && <InlineBanner tone="error">{error}</InlineBanner>}

        {/* Navigation tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setView("browse")}
            className={`btn whitespace-nowrap ${view === "browse" ? "btn-primary" : "btn-outline"}`}
          >
            Buscar servicios
          </button>
          <button
            type="button"
            onClick={() => setView("my-appointments")}
            className={`btn whitespace-nowrap ${view === "my-appointments" ? "btn-primary" : "btn-outline"}`}
          >
            Mis reservas
            {upcomingAppointments.length > 0 && (
              <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                {upcomingAppointments.length}
              </span>
            )}
          </button>
          {isProvider && (
            <button
              type="button"
              onClick={() => setView("provider")}
              className={`btn whitespace-nowrap ${view === "provider" ? "btn-primary" : "btn-outline"}`}
            >
              Agenda proveedor
            </button>
          )}
        </div>

        {/* Browse services view */}
        {view === "browse" && (
          <div className="space-y-6">
            {/* Upcoming appointments preview */}
            {upcomingAppointments.length > 0 && (
              <section className="card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold">Proximas citas</h2>
                  <button
                    type="button"
                    onClick={() => setView("my-appointments")}
                    className="text-sm font-medium text-[hsl(var(--secondary))]"
                  >
                    Ver todas
                  </button>
                </div>
                <div className="space-y-2">
                  {upcomingAppointments.slice(0, 2).map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between rounded-lg bg-[hsl(var(--muted))] p-3"
                    >
                      <div>
                        <p className="font-medium">{appointment.pet.name}</p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          {appointment.serviceTypeLabel} - {formatDateLabel(appointment.scheduledAt)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadge(appointment.status)}`}
                      >
                        {appointment.status === "CONFIRMED" ? "Confirmada" : "Pendiente"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Service categories */}
            <section>
              <h2 className="mb-4 text-lg font-semibold">Reservar un servicio</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {serviceCategories.map((category) => (
                  <Link
                    key={category.id}
                    href={category.href}
                    className={`card flex items-start gap-4 p-4 transition-shadow hover:shadow-md ${category.color}`}
                  >
                    <span className="text-3xl">{category.icon}</span>
                    <div>
                      <h3 className="font-semibold">{category.title}</h3>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {category.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Quick actions */}
            <section className="card p-4">
              <h2 className="mb-3 font-semibold">Acciones rapidas</h2>
              <div className="flex flex-wrap gap-2">
                <Link href="/map?emergencyOnly=true" className="btn btn-outline">
                  Urgencias 24/7
                </Link>
                <Link href="/map?openNow=true" className="btn btn-outline">
                  Abiertos ahora
                </Link>
                <Link href="/map?atHomeOnly=true" className="btn btn-outline">
                  Servicio a domicilio
                </Link>
              </div>
            </section>
          </div>
        )}

        {/* My appointments view */}
        {view === "my-appointments" && (
          <section className="space-y-3">
            {loading ? (
              <div className="card p-6 text-center text-[hsl(var(--muted-foreground))]">
                Cargando reservas...
              </div>
            ) : ownerAppointments.length === 0 ? (
              <EmptyState
                title="Sin reservas"
                description="Cuando reserves un servicio, aparecera aqui. Explora las categorias para encontrar lo que necesitas."
              />
            ) : (
              ownerAppointments.map((appointment) => (
                <article key={appointment.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{appointment.pet.name}</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(appointment.status)}`}
                        >
                          {appointment.status}
                        </span>
                      </div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {appointment.serviceTypeLabel}
                      </p>
                      <p className="text-sm">{formatDateLabel(appointment.scheduledAt)}</p>
                      {appointment.providerName && (
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          {appointment.providerName}
                        </p>
                      )}
                      {appointment.appointmentService && (
                        <p className="text-sm font-medium text-[hsl(var(--secondary))]">
                          {formatMoney(
                            appointment.appointmentService.priceCents,
                            appointment.appointmentService.currencyCode
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {(appointment.status === "PENDING" || appointment.status === "CONFIRMED") && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={workingId === appointment.id}
                        onClick={() =>
                          runAction(appointment.id, "Reserva cancelada", () =>
                            cancelAppointment(accessToken!, appointment.id)
                          )
                        }
                        className="btn btn-outline text-[hsl(var(--destructive))]"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </article>
              ))
            )}
          </section>
        )}

        {/* Provider view */}
        {view === "provider" && isProvider && (
          <section className="space-y-3">
            {loading ? (
              <div className="card p-6 text-center text-[hsl(var(--muted-foreground))]">
                Cargando agenda...
              </div>
            ) : providerAppointments.length === 0 ? (
              <EmptyState
                title="Sin reservas de clientes"
                description="Cuando un tutor reserve tus servicios, veras aqui las solicitudes."
              />
            ) : (
              providerAppointments.map((appointment) => (
                <article key={appointment.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{appointment.pet.name}</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(appointment.status)}`}
                        >
                          {appointment.status}
                        </span>
                      </div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {appointment.serviceTypeLabel}
                      </p>
                      <p className="text-sm">{formatDateLabel(appointment.scheduledAt)}</p>
                      {appointment.reason && (
                        <p className="mt-1 text-sm italic text-[hsl(var(--muted-foreground))]">
                          "{appointment.reason}"
                        </p>
                      )}
                    </div>
                  </div>

                  {appointment.status === "PENDING" && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={workingId === appointment.id}
                        onClick={() =>
                          runAction(appointment.id, "Reserva confirmada", () =>
                            confirmAppointment(accessToken!, appointment.id)
                          )
                        }
                        className="btn btn-secondary"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        disabled={workingId === appointment.id}
                        onClick={() =>
                          runAction(appointment.id, "Reserva rechazada", () =>
                            rejectAppointment(accessToken!, appointment.id, "No disponible")
                          )
                        }
                        className="btn btn-outline"
                      >
                        Rechazar
                      </button>
                    </div>
                  )}

                  {appointment.status === "CONFIRMED" && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={workingId === appointment.id}
                        onClick={() =>
                          runAction(appointment.id, "Reserva completada", () =>
                            completeAppointment(accessToken!, appointment.id)
                          )
                        }
                        className="btn btn-secondary"
                      >
                        Marcar completada
                      </button>
                      <button
                        type="button"
                        disabled={workingId === appointment.id}
                        onClick={() =>
                          runAction(appointment.id, "Reserva cancelada", () =>
                            cancelAppointment(accessToken!, appointment.id)
                          )
                        }
                        className="btn btn-outline"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </article>
              ))
            )}

            {/* Provider settings link */}
            <div className="card p-4">
              <h3 className="font-semibold">Configuracion de proveedor</h3>
              <p className="mb-3 text-sm text-[hsl(var(--muted-foreground))]">
                Administra tus horarios y servicios disponibles
              </p>
              <Link href="/appointments/settings" className="btn btn-outline">
                Configurar agenda
              </Link>
            </div>
          </section>
        )}
      </div>
    </AuthGate>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { EmptyState } from "@/components/feedback/empty-state";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { SurfaceSkeleton } from "@/components/feedback/skeleton";
import {
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  getAppointment,
  rejectAppointment,
  rescheduleAppointment
} from "@/features/appointments/appointments-api";
import type { AppointmentRecord } from "@/features/appointments/types";
import { useAuth } from "@/features/auth/auth-context";
import { useToast } from "@/features/ui/toast-context";

function formatDateLabel(value: string) {
  return new Date(value).toLocaleString("es-CL", {
    dateStyle: "full",
    timeStyle: "short"
  });
}

function toLocalInput(isoValue: string) {
  const date = new Date(isoValue);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function AppointmentDetailsPage() {
  const params = useParams<{ id: string }>();
  const appointmentId = typeof params.id === "string" ? params.id : "";
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.tokens.accessToken;

  const [appointment, setAppointment] = useState<AppointmentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAppointment = async () => {
    if (!accessToken || !appointmentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAppointment(accessToken, appointmentId);
      setAppointment(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la reserva.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAppointment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, appointmentId]);

  const runAction = async (successTitle: string, fn: () => Promise<unknown>) => {
    if (!accessToken || !appointment) return;
    setWorking(true);
    setError(null);
    try {
      await fn();
      await loadAppointment();
      showToast({
        tone: "success",
        title: successTitle,
        description: "La reserva fue actualizada correctamente."
      });
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No se pudo actualizar la reserva.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <AuthGate>
      <div className="space-y-4">
        <header className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Detalle de reserva</h1>
            <p className="text-sm text-slate-600">Revision completa de estado, fechas y acciones.</p>
          </div>
          <Link href="/appointments" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700">
            Volver
          </Link>
        </header>

        {error && <InlineBanner tone="error">{error}</InlineBanner>}

        {loading ? (
          <SurfaceSkeleton blocks={5} />
        ) : !appointment ? (
          <EmptyState
            eyebrow="Reservas"
            title="Reserva no encontrada"
            description="La reserva solicitada no existe o ya no esta disponible para esta cuenta."
          />
        ) : (
          <article className="space-y-3 rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              <p>
                <span className="font-semibold">Mascota:</span> {appointment.pet.name} ({appointment.pet.species})
              </p>
              <p>
                <span className="font-semibold">Servicio:</span> {appointment.serviceTypeLabel}
              </p>
              {appointment.appointmentService && (
                <p>
                  <span className="font-semibold">Catalogo:</span> {appointment.appointmentService.title}
                </p>
              )}
              <p>
                <span className="font-semibold">Proveedor:</span> {appointment.provider.providerName}
              </p>
              <p>
                <span className="font-semibold">Estado:</span> {appointment.status}
              </p>
              <p>
                <span className="font-semibold">Inicio:</span> {formatDateLabel(appointment.scheduledAt)}
              </p>
              <p>
                <span className="font-semibold">Fin:</span> {formatDateLabel(appointment.endsAt)}
              </p>
              <p>
                <span className="font-semibold">Duracion:</span> {appointment.durationMinutes} min
              </p>
              <p>
                <span className="font-semibold">Tutor:</span> {appointment.owner.fullName}
              </p>
            </div>

            {appointment.reason && (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                <span className="font-semibold">Motivo:</span> {appointment.reason}
              </p>
            )}
            {appointment.appointmentService?.description && (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                <span className="font-semibold">Descripcion servicio:</span>{" "}
                {appointment.appointmentService.description}
              </p>
            )}
            {appointment.notes && (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                <span className="font-semibold">Notas:</span> {appointment.notes}
              </p>
            )}
            {appointment.cancelReason && (
              <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                <span className="font-semibold">Detalle cancelacion/rechazo:</span> {appointment.cancelReason}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {appointment.permissions.canConfirm && (
                <button
                  type="button"
                  disabled={working}
                  onClick={() => {
                    void runAction("Reserva confirmada", () =>
                      confirmAppointment(accessToken!, appointment.id)
                    );
                  }}
                  className="inline-flex min-h-10 items-center rounded-xl border border-emerald-300 px-3 text-xs font-semibold text-emerald-700 disabled:opacity-60"
                >
                  Confirmar
                </button>
              )}

              {appointment.permissions.canReject && (
                <button
                  type="button"
                  disabled={working}
                  onClick={() => {
                    const reason = window.prompt("Motivo rechazo (opcional):", "") ?? undefined;
                    void runAction("Reserva rechazada", () =>
                      rejectAppointment(accessToken!, appointment.id, reason)
                    );
                  }}
                  className="inline-flex min-h-10 items-center rounded-xl border border-rose-300 px-3 text-xs font-semibold text-rose-700 disabled:opacity-60"
                >
                  Rechazar
                </button>
              )}

              {appointment.permissions.canComplete && (
                <button
                  type="button"
                  disabled={working}
                  onClick={() => {
                    void runAction("Reserva completada", () =>
                      completeAppointment(accessToken!, appointment.id)
                    );
                  }}
                  className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 disabled:opacity-60"
                >
                  Completar
                </button>
              )}

              {appointment.permissions.canReschedule && (
                <button
                  type="button"
                  disabled={working}
                  onClick={() => {
                    const nextDate = window.prompt(
                      "Nueva fecha y hora (YYYY-MM-DDTHH:mm):",
                      toLocalInput(appointment.scheduledAt)
                    );
                    if (!nextDate) return;
                    const reason = window.prompt("Motivo reagendamiento (opcional):", "") ?? undefined;
                    void runAction("Reserva reagendada", () =>
                      rescheduleAppointment(accessToken!, appointment.id, {
                        scheduledAt: new Date(nextDate).toISOString(),
                        durationMinutes: appointment.durationMinutes,
                        reason
                      })
                    );
                  }}
                  className="inline-flex min-h-10 items-center rounded-xl border border-sky-300 px-3 text-xs font-semibold text-sky-700 disabled:opacity-60"
                >
                  Reagendar
                </button>
              )}

              {appointment.permissions.canCancel && (
                <button
                  type="button"
                  disabled={working}
                  onClick={() => {
                    const reason = window.prompt("Motivo cancelacion (opcional):", "") ?? undefined;
                    void runAction("Reserva cancelada", () =>
                      cancelAppointment(accessToken!, appointment.id, reason)
                    );
                  }}
                  className="inline-flex min-h-10 items-center rounded-xl border border-rose-300 px-3 text-xs font-semibold text-rose-700 disabled:opacity-60"
                >
                  Cancelar
                </button>
              )}
            </div>
          </article>
        )}
      </div>
    </AuthGate>
  );
}

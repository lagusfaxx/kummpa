"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { useAuth } from "@/features/auth/auth-context";
import { createAppointment } from "@/features/appointments/appointments-api";
import type { CreateAppointmentPayload } from "@/features/appointments/types";
import { listMapServices } from "@/features/map/map-api";
import type { MapServicePoint } from "@/features/map/types";
import { listPets } from "@/features/pets/pets-api";
import type { Pet } from "@/features/pets/types";

/* ─── Page ─────────────────────────────────────────────────────── */
export default function PublicVetPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;

  const [vet, setVet]           = useState<MapServicePoint | null>(null);
  const [pets, setPets]         = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);

  /* booking state */
  const [petId, setPetId]       = useState("");
  const [serviceLabel, setServiceLabel] = useState("");
  const [date, setDate]         = useState("");
  const [hour, setHour]         = useState("09:00");
  const [reason, setReason]     = useState("");
  const [booking, setBooking]   = useState(false);
  const [booked, setBooked]     = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  useEffect(() => {
    void listMapServices({ limit: 100 }).then(res => {
      const point = res.items.find(p => p.sourceId === id || p.id === id);
      setVet(point ?? null);
    }).catch(() => setError("No se pudo cargar la clínica.")).finally(() => setIsLoading(false));

    if (accessToken) {
      void listPets(accessToken).then(setPets).catch(() => {});
    }
  }, [id, accessToken]);

  async function handleBook() {
    if (!accessToken || !petId || !date) return;
    setBooking(true); setBookError(null);
    try {
      const scheduledAt = new Date(`${date}T${hour}:00`).toISOString();
      const payload: CreateAppointmentPayload = {
        petId,
        providerType: "VET",
        providerSourceId: id,
        providerName: vet?.name ?? "Veterinaria",
        serviceType: "GENERAL_CONSULT",
        scheduledAt,
        durationMinutes: 30,
        reason: reason || serviceLabel || undefined,
      };
      await createAppointment(accessToken, payload);
      setBooked(true);
    } catch (err) {
      setBookError(err instanceof Error ? err.message : "No se pudo realizar la reserva.");
    } finally { setBooking(false); }
  }

  const today = new Date().toISOString().split("T")[0]!;
  const HOURS = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00"];

  if (isLoading) {
    return (
      <div className="space-y-4 py-8">
        <div className="h-40 animate-pulse rounded-3xl bg-[hsl(var(--muted))]" />
        <div className="h-6 w-1/2 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
        <div className="h-4 w-1/3 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
      </div>
    );
  }

  if (error || !vet) {
    return (
      <div className="py-8 text-center">
        <p className="text-4xl">🏥</p>
        <p className="mt-3 font-bold text-[hsl(var(--foreground))]">Clínica no encontrada</p>
        <Link href="/explore" className="mt-4 inline-block text-sm font-semibold text-[hsl(var(--secondary))] hover:underline">← Volver a Cerca de ti</Link>
      </div>
    );
  }

  return (
    <div className="pb-16 space-y-6">
      {/* back */}
      <Link href="/explore" className="inline-flex items-center gap-1 text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition">
        ← Volver
      </Link>

      {/* header */}
      <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white shadow-sm">
        <div className="h-32 bg-gradient-to-r from-teal-800 to-teal-600" />
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-[hsl(var(--foreground))]">{vet.name}</h1>
              {vet.subtitle && <p className="mt-0.5 text-sm text-[hsl(var(--muted-foreground))]">{vet.subtitle}</p>}
              {(vet.address ?? vet.district ?? vet.city) && (
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  📍 {[vet.address, vet.district, vet.city].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col gap-1.5 items-end">
              {vet.isEmergency24x7 && (
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600">🚨 Urgencias 24/7</span>
              )}
              {vet.isOpenNow !== null && (
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${vet.isOpenNow ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {vet.isOpenNow ? "Abierto ahora" : "Cerrado"}
                </span>
              )}
            </div>
          </div>
          {vet.description && (
            <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--foreground)/0.7)]">{vet.description}</p>
          )}
          {vet.phone && (
            <a href={`tel:${vet.phone}`} className="mt-3 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] px-4 py-2 text-sm font-semibold text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--muted)/0.5)]">
              📞 {vet.phone}
            </a>
          )}
        </div>
      </div>

      {/* 2-col layout */}
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">

        {/* services + info */}
        <div className="space-y-4">
          {/* services */}
          {vet.services.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white shadow-sm p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-4">Servicios disponibles</p>
              <div className="space-y-2">
                {vet.services.map((svc, i) => (
                  <div key={i}
                    onClick={() => setServiceLabel(svc)}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${serviceLabel === svc ? "border-teal-500 bg-teal-50" : "border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.3)]"}`}>
                    <span className="text-teal-600 text-lg">🩺</span>
                    <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{svc}</span>
                    {serviceLabel === svc && <span className="ml-auto text-teal-600 font-bold text-xs">Seleccionado</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* prices */}
          {vet.priceInfo.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white shadow-sm p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-3">Precios de referencia</p>
              <div className="space-y-1.5">
                {vet.priceInfo.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-[hsl(var(--muted)/0.3)] px-4 py-2.5">
                    <span className="text-sm text-[hsl(var(--foreground))]">{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* hours */}
          {vet.openingHours.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white shadow-sm p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-3">Horarios de atención</p>
              <div className="space-y-1">
                {vet.openingHours.map((h, i) => (
                  <p key={i} className="text-sm text-[hsl(var(--foreground)/0.8)]">🕐 {h}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* booking form */}
        <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white shadow-sm p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-4">Reservar cita</p>

          {booked ? (
            <div className="space-y-4 text-center py-4">
              <p className="text-4xl">✅</p>
              <p className="font-bold text-[hsl(var(--foreground))]">¡Reserva enviada!</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">La clínica confirmará tu cita. Puedes ver el estado en Mis citas.</p>
              <Link href="/appointments" className="inline-block rounded-full bg-teal-700 px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90">
                Ver mis citas
              </Link>
            </div>
          ) : !session ? (
            <div className="text-center py-4">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Inicia sesión para reservar</p>
              <Link href="/login" className="mt-3 inline-block rounded-full bg-teal-700 px-6 py-2.5 text-sm font-bold text-white">
                Iniciar sesión
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {bookError && <InlineBanner tone="error">{bookError}</InlineBanner>}

              {serviceLabel && (
                <div className="rounded-2xl bg-teal-50 border border-teal-200 px-4 py-2.5 text-sm font-semibold text-teal-800">
                  🩺 {serviceLabel}
                </div>
              )}

              {/* pet */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Tu mascota *</label>
                <select value={petId} onChange={(e) => setPetId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] px-3 py-2.5 text-sm outline-none focus:border-teal-500">
                  <option value="">Seleccionar mascota</option>
                  {pets.map(p => <option key={p.id} value={p.id}>{p.name} · {p.species}</option>)}
                </select>
                {pets.length === 0 && (
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    <Link href="/pets/new" className="text-teal-700 underline">Agrega una mascota</Link> para reservar
                  </p>
                )}
              </div>

              {/* date */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Fecha *</label>
                <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] px-3 py-2.5 text-sm outline-none focus:border-teal-500" />
              </div>

              {/* time */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Hora *</label>
                <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                  {HOURS.map(h => (
                    <button key={h} type="button" onClick={() => setHour(h)}
                      className={`rounded-xl py-2 text-xs font-bold transition ${hour === h ? "bg-teal-700 text-white" : "border border-[hsl(var(--border))] bg-white text-[hsl(var(--foreground))] hover:border-teal-400"}`}>
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              {/* reason */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Motivo (opcional)</label>
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: control anual, vacuna, consulta..."
                  className="mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] px-3 py-2.5 text-sm outline-none focus:border-teal-500" />
              </div>

              <button
                type="button"
                onClick={() => void handleBook()}
                disabled={booking || !petId || !date}
                className="w-full rounded-2xl bg-teal-700 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
              >
                {booking ? "Enviando reserva..." : "Confirmar reserva"}
              </button>

              <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
                La clínica confirmará tu cita. Recibirás una notificación.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { useAuth } from "@/features/auth/auth-context";
import { createAppointment } from "@/features/appointments/appointments-api";
import type { CreateAppointmentPayload, ProviderAppointmentService } from "@/features/appointments/types";
import { listPets } from "@/features/pets/pets-api";
import type { Pet } from "@/features/pets/types";

/* ─── Types ─────────────────────────────────────────────────────── */
interface GroomerPublicProfile {
  id: string;
  userId: string;
  businessName: string | null;
  logoUrl: string | null;
  description: string | null;
  address: string | null;
  district: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  openingHours: string[];
  services: Array<{ name: string; duration?: number; price?: number; type?: string }>;
  referencePrices: string[];
  photos: string[];
  paymentMethods: string[];
  contactPhone: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  ratingAverage: number | null;
  reviewsCount: number;
  ownerName: string | null;
}

interface ScheduleAvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
  isActive: boolean;
}

/* ─── API helpers ────────────────────────────────────────────────── */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function fetchGroomerProfile(groomerId: string): Promise<GroomerPublicProfile> {
  const res = await fetch(`${API_URL}/api/v1/groomers/${groomerId}`, { cache: "no-store" });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) throw new Error(json?.error?.message ?? "No se pudo cargar la peluquería.");
  return json.data as GroomerPublicProfile;
}

async function fetchGroomerServices(groomerId: string): Promise<ProviderAppointmentService[]> {
  const res = await fetch(`${API_URL}/api/v1/groomers/${groomerId}/services`, { cache: "no-store" });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) return [];
  return (json.data ?? []) as ProviderAppointmentService[];
}

async function fetchGroomerAvailability(groomerId: string): Promise<ScheduleAvailabilitySlot[]> {
  const res = await fetch(`${API_URL}/api/v1/groomers/${groomerId}/availability`, { cache: "no-store" });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) return [];
  return (json.data ?? []) as ScheduleAvailabilitySlot[];
}

/* ─── Availability helpers ───────────────────────────────────────── */
const FALLBACK_HOURS = [
  "08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","14:00","14:30","15:00","15:30","16:00","16:30",
  "17:00","17:30","18:00","18:30","19:00",
];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function slotsForDay(dayOfWeek: number, slots: ScheduleAvailabilitySlot[]): string[] {
  const daySlots = slots.filter(s => s.dayOfWeek === dayOfWeek && s.isActive);
  if (daySlots.length === 0) return [];
  const result: string[] = [];
  for (const slot of daySlots) {
    const start = timeToMinutes(slot.startTime);
    const end = timeToMinutes(slot.endTime);
    for (let m = start; m < end; m += 30) {
      const hh = Math.floor(m / 60).toString().padStart(2, "0");
      const mm = (m % 60).toString().padStart(2, "0");
      result.push(`${hh}:${mm}`);
    }
  }
  return [...new Set(result)].sort();
}

function buildDateList(
  availability: ScheduleAvailabilitySlot[],
  days = 28
): { date: string; available: boolean }[] {
  const activeDays =
    availability.length > 0
      ? new Set(availability.filter(s => s.isActive).map(s => s.dayOfWeek))
      : null;

  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    const iso = d.toISOString().split("T")[0]!;
    const dow = new Date(iso + "T12:00:00").getDay();
    return {
      date: iso,
      available: activeDays === null || activeDays.has(dow),
    };
  });
}

/* ─── Helpers ────────────────────────────────────────────────────── */
function fmtClp(cents: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/* ─── Step indicator ─────────────────────────────────────────────── */
function BookingSteps({ step }: { step: number }) {
  const steps = ["Servicio", "Fecha y hora", "Confirmación"];
  return (
    <div className="flex items-center gap-2 mb-5">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-1">
          <div
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black transition ${
              i < step
                ? "bg-teal-700 text-white"
                : i === step
                ? "bg-teal-600 text-white"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            {i < step ? "✓" : i + 1}
          </div>
          <span
            className={`text-xs font-semibold ${
              i === step ? "text-teal-700" : "text-slate-400"
            }`}
          >
            {label}
          </span>
          {i < steps.length - 1 && (
            <span className="ml-1 text-slate-200">›</span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────── */
export default function PublicGroomerPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;

  const [groomer, setGroomer] = useState<GroomerPublicProfile | null>(null);
  const [apptServices, setApptServices] = useState<ProviderAppointmentService[]>([]);
  const [availability, setAvailability] = useState<ScheduleAvailabilitySlot[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);

  /* booking state */
  const [bookStep, setBookStep] = useState(0);
  const [selectedService, setSelectedService] =
    useState<ProviderAppointmentService | null>(null);
  const [petId, setPetId] = useState("");
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("");
  const [reason, setReason] = useState("");
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  /* ── Derived availability ── */
  const dateList = useMemo(() => buildDateList(availability, 28), [availability]);
  const availableDates = useMemo(
    () => dateList.filter(d => d.available),
    [dateList]
  );

  const hoursForDate = useMemo(() => {
    if (!date) return [];
    if (availability.length === 0) return FALLBACK_HOURS;
    const dow = new Date(date + "T12:00:00").getDay();
    const slots = slotsForDay(dow, availability);
    return slots.length > 0 ? slots : FALLBACK_HOURS;
  }, [date, availability]);

  /* Reset hour when date changes or available hours change */
  useEffect(() => {
    setHour(prev => (hoursForDate.includes(prev) ? prev : hoursForDate[0] ?? ""));
  }, [hoursForDate]);

  /* ── Load data ── */
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [profile, services, avail] = await Promise.all([
          fetchGroomerProfile(id),
          fetchGroomerServices(id),
          fetchGroomerAvailability(id),
        ]);
        setGroomer(profile);
        setApptServices(services);
        setAvailability(avail);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al cargar la peluquería."
        );
      } finally {
        setIsLoading(false);
      }
    }
    void load();
    if (accessToken)
      void listPets(accessToken)
        .then(setPets)
        .catch(() => {});
  }, [id, accessToken]);

  /* ── Book ── */
  async function handleBook() {
    if (!accessToken || !petId || !date || !hour || !groomer) return;
    setBooking(true);
    setBookError(null);
    try {
      const scheduledAt = new Date(`${date}T${hour}:00`).toISOString();
      const payload: CreateAppointmentPayload = {
        petId,
        providerType: "GROOMING",
        providerSourceId: id,
        providerName: groomer.businessName ?? "Peluquería",
        serviceType: "GROOMING",
        scheduledAt,
        durationMinutes: selectedService?.durationMinutes ?? 60,
        reason: reason || selectedService?.title || undefined,
        ...(selectedService?.id ? { appointmentServiceId: selectedService.id } : {}),
      };
      await createAppointment(accessToken, payload);
      setBooked(true);
    } catch (err) {
      setBookError(
        err instanceof Error ? err.message : "No se pudo realizar la reserva."
      );
    } finally {
      setBooking(false);
    }
  }

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="space-y-4 py-8">
        <div className="h-48 animate-pulse rounded-3xl bg-[hsl(var(--muted))]" />
        <div className="h-6 w-1/2 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
        <div className="h-4 w-1/3 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
      </div>
    );
  }

  /* ── Error ── */
  if (error || !groomer) {
    return (
      <div className="py-8 text-center">
        <p className="text-4xl">✂</p>
        <p className="mt-3 font-bold text-[hsl(var(--foreground))]">
          Peluquería no encontrada
        </p>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        <Link
          href="/explore"
          className="mt-4 inline-block text-sm font-semibold text-[hsl(var(--secondary))] hover:underline"
        >
          ← Volver a Cerca de ti
        </Link>
      </div>
    );
  }

  const photos = groomer.photos.length > 0 ? groomer.photos : [];
  const displayName = groomer.businessName ?? groomer.ownerName ?? "Peluquería";
  const hasAvailability = availability.some(s => s.isActive);

  /* ── Booking panel ── */
  function renderBookingPanel() {
    if (booked) {
      return (
        <div className="space-y-4 text-center py-6">
          <p className="text-4xl">✅</p>
          <p className="font-bold text-[hsl(var(--foreground))]">
            ¡Reserva enviada!
          </p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            La peluquería confirmará tu cita en breve. Puedes ver el estado en
            Mis citas.
          </p>
          <Link
            href="/appointments"
            className="inline-block rounded-full bg-teal-700 px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            Ver mis citas
          </Link>
        </div>
      );
    }

    if (!session) {
      return (
        <div className="text-center py-6 space-y-3">
          <p className="text-2xl">✂</p>
          <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
            Inicia sesión para reservar un turno
          </p>
          <Link
            href="/login"
            className="inline-block rounded-full bg-teal-700 px-6 py-2.5 text-sm font-bold text-white"
          >
            Iniciar sesión
          </Link>
        </div>
      );
    }

    /* Step 0: Select service */
    if (bookStep === 0) {
      return (
        <div className="space-y-4">
          <BookingSteps step={0} />
          {apptServices.length === 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Esta peluquería aún no tiene servicios registrados. Puedes
                reservar una consulta general.
              </p>
              <button
                onClick={() => {
                  setSelectedService(null);
                  setBookStep(1);
                }}
                className="w-full rounded-2xl bg-teal-700 py-3 text-sm font-bold text-white hover:opacity-90 transition"
              >
                Reservar turno
              </button>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Elige un servicio
              </p>
              <div className="space-y-2">
                {apptServices.map(svc => (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => setSelectedService(svc)}
                    className={`w-full flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                      selectedService?.id === svc.id
                        ? "border-teal-500 bg-teal-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="mt-0.5 text-lg leading-none">✂</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800">
                        {svc.title}
                      </p>
                      {svc.description && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {svc.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500">
                          🕐 {svc.durationMinutes} min
                        </span>
                        {svc.priceCents != null && svc.priceCents > 0 && (
                          <span className="text-xs font-bold text-teal-700">
                            {fmtClp(svc.priceCents)}
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedService?.id === svc.id && (
                      <span className="shrink-0 text-teal-600 font-bold text-xs">
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <button
                disabled={!selectedService}
                onClick={() => setBookStep(1)}
                className="w-full rounded-2xl bg-teal-700 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 transition"
              >
                Continuar →
              </button>
            </>
          )}
        </div>
      );
    }

    /* Step 1: Date & time */
    if (bookStep === 1) {
      return (
        <div className="space-y-4">
          <BookingSteps step={1} />

          {selectedService && (
            <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-2.5 flex items-center gap-3">
              <span className="text-lg">✂</span>
              <div>
                <p className="text-sm font-bold text-teal-800">
                  {selectedService.title}
                </p>
                <p className="text-xs text-teal-600">
                  {selectedService.durationMinutes} min
                  {selectedService.priceCents != null &&
                  selectedService.priceCents > 0
                    ? ` · ${fmtClp(selectedService.priceCents)}`
                    : ""}
                </p>
              </div>
            </div>
          )}

          {/* Pet */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Tu mascota *
            </label>
            <select
              value={petId}
              onChange={e => setPetId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] px-3 py-2.5 text-sm outline-none focus:border-teal-500"
            >
              <option value="">Seleccionar mascota</option>
              {pets.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.species}
                </option>
              ))}
            </select>
            {pets.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">
                <Link href="/pets/new" className="text-teal-700 underline">
                  Agrega una mascota
                </Link>{" "}
                para reservar
              </p>
            )}
          </div>

          {/* Date — only days with availability */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Fecha *
              </label>
              {!hasAvailability && (
                <span className="text-[10px] text-amber-600 font-medium">
                  Horario no configurado — mostrando todas las fechas
                </span>
              )}
            </div>
            {availableDates.length === 0 ? (
              <p className="text-xs text-slate-500 rounded-xl border border-slate-200 p-3">
                Esta peluquería no tiene días disponibles en las próximas semanas.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                {availableDates.map(({ date: d }) => {
                  const dateObj = new Date(d + "T12:00:00");
                  const dayName = DAY_NAMES[dateObj.getDay()]!;
                  const dayNum = dateObj.getDate();
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDate(d)}
                      className={`flex flex-col items-center rounded-xl py-2 text-center transition ${
                        date === d
                          ? "bg-teal-700 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-teal-400"
                      }`}
                    >
                      <span className="text-[9px] font-semibold uppercase leading-none">
                        {dayName}
                      </span>
                      <span className="text-sm font-black leading-tight">
                        {dayNum}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hour — only slots within availability windows */}
          {date && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Hora *
              </label>
              {hoursForDate.length === 0 ? (
                <p className="mt-1.5 text-xs text-slate-500 rounded-xl border border-slate-200 p-3">
                  No hay horarios disponibles para este día.
                </p>
              ) : (
                <div className="mt-1.5 grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                  {hoursForDate.map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHour(h)}
                      className={`rounded-xl py-2 text-xs font-bold transition ${
                        hour === h
                          ? "bg-teal-700 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-teal-400"
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setBookStep(0)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              ← Atrás
            </button>
            <button
              disabled={!petId || !date || !hour}
              onClick={() => setBookStep(2)}
              className="flex-1 rounded-2xl bg-teal-700 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 transition"
            >
              Continuar →
            </button>
          </div>
        </div>
      );
    }

    /* Step 2: Confirm */
    return (
      <div className="space-y-4">
        <BookingSteps step={2} />
        {bookError && <InlineBanner tone="error">{bookError}</InlineBanner>}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
            Resumen de la reserva
          </p>
          {selectedService && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 w-20 shrink-0">Servicio</span>
              <span className="text-sm font-semibold text-slate-800">
                {selectedService.title}
                {selectedService.priceCents != null &&
                selectedService.priceCents > 0
                  ? ` · ${fmtClp(selectedService.priceCents)}`
                  : ""}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 w-20 shrink-0">Mascota</span>
            <span className="text-sm font-semibold text-slate-800">
              {pets.find(p => p.id === petId)?.name ?? petId}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 w-20 shrink-0">Fecha</span>
            <span className="text-sm font-semibold text-slate-800">
              {date
                ? new Date(date + "T12:00:00").toLocaleDateString("es-CL", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
                : "—"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 w-20 shrink-0">Hora</span>
            <span className="text-sm font-semibold text-slate-800">{hour}</span>
          </div>
          {selectedService?.durationMinutes && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 w-20 shrink-0">Duración</span>
              <span className="text-sm font-semibold text-slate-800">
                {selectedService.durationMinutes} min
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Notas (opcional)
          </label>
          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Ej: primer baño, pelo largo, sensible al ruido..."
            className="mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] px-3 py-2.5 text-sm outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setBookStep(1)}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            ← Atrás
          </button>
          <button
            type="button"
            onClick={() => void handleBook()}
            disabled={booking}
            className="flex-1 rounded-2xl bg-teal-700 py-3 text-sm font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50 transition"
          >
            {booking ? "Enviando reserva..." : "Confirmar reserva ✓"}
          </button>
        </div>

        <p className="text-center text-xs text-slate-400">
          La peluquería confirmará tu cita. Recibirás una notificación.
        </p>
      </div>
    );
  }

  /* ── Main render ── */
  return (
    <div className="pb-20 space-y-5">
      <Link
        href="/explore"
        className="inline-flex items-center gap-1 text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition"
      >
        ← Volver a Cerca de ti
      </Link>

      {/* hero */}
      <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white shadow-sm">
        {photos.length > 0 ? (
          <div className="relative h-44 overflow-hidden">
            <img
              src={photos[photoIdx]}
              alt={displayName}
              className="h-full w-full object-cover"
              onError={e => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            {photos.length > 1 && (
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIdx(i)}
                    className={`h-1.5 w-4 rounded-full transition ${
                      i === photoIdx ? "bg-white" : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
            )}
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setPhotoIdx(i => Math.max(0, i - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white hover:bg-black/50 transition"
                >
                  ‹
                </button>
                <button
                  onClick={() =>
                    setPhotoIdx(i => Math.min(photos.length - 1, i + 1))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white hover:bg-black/50 transition"
                >
                  ›
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-br from-pink-800 via-pink-700 to-teal-700 flex items-center justify-center">
            <span className="text-4xl">✂</span>
          </div>
        )}

        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-[hsl(var(--foreground))]">
                {displayName}
              </h1>
              {(groomer.address ?? groomer.district ?? groomer.city) && (
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  📍{" "}
                  {[groomer.address, groomer.district, groomer.city]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>
            <span className="shrink-0 rounded-full bg-pink-100 px-3 py-1 text-xs font-bold text-pink-700">
              ✂ Peluquería
            </span>
          </div>

          {groomer.description && (
            <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--foreground)/0.7)]">
              {groomer.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {groomer.contactPhone && (
              <a
                href={`tel:${groomer.contactPhone}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)] transition"
              >
                📞 {groomer.contactPhone}
              </a>
            )}
            {groomer.contactEmail && (
              <a
                href={`mailto:${groomer.contactEmail}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)] transition"
              >
                ✉ {groomer.contactEmail}
              </a>
            )}
            {groomer.websiteUrl && (
              <a
                href={groomer.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)] transition"
              >
                🌐 Sitio web
              </a>
            )}
          </div>
        </div>
      </div>

      {/* body */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        {/* ── Info column ── */}
        <div className="space-y-5">
          {/* AppointmentServices */}
          {apptServices.length > 0 && (
            <div className="rounded-3xl border border-[hsl(var(--border))] bg-white p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Servicios y precios
              </p>
              <div className="space-y-2">
                {apptServices.map(svc => (
                  <div
                    key={svc.id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                        {svc.title}
                      </p>
                      {svc.description && (
                        <p className="text-xs text-slate-500">{svc.description}</p>
                      )}
                      <p className="text-xs text-slate-400">
                        🕐 {svc.durationMinutes} min
                      </p>
                    </div>
                    {svc.priceCents != null && svc.priceCents > 0 && (
                      <span className="text-sm font-black text-teal-700">
                        {fmtClp(svc.priceCents)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generic services (JSON field) */}
          {groomer.services.length > 0 && apptServices.length === 0 && (
            <div className="rounded-3xl border border-[hsl(var(--border))] bg-white p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Servicios
              </p>
              <div className="space-y-2">
                {groomer.services.map((svc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                      {svc.name}
                    </p>
                    {svc.price != null && (
                      <span className="text-sm font-black text-teal-700">
                        {fmtClp(svc.price)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment methods */}
          {groomer.paymentMethods.length > 0 && (
            <div className="rounded-3xl border border-[hsl(var(--border))] bg-white p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Métodos de pago
              </p>
              <div className="flex flex-wrap gap-2">
                {groomer.paymentMethods.map((m, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Opening hours */}
          {groomer.openingHours.length > 0 && (
            <div className="rounded-3xl border border-[hsl(var(--border))] bg-white p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Horario de atención
              </p>
              <ul className="space-y-1">
                {groomer.openingHours.map((h, i) => (
                  <li key={i} className="text-sm text-[hsl(var(--foreground)/0.8)]">
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Reference prices */}
          {groomer.referencePrices.length > 0 && (
            <div className="rounded-3xl border border-[hsl(var(--border))] bg-white p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Precios de referencia
              </p>
              <ul className="space-y-1">
                {groomer.referencePrices.map((p, i) => (
                  <li key={i} className="text-sm text-[hsl(var(--foreground)/0.8)]">
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Booking panel ── */}
        <div className="rounded-3xl border border-[hsl(var(--border))] bg-white p-5 shadow-sm xl:sticky xl:top-4 xl:self-start">
          <p className="text-base font-black text-[hsl(var(--foreground))] mb-4">
            Reservar turno
          </p>
          {renderBookingPanel()}
        </div>
      </div>
    </div>
  );
}

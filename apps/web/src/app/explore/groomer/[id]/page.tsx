"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

/* ─── Helpers ────────────────────────────────────────────────────── */
function fmtClp(cents: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(cents / 100);
}

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const HOURS = [
  "08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","14:00","14:30","15:00","15:30","16:00","16:30",
  "17:00","17:30","18:00","18:30","19:00",
];

/* ─── Step indicator ─────────────────────────────────────────────── */
function BookingSteps({ step }: { step: number }) {
  const steps = ["Servicio", "Fecha y hora", "Confirmación"];
  return (
    <div className="flex items-center gap-2 mb-5">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black transition ${
            i < step ? "bg-teal-700 text-white" : i === step ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-400"
          }`}>{i < step ? "✓" : i + 1}</div>
          <span className={`text-xs font-semibold ${i === step ? "text-teal-700" : "text-slate-400"}`}>{label}</span>
          {i < steps.length - 1 && <span className="ml-1 text-slate-200">›</span>}
        </div>
      ))}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────── */
export default function PublicGroomerPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;

  const [groomer, setGroomer]       = useState<GroomerPublicProfile | null>(null);
  const [apptServices, setApptServices] = useState<ProviderAppointmentService[]>([]);
  const [pets, setPets]             = useState<Pet[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [photoIdx, setPhotoIdx]     = useState(0);

  /* booking state */
  const [bookStep, setBookStep]       = useState(0);
  const [selectedService, setSelectedService] = useState<ProviderAppointmentService | null>(null);
  const [petId, setPetId]             = useState("");
  const [date, setDate]               = useState("");
  const [hour, setHour]               = useState("09:00");
  const [reason, setReason]           = useState("");
  const [booking, setBooking]         = useState(false);
  const [booked, setBooked]           = useState(false);
  const [bookError, setBookError]     = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0]!;

  /* generate next 14 days */
  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d.toISOString().split("T")[0]!;
  });

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [profile, services] = await Promise.all([
          fetchGroomerProfile(id),
          fetchGroomerServices(id),
        ]);
        setGroomer(profile);
        setApptServices(services);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar la peluquería.");
      } finally { setIsLoading(false); }
    }
    void load();
    if (accessToken) void listPets(accessToken).then(setPets).catch(() => {});
  }, [id, accessToken]);

  async function handleBook() {
    if (!accessToken || !petId || !date || !groomer) return;
    setBooking(true); setBookError(null);
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
      setBookError(err instanceof Error ? err.message : "No se pudo realizar la reserva.");
    } finally { setBooking(false); }
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
        <p className="mt-3 font-bold text-[hsl(var(--foreground))]">Peluquería no encontrada</p>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        <Link href="/explore" className="mt-4 inline-block text-sm font-semibold text-[hsl(var(--secondary))] hover:underline">
          ← Volver a Cerca de ti
        </Link>
      </div>
    );
  }

  const photos = groomer.photos.length > 0 ? groomer.photos : [];
  const displayName = groomer.businessName ?? groomer.ownerName ?? "Peluquería";

  /* ── Booking panel ── */
  function renderBookingPanel() {
    if (booked) {
      return (
        <div className="space-y-4 text-center py-6">
          <p className="text-4xl">✅</p>
          <p className="font-bold text-[hsl(var(--foreground))]">¡Reserva enviada!</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            La peluquería confirmará tu cita en breve. Puedes ver el estado en Mis citas.
          </p>
          <Link href="/appointments"
            className="inline-block rounded-full bg-teal-700 px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90">
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
          <Link href="/login"
            className="inline-block rounded-full bg-teal-700 px-6 py-2.5 text-sm font-bold text-white">
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
              <p className="text-xs text-slate-500">Esta peluquería aún no tiene servicios registrados. Puedes reservar una consulta general.</p>
              <button
                onClick={() => { setSelectedService(null); setBookStep(1); }}
                className="w-full rounded-2xl bg-teal-700 py-3 text-sm font-bold text-white hover:opacity-90 transition"
              >
                Reservar turno
              </button>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Elige un servicio</p>
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
                      <p className="text-sm font-bold text-slate-800">{svc.title}</p>
                      {svc.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{svc.description}</p>}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500">🕐 {svc.durationMinutes} min</span>
                        {svc.priceCents != null && svc.priceCents > 0 && (
                          <span className="text-xs font-bold text-teal-700">{fmtClp(svc.priceCents)}</span>
                        )}
                      </div>
                    </div>
                    {selectedService?.id === svc.id && (
                      <span className="shrink-0 text-teal-600 font-bold text-xs">✓</span>
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
                <p className="text-sm font-bold text-teal-800">{selectedService.title}</p>
                <p className="text-xs text-teal-600">{selectedService.durationMinutes} min
                  {selectedService.priceCents != null && selectedService.priceCents > 0 ? ` · ${fmtClp(selectedService.priceCents)}` : ""}
                </p>
              </div>
            </div>
          )}

          {/* Pet */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Tu mascota *</label>
            <select value={petId} onChange={(e) => setPetId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] px-3 py-2.5 text-sm outline-none focus:border-teal-500">
              <option value="">Seleccionar mascota</option>
              {pets.map(p => <option key={p.id} value={p.id}>{p.name} · {p.species}</option>)}
            </select>
            {pets.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">
                <Link href="/pets/new" className="text-teal-700 underline">Agrega una mascota</Link> para reservar
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Fecha *</label>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
              {availableDates.slice(0, 14).map(d => {
                const dateObj = new Date(d + "T12:00:00");
                const dayName = DAY_NAMES[dateObj.getDay()]!;
                const dayNum = dateObj.getDate();
                return (
                  <button key={d} type="button" onClick={() => setDate(d)}
                    className={`flex flex-col items-center rounded-xl py-2 text-center transition ${
                      date === d
                        ? "bg-teal-700 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-teal-400"
                    }`}
                  >
                    <span className="text-[9px] font-semibold uppercase leading-none">{dayName}</span>
                    <span className="text-sm font-black leading-tight">{dayNum}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hour */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Hora *</label>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5 sm:grid-cols-5">
              {HOURS.map(h => (
                <button key={h} type="button" onClick={() => setHour(h)}
                  className={`rounded-xl py-2 text-xs font-bold transition ${
                    hour === h ? "bg-teal-700 text-white" : "border border-slate-200 bg-white text-slate-700 hover:border-teal-400"
                  }`}>
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setBookStep(0)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
              ← Atrás
            </button>
            <button
              disabled={!petId || !date}
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
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Resumen de la reserva</p>
          {selectedService && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 w-20 shrink-0">Servicio</span>
              <span className="text-sm font-semibold text-slate-800">
                {selectedService.title}
                {selectedService.priceCents != null && selectedService.priceCents > 0
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
              {date ? new Date(date + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }) : "—"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 w-20 shrink-0">Hora</span>
            <span className="text-sm font-semibold text-slate-800">{hour}</span>
          </div>
          {selectedService?.durationMinutes && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 w-20 shrink-0">Duración</span>
              <span className="text-sm font-semibold text-slate-800">{selectedService.durationMinutes} min</span>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Notas (opcional)</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: primer baño, pelo largo, sensible al ruido..."
            className="mt-1.5 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] px-3 py-2.5 text-sm outline-none focus:border-teal-500" />
        </div>

        <div className="flex gap-2">
          <button onClick={() => setBookStep(1)}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
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
      {/* back */}
      <Link href="/explore"
        className="inline-flex items-center gap-1 text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition">
        ← Volver a Cerca de ti
      </Link>

      {/* hero */}
      <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white shadow-sm">
        {/* photo gallery or gradient header */}
        {photos.length > 0 ? (
          <div className="relative h-44 overflow-hidden">
            <img
              src={photos[photoIdx]}
              alt={displayName}
              className="h-full w-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            {photos.length > 1 && (
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {photos.map((_, i) => (
                  <button key={i} onClick={() => setPhotoIdx(i)}
                    className={`h-1.5 w-4 rounded-full transition ${i === photoIdx ? "bg-white" : "bg-white/40"}`} />
                ))}
              </div>
            )}
            {photos.length > 1 && (
              <>
                <button onClick={() => setPhotoIdx(i => Math.max(0, i - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white hover:bg-black/50 transition">‹</button>
                <button onClick={() => setPhotoIdx(i => Math.min(photos.length - 1, i + 1))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white hover:bg-black/50 transition">›</button>
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
              <h1 className="text-2xl font-black text-[hsl(var(--foreground))]">{displayName}</h1>
              {(groomer.address ?? groomer.district ?? groomer.city) && (
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  📍 {[groomer.address, groomer.district, groomer.city].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
            <span className="shrink-0 rounded-full bg-pink-100 px-3 py-1 text-xs font-bold text-pink-700">✂ Peluquería</span>
          </div>

          {groomer.description && (
            <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--foreground)/0.7)]">{groomer.description}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {groomer.contactPhone && (
              <a href={`tel:${groomer.contactPhone}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)] transition">
                📞 {groomer.contactPhone}
              </a>
            )}
            {groomer.contactEmail && (
              <a href={`mailto:${groomer.contactEmail}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)] transition">
                ✉ {groomer.contactEmail}
              </a>
            )}
            {groomer.websiteUrl && (
              <a href={groomer.websiteUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)] transition">
                🌐 Sitio web
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 2-col layout */}
      <div className="grid gap-5 xl:grid-cols-[1fr_400px]">

        {/* Info column */}
        <div className="space-y-4">
          {/* Appointment services */}
          {apptServices.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white shadow-sm p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-4">Servicios y precios</p>
              <div className="space-y-2">
                {apptServices.map(svc => (
                  <div key={svc.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <span className="mt-0.5 text-teal-600 text-lg">✂</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800">{svc.title}</p>
                      {svc.description && <p className="text-xs text-slate-500 mt-0.5">{svc.description}</p>}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500">🕐 {svc.durationMinutes} min</span>
                        {svc.priceCents != null && svc.priceCents > 0 && (
                          <span className="text-xs font-black text-teal-700">{fmtClp(svc.priceCents)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Groomer profile services (JSON) as fallback */}
          {apptServices.length === 0 && groomer.services.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white shadow-sm p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-4">Servicios disponibles</p>
              <div className="space-y-2">
                {groomer.services.map((svc, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <span className="mt-0.5 text-teal-600">✂</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{svc.name}</p>
                      <div className="flex gap-3 mt-0.5">
                        {svc.duration && <span className="text-xs text-slate-500">🕐 {svc.duration} min</span>}
                        {svc.price != null && svc.price > 0 && (
                          <span className="text-xs font-bold text-teal-700">${svc.price.toLocaleString("es-CL")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment methods */}
          {groomer.paymentMethods.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white shadow-sm p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-3">Métodos de pago</p>
              <div className="flex flex-wrap gap-2">
                {groomer.paymentMethods.map((m, i) => (
                  <span key={i} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                    💳 {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Opening hours */}
          {groomer.openingHours.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white shadow-sm p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-3">Horarios de atención</p>
              <div className="space-y-1">
                {groomer.openingHours.map((h, i) => (
                  <p key={i} className="text-sm text-[hsl(var(--foreground)/0.8)]">🕐 {h}</p>
                ))}
              </div>
            </div>
          )}

          {/* Reference prices */}
          {groomer.referencePrices.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white shadow-sm p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-3">Precios de referencia</p>
              <div className="space-y-1.5">
                {groomer.referencePrices.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5">
                    <span className="text-sm text-slate-700">{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Booking panel */}
        <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white shadow-sm p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-4">Reservar turno</p>
          {renderBookingPanel()}
        </div>
      </div>
    </div>
  );
}

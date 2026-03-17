"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { EmptyState } from "@/components/feedback/empty-state";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { SurfaceSkeleton } from "@/components/feedback/skeleton";
import { PageIntro } from "@/components/layout/page-intro";
import {
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  createAppointment,
  listAppointments,
  rejectAppointment
} from "@/features/appointments/appointments-api";
import type { AppointmentRecord, ProviderType, ServiceType } from "@/features/appointments/types";
import { useAuth } from "@/features/auth/auth-context";
import { listBenefits } from "@/features/benefits/benefits-api";
import type { BenefitItem, BenefitProviderType } from "@/features/benefits/types";
import { listMapServices } from "@/features/map/map-api";
import type { MapServicePoint, MapServiceType } from "@/features/map/types";
import { listPets } from "@/features/pets/pets-api";
import type { Pet } from "@/features/pets/types";
import { useToast } from "@/features/ui/toast-context";

const providerRoles = new Set(["VET", "CAREGIVER", "SHOP", "ADMIN"]);

interface ReservationFlowOption {
  id: string;
  title: string;
  description: string;
  providerType: ProviderType;
  serviceType: ServiceType;
  mapType: MapServiceType;
  providerBenefitType: BenefitProviderType;
  durationMinutes: number;
}

const FLOW_OPTIONS: ReservationFlowOption[] = [
  {
    id: "vet",
    title: "Veterinaria",
    description: "Consultas, vacunas, controles y urgencias.",
    providerType: "VET",
    serviceType: "GENERAL_CONSULT",
    mapType: "VET",
    providerBenefitType: "VET",
    durationMinutes: 45
  },
  {
    id: "grooming",
    title: "Peluqueria",
    description: "Bano, corte, higiene y estetica.",
    providerType: "GROOMING",
    serviceType: "GROOMING",
    mapType: "GROOMING",
    providerBenefitType: "GROOMING",
    durationMinutes: 60
  },
  {
    id: "caregiver",
    title: "Cuidador",
    description: "Paseos, cuidado diario y visitas.",
    providerType: "CAREGIVER",
    serviceType: "WALKING",
    mapType: "CAREGIVER",
    providerBenefitType: "CAREGIVER",
    durationMinutes: 60
  },
  {
    id: "hotel",
    title: "Hotel o guarderia",
    description: "Estadias, guarderia y cuidado extendido.",
    providerType: "OTHER",
    serviceType: "HOTEL_DAYCARE",
    mapType: "HOTEL",
    providerBenefitType: "HOTEL",
    durationMinutes: 120
  },
  {
    id: "shop",
    title: "Tienda o servicio",
    description: "Compras con apoyo profesional o retiro.",
    providerType: "SHOP",
    serviceType: "OTHER",
    mapType: "SHOP",
    providerBenefitType: "SHOP",
    durationMinutes: 30
  }
];

function defaultDateTime() {
  const now = new Date(Date.now() + 24 * 60 * 60 * 1000);
  now.setMinutes(0, 0, 0);
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function formatMoney(cents?: number | null, currencyCode = "CLP") {
  if (cents === null || cents === undefined) return null;
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(cents);
}

function appointmentStatusLabel(status: AppointmentRecord["status"]) {
  if (status === "PENDING") return "Pendiente";
  if (status === "CONFIRMED") return "Confirmada";
  if (status === "COMPLETED") return "Completada";
  if (status === "CANCELLED") return "Cancelada";
  if (status === "REJECTED") return "Rechazada";
  return "Reagendada";
}

function flowIdFromAppointment(appointment: AppointmentRecord) {
  if (appointment.provider.providerType === "VET") return "vet";
  if (appointment.provider.providerType === "GROOMING") return "grooming";
  if (appointment.provider.providerType === "CAREGIVER") return "caregiver";
  if (appointment.provider.providerType === "SHOP") return "shop";
  if (
    appointment.provider.providerType === "HOTEL" ||
    appointment.serviceType === "HOTEL_DAYCARE"
  ) {
    return "hotel";
  }

  return "vet";
}

export default function AppointmentsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.tokens.accessToken;
  const isProvider = providerRoles.has(session?.user.role ?? "");

  const [pets, setPets] = useState<Pet[]>([]);
  const [ownerAppointments, setOwnerAppointments] = useState<AppointmentRecord[]>([]);
  const [providerAppointments, setProviderAppointments] = useState<AppointmentRecord[]>([]);
  const [providerOptions, setProviderOptions] = useState<MapServicePoint[]>([]);
  const [benefits, setBenefits] = useState<BenefitItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<"upcoming" | "history">("upcoming");
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedFlowId, setSelectedFlowId] = useState<string>("vet");
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [scheduledAt, setScheduledAt] = useState(defaultDateTime());
  const [reason, setReason] = useState("");
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [atHomeOnly, setAtHomeOnly] = useState(false);
  const [withDiscountOnly, setWithDiscountOnly] = useState(false);

  const selectedFlow =
    FLOW_OPTIONS.find((option) => option.id === selectedFlowId) ?? FLOW_OPTIONS[0]!;
  const selectedProvider = providerOptions.find((option) => option.id === selectedProviderId) ?? null;

  const upcomingAppointments = useMemo(
    () =>
      ownerAppointments
        .filter((appointment) => appointment.status === "PENDING" || appointment.status === "CONFIRMED")
        .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt)),
    [ownerAppointments]
  );

  const historyAppointments = useMemo(
    () =>
      ownerAppointments
        .filter((appointment) => appointment.status !== "PENDING" && appointment.status !== "CONFIRMED")
        .sort((left, right) => right.scheduledAt.localeCompare(left.scheduledAt)),
    [ownerAppointments]
  );

  const displayedAppointments = historyFilter === "upcoming" ? upcomingAppointments : historyAppointments;
  const latestReservation = useMemo(
    () =>
      [...ownerAppointments]
        .sort((left, right) => right.scheduledAt.localeCompare(left.scheduledAt))[0] ?? null,
    [ownerAppointments]
  );
  const previousPlaces = useMemo(() => {
    const seen = new Set<string>();
    return ownerAppointments.filter((appointment) => {
      const key = `${appointment.provider.providerSourceId ?? appointment.provider.providerName}-${appointment.provider.providerType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 2);
  }, [ownerAppointments]);
  const suggestedTimes = useMemo(() => {
    const base = new Date(scheduledAt);
    if (Number.isNaN(base.getTime())) return [];
    const candidateSlots: Array<[number, number]> = [
      [9, 0],
      [11, 30],
      [15, 0],
      [18, 30]
    ];

    const candidates = candidateSlots
      .map(([hours, minutes]) => {
        const next = new Date(base);
        next.setHours(hours, minutes, 0, 0);
        return next;
      })
      .filter((slot) => slot.getTime() > Date.now())
      .slice(0, 4);

    return candidates.map((slot) => {
      const copy = new Date(slot);
      copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
      return copy.toISOString().slice(0, 16);
    });
  }, [scheduledAt]);

  const loadAppointments = async () => {
    if (!accessToken) return;
    const [ownerRows, providerRows, petRows] = await Promise.all([
      listAppointments(accessToken, { view: "owner", limit: 40 }),
      isProvider ? listAppointments(accessToken, { view: "provider", limit: 40 }) : Promise.resolve([]),
      listPets(accessToken)
    ]);

    setOwnerAppointments(ownerRows);
    setProviderAppointments(providerRows);
    setPets(petRows);
    setSelectedPetId((current) => current || petRows[0]?.id || "");
  };

  const loadExploreData = async () => {
    const [serviceRows, benefitRows] = await Promise.all([
      listMapServices({
        types: [selectedFlow.mapType],
        openNow: openNowOnly,
        atHomeOnly,
        withDiscount: withDiscountOnly,
        sortBy: "rating",
        limit: 12
      }),
      accessToken
        ? listBenefits(accessToken, {
            providerType: selectedFlow.providerBenefitType,
            featuredOnly: true,
            validOnly: true,
            limit: 4
          })
        : Promise.resolve([])
    ]);

    setProviderOptions(serviceRows.items);
    setBenefits(benefitRows);
    setSelectedProviderId((current) =>
      current && serviceRows.items.some((item) => item.id === current) ? current : serviceRows.items[0]?.id || ""
    );
  };

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    const loadPage = async () => {
      setIsLoading(true);
      setError(null);

      try {
        await Promise.all([loadAppointments(), loadExploreData()]);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar reservas.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadPage();
  }, [accessToken, selectedFlowId, openNowOnly, atHomeOnly, withDiscountOnly]);

  const handleCreateReservation = async () => {
    if (!accessToken || !selectedProvider || !selectedPetId) {
      setError("Completa el flujo antes de confirmar la reserva.");
      return;
    }

    try {
      setWorkingId("create-reservation");
      await createAppointment(accessToken, {
        petId: selectedPetId,
        providerType: selectedFlow.providerType,
        providerSourceId: selectedProvider.sourceId,
        providerName: selectedProvider.name,
        serviceType: selectedFlow.serviceType,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: selectedFlow.durationMinutes,
        reason: reason || undefined
      });

      await loadAppointments();
      setWizardStep(1);
      setReason("");
      setScheduledAt(defaultDateTime());
      showToast({
        tone: "success",
        title: "Reserva creada",
        description: "Tu solicitud quedo registrada y visible en la agenda personal."
      });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear la reserva.");
    } finally {
      setWorkingId(null);
    }
  };

  const runProviderAction = async (appointmentId: string, action: () => Promise<unknown>, title: string) => {
    try {
      setWorkingId(appointmentId);
      await action();
      await loadAppointments();
      showToast({
        tone: "success",
        title,
        description: "La reserva se actualizo correctamente."
      });
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No se pudo actualizar la reserva.");
    } finally {
      setWorkingId(null);
    }
  };

  const applyShortcut = (appointment: AppointmentRecord) => {
    setSelectedFlowId(flowIdFromAppointment(appointment));
    setSelectedPetId(appointment.pet.id);
    setReason(appointment.reason ?? "");
    setSelectedProviderId((current) => current || appointment.provider.providerSourceId || "");
    setWizardStep(3);
  };

  return (
    <AuthGate>
      <div className="space-y-6">
        <PageIntro
          eyebrow="Reservas"
          title="Agenda tu proximo servicio sin navegar menus internos"
          description="Tus horas, controles y recordatorios viven en una sola experiencia clara. La vista profesional solo aparece como apoyo secundario para quien realmente la necesita."
          tone="care"
          metrics={[
            { value: String(upcomingAppointments.length), label: "proximas" },
            { value: String(historyAppointments.length), label: "historial" },
            { value: String(providerOptions.length), label: "servicios sugeridos" },
            { value: String(benefits.length), label: "promos visibles" }
          ]}
        />

        {error && <InlineBanner tone="error">{error}</InlineBanner>}

        {isLoading ? (
          <>
            <SurfaceSkeleton blocks={5} />
            <div className="grid gap-4 xl:grid-cols-2">
              <SurfaceSkeleton blocks={4} />
              <SurfaceSkeleton blocks={4} />
            </div>
          </>
        ) : (
          <>
            <section className="kumpa-soft-section p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="kumpa-eyebrow">Reservar nueva hora</span>
                  <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                    Flujo guiado en 5 pasos
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    Elige servicio, establecimiento, mascota, fecha y motivo. Sin agenda proveedor visible
                    como CTA principal para usuarios comunes.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setWizardStep(step)}
                      className={`kumpa-chip ${wizardStep === step ? "kumpa-chip-active" : ""}`}
                    >
                      Paso {step}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_360px]">
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="card p-4">
                      <p className="kumpa-eyebrow">Atajo</p>
                      <h3 className="mt-2 text-lg font-semibold">Repetir ultima reserva</h3>
                      <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                        {latestReservation
                          ? `${latestReservation.pet.name} con ${latestReservation.provider.providerName}`
                          : "Aun no tienes reservas previas para repetir."}
                      </p>
                      <div className="mt-4">
                        <button
                          type="button"
                          disabled={!latestReservation}
                          onClick={() => {
                            if (latestReservation) applyShortcut(latestReservation);
                          }}
                          className="btn btn-outline text-xs"
                        >
                          Repetir
                        </button>
                      </div>
                    </div>

                    <div className="card p-4">
                      <p className="kumpa-eyebrow">Lugar anterior</p>
                      <h3 className="mt-2 text-lg font-semibold">Reservar en un lugar ya conocido</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {previousPlaces.length === 0 ? (
                          <span className="text-sm text-[hsl(var(--muted-foreground))]">
                            Tus lugares recientes apareceran aqui.
                          </span>
                        ) : (
                          previousPlaces.map((appointment) => (
                            <button
                              key={appointment.id}
                              type="button"
                              onClick={() => applyShortcut(appointment)}
                              className="kumpa-chip"
                            >
                              {appointment.provider.providerName}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {FLOW_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setSelectedFlowId(option.id);
                          setWizardStep(2);
                        }}
                        className={`card p-4 text-left ${
                          selectedFlowId === option.id ? "border-[hsl(var(--primary))]" : ""
                        }`}
                      >
                        <p className="text-lg font-semibold">{option.title}</p>
                        <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                          {option.description}
                        </p>
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenNowOnly((current) => !current)}
                      className={`kumpa-chip ${openNowOnly ? "kumpa-chip-active" : ""}`}
                    >
                      Abierto ahora
                    </button>
                    <button
                      type="button"
                      onClick={() => setWithDiscountOnly((current) => !current)}
                      className={`kumpa-chip ${withDiscountOnly ? "kumpa-chip-active" : ""}`}
                    >
                      Con descuento
                    </button>
                    <button
                      type="button"
                      onClick={() => setAtHomeOnly((current) => !current)}
                      className={`kumpa-chip ${atHomeOnly ? "kumpa-chip-active" : ""}`}
                    >
                      A domicilio
                    </button>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    {providerOptions.slice(0, 6).map((option) => (
                      <article
                        key={option.id}
                        className={`card p-4 ${selectedProviderId === option.id ? "border-[hsl(var(--primary))]" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold">{option.name}</h3>
                            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                              {option.address ?? option.subtitle ?? "Servicio disponible"}
                            </p>
                          </div>
                          {option.hasDiscount && (
                            <span className="kumpa-offer-badge">
                              {option.discountLabel ?? "Promocion"}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                          {option.isOpenNow !== null && (
                            <span>{option.isOpenNow ? "Abierto ahora" : "Cerrado"}</span>
                          )}
                          {option.priceFrom !== null && <span>{formatMoney(option.priceFrom)}</span>}
                          {option.supportsAtHome && <span>A domicilio</span>}
                          {option.isEmergency24x7 && <span>Urgencias 24/7</span>}
                        </div>
                        <p className="mt-3 text-lg font-bold text-[hsl(var(--primary))]">
                          {formatMoney(option.priceFrom) ?? "Consultar precio"}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProviderId(option.id);
                              setWizardStep(3);
                            }}
                            className="btn btn-primary text-xs"
                          >
                            Elegir
                          </button>
                          {option.phone && (
                            <a
                              href={`tel:${option.phone.replace(/\s+/g, "")}`}
                              className="btn btn-outline text-xs"
                            >
                              Llamar
                            </a>
                          )}
                          <Link href="/map" className="btn btn-outline text-xs">
                            Ver mas
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <aside className="space-y-4">
                  <div className="card p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                      Confirmacion
                    </p>
                    <div className="mt-4 rounded-[1.4rem] bg-[hsl(var(--muted)/0.65)] p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                        Precio estimado antes de confirmar
                      </p>
                      <p className="mt-2 text-2xl font-bold text-[hsl(var(--primary))]">
                        {formatMoney(selectedProvider?.priceFrom) ?? "Consultar"}
                      </p>
                    </div>
                    <div className="mt-4 space-y-3 text-sm">
                      <p><strong>1.</strong> {selectedFlow.title}</p>
                      <p><strong>2.</strong> {selectedProvider?.name || "Selecciona un establecimiento"}</p>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
                          3. Mascota
                        </label>
                        <select value={selectedPetId} onChange={(event) => { setSelectedPetId(event.target.value); setWizardStep(4); }}>
                          <option value="">Selecciona una mascota</option>
                          {pets.map((pet) => (
                            <option key={pet.id} value={pet.id}>
                              {pet.name} | {pet.species}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
                          4. Fecha y hora
                        </label>
                        <input
                          type="datetime-local"
                          value={scheduledAt}
                          onChange={(event) => {
                            setScheduledAt(event.target.value);
                            setWizardStep(5);
                          }}
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          {suggestedTimes.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => {
                                setScheduledAt(slot);
                                setWizardStep(5);
                              }}
                              className={`kumpa-chip ${scheduledAt === slot ? "kumpa-chip-active" : ""}`}
                            >
                              {slot.slice(11, 16)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
                          5. Motivo opcional
                        </label>
                        <textarea
                          rows={3}
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                          placeholder="Cuentales brevemente que necesitas."
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={workingId === "create-reservation" || !selectedProvider || !selectedPetId}
                      onClick={() => void handleCreateReservation()}
                      className="btn btn-primary mt-5 w-full"
                    >
                      {workingId === "create-reservation" ? "Confirmando..." : "Confirmar reserva"}
                    </button>
                  </div>

                  <div className="card p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                      Promociones del servicio
                    </p>
                    <div className="mt-4 space-y-3">
                      {benefits.length === 0 ? (
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          No hay promociones activas para este tipo de servicio ahora mismo.
                        </p>
                      ) : (
                        benefits.map((benefit) => (
                          <article key={benefit.id} className="rounded-2xl bg-[hsl(var(--muted))] p-4 text-sm">
                            <p className="font-semibold">{benefit.title}</p>
                            <p className="mt-1 text-[hsl(var(--muted-foreground))]">{benefit.summary}</p>
                            {benefit.discountLabel && (
                              <p className="mt-2 text-xs font-semibold text-[hsl(var(--primary))]">
                                {benefit.discountLabel}
                              </p>
                            )}
                          </article>
                        ))
                      )}
                    </div>
                  </div>
                </aside>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setHistoryFilter("upcoming")}
                  className={`kumpa-chip ${historyFilter === "upcoming" ? "kumpa-chip-active" : ""}`}
                >
                  Proximas reservas
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter("history")}
                  className={`kumpa-chip ${historyFilter === "history" ? "kumpa-chip-active" : ""}`}
                >
                  Historial reciente
                </button>
              </div>

              {displayedAppointments.length === 0 ? (
                <EmptyState
                  eyebrow="Reservas"
                  title="Aun no hay movimientos en esta vista"
                  description={
                    historyFilter === "upcoming"
                      ? "Cuando reserves una hora, aparecera aqui con su estado y proximos pasos."
                      : "Tu historial se ira completando a medida que uses servicios dentro de la app."
                  }
                />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {displayedAppointments.map((appointment) => (
                    <article key={appointment.id} className="card p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">{appointment.pet.name}</h3>
                          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                            {appointment.provider.providerName}
                          </p>
                        </div>
                        <span className="rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 text-xs font-semibold">
                          {appointmentStatusLabel(appointment.status)}
                        </span>
                      </div>

                      <p className="mt-3 text-sm">{appointment.serviceTypeLabel}</p>
                      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        {formatDateTime(appointment.scheduledAt)}
                      </p>
                      {appointment.appointmentService?.priceCents !== undefined && (
                        <p className="mt-2 text-sm font-semibold text-[hsl(var(--primary))]">
                          {formatMoney(
                            appointment.appointmentService.priceCents,
                            appointment.appointmentService.currencyCode
                          )}
                        </p>
                      )}

                      {(appointment.status === "PENDING" || appointment.status === "CONFIRMED") && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={workingId === appointment.id}
                            onClick={() =>
                              runProviderAction(
                                appointment.id,
                                () => cancelAppointment(accessToken!, appointment.id),
                                "Reserva cancelada"
                              )
                            }
                            className="btn btn-outline text-xs"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            {isProvider && (
              <section className="space-y-4">
                <SectionHeader
                  title="Vista profesional"
                  description="Solo visible para roles de servicio. No aparece como CTA principal al usuario comun."
                />

                {providerAppointments.length === 0 ? (
                  <div className="card p-5 text-sm text-[hsl(var(--muted-foreground))]">
                    Aun no tienes solicitudes de clientes.
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {providerAppointments.slice(0, 6).map((appointment) => (
                      <article key={appointment.id} className="card p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold">{appointment.pet.name}</h3>
                            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                              {appointment.owner.fullName}
                            </p>
                          </div>
                          <span className="rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 text-xs font-semibold">
                            {appointmentStatusLabel(appointment.status)}
                          </span>
                        </div>

                        <p className="mt-3 text-sm">{appointment.serviceTypeLabel}</p>
                        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                          {formatDateTime(appointment.scheduledAt)}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {appointment.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                disabled={workingId === appointment.id}
                                onClick={() =>
                                  runProviderAction(
                                    appointment.id,
                                    () => confirmAppointment(accessToken!, appointment.id),
                                    "Reserva confirmada"
                                  )
                                }
                                className="btn btn-primary text-xs"
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                disabled={workingId === appointment.id}
                                onClick={() =>
                                  runProviderAction(
                                    appointment.id,
                                    () => rejectAppointment(accessToken!, appointment.id, "Sin disponibilidad"),
                                    "Reserva rechazada"
                                  )
                                }
                                className="btn btn-outline text-xs"
                              >
                                Rechazar
                              </button>
                            </>
                          )}
                          {appointment.status === "CONFIRMED" && (
                            <>
                              <button
                                type="button"
                                disabled={workingId === appointment.id}
                                onClick={() =>
                                  runProviderAction(
                                    appointment.id,
                                    () => completeAppointment(accessToken!, appointment.id),
                                    "Reserva completada"
                                  )
                                }
                                className="btn btn-primary text-xs"
                              >
                                Completar
                              </button>
                              <button
                                type="button"
                                disabled={workingId === appointment.id}
                                onClick={() =>
                                  runProviderAction(
                                    appointment.id,
                                    () => cancelAppointment(accessToken!, appointment.id),
                                    "Reserva cancelada"
                                  )
                                }
                                className="btn btn-outline text-xs"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </AuthGate>
  );
}

function SectionHeader({
  title,
  description
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h2 className="kumpa-section-title">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{description}</p>
      ) : null}
    </div>
  );
}

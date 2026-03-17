"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
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
  listProviderAppointmentServices,
  listProviderAvailability,
  rejectAppointment,
  replaceProviderAppointmentServices,
  replaceProviderAvailability,
  rescheduleAppointment
} from "@/features/appointments/appointments-api";
import type {
  AppointmentRecord,
  ProviderAppointmentServiceWriteItem,
  ProviderType,
  ScheduleAvailabilityWriteItem,
  ServiceType
} from "@/features/appointments/types";
import { useAuth } from "@/features/auth/auth-context";
import { listPets } from "@/features/pets/pets-api";
import type { Pet } from "@/features/pets/types";
import { useToast } from "@/features/ui/toast-context";

const providerRoles = new Set(["VET", "CAREGIVER", "SHOP", "ADMIN"]);
const catalogRoles = new Set(["VET", "CAREGIVER", "SHOP"]);
const weekDays = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

const providerOptions: Array<{ value: ProviderType; label: string }> = [
  { value: "VET", label: "Veterinaria" },
  { value: "CAREGIVER", label: "Cuidador" },
  { value: "SHOP", label: "Pet shop" },
  { value: "GROOMING", label: "Grooming" },
  { value: "HOTEL", label: "Hotel / guarderia" },
  { value: "OTHER", label: "Otro" }
];

const serviceOptions: Array<{ value: ServiceType; label: string }> = [
  { value: "GENERAL_CONSULT", label: "Consulta general" },
  { value: "VACCINATION", label: "Vacunacion" },
  { value: "EMERGENCY", label: "Urgencia" },
  { value: "DEWORMING", label: "Desparasitacion" },
  { value: "GROOMING", label: "Peluqueria" },
  { value: "HOTEL_DAYCARE", label: "Hotel / guarderia" },
  { value: "WALKING", label: "Paseo" },
  { value: "TRAINING", label: "Entrenamiento" },
  { value: "OTHER", label: "Otro" }
];

function toLocalInput(isoValue?: string | null) {
  if (!isoValue) return "";
  const date = new Date(isoValue);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDateLabel(isoValue: string) {
  return new Date(isoValue).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function formatMoney(priceCents?: number | null, currencyCode = "CLP") {
  if (priceCents === null || priceCents === undefined) return "Sin precio";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(priceCents);
}

function isValidProviderType(value: string): value is ProviderType {
  return providerOptions.some((item) => item.value === value);
}

function initialDateTime() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return toLocalInput(date.toISOString());
}

export default function AppointmentsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.tokens.accessToken;
  const isProvider = providerRoles.has(session?.user.role ?? "");
  const canManageCatalog = catalogRoles.has(session?.user.role ?? "");

  const [pets, setPets] = useState<Pet[]>([]);
  const [ownerAppointments, setOwnerAppointments] = useState<AppointmentRecord[]>([]);
  const [providerAppointments, setProviderAppointments] = useState<AppointmentRecord[]>([]);
  const [availability, setAvailability] = useState<ScheduleAvailabilityWriteItem[]>([]);
  const [appointmentServices, setAppointmentServices] = useState<ProviderAppointmentServiceWriteItem[]>(
    []
  );
  const [view, setView] = useState<"owner" | "provider">("owner");

  const [petId, setPetId] = useState("");
  const [providerType, setProviderType] = useState<ProviderType>("VET");
  const [providerSourceId, setProviderSourceId] = useState("");
  const [providerName, setProviderName] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("GENERAL_CONSULT");
  const [scheduledAt, setScheduledAt] = useState(initialDateTime());
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [reason, setReason] = useState("");

  const [slotDay, setSlotDay] = useState(1);
  const [slotStart, setSlotStart] = useState("09:00");
  const [slotEnd, setSlotEnd] = useState("18:00");
  const [slotTimezone, setSlotTimezone] = useState("America/Santiago");
  const [slotService, setSlotService] = useState<ServiceType | "ALL">("ALL");

  const [serviceTitle, setServiceTitle] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceCatalogType, setServiceCatalogType] = useState<ServiceType>("GENERAL_CONSULT");
  const [serviceDuration, setServiceDuration] = useState(30);
  const [servicePrice, setServicePrice] = useState("");
  const [serviceCurrency, setServiceCurrency] = useState("CLP");
  const [serviceActive, setServiceActive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [savingServices, setSavingServices] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const appointments = view === "provider" ? providerAppointments : ownerAppointments;

  const resetCatalogForm = () => {
    setServiceTitle("");
    setServiceDescription("");
    setServiceCatalogType("GENERAL_CONSULT");
    setServiceDuration(30);
    setServicePrice("");
    setServiceCurrency("CLP");
    setServiceActive(true);
  };

  const loadData = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const [petsData, ownerData, providerData, availabilityData, servicesData] = await Promise.all([
        listPets(accessToken),
        listAppointments(accessToken, { view: "owner", limit: 150 }),
        isProvider ? listAppointments(accessToken, { view: "provider", limit: 150 }) : Promise.resolve([]),
        isProvider ? listProviderAvailability(accessToken, true) : Promise.resolve([]),
        canManageCatalog ? listProviderAppointmentServices(accessToken, true) : Promise.resolve([])
      ]);

      setPets(petsData);
      setOwnerAppointments(ownerData);
      setProviderAppointments(providerData);
      setAvailability(
        availabilityData.map((item) => ({
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          serviceType: item.serviceType ?? undefined,
          timezone: item.timezone,
          isActive: item.isActive
        }))
      );
      setAppointmentServices(
        servicesData.map((item) => ({
          title: item.title,
          description: item.description ?? undefined,
          serviceType: item.serviceType,
          durationMinutes: item.durationMinutes,
          priceCents: item.priceCents ?? undefined,
          currencyCode: item.currencyCode,
          isActive: item.isActive,
          sortOrder: item.sortOrder
        }))
      );
      setPetId((current) => current || petsData[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar reservas.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, canManageCatalog, isProvider]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const providerTypeFromMap = params.get("providerType");
    const providerIdFromMap = params.get("providerId");

    if (providerTypeFromMap && isValidProviderType(providerTypeFromMap)) {
      setProviderType(providerTypeFromMap);
    }
    if (providerIdFromMap) {
      setProviderSourceId(providerIdFromMap);
    }
  }, []);

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

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;
    if (!petId || !scheduledAt) {
      setError("Debes seleccionar mascota y fecha.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await createAppointment(accessToken, {
        petId,
        providerType,
        providerSourceId: providerSourceId || undefined,
        providerName:
          providerName ||
          providerOptions.find((item) => item.value === providerType)?.label ||
          undefined,
        serviceType,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes,
        reason: reason || undefined
      });
      setReason("");
      setScheduledAt(initialDateTime());
      await loadData();
      showToast({
        tone: "success",
        title: "Reserva creada",
        description: "La solicitud quedo registrada y ya aparece en tu historial."
      });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear reserva.");
    } finally {
      setSaving(false);
    }
  };

  const addAvailability = () => {
    if (slotStart >= slotEnd) {
      setError("El horario de inicio debe ser menor al de termino.");
      return;
    }

    setAvailability((current) => [
      ...current,
      {
        dayOfWeek: slotDay,
        startTime: slotStart,
        endTime: slotEnd,
        timezone: slotTimezone,
        serviceType: slotService === "ALL" ? undefined : slotService,
        isActive: true
      }
    ]);
  };

  const saveAvailability = async () => {
    if (!accessToken || !isProvider) return;
    setSavingAvailability(true);
    setError(null);

    try {
      const updated = await replaceProviderAvailability(accessToken, availability);
      setAvailability(
        updated.map((item) => ({
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          serviceType: item.serviceType ?? undefined,
          timezone: item.timezone,
          isActive: item.isActive
        }))
      );
      showToast({
        tone: "success",
        title: "Agenda guardada",
        description: "Los bloques horarios del proveedor quedaron actualizados."
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar agenda.");
    } finally {
      setSavingAvailability(false);
    }
  };

  const addAppointmentService = () => {
    const trimmedTitle = serviceTitle.trim();
    if (!trimmedTitle) {
      setError("Debes indicar un nombre para el servicio.");
      return;
    }

    if (!Number.isFinite(serviceDuration) || serviceDuration < 15 || serviceDuration > 240) {
      setError("La duracion debe estar entre 15 y 240 minutos.");
      return;
    }

    const trimmedCurrency = serviceCurrency.trim().toUpperCase();
    if (trimmedCurrency.length !== 3) {
      setError("La moneda debe tener 3 letras.");
      return;
    }

    const parsedPrice = servicePrice.trim() ? Number(servicePrice) : undefined;
    if (parsedPrice !== undefined && (!Number.isInteger(parsedPrice) || parsedPrice < 0)) {
      setError("El precio debe ser un entero mayor o igual a 0.");
      return;
    }

    setAppointmentServices((current) => [
      ...current,
      {
        title: trimmedTitle,
        description: serviceDescription.trim() || undefined,
        serviceType: serviceCatalogType,
        durationMinutes: serviceDuration,
        priceCents: parsedPrice,
        currencyCode: trimmedCurrency,
        isActive: serviceActive,
        sortOrder: current.length
      }
    ]);
    resetCatalogForm();
  };

  const saveAppointmentServices = async () => {
    if (!accessToken || !canManageCatalog) return;
    setSavingServices(true);
    setError(null);

    try {
      const updated = await replaceProviderAppointmentServices(accessToken, appointmentServices);
      setAppointmentServices(
        updated.map((item) => ({
          title: item.title,
          description: item.description ?? undefined,
          serviceType: item.serviceType,
          durationMinutes: item.durationMinutes,
          priceCents: item.priceCents ?? undefined,
          currencyCode: item.currencyCode,
          isActive: item.isActive,
          sortOrder: item.sortOrder
        }))
      );
      showToast({
        tone: "success",
        title: "Catalogo actualizado",
        description: "Los servicios reservables quedaron publicados con la nueva configuracion."
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el catalogo.");
    } finally {
      setSavingServices(false);
    }
  };

  return (
    <AuthGate>
      <div className="space-y-4">
        <PageIntro
          eyebrow="Agenda"
          title="Reservas"
          description="Gestiona solicitudes, agenda profesional y catalogo de servicios desde una vista mas clara para tutores y proveedores."
          tone="health"
          metrics={[
            { value: String(ownerAppointments.length), label: "reservas tutor" },
            { value: String(providerAppointments.length), label: "reservas proveedor" }
          ]}
        />

        {error && <InlineBanner tone="error">{error}</InlineBanner>}

        {loading ? (
          <div className="space-y-4">
            <SurfaceSkeleton blocks={5} />
            <SurfaceSkeleton blocks={4} />
          </div>
        ) : (
          <>
            <section className="kumpa-panel p-4">
              <h2 className="text-lg font-bold text-slate-900">Nueva reserva</h2>
              <form onSubmit={(event) => void handleCreate(event)} className="mt-3 grid gap-3 sm:grid-cols-2">
                <select value={petId} onChange={(event) => setPetId(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Selecciona mascota</option>
                  {pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name}
                    </option>
                  ))}
                </select>
                <select value={providerType} onChange={(event) => setProviderType(event.target.value as ProviderType)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  {providerOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <input value={providerSourceId} onChange={(event) => setProviderSourceId(event.target.value)} placeholder="ID proveedor (opcional)" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                <input value={providerName} onChange={(event) => setProviderName(event.target.value)} placeholder="Nombre proveedor" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                <select value={serviceType} onChange={(event) => setServiceType(event.target.value as ServiceType)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  {serviceOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                <input type="number" min={15} max={240} step={15} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo (opcional)" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                <div className="sm:col-span-2">
                  <button type="submit" disabled={saving} className="kumpa-button-primary">
                    {saving ? "Guardando..." : "Crear reserva"}
                  </button>
                </div>
              </form>
            </section>

            <section className="kumpa-panel p-4">
              <div className="mb-3 flex gap-2">
                <button type="button" onClick={() => setView("owner")} className={`rounded-xl px-3 py-2 text-xs font-semibold ${view === "owner" ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700"}`}>
                  Mis reservas
                </button>
                {isProvider && (
                  <button type="button" onClick={() => setView("provider")} className={`rounded-xl px-3 py-2 text-xs font-semibold ${view === "provider" ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700"}`}>
                    Agenda proveedor
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {appointments.length === 0 ? (
                  <EmptyState
                    eyebrow={view === "provider" ? "Agenda" : "Reservas"}
                    title={view === "provider" ? "Aun no tienes reservas agendadas" : "Aun no tienes reservas"}
                    description={
                      view === "provider"
                        ? "Cuando un tutor reserve tus servicios, veras aqui la agenda operativa del proveedor."
                        : "Crea una reserva para empezar a gestionar consultas, vacunas o servicios pet."
                    }
                  />
                ) : (
                  appointments.map((appointment) => (
                    <article key={appointment.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-900">
                            {appointment.pet.name} - {appointment.serviceTypeLabel}
                          </p>
                          {appointment.appointmentService && (
                            <p className="mt-1 text-xs font-semibold text-slate-700">
                              Catalogo: {appointment.appointmentService.title} |{" "}
                              {formatMoney(
                                appointment.appointmentService.priceCents,
                                appointment.appointmentService.currencyCode
                              )}
                            </p>
                          )}
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                          {appointment.status}
                        </span>
                      </div>
                      <p className="text-slate-600">{formatDateLabel(appointment.scheduledAt)}</p>
                      <p className="text-slate-500">Proveedor: {appointment.provider.providerName}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Link href={`/appointments/${appointment.id}`} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
                          Detalle
                        </Link>
                        {appointment.permissions.canConfirm && (
                          <button type="button" disabled={workingId === appointment.id} onClick={() => void runAction(appointment.id, "Reserva confirmada", () => confirmAppointment(accessToken!, appointment.id))} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700">
                            Confirmar
                          </button>
                        )}
                        {appointment.permissions.canReject && (
                          <button type="button" disabled={workingId === appointment.id} onClick={() => void runAction(appointment.id, "Reserva rechazada", () => rejectAppointment(accessToken!, appointment.id, window.prompt("Motivo rechazo", "") ?? undefined))} className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700">
                            Rechazar
                          </button>
                        )}
                        {appointment.permissions.canComplete && (
                          <button type="button" disabled={workingId === appointment.id} onClick={() => void runAction(appointment.id, "Reserva completada", () => completeAppointment(accessToken!, appointment.id))} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
                            Completar
                          </button>
                        )}
                        {appointment.permissions.canReschedule && (
                          <button type="button" disabled={workingId === appointment.id} onClick={() => {
                            const nextDate = window.prompt("Nueva fecha y hora (YYYY-MM-DDTHH:mm)", toLocalInput(appointment.scheduledAt));
                            if (!nextDate) return;
                            void runAction(appointment.id, "Reserva reagendada", () =>
                              rescheduleAppointment(accessToken!, appointment.id, {
                                scheduledAt: new Date(nextDate).toISOString(),
                                durationMinutes: appointment.durationMinutes,
                                reason: window.prompt("Motivo (opcional)", "") ?? undefined
                              })
                            );
                          }} className="rounded-lg border border-sky-300 px-2 py-1 text-xs font-semibold text-sky-700">
                            Reagendar
                          </button>
                        )}
                        {appointment.permissions.canCancel && (
                          <button type="button" disabled={workingId === appointment.id} onClick={() => void runAction(appointment.id, "Reserva cancelada", () => cancelAppointment(accessToken!, appointment.id, window.prompt("Motivo cancelacion", "") ?? undefined))} className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700">
                            Cancelar
                          </button>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            {isProvider && (
              <section className="kumpa-panel p-4">
                <h2 className="text-lg font-bold text-slate-900">Agenda profesional</h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  <select value={slotDay} onChange={(event) => setSlotDay(Number(event.target.value))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    {weekDays.map((label, index) => (
                      <option key={label} value={index}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input type="time" value={slotStart} onChange={(event) => setSlotStart(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  <input type="time" value={slotEnd} onChange={(event) => setSlotEnd(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  <select value={slotService} onChange={(event) => setSlotService(event.target.value as ServiceType | "ALL")} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    <option value="ALL">Todos</option>
                    {serviceOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <input value={slotTimezone} onChange={(event) => setSlotTimezone(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={addAvailability} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">
                    Agregar bloque
                  </button>
                  <button type="button" disabled={savingAvailability} onClick={() => { void saveAvailability(); }} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
                    {savingAvailability ? "Guardando..." : "Guardar agenda"}
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {availability.length === 0 ? (
                    <EmptyState
                      eyebrow="Agenda"
                      title="Sin bloques definidos"
                      description="Agrega bloques semanales para dejar preparada la disponibilidad del proveedor."
                    />
                  ) : (
                    availability.map((item, index) => (
                      <div key={`${item.dayOfWeek}-${item.startTime}-${item.endTime}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-200 p-2 text-xs">
                        <span>
                          {weekDays[item.dayOfWeek]} {item.startTime}-{item.endTime} | {item.serviceType ?? "Todos"} | {item.timezone}
                        </span>
                        <button type="button" onClick={() => setAvailability((current) => current.filter((_value, currentIndex) => currentIndex !== index))} className="rounded-lg border border-rose-300 px-2 py-1 font-semibold text-rose-700">
                          Quitar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {canManageCatalog && (
              <section className="kumpa-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Catalogo de servicios</h2>
                    <p className="text-sm text-slate-600">
                      Define tus servicios reservables. Guardar reemplaza el catalogo completo del proveedor.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetCatalogForm}
                    className="kumpa-button-secondary min-h-10 px-3 text-xs"
                  >
                    Limpiar formulario
                  </button>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
                  <div className="space-y-2">
                    {appointmentServices.length === 0 ? (
                      <EmptyState
                        eyebrow="Catalogo"
                        title="Aun no tienes servicios configurados"
                        description="Agrega prestaciones reservables para que los tutores puedan elegirlas al crear una cita."
                      />
                    ) : (
                      appointmentServices
                        .slice()
                        .sort((left, right) => left.sortOrder - right.sortOrder)
                        .map((item, index) => (
                          <article key={`${item.title}-${item.sortOrder}-${index}`} className="rounded-xl border border-slate-200 p-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-slate-900">{item.title}</p>
                                <p className="text-xs text-slate-600">
                                  {serviceOptions.find((service) => service.value === item.serviceType)?.label} |{" "}
                                  {item.durationMinutes} min | {formatMoney(item.priceCents, item.currencyCode)}
                                </p>
                              </div>
                              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${item.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                                {item.isActive ? "Activo" : "Inactivo"}
                              </span>
                            </div>
                            {item.description && <p className="mt-2 text-sm text-slate-700">{item.description}</p>}
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setAppointmentServices((current) =>
                                    current.map((service, serviceIndex) =>
                                      serviceIndex !== index
                                        ? service
                                        : {
                                            ...service,
                                            isActive: !service.isActive
                                          }
                                    )
                                  )
                                }
                                className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                              >
                                {item.isActive ? "Desactivar" : "Activar"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setAppointmentServices((current) =>
                                    current
                                      .filter((_service, serviceIndex) => serviceIndex !== index)
                                      .map((service, serviceIndex) => ({
                                        ...service,
                                        sortOrder: serviceIndex
                                      }))
                                  )
                                }
                                className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700"
                              >
                                Quitar
                              </button>
                            </div>
                          </article>
                        ))
                    )}
                  </div>

                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      addAppointmentService();
                    }}
                    className="kumpa-panel-muted p-4"
                  >
                    <h3 className="text-sm font-bold text-slate-900">Agregar servicio</h3>
                    <div className="mt-3 grid gap-2">
                      <input
                        value={serviceTitle}
                        onChange={(event) => setServiceTitle(event.target.value)}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Consulta general, vacuna anual, etc."
                      />
                      <textarea
                        value={serviceDescription}
                        onChange={(event) => setServiceDescription(event.target.value)}
                        rows={3}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Descripcion breve del servicio"
                      />
                      <select
                        value={serviceCatalogType}
                        onChange={(event) => setServiceCatalogType(event.target.value as ServiceType)}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      >
                        {serviceOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          type="number"
                          min={15}
                          max={240}
                          step={15}
                          value={serviceDuration}
                          onChange={(event) => setServiceDuration(Number(event.target.value))}
                          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                          placeholder="Duracion"
                        />
                        <input
                          value={servicePrice}
                          onChange={(event) => setServicePrice(event.target.value)}
                          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                          placeholder="Precio entero"
                        />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          value={serviceCurrency}
                          onChange={(event) => setServiceCurrency(event.target.value)}
                          maxLength={3}
                          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                          placeholder="CLP"
                        />
                        <label className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={serviceActive}
                            onChange={(event) => setServiceActive(event.target.checked)}
                          />
                          Activo al publicar
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="submit"
                          className="kumpa-button-secondary"
                        >
                          Agregar al catalogo
                        </button>
                        <button
                          type="button"
                          disabled={savingServices}
                          onClick={() => {
                            void saveAppointmentServices();
                          }}
                          className="kumpa-button-primary"
                        >
                          {savingServices ? "Guardando..." : "Guardar catalogo"}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AuthGate>
  );
}


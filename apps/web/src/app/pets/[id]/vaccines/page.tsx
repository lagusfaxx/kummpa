"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/features/auth/auth-context";
import {
  createReminder,
  createVaccine,
  deleteReminder,
  deleteVaccine,
  getVaccineCard,
  listReminders,
  listVaccines,
  updateReminder,
  updateVaccine
} from "@/features/vaccines/vaccines-api";
import type {
  PetVaccineCard,
  Reminder,
  ReminderType,
  VaccineRecord,
  VaccineStatus
} from "@/features/vaccines/types";

const vaccineStatusOptions: Array<{ value: VaccineStatus; label: string }> = [
  { value: "UP_TO_DATE", label: "Al dia" },
  { value: "DUE_SOON", label: "Proxima a vencer" },
  { value: "OVERDUE", label: "Vencida" },
  { value: "NO_NEXT_DOSE", label: "Sin proxima dosis" }
];

const reminderTypeOptions: Array<{ value: ReminderType; label: string }> = [
  { value: "VACCINE", label: "Proxima vacuna" },
  { value: "VACCINE_OVERDUE", label: "Vacuna vencida" },
  { value: "DEWORMING", label: "Desparasitacion" },
  { value: "MEDICAL_CHECK", label: "Control medico" },
  { value: "MEDICATION", label: "Medicacion" },
  { value: "GROOMING", label: "Peluqueria/Bano" }
];

function isoToDateInput(value?: string | null) {
  if (!value) return "";
  return value.split("T")[0] ?? "";
}

function statusBadgeClass(status: VaccineStatus) {
  if (status === "OVERDUE") return "bg-rose-100 text-rose-700";
  if (status === "DUE_SOON") return "bg-amber-100 text-amber-700";
  if (status === "UP_TO_DATE") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

export default function PetVaccinesPage() {
  const params = useParams<{ id: string }>();
  const petId = typeof params.id === "string" ? params.id : "";
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;

  const [card, setCard] = useState<PetVaccineCard | null>(null);
  const [vaccines, setVaccines] = useState<VaccineRecord[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingVaccine, setIsSavingVaccine] = useState(false);
  const [isSavingReminder, setIsSavingReminder] = useState(false);

  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState<VaccineStatus | "">("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const [editingVaccineId, setEditingVaccineId] = useState<string | null>(null);
  const [vaccineName, setVaccineName] = useState("");
  const [appliedAt, setAppliedAt] = useState("");
  const [nextDoseAt, setNextDoseAt] = useState("");
  const [providerName, setProviderName] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [certificateUrl, setCertificateUrl] = useState("");
  const [vaccineNotes, setVaccineNotes] = useState("");

  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [reminderType, setReminderType] = useState<ReminderType>("MEDICAL_CHECK");
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");
  const [reminderDueAt, setReminderDueAt] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendInApp, setSendInApp] = useState(true);
  const [sendPush, setSendPush] = useState(false);

  const summaryStatusLabel = useMemo(() => {
    if (!card) return "-";
    if (card.summary.overallStatus === "OVERDUE") return "Vencido";
    if (card.summary.overallStatus === "DUE_SOON") return "Proximo a vencer";
    return "Al dia";
  }, [card]);

  const loadVaccineList = async () => {
    if (!accessToken || !petId) return;
    const data = await listVaccines(accessToken, petId, {
      type: filterType || undefined,
      status: filterStatus || undefined,
      from: filterFrom || undefined,
      to: filterTo || undefined
    });
    setVaccines(data);
  };

  const loadPage = async () => {
    if (!accessToken || !petId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [cardData, remindersData] = await Promise.all([
        getVaccineCard(accessToken, petId),
        listReminders(accessToken, petId)
      ]);
      setCard(cardData);
      setReminders(remindersData);
      await loadVaccineList();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el carnet.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, petId]);

  const resetVaccineForm = () => {
    setEditingVaccineId(null);
    setVaccineName("");
    setAppliedAt("");
    setNextDoseAt("");
    setProviderName("");
    setLotNumber("");
    setCertificateUrl("");
    setVaccineNotes("");
  };

  const resetReminderForm = () => {
    setEditingReminderId(null);
    setReminderType("MEDICAL_CHECK");
    setReminderTitle("");
    setReminderMessage("");
    setReminderDueAt("");
    setSendEmail(true);
    setSendInApp(true);
    setSendPush(false);
  };

  const handleApplyFilters = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await loadVaccineList();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo aplicar filtros.");
    }
  };

  const handleSubmitVaccine = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !petId) return;

    if (!vaccineName.trim() || !appliedAt) {
      setError("Debes completar nombre y fecha de aplicacion.");
      return;
    }

    setIsSavingVaccine(true);
    setError(null);
    try {
      if (editingVaccineId) {
        await updateVaccine(accessToken, petId, editingVaccineId, {
          vaccineName: vaccineName.trim(),
          appliedAt,
          nextDoseAt: nextDoseAt || undefined,
          providerName: providerName.trim() || undefined,
          lotNumber: lotNumber.trim() || undefined,
          certificateUrl: certificateUrl.trim() || undefined,
          notes: vaccineNotes.trim() || undefined
        });
      } else {
        await createVaccine(accessToken, petId, {
          vaccineName: vaccineName.trim(),
          appliedAt,
          nextDoseAt: nextDoseAt || undefined,
          providerName: providerName.trim() || undefined,
          lotNumber: lotNumber.trim() || undefined,
          certificateUrl: certificateUrl.trim() || undefined,
          notes: vaccineNotes.trim() || undefined
        });
      }

      resetVaccineForm();
      await loadPage();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar vacuna.");
    } finally {
      setIsSavingVaccine(false);
    }
  };

  const handleEditVaccine = (record: VaccineRecord) => {
    setEditingVaccineId(record.id);
    setVaccineName(record.vaccineName);
    setAppliedAt(isoToDateInput(record.appliedAt));
    setNextDoseAt(isoToDateInput(record.nextDoseAt));
    setProviderName(record.providerName ?? "");
    setLotNumber(record.lotNumber ?? "");
    setCertificateUrl(record.certificateUrl ?? "");
    setVaccineNotes(record.notes ?? "");
  };

  const handleDeleteVaccine = async (vaccineId: string) => {
    if (!accessToken || !petId) return;
    const confirmed = window.confirm("¿Eliminar este registro de vacuna?");
    if (!confirmed) return;

    try {
      await deleteVaccine(accessToken, petId, vaccineId);
      await loadPage();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar vacuna.");
    }
  };

  const handleSubmitReminder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !petId) return;

    if (!reminderTitle.trim() || !reminderDueAt) {
      setError("Debes ingresar titulo y fecha del recordatorio.");
      return;
    }

    setIsSavingReminder(true);
    setError(null);
    try {
      if (editingReminderId) {
        await updateReminder(accessToken, petId, editingReminderId, {
          type: reminderType,
          title: reminderTitle.trim(),
          message: reminderMessage.trim() || undefined,
          dueAt: reminderDueAt,
          sendEmail,
          sendInApp,
          sendPush
        });
      } else {
        await createReminder(accessToken, petId, {
          type: reminderType,
          title: reminderTitle.trim(),
          message: reminderMessage.trim() || undefined,
          dueAt: reminderDueAt,
          sendEmail,
          sendInApp,
          sendPush
        });
      }

      resetReminderForm();
      await loadPage();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar recordatorio.");
    } finally {
      setIsSavingReminder(false);
    }
  };

  const handleEditReminder = (reminder: Reminder) => {
    setEditingReminderId(reminder.id);
    setReminderType(reminder.type);
    setReminderTitle(reminder.title);
    setReminderMessage(reminder.message ?? "");
    setReminderDueAt(isoToDateInput(reminder.dueAt));
    setSendEmail(reminder.sendEmail);
    setSendInApp(reminder.sendInApp);
    setSendPush(reminder.sendPush);
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (!accessToken || !petId) return;
    const confirmed = window.confirm("¿Eliminar este recordatorio?");
    if (!confirmed) return;

    try {
      await deleteReminder(accessToken, petId, reminderId);
      await loadPage();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar recordatorio.");
    }
  };

  const copyPublicLink = async () => {
    if (!card?.share.publicUrl) return;
    await navigator.clipboard.writeText(card.share.publicUrl);
  };

  return (
    <AuthGate>
      <div className="space-y-4">
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Cargando carnet de vacunacion...
          </div>
        ) : !card ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            No se pudo cargar la informacion del carnet.
          </div>
        ) : (
          <>
            <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">
                    Carnet de vacunacion: {card.pet.name}
                  </h1>
                  <p className="text-sm text-slate-600">
                    {card.pet.species} · {card.pet.breed} · Tutor: {card.pet.ownerName}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/pets/${card.pet.id}`}
                    className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Volver a mascota
                  </Link>
                  <Link
                    href={`/pets/${card.pet.id}/vaccines/print?format=sheet`}
                    className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    Imprimir / PDF
                  </Link>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-4">
                <div className="rounded-xl bg-slate-100 p-2">
                  <p className="text-xs text-slate-500">Estado general</p>
                  <p className="font-semibold">{summaryStatusLabel}</p>
                </div>
                <div className="rounded-xl bg-slate-100 p-2">
                  <p className="text-xs text-slate-500">Total vacunas</p>
                  <p className="font-semibold">{card.summary.totalVaccines}</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-2">
                  <p className="text-xs text-amber-700">Proximas a vencer</p>
                  <p className="font-semibold text-amber-800">{card.summary.dueSoonCount}</p>
                </div>
                <div className="rounded-xl bg-rose-50 p-2">
                  <p className="text-xs text-rose-700">Vencidas</p>
                  <p className="font-semibold text-rose-800">{card.summary.overdueCount}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                {card.share.publicUrl ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 p-3 text-brand-800">
                    <span className="font-semibold">Enlace publico del carnet:</span>
                    <a href={card.share.publicUrl} target="_blank" rel="noreferrer" className="underline">
                      {card.share.publicUrl}
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        void copyPublicLink();
                      }}
                      className="inline-flex min-h-9 items-center rounded-lg border border-brand-300 px-2 text-xs font-semibold"
                    >
                      Copiar link
                    </button>
                  </div>
                ) : (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-600">
                    Para compartir por link, marca el perfil de mascota como publico en su ficha.
                  </p>
                )}
              </div>
            </header>

            {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-bold text-slate-900">Filtros de historial</h2>
              <form className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={(event) => void handleApplyFilters(event)}>
                <label className="text-sm font-semibold text-slate-700">
                  Tipo
                  <input
                    value={filterType}
                    onChange={(event) => setFilterType(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Estado
                  <select
                    value={filterStatus}
                    onChange={(event) => setFilterStatus(event.target.value as VaccineStatus | "")}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Todos</option>
                    {vaccineStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Desde
                  <input
                    type="date"
                    value={filterFrom}
                    onChange={(event) => setFilterFrom(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Hasta
                  <input
                    type="date"
                    value={filterTo}
                    onChange={(event) => setFilterTo(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Aplicar
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-bold text-slate-900">
                {editingVaccineId ? "Editar vacuna" : "Agregar vacuna"}
              </h2>
              <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void handleSubmitVaccine(event)}>
                <label className="text-sm font-semibold text-slate-700">
                  Nombre de vacuna*
                  <input value={vaccineName} onChange={(event) => setVaccineName(event.target.value)} required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Fecha aplicacion*
                  <input type="date" value={appliedAt} onChange={(event) => setAppliedAt(event.target.value)} required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Proxima dosis
                  <input type="date" value={nextDoseAt} onChange={(event) => setNextDoseAt(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Veterinaria/profesional
                  <input value={providerName} onChange={(event) => setProviderName(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Lote
                  <input value={lotNumber} onChange={(event) => setLotNumber(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Certificado (URL)
                  <input type="url" value={certificateUrl} onChange={(event) => setCertificateUrl(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                  Observaciones
                  <textarea rows={3} value={vaccineNotes} onChange={(event) => setVaccineNotes(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <button type="submit" disabled={isSavingVaccine} className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">
                    {isSavingVaccine ? "Guardando..." : editingVaccineId ? "Actualizar vacuna" : "Agregar vacuna"}
                  </button>
                  {editingVaccineId && (
                    <button type="button" onClick={resetVaccineForm} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                      Cancelar edicion
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-bold text-slate-900">Historial de vacunas</h2>
              <div className="mt-3 grid gap-2">
                {vaccines.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                    No hay vacunas registradas para los filtros seleccionados.
                  </p>
                ) : (
                  vaccines.map((record) => (
                    <article key={record.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{record.vaccineName}</h3>
                          <p className="text-xs text-slate-600">
                            Aplicada: {isoToDateInput(record.appliedAt)} · Proxima: {isoToDateInput(record.nextDoseAt) || "-"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {record.providerName ?? "Sin profesional"} · lote: {record.lotNumber ?? "-"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-semibold ${statusBadgeClass(record.status)}`}>
                            {vaccineStatusOptions.find((item) => item.value === record.status)?.label}
                          </span>
                          <button type="button" onClick={() => handleEditVaccine(record)} className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                            Editar
                          </button>
                          <button type="button" onClick={() => { void handleDeleteVaccine(record.id); }} className="inline-flex min-h-9 items-center rounded-lg border border-rose-300 px-2 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                            Eliminar
                          </button>
                        </div>
                      </div>
                      {record.notes && <p className="mt-2 text-xs text-slate-700">{record.notes}</p>}
                      {record.certificateUrl && (
                        <a href={record.certificateUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-brand-700 underline">
                          Ver certificado
                        </a>
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-bold text-slate-900">{editingReminderId ? "Editar recordatorio" : "Crear recordatorio"}</h2>
              <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void handleSubmitReminder(event)}>
                <label className="text-sm font-semibold text-slate-700">
                  Tipo
                  <select value={reminderType} onChange={(event) => setReminderType(event.target.value as ReminderType)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    {reminderTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Fecha
                  <input type="date" value={reminderDueAt} onChange={(event) => setReminderDueAt(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                  Titulo
                  <input value={reminderTitle} onChange={(event) => setReminderTitle(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                  Mensaje
                  <textarea rows={2} value={reminderMessage} onChange={(event) => setReminderMessage(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-700 sm:col-span-2">
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} />Email</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={sendInApp} onChange={(event) => setSendInApp(event.target.checked)} />In-app</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={sendPush} onChange={(event) => setSendPush(event.target.checked)} />Push (futuro)</label>
                </div>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <button type="submit" disabled={isSavingReminder} className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">
                    {isSavingReminder ? "Guardando..." : editingReminderId ? "Actualizar recordatorio" : "Crear recordatorio"}
                  </button>
                  {editingReminderId && (
                    <button type="button" onClick={resetReminderForm} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                      Cancelar edicion
                    </button>
                  )}
                </div>
              </form>

              <div className="mt-4 grid gap-2">
                {reminders.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">No hay recordatorios configurados.</p>
                ) : (
                  reminders.map((reminder) => (
                    <article key={reminder.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{reminder.title}</h3>
                          <p className="text-xs text-slate-600">
                            {reminder.type} · Fecha: {isoToDateInput(reminder.dueAt)} · {reminder.isActive ? "Activo" : "Inactivo"}
                          </p>
                          {reminder.lastDispatch && (
                            <p className="text-xs text-slate-500">
                              Ultimo envio: {reminder.lastDispatch.channel} · {reminder.lastDispatch.status}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleEditReminder(reminder)} className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                            Editar
                          </button>
                          <button type="button" onClick={() => { void handleDeleteReminder(reminder.id); }} className="inline-flex min-h-9 items-center rounded-lg border border-rose-300 px-2 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                            Eliminar
                          </button>
                        </div>
                      </div>
                      {reminder.message && <p className="mt-2 text-xs text-slate-700">{reminder.message}</p>}
                    </article>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AuthGate>
  );
}

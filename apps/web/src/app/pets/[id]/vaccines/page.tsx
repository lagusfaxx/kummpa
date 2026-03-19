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

/* ─── Constants ───────────────────────────────────────────────── */

const vaccineStatusOptions: Array<{ value: VaccineStatus; label: string }> = [
  { value: "UP_TO_DATE",   label: "Al día" },
  { value: "DUE_SOON",     label: "Próxima a vencer" },
  { value: "OVERDUE",      label: "Vencida" },
  { value: "NO_NEXT_DOSE", label: "Sin próxima dosis" }
];

const reminderTypeOptions: Array<{ value: ReminderType; label: string }> = [
  { value: "VACCINE",          label: "Próxima vacuna" },
  { value: "VACCINE_OVERDUE",  label: "Vacuna vencida" },
  { value: "DEWORMING",        label: "Desparasitación" },
  { value: "MEDICAL_CHECK",    label: "Control médico" },
  { value: "MEDICATION",       label: "Medicación" },
  { value: "GROOMING",         label: "Peluquería/Baño" }
];

const reminderTypeLabel: Record<ReminderType, string> = {
  VACCINE:          "Vacuna",
  VACCINE_OVERDUE:  "Vacuna vencida",
  DEWORMING:        "Desparasitación",
  MEDICAL_CHECK:    "Control médico",
  MEDICATION:       "Medicación",
  GROOMING:         "Peluquería"
};

/* ─── Helpers ─────────────────────────────────────────────────── */

function isoToDateInput(value?: string | null) {
  if (!value) return "";
  return value.split("T")[0] ?? "";
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

function daysLabel(days?: number | null) {
  if (days == null) return null;
  if (days < 0) return `Vencida hace ${Math.abs(days)} días`;
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  return `Faltan ${days} días`;
}

const statusCfg: Record<VaccineStatus, { dot: string; badge: string; label: string }> = {
  UP_TO_DATE:   { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700",   label: "Al día" },
  DUE_SOON:     { dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700",       label: "Próxima" },
  OVERDUE:      { dot: "bg-red-500",     badge: "bg-red-50 text-red-700",           label: "Vencida" },
  NO_NEXT_DOSE: { dot: "bg-slate-300",   badge: "bg-slate-100 text-slate-500",      label: "Sin próx." }
};

/* ─── Icons ───────────────────────────────────────────────────── */
function IcoShare() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>;
}
function IcoPrint() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;
}
function IcoCopy() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
}
function IcoPlus() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4"><path d="M12 5v14M5 12h14"/></svg>;
}
function IcoBell() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
}
function IcoSyringe() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/><path d="m9 11 4 4"/><path d="m5 19-3 3"/><path d="m14 4 6 6"/></svg>;
}
function IcoHistory() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>;
}
function IcoSettings() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}

/* ─── Tab types ───────────────────────────────────────────────── */
type Tab = "carnet" | "historial" | "administrar" | "recordatorios";

const TABS: { id: Tab; label: string; icon: () => JSX.Element }[] = [
  { id: "carnet",         label: "Carnet",         icon: IcoSyringe  },
  { id: "historial",      label: "Historial",      icon: IcoHistory  },
  { id: "administrar",    label: "Administrar",    icon: IcoSettings },
  { id: "recordatorios",  label: "Recordatorios",  icon: IcoBell     },
];

/* ─── Form field atom ─────────────────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-300 focus:border-[hsl(var(--primary))] focus:bg-white focus:outline-none transition-colors";

/* ─── Carnet tab ──────────────────────────────────────────────── */
function TabCarnet({
  card,
  onCopyLink
}: {
  card: PetVaccineCard;
  onCopyLink: () => void;
}) {
  const overallTone = card.summary.overallStatus;
  const overallCfg = {
    UP_TO_DATE: { from: "from-emerald-500", to: "to-emerald-700", label: "Vacunas al día", icon: "✓" },
    DUE_SOON:   { from: "from-amber-400",   to: "to-amber-600",   label: "Próxima dosis",  icon: "!" },
    OVERDUE:    { from: "from-red-500",     to: "to-red-700",     label: "Vacuna vencida", icon: "⚠" },
  }[overallTone] ?? { from: "from-slate-500", to: "to-slate-700", label: "Sin estado", icon: "?" };

  const nextVaccine = card.upcoming[0];

  return (
    <div className="space-y-4">
      {/* ── Premium card ─────────────────────────────────────── */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${overallCfg.from} ${overallCfg.to} p-5 text-white shadow-lg`}>
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-16 w-px bg-white/10" />

        {/* Pet identity */}
        <div className="relative flex items-start gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-white/25 shadow">
            {card.pet.primaryPhotoUrl ? (
              <img src={card.pet.primaryPhotoUrl} alt={card.pet.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white/20 text-xl font-bold">
                {card.pet.name.slice(0, 1)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Carnet de Vacunación</p>
            <h2 className="mt-0.5 font-display text-2xl font-bold leading-tight">{card.pet.name}</h2>
            <p className="mt-0.5 text-[12px] text-white/70">
              {[card.pet.species, card.pet.breed].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm">
            {overallCfg.label}
          </div>
        </div>

        {/* Divider */}
        <div className="relative my-4 border-t border-white/15" />

        {/* Metrics */}
        <div className="relative grid grid-cols-3 gap-2">
          {[
            { n: card.summary.upToDateCount,  label: "Al día"      },
            { n: card.summary.dueSoonCount,   label: "Por vencer"  },
            { n: card.summary.overdueCount,   label: "Vencidas"    },
          ].map(({ n, label }) => (
            <div key={label} className="rounded-2xl bg-white/15 py-3 text-center backdrop-blur-sm">
              <p className="text-xl font-black">{n}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/60">{label}</p>
            </div>
          ))}
        </div>

        {/* Owner + microchip */}
        <div className="relative mt-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-white/50">Tutor</p>
            <p className="text-[13px] font-semibold">{card.pet.ownerName}</p>
          </div>
          {card.pet.microchipNumber && (
            <div className="text-right">
              <p className="text-[10px] text-white/50">Microchip</p>
              <p className="text-[11px] font-mono font-semibold">{card.pet.microchipNumber}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Next dose ────────────────────────────────────────── */}
      {nextVaccine ? (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Próxima dosis</p>
          <p className="mt-1 text-[15px] font-bold text-amber-900">{nextVaccine.vaccineName}</p>
          <p className="mt-0.5 text-[12px] text-amber-700">
            {formatDate(nextVaccine.nextDoseAt)}
            {nextVaccine.daysUntilDue != null && ` · ${daysLabel(nextVaccine.daysUntilDue)}`}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3.5">
          <p className="text-[13px] font-semibold text-emerald-700">Sin dosis próximas pendientes</p>
          <p className="mt-0.5 text-[11px] text-emerald-600">Todas las vacunas están al día o sin próxima dosis registrada.</p>
        </div>
      )}

      {/* ── Primary actions ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        <a
          href={card.share.printableSheetUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl bg-[hsl(var(--primary))] py-3 text-[13px] font-bold text-white shadow-sm"
        >
          <IcoPrint /> Imprimir / PDF
        </a>
        <a
          href={card.share.printableCardUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-[13px] font-bold text-slate-700"
        >
          <IcoShare /> Tarjeta
        </a>
      </div>

      {/* ── Share URL ────────────────────────────────────────── */}
      {card.share.publicUrl ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Enlace público del carnet</p>
          <p className="mt-1.5 truncate rounded-xl bg-white border border-slate-100 px-3 py-2 text-[12px] font-mono text-slate-600">
            {card.share.publicUrl}
          </p>
          <button
            type="button"
            onClick={onCopyLink}
            className="mt-2 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <IcoCopy /> Copiar enlace
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center">
          <p className="text-[12px] text-slate-400">Para compartir por link, activa el perfil público en la ficha de la mascota.</p>
          <Link href={`/pets/${card.pet.id}`} className="mt-2 inline-block text-[12px] font-semibold text-[hsl(var(--primary))]">
            Ir a ficha →
          </Link>
        </div>
      )}
    </div>
  );
}

/* ─── Historial tab ───────────────────────────────────────────── */
function TabHistorial({
  vaccines,
  filterType, setFilterType,
  filterStatus, setFilterStatus,
  filterFrom, setFilterFrom,
  filterTo, setFilterTo,
  onApplyFilters,
  onEditVaccine,
  onDeleteVaccine,
}: {
  vaccines: VaccineRecord[];
  filterType: string; setFilterType: (v: string) => void;
  filterStatus: VaccineStatus | ""; setFilterStatus: (v: VaccineStatus | "") => void;
  filterFrom: string; setFilterFrom: (v: string) => void;
  filterTo: string; setFilterTo: (v: string) => void;
  onApplyFilters: (e: FormEvent<HTMLFormElement>) => void;
  onEditVaccine: (r: VaccineRecord) => void;
  onDeleteVaccine: (id: string) => void;
}) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-4">
      {/* Filter toggle */}
      <button
        type="button"
        onClick={() => setShowFilters(!showFilters)}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-[12px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
      >
        <span>Filtrar historial</span>
        <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`}><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
      </button>

      {showFilters && (
        <form className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4" onSubmit={onApplyFilters}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tipo">
              <input value={filterType} onChange={(e) => setFilterType(e.target.value)} className={inputCls} placeholder="Nombre de vacuna…" />
            </Field>
            <Field label="Estado">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as VaccineStatus | "")} className={inputCls}>
                <option value="">Todos</option>
                {vaccineStatusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Desde">
              <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Hasta">
              <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <button type="submit" className="rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-[12px] font-bold text-white">
            Aplicar filtros
          </button>
        </form>
      )}

      {/* Timeline */}
      {vaccines.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-50 to-emerald-100">
            <IcoSyringe />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Sin vacunas registradas</p>
            <p className="mt-1 text-[12px] text-slate-400">El historial de vacunas aparecerá aquí a medida que las vayas registrando.</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-0 h-full w-px bg-slate-100" />
          <div className="space-y-3">
            {vaccines.map((record, idx) => {
              const cfg = statusCfg[record.status];
              return (
                <div key={record.id} className="relative flex gap-4">
                  {/* Timeline dot */}
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center">
                    <div className={`h-3 w-3 rounded-full ring-2 ring-white ${cfg.dot}`} />
                  </div>

                  {/* Card */}
                  <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm mb-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[14px] text-slate-900">{record.vaccineName}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          Aplicada {formatDate(record.appliedAt)}
                          {record.providerName ? ` · ${record.providerName}` : ""}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </div>

                    {record.nextDoseAt && (
                      <div className="mt-2.5 flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2">
                        <div className={`h-2 w-2 rounded-full ${record.status === "OVERDUE" ? "bg-red-400" : "bg-amber-400"}`} />
                        <p className="text-[11px] text-slate-600">
                          Próxima dosis {formatDate(record.nextDoseAt)}
                          {record.daysUntilDue != null && <span className="ml-1 font-semibold">{daysLabel(record.daysUntilDue)}</span>}
                        </p>
                      </div>
                    )}

                    {(record.lotNumber || record.notes || record.certificateUrl) && (
                      <div className="mt-2.5 space-y-1.5">
                        {record.lotNumber && <p className="text-[11px] text-slate-400">Lote: {record.lotNumber}</p>}
                        {record.notes && <p className="text-[11px] leading-relaxed text-slate-500">{record.notes}</p>}
                        {record.certificateUrl && (
                          <a href={record.certificateUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[hsl(var(--primary))] underline">
                            Ver certificado
                          </a>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEditVaccine(record)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteVaccine(record.id)}
                        className="rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-100 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Administrar tab ─────────────────────────────────────────── */
function TabAdministrar({
  editingVaccineId,
  vaccineName, setVaccineName,
  appliedAt, setAppliedAt,
  nextDoseAt, setNextDoseAt,
  providerName, setProviderName,
  lotNumber, setLotNumber,
  certificateUrl, setCertificateUrl,
  vaccineNotes, setVaccineNotes,
  isSavingVaccine,
  onSubmitVaccine,
  onResetVaccineForm,
}: {
  editingVaccineId: string | null;
  vaccineName: string; setVaccineName: (v: string) => void;
  appliedAt: string; setAppliedAt: (v: string) => void;
  nextDoseAt: string; setNextDoseAt: (v: string) => void;
  providerName: string; setProviderName: (v: string) => void;
  lotNumber: string; setLotNumber: (v: string) => void;
  certificateUrl: string; setCertificateUrl: (v: string) => void;
  vaccineNotes: string; setVaccineNotes: (v: string) => void;
  isSavingVaccine: boolean;
  onSubmitVaccine: (e: FormEvent<HTMLFormElement>) => void;
  onResetVaccineForm: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.1)]">
            <IcoPlus />
          </div>
          <h2 className="font-semibold text-[15px] text-slate-800">
            {editingVaccineId ? "Editar vacuna" : "Registrar vacuna"}
          </h2>
        </div>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmitVaccine}>
          <Field label="Nombre de vacuna *">
            <input value={vaccineName} onChange={(e) => setVaccineName(e.target.value)} required className={inputCls} placeholder="p. ej. Antirrábica" />
          </Field>
          <Field label="Fecha de aplicación *">
            <input type="date" value={appliedAt} onChange={(e) => setAppliedAt(e.target.value)} required className={inputCls} />
          </Field>
          <Field label="Próxima dosis">
            <input type="date" value={nextDoseAt} onChange={(e) => setNextDoseAt(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Veterinaria / profesional">
            <input value={providerName} onChange={(e) => setProviderName(e.target.value)} className={inputCls} placeholder="Nombre del profesional…" />
          </Field>
          <Field label="Número de lote">
            <input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} className={inputCls} placeholder="Lote del fabricante…" />
          </Field>
          <Field label="Certificado (URL)">
            <input type="url" value={certificateUrl} onChange={(e) => setCertificateUrl(e.target.value)} className={inputCls} placeholder="https://…" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Observaciones">
              <textarea rows={3} value={vaccineNotes} onChange={(e) => setVaccineNotes(e.target.value)} className={inputCls} placeholder="Notas clínicas, reacciones, etc…" />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={isSavingVaccine}
              className="rounded-xl bg-[hsl(var(--primary))] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
            >
              {isSavingVaccine ? "Guardando…" : editingVaccineId ? "Actualizar" : "Registrar vacuna"}
            </button>
            {editingVaccineId && (
              <button type="button" onClick={onResetVaccineForm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] font-semibold text-slate-600">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Recordatorios tab ───────────────────────────────────────── */
function TabRecordatorios({
  reminders,
  editingReminderId,
  reminderType, setReminderType,
  reminderTitle, setReminderTitle,
  reminderMessage, setReminderMessage,
  reminderDueAt, setReminderDueAt,
  sendEmail, setSendEmail,
  sendInApp, setSendInApp,
  sendPush, setSendPush,
  isSavingReminder,
  onSubmitReminder,
  onResetReminderForm,
  onEditReminder,
  onDeleteReminder,
}: {
  reminders: Reminder[];
  editingReminderId: string | null;
  reminderType: ReminderType; setReminderType: (v: ReminderType) => void;
  reminderTitle: string; setReminderTitle: (v: string) => void;
  reminderMessage: string; setReminderMessage: (v: string) => void;
  reminderDueAt: string; setReminderDueAt: (v: string) => void;
  sendEmail: boolean; setSendEmail: (v: boolean) => void;
  sendInApp: boolean; setSendInApp: (v: boolean) => void;
  sendPush: boolean; setSendPush: (v: boolean) => void;
  isSavingReminder: boolean;
  onSubmitReminder: (e: FormEvent<HTMLFormElement>) => void;
  onResetReminderForm: () => void;
  onEditReminder: (r: Reminder) => void;
  onDeleteReminder: (id: string) => void;
}) {
  const dispatchStatusLabel: Record<string, string> = {
    SENT: "Enviado", SKIPPED: "Omitido", FAILED: "Fallido", PENDING_PUSH: "Push pendiente"
  };

  return (
    <div className="space-y-4">
      {/* Form */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
            <IcoBell />
          </div>
          <h2 className="font-semibold text-[15px] text-slate-800">
            {editingReminderId ? "Editar recordatorio" : "Crear recordatorio"}
          </h2>
        </div>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmitReminder}>
          <Field label="Tipo">
            <select value={reminderType} onChange={(e) => setReminderType(e.target.value as ReminderType)} className={inputCls}>
              {reminderTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Fecha *">
            <input type="date" value={reminderDueAt} onChange={(e) => setReminderDueAt(e.target.value)} className={inputCls} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Título *">
              <input value={reminderTitle} onChange={(e) => setReminderTitle(e.target.value)} className={inputCls} placeholder="p. ej. Vacuna anual antirrábica…" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Mensaje (opcional)">
              <textarea rows={2} value={reminderMessage} onChange={(e) => setReminderMessage(e.target.value)} className={inputCls} placeholder="Mensaje adicional para la notificación…" />
            </Field>
          </div>

          {/* Channels */}
          <div className="sm:col-span-2">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Canal de notificación</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Email",  checked: sendEmail, onChange: setSendEmail },
                { label: "In-app", checked: sendInApp, onChange: setSendInApp },
                { label: "Push",   checked: sendPush,  onChange: setSendPush  },
              ].map(({ label, checked, onChange }) => (
                <label key={label} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-semibold transition-colors ${checked ? "border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.05)] text-[hsl(var(--primary))]" : "border-slate-200 text-slate-500"}`}>
                  <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button type="submit" disabled={isSavingReminder} className="rounded-xl bg-[hsl(var(--primary))] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60">
              {isSavingReminder ? "Guardando…" : editingReminderId ? "Actualizar" : "Crear recordatorio"}
            </button>
            {editingReminderId && (
              <button type="button" onClick={onResetReminderForm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] font-semibold text-slate-600">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* List */}
      {reminders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
            <IcoBell />
          </div>
          <p className="text-[13px] text-slate-400">Sin recordatorios configurados. Crea uno para recibir alertas de vacunas y controles.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Recordatorios activos</p>
          {reminders.map((reminder) => (
            <div key={reminder.id} className={`rounded-2xl border px-4 py-3.5 ${reminder.isActive ? "border-amber-100 bg-amber-50" : "border-slate-100 bg-slate-50"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[13px] text-slate-800">{reminder.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {reminderTypeLabel[reminder.type]} · {formatDate(reminder.dueAt)} · {reminder.isActive ? "Activo" : "Inactivo"}
                  </p>
                  <div className="mt-1 flex gap-1.5">
                    {reminder.sendEmail && <span className="rounded-full bg-white border border-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">Email</span>}
                    {reminder.sendInApp && <span className="rounded-full bg-white border border-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">In-app</span>}
                    {reminder.sendPush  && <span className="rounded-full bg-white border border-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">Push</span>}
                  </div>
                  {reminder.lastDispatch && (
                    <p className="mt-1 text-[10px] text-slate-400">
                      Último envío: {reminder.lastDispatch.channel} · {dispatchStatusLabel[reminder.lastDispatch.status] ?? reminder.lastDispatch.status}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" onClick={() => onEditReminder(reminder)} className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">
                    Editar
                  </button>
                  <button type="button" onClick={() => onDeleteReminder(reminder.id)} className="rounded-xl border border-red-100 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-red-600">
                    Eliminar
                  </button>
                </div>
              </div>
              {reminder.message && <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{reminder.message}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────── */
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
  const [activeTab, setActiveTab] = useState<Tab>("carnet");

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
    setEditingVaccineId(null); setVaccineName(""); setAppliedAt("");
    setNextDoseAt(""); setProviderName(""); setLotNumber("");
    setCertificateUrl(""); setVaccineNotes("");
  };

  const resetReminderForm = () => {
    setEditingReminderId(null); setReminderType("MEDICAL_CHECK");
    setReminderTitle(""); setReminderMessage(""); setReminderDueAt("");
    setSendEmail(true); setSendInApp(true); setSendPush(false);
  };

  const handleApplyFilters = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try { await loadVaccineList(); } catch (e) { setError(e instanceof Error ? e.message : "Error al filtrar."); }
  };

  const handleSubmitVaccine = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !petId) return;
    if (!vaccineName.trim() || !appliedAt) { setError("Completa nombre y fecha de aplicación."); return; }
    setIsSavingVaccine(true); setError(null);
    try {
      if (editingVaccineId) {
        await updateVaccine(accessToken, petId, editingVaccineId, {
          vaccineName: vaccineName.trim(), appliedAt,
          nextDoseAt: nextDoseAt || undefined, providerName: providerName.trim() || undefined,
          lotNumber: lotNumber.trim() || undefined, certificateUrl: certificateUrl.trim() || undefined,
          notes: vaccineNotes.trim() || undefined
        });
      } else {
        await createVaccine(accessToken, petId, {
          vaccineName: vaccineName.trim(), appliedAt,
          nextDoseAt: nextDoseAt || undefined, providerName: providerName.trim() || undefined,
          lotNumber: lotNumber.trim() || undefined, certificateUrl: certificateUrl.trim() || undefined,
          notes: vaccineNotes.trim() || undefined
        });
      }
      resetVaccineForm();
      await loadPage();
      setActiveTab("historial");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar."); }
    finally { setIsSavingVaccine(false); }
  };

  const handleEditVaccine = (record: VaccineRecord) => {
    setEditingVaccineId(record.id); setVaccineName(record.vaccineName);
    setAppliedAt(isoToDateInput(record.appliedAt)); setNextDoseAt(isoToDateInput(record.nextDoseAt));
    setProviderName(record.providerName ?? ""); setLotNumber(record.lotNumber ?? "");
    setCertificateUrl(record.certificateUrl ?? ""); setVaccineNotes(record.notes ?? "");
    setActiveTab("administrar");
  };

  const handleDeleteVaccine = async (vaccineId: string) => {
    if (!accessToken || !petId) return;
    if (!window.confirm("¿Eliminar este registro de vacuna?")) return;
    try { await deleteVaccine(accessToken, petId, vaccineId); await loadPage(); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo eliminar."); }
  };

  const handleSubmitReminder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !petId) return;
    if (!reminderTitle.trim() || !reminderDueAt) { setError("Ingresa título y fecha."); return; }
    setIsSavingReminder(true); setError(null);
    try {
      if (editingReminderId) {
        await updateReminder(accessToken, petId, editingReminderId, {
          type: reminderType, title: reminderTitle.trim(),
          message: reminderMessage.trim() || undefined, dueAt: reminderDueAt,
          sendEmail, sendInApp, sendPush
        });
      } else {
        await createReminder(accessToken, petId, {
          type: reminderType, title: reminderTitle.trim(),
          message: reminderMessage.trim() || undefined, dueAt: reminderDueAt,
          sendEmail, sendInApp, sendPush
        });
      }
      resetReminderForm();
      await loadPage();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar."); }
    finally { setIsSavingReminder(false); }
  };

  const handleEditReminder = (reminder: Reminder) => {
    setEditingReminderId(reminder.id); setReminderType(reminder.type);
    setReminderTitle(reminder.title); setReminderMessage(reminder.message ?? "");
    setReminderDueAt(isoToDateInput(reminder.dueAt)); setSendEmail(reminder.sendEmail);
    setSendInApp(reminder.sendInApp); setSendPush(reminder.sendPush);
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (!accessToken || !petId) return;
    if (!window.confirm("¿Eliminar este recordatorio?")) return;
    try { await deleteReminder(accessToken, petId, reminderId); await loadPage(); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo eliminar."); }
  };

  const copyPublicLink = async () => {
    if (!card?.share.publicUrl) return;
    await navigator.clipboard.writeText(card.share.publicUrl);
  };

  return (
    <AuthGate>
      <div className="mx-auto max-w-xl">
        {isLoading ? (
          <div className="space-y-4 p-4">
            <div className="h-52 w-full animate-pulse rounded-3xl bg-slate-100" />
            <div className="h-24 w-full animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-16 w-full animate-pulse rounded-2xl bg-slate-100" />
          </div>
        ) : !card ? (
          <div className="p-4">
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-slate-200 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50">
                <IcoSyringe />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Carnet no disponible</p>
                <p className="mt-1 text-[12px] text-slate-400">{error ?? "No se pudo cargar la información del carnet."}</p>
              </div>
              <Link href={`/pets/${petId}`} className="rounded-xl border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-600">
                Volver a mascota
              </Link>
            </div>
          </div>
        ) : (
          <div>
            {/* ── Top bar ──────────────────────────────────────── */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <Link href={`/pets/${card.pet.id}`} className="flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                {card.pet.name}
              </Link>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setActiveTab("administrar"); }}
                  className="flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-3 py-1.5 text-[11px] font-bold text-white"
                >
                  <IcoPlus /> Vacuna
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab("recordatorios"); }}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600"
                >
                  <IcoBell /> Recordatorio
                </button>
              </div>
            </div>

            {/* ── Tabs ──────────────────────────────────────────── */}
            <div className="sticky top-0 z-10 bg-white shadow-sm">
              <div className="flex overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-[12px] font-semibold transition-colors ${
                        active
                          ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                          : "border-transparent text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      <Icon />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Error ─────────────────────────────────────────── */}
            {error && (
              <div className="mx-4 mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[12px] text-red-700">
                {error}
              </div>
            )}

            {/* ── Tab content ───────────────────────────────────── */}
            <div className="px-4 py-5">
              {activeTab === "carnet" && (
                <TabCarnet card={card} onCopyLink={() => void copyPublicLink()} />
              )}
              {activeTab === "historial" && (
                <TabHistorial
                  vaccines={vaccines}
                  filterType={filterType} setFilterType={setFilterType}
                  filterStatus={filterStatus} setFilterStatus={setFilterStatus}
                  filterFrom={filterFrom} setFilterFrom={setFilterFrom}
                  filterTo={filterTo} setFilterTo={setFilterTo}
                  onApplyFilters={(e) => void handleApplyFilters(e)}
                  onEditVaccine={handleEditVaccine}
                  onDeleteVaccine={(id) => void handleDeleteVaccine(id)}
                />
              )}
              {activeTab === "administrar" && (
                <TabAdministrar
                  editingVaccineId={editingVaccineId}
                  vaccineName={vaccineName} setVaccineName={setVaccineName}
                  appliedAt={appliedAt} setAppliedAt={setAppliedAt}
                  nextDoseAt={nextDoseAt} setNextDoseAt={setNextDoseAt}
                  providerName={providerName} setProviderName={setProviderName}
                  lotNumber={lotNumber} setLotNumber={setLotNumber}
                  certificateUrl={certificateUrl} setCertificateUrl={setCertificateUrl}
                  vaccineNotes={vaccineNotes} setVaccineNotes={setVaccineNotes}
                  isSavingVaccine={isSavingVaccine}
                  onSubmitVaccine={(e) => void handleSubmitVaccine(e)}
                  onResetVaccineForm={resetVaccineForm}
                />
              )}
              {activeTab === "recordatorios" && (
                <TabRecordatorios
                  reminders={reminders}
                  editingReminderId={editingReminderId}
                  reminderType={reminderType} setReminderType={setReminderType}
                  reminderTitle={reminderTitle} setReminderTitle={setReminderTitle}
                  reminderMessage={reminderMessage} setReminderMessage={setReminderMessage}
                  reminderDueAt={reminderDueAt} setReminderDueAt={setReminderDueAt}
                  sendEmail={sendEmail} setSendEmail={setSendEmail}
                  sendInApp={sendInApp} setSendInApp={setSendInApp}
                  sendPush={sendPush} setSendPush={setSendPush}
                  isSavingReminder={isSavingReminder}
                  onSubmitReminder={(e) => void handleSubmitReminder(e)}
                  onResetReminderForm={resetReminderForm}
                  onEditReminder={handleEditReminder}
                  onDeleteReminder={(id) => void handleDeleteReminder(id)}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  );
}

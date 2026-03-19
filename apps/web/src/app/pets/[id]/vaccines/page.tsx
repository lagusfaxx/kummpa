"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/features/auth/auth-context";
import {
  createVaccine,
  deleteVaccine,
  getVaccineCard,
  listVaccines,
  updateVaccine
} from "@/features/vaccines/vaccines-api";
import type {
  PetVaccineCard,
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
  UP_TO_DATE:   { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700",  label: "Al día"     },
  DUE_SOON:     { dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700",      label: "Próxima"    },
  OVERDUE:      { dot: "bg-red-500",     badge: "bg-red-50 text-red-700",          label: "Vencida"    },
  NO_NEXT_DOSE: { dot: "bg-slate-300",   badge: "bg-slate-100 text-slate-500",     label: "Sin próx."  }
};

/* ─── Icons ───────────────────────────────────────────────────── */
function IcoShare()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>; }
function IcoPrint()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>; }
function IcoCopy()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>; }
function IcoPlus()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4"><path d="M12 5v14M5 12h14"/></svg>; }
function IcoSyringe() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/><path d="m9 11 4 4"/><path d="m5 19-3 3"/><path d="m14 4 6 6"/></svg>; }
function IcoHistory() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>; }
function IcoSettings(){ return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }

/* ─── Tab type ────────────────────────────────────────────────── */
type Tab = "carnet" | "historial" | "administrar";

const TABS: { id: Tab; label: string; icon: () => JSX.Element }[] = [
  { id: "carnet",      label: "Carnet",      icon: IcoSyringe  },
  { id: "historial",   label: "Historial",   icon: IcoHistory  },
  { id: "administrar", label: "Administrar", icon: IcoSettings },
];

/* ─── Field atom ──────────────────────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-300 focus:border-[hsl(var(--primary))] focus:bg-white focus:outline-none transition-colors";

/* ─── Shared carnet card visual (used in both mobile and desktop) ── */
type CarnetCfg = { from: string; to: string; label: string; dotCls: string };

function CarnetCardVisual({ card, cfg, large = false }: { card: PetVaccineCard; cfg: CarnetCfg; large?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${cfg.from} ${cfg.to} text-white shadow-xl`}
      style={{ padding: large ? "28px" : "20px" }}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-8 left-1/3 h-32 w-32 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-20 w-20 rounded-full bg-white/10" />

      <div className="relative flex items-start gap-4">
        <div className={`shrink-0 overflow-hidden rounded-2xl border-2 border-white/25 shadow-lg ${large ? "h-[110px] w-[110px]" : "h-16 w-16"}`}>
          {card.pet.primaryPhotoUrl ? (
            <img src={card.pet.primaryPhotoUrl} alt={card.pet.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/20 text-2xl font-bold">
              {card.pet.name.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Carnet de Vacunación · Kummpa</p>
          <h2 className={`font-display font-extrabold leading-tight tracking-tight ${large ? "mt-1 text-4xl" : "mt-0.5 text-2xl"}`}>
            {card.pet.name}
          </h2>
          <p className={`text-white/70 ${large ? "mt-1 text-[14px]" : "mt-0.5 text-[12px]"}`}>
            {[card.pet.species, card.pet.breed].filter(Boolean).join(" · ")}
          </p>
          {large && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 backdrop-blur-sm">
              <div className={`h-2 w-2 rounded-full ${cfg.dotCls} ring-1 ring-white/40`} />
              <span className="text-[11px] font-bold">{cfg.label}</span>
            </div>
          )}
        </div>
        {!large && (
          <div className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm">
            {cfg.label}
          </div>
        )}
      </div>

      <div className="relative my-4 border-t border-white/15" />

      <div className={`relative grid grid-cols-3 ${large ? "gap-3" : "gap-2"}`}>
        {[
          { n: card.summary.upToDateCount, label: "Al día"     },
          { n: card.summary.dueSoonCount,  label: "Por vencer" },
          { n: card.summary.overdueCount,  label: "Vencidas"   },
        ].map(({ n, label }) => (
          <div key={label} className={`rounded-2xl bg-white/15 text-center backdrop-blur-sm ${large ? "py-4" : "py-3"}`}>
            <p className={`font-black ${large ? "text-3xl" : "text-xl"}`}>{n}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-white/60">{label}</p>
          </div>
        ))}
      </div>

      <div className="relative mt-4 flex items-end justify-between">
        <div>
          <p className="text-[10px] text-white/50">Tutor</p>
          <p className={`font-semibold ${large ? "text-[15px]" : "text-[13px]"}`}>{card.pet.ownerName}</p>
        </div>
        {card.pet.microchipNumber && (
          <div className="text-right">
            <p className="text-[10px] text-white/50">Microchip</p>
            <p className={`font-mono font-semibold ${large ? "text-[13px]" : "text-[11px]"}`}>{card.pet.microchipNumber}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function NextDoseVisual({ nextVaccine }: { nextVaccine: PetVaccineCard["upcoming"][0] | undefined }) {
  if (nextVaccine) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Próxima dosis</p>
        <p className="mt-1 text-[15px] font-bold text-amber-900">{nextVaccine.vaccineName}</p>
        <p className="mt-0.5 text-[12px] text-amber-700">
          {formatDate(nextVaccine.nextDoseAt)}
          {nextVaccine.daysUntilDue != null && ` · ${daysLabel(nextVaccine.daysUntilDue)}`}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3.5">
      <p className="text-[13px] font-semibold text-emerald-700">Sin dosis próximas pendientes</p>
      <p className="mt-0.5 text-[11px] text-emerald-600">Todas las vacunas están al día o sin próxima dosis registrada.</p>
    </div>
  );
}

/* ─── Carnet tab ──────────────────────────────────────────────── */
function TabCarnet({
  card,
  vaccines,
  onCopyLink,
  onGoToAdmin,
}: {
  card: PetVaccineCard;
  vaccines: VaccineRecord[];
  onCopyLink: () => void;
  onGoToAdmin: () => void;
}) {
  const tone = card.summary.overallStatus;
  const cfg: CarnetCfg = {
    UP_TO_DATE: { from: "from-emerald-500", to: "to-emerald-700", label: "Vacunas al día",       dotCls: "bg-emerald-500" },
    DUE_SOON:   { from: "from-amber-400",   to: "to-amber-600",   label: "Próxima dosis pronto", dotCls: "bg-amber-400"   },
    OVERDUE:    { from: "from-red-500",     to: "to-red-700",     label: "Vacuna vencida",       dotCls: "bg-red-500"     },
  }[tone] ?? { from: "from-slate-500", to: "to-slate-700", label: "Sin estado", dotCls: "bg-slate-400" };

  const nextVaccine = card.upcoming[0];
  const recentVaccines = vaccines.slice(0, 5);

  /* ── Mobile layout ──────────────────────────────────────────── */
  return (
    <>
      <div className="space-y-4 lg:hidden">
        <CarnetCardVisual card={card} cfg={cfg} />
        <NextDoseVisual nextVaccine={nextVaccine} />
        <div className="grid grid-cols-2 gap-2">
          <a href={card.share.printableSheetUrl} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-[hsl(var(--primary))] py-3 text-[13px] font-bold text-white shadow-sm hover:opacity-90 transition-opacity">
            <IcoPrint /> Imprimir / PDF
          </a>
          <a href={card.share.printableCardUrl} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-colors">
            <IcoShare /> Tarjeta
          </a>
        </div>
        {card.share.publicUrl ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Enlace público del carnet</p>
            <p className="mt-1.5 truncate rounded-xl border border-slate-100 bg-white px-3 py-2 text-[12px] font-mono text-slate-600">
              {card.share.publicUrl}
            </p>
            <button type="button" onClick={onCopyLink}
              className="mt-2 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
              <IcoCopy /> Copiar enlace
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center">
            <p className="text-[12px] text-slate-400">Para compartir por enlace, activa el perfil público en la ficha de la mascota.</p>
            <Link href={`/pets/${card.pet.id}`} className="mt-2 inline-block text-[12px] font-semibold text-[hsl(var(--primary))]">Ir a la ficha →</Link>
          </div>
        )}
      </div>

      {/* ── Desktop 2-col layout ──────────────────────────────── */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_296px] lg:gap-7 lg:items-start">

        {/* Left: big carnet + mini historial ─────────────────── */}
        <div className="space-y-6">
          <CarnetCardVisual card={card} cfg={cfg} large />

          {/* Mini historial */}
          {recentVaccines.length > 0 && (
            <div className="rounded-3xl border border-slate-100 bg-white overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-50 px-5 py-3.5">
                <p className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Historial reciente</p>
                <span className="text-[11px] font-semibold text-slate-300">{vaccines.length} registros</span>
              </div>
              <div className="divide-y divide-slate-50">
                {recentVaccines.map((v) => {
                  const vcfg = statusCfg[v.status];
                  return (
                    <div key={v.id} className="flex items-center gap-4 px-5 py-3">
                      <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${vcfg.dot}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-slate-800">{v.vaccineName}</p>
                        <p className="text-[11px] text-slate-400">
                          {formatDate(v.appliedAt)}
                          {v.providerName ? ` · ${v.providerName}` : ""}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${vcfg.badge}`}>
                        {vcfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              {vaccines.length > 5 && (
                <div className="border-t border-slate-50 px-5 py-3 text-center">
                  <span className="text-[11px] font-semibold text-slate-400">+{vaccines.length - 5} más en el historial completo</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: sidebar ─────────────────────────────────────── */}
        <div className="space-y-3 lg:sticky lg:top-14">

          {/* Status card */}
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
            <div className="border-b border-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estado general</p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-50 py-2">
              {[
                { n: card.summary.upToDateCount,  label: "Al día",      cls: "text-emerald-600" },
                { n: card.summary.dueSoonCount,   label: "Por vencer",  cls: "text-amber-500"   },
                { n: card.summary.overdueCount,   label: "Vencidas",    cls: "text-red-500"     },
              ].map(({ n, label, cls }) => (
                <div key={label} className="py-2.5 text-center">
                  <p className={`text-[22px] font-black leading-none ${cls}`}>{n}</p>
                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Next dose */}
          <NextDoseVisual nextVaccine={nextVaccine} />

          {/* Actions */}
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white divide-y divide-slate-50">
            <button type="button" onClick={onGoToAdmin}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-[hsl(var(--primary)/0.04)] transition-colors group">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                <IcoPlus />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[hsl(var(--primary))]">Registrar vacuna</p>
                <p className="text-[11px] text-slate-400">Agregar nuevo registro</p>
              </div>
            </button>
            <a href={card.share.printableSheetUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><IcoPrint /></div>
              <div>
                <p className="text-[13px] font-semibold text-slate-800">Imprimir / PDF</p>
                <p className="text-[11px] text-slate-400">Hoja A4 para el veterinario</p>
              </div>
            </a>
            <a href={card.share.printableCardUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><IcoShare /></div>
              <div>
                <p className="text-[13px] font-semibold text-slate-800">Tarjeta de bolsillo</p>
                <p className="text-[11px] text-slate-400">Tamaño carné para collar</p>
              </div>
            </a>
            {card.share.publicUrl && (
              <button type="button" onClick={onCopyLink}
                className="flex w-full items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><IcoCopy /></div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-800">Copiar enlace</p>
                  <p className="text-[11px] text-slate-400">Compartir el carnet</p>
                </div>
              </button>
            )}
          </div>

          {/* Public URL chip */}
          {card.share.publicUrl && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Enlace público</p>
              <p className="mt-1 truncate font-mono text-[11px] text-slate-500">{card.share.publicUrl}</p>
            </div>
          )}

        </div>
      </div>
    </>
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
      <button type="button" onClick={() => setShowFilters(!showFilters)}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-[12px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors">
        <span>Filtrar historial</span>
        <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
        </svg>
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

      {vaccines.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 text-3xl">💉</div>
          <div>
            <p className="font-semibold text-slate-800">Sin vacunas en el historial</p>
            <p className="mt-1 text-[12px] text-slate-400">Las vacunas que registres aparecerán aquí con su estado y próximas dosis.</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[19px] top-0 h-full w-px bg-slate-100" />
          <div className="space-y-3">
            {vaccines.map((record) => {
              const cfg = statusCfg[record.status];
              return (
                <div key={record.id} className="relative flex gap-4">
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center">
                    <div className={`h-3 w-3 rounded-full ring-2 ring-white ${cfg.dot}`} />
                  </div>
                  <div className="mb-1 flex-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[14px] text-slate-900">{record.vaccineName}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {formatDate(record.appliedAt)}{record.providerName ? ` · ${record.providerName}` : ""}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </div>

                    {record.nextDoseAt && (
                      <div className="mt-2.5 flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2">
                        <div className={`h-2 w-2 shrink-0 rounded-full ${record.status === "OVERDUE" ? "bg-red-400" : "bg-amber-400"}`} />
                        <p className="text-[11px] text-slate-600">
                          Próxima dosis {formatDate(record.nextDoseAt)}
                          {record.daysUntilDue != null && <span className="ml-1 font-semibold">{daysLabel(record.daysUntilDue)}</span>}
                        </p>
                      </div>
                    )}

                    {(record.lotNumber || record.notes || record.certificateUrl) && (
                      <div className="mt-2.5 space-y-1">
                        {record.lotNumber && <p className="text-[11px] text-slate-400">Lote: {record.lotNumber}</p>}
                        {record.notes && <p className="text-[11px] leading-relaxed text-slate-500">{record.notes}</p>}
                        {record.certificateUrl && (
                          <a href={record.certificateUrl} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[hsl(var(--primary))] underline">
                            Ver certificado
                          </a>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => onEditVaccine(record)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                        Editar
                      </button>
                      <button type="button" onClick={() => onDeleteVaccine(record.id)}
                        className="rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-100 transition-colors">
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
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
            <IcoPlus />
          </div>
          <h2 className="font-semibold text-[15px] text-slate-800">
            {editingVaccineId ? "Editar registro" : "Registrar vacuna"}
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
              <textarea rows={3} value={vaccineNotes} onChange={(e) => setVaccineNotes(e.target.value)} className={inputCls + " resize-none"} placeholder="Notas clínicas, reacciones, etc…" />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button type="submit" disabled={isSavingVaccine}
              className="rounded-xl bg-[hsl(var(--primary))] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60 hover:opacity-90 transition-opacity">
              {isSavingVaccine ? "Guardando…" : editingVaccineId ? "Actualizar" : "Registrar vacuna"}
            </button>
            {editingVaccineId && (
              <button type="button" onClick={onResetVaccineForm}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-blue-50 bg-blue-50 px-4 py-3">
        <p className="text-[12px] font-semibold text-blue-700">Recordatorios automáticos</p>
        <p className="mt-0.5 text-[11px] text-blue-600 leading-relaxed">
          Al registrar una próxima dosis, Kummpa generará automáticamente recordatorios para avisarte cuando se acerque la fecha.
        </p>
      </div>
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingVaccine, setIsSavingVaccine] = useState(false);
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
      const cardData = await getVaccineCard(accessToken, petId);
      setCard(cardData);
      await loadVaccineList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el carnet.");
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

  const copyPublicLink = async () => {
    if (!card?.share.publicUrl) return;
    await navigator.clipboard.writeText(card.share.publicUrl);
  };

  return (
    <AuthGate>
      <div className="mx-auto max-w-5xl">
        {isLoading ? (
          <div className="space-y-4 p-4">
            <div className="h-52 w-full animate-pulse rounded-3xl bg-slate-100" />
            <div className="h-24 w-full animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-16 w-full animate-pulse rounded-2xl bg-slate-100" />
          </div>
        ) : !card ? (
          <div className="p-4">
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-slate-200 py-16 text-center">
              <div className="text-4xl">💉</div>
              <div>
                <p className="font-semibold text-slate-800">Carnet no disponible</p>
                <p className="mt-1 text-[12px] text-slate-400">{error ?? "No se pudo cargar la información del carnet."}</p>
              </div>
              <Link href={`/pets/${petId}`} className="rounded-xl border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-600">
                Volver a la ficha
              </Link>
            </div>
          </div>
        ) : (
          <div>
            {/* Top bar */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <Link href={`/pets/${card.pet.id}`}
                className="flex items-center gap-1 text-[12px] font-semibold text-slate-400 hover:text-slate-700 transition-colors">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                {card.pet.name}
              </Link>
              <button type="button" onClick={() => setActiveTab("administrar")}
                className="flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-3 py-1.5 text-[11px] font-bold text-white hover:opacity-90 transition-opacity">
                <IcoPlus /> Registrar vacuna
              </button>
            </div>

            {/* Tabs */}
            <div className="sticky top-0 z-10 border-b border-slate-100 bg-white">
              <div className="flex overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`relative flex shrink-0 items-center gap-1.5 px-5 py-3.5 text-[12px] font-semibold transition-colors ${
                        active ? "text-[hsl(var(--primary))]" : "text-slate-400 hover:text-slate-600"
                      }`}>
                      <Icon />
                      {tab.label}
                      {active && <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[hsl(var(--primary))]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mx-4 mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[12px] text-red-700">
                {error}
              </div>
            )}

            {/* Tab content */}
            <div className="px-4 py-5 lg:px-8 lg:py-7">
              {activeTab === "carnet" && (
                <TabCarnet
                  card={card}
                  vaccines={vaccines}
                  onCopyLink={() => void copyPublicLink()}
                  onGoToAdmin={() => setActiveTab("administrar")}
                />
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
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  );
}

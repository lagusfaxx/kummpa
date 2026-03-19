"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AuthGate } from "@/components/auth/auth-gate";
import { EmptyState } from "@/components/feedback/empty-state";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { SurfaceSkeleton } from "@/components/feedback/skeleton";
import { useAuth } from "@/features/auth/auth-context";
import { listLostPetAlerts } from "@/features/lost-pets/lost-pets-api";
import type { LostPetAlert } from "@/features/lost-pets/types";
import { getPet, getPetPublicIdentity, updatePetVisibility } from "@/features/pets/pets-api";
import type { Pet, PetPublicIdentityManaged } from "@/features/pets/types";
import { useToast } from "@/features/ui/toast-context";
import { getVaccineCard } from "@/features/vaccines/vaccines-api";
import type { PetVaccineCard } from "@/features/vaccines/types";

/* ─── Helpers ─────────────────────────────────────────────────── */

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

function ageLabel(pet: Pet) {
  if (pet.ageYears == null) return null;
  if (pet.ageYears < 1) return "Cachorro";
  if (pet.ageYears === 1) return "1 año";
  return `${pet.ageYears} años`;
}

function speciesEmoji(species: string) {
  const s = species.toLowerCase();
  if (s.includes("perro") || s.includes("dog")) return "🐕";
  if (s.includes("gato") || s.includes("cat")) return "🐈";
  if (s.includes("conejo") || s.includes("rabbit")) return "🐇";
  if (s.includes("pájaro") || s.includes("ave") || s.includes("bird")) return "🦜";
  if (s.includes("pez") || s.includes("fish")) return "🐟";
  return "🐾";
}

type HealthTone = "ok" | "warn" | "error" | "none";

function healthTone(card: PetVaccineCard | null): HealthTone {
  if (!card) return "none";
  if (card.summary.overallStatus === "OVERDUE") return "error";
  if (card.summary.overallStatus === "DUE_SOON") return "warn";
  return "ok";
}

/* ─── Icons (inline SVG) ──────────────────────────────────────── */
function IcoPen()   { return <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5"><path d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>; }
function IcoSyringe() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/><path d="m9 11 4 4"/><path d="m5 19-3 3"/><path d="m14 4 6 6"/></svg>; }
function IcoAlert()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>; }
function IcoShare()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>; }
function IcoChevron() { return <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-slate-200"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>; }
function IcoQr()     { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3" rx="0.5"/><path d="M17 14h4M14 17v4M17 20h4M20 17v4"/></svg>; }
function IcoDoc()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>; }

/* ─── Tabs ────────────────────────────────────────────────────── */
type Tab = "resumen" | "salud" | "identidad" | "alertas" | "documentos";

/* ─── Atoms ───────────────────────────────────────────────────── */

function DataRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-50 last:border-0">
      <span className="text-[12px] text-slate-400 font-medium shrink-0">{label}</span>
      <span className="text-[13px] font-semibold text-slate-700 text-right">{value}</span>
    </div>
  );
}

function WarmEmptyState({
  emoji,
  title,
  body,
  action,
}: {
  emoji: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-50 text-3xl">{emoji}</div>
      <div>
        <p className="font-semibold text-[14px] text-slate-700">{title}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-400 max-w-[240px] mx-auto">{body}</p>
      </div>
      {action}
    </div>
  );
}

function ActionRow({
  href,
  label,
  sublabel,
  external,
  accent,
}: {
  href: string;
  label: string;
  sublabel?: string;
  external?: boolean;
  accent?: boolean;
}) {
  const cls = `flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 transition-colors ${
    accent
      ? "bg-[hsl(var(--primary)/0.06)] hover:bg-[hsl(var(--primary)/0.10)] border border-[hsl(var(--primary)/0.12)]"
      : "bg-slate-50 hover:bg-slate-100 border border-transparent"
  }`;
  const content = (
    <>
      <div>
        <p className={`text-[13px] font-semibold ${accent ? "text-[hsl(var(--primary))]" : "text-slate-800"}`}>{label}</p>
        {sublabel && <p className="mt-0.5 text-[11px] text-slate-400">{sublabel}</p>}
      </div>
      <IcoChevron />
    </>
  );
  if (external) return <a href={href} target="_blank" rel="noreferrer" className={cls}>{content}</a>;
  return <Link href={href} className={cls}>{content}</Link>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-300">{children}</p>;
}

/* ─── Tab panels ─────────────────────────────────────────────── */

function TabResumen({ pet }: { pet: Pet }) {
  const infoItems: [string, string | number | null | undefined][] = [
    ["Sexo",        pet.sex === "MALE" ? "Macho" : pet.sex === "FEMALE" ? "Hembra" : null],
    ["Tamaño",      pet.size === "UNKNOWN" ? null : pet.size],
    ["Peso",        pet.weightKg ? `${pet.weightKg} kg` : null],
    ["Color",       pet.color],
    ["Microchip",   pet.microchipNumber],
    ["Esterilizado",pet.isSterilized ? "Sí" : null],
    ["Veterinaria", pet.usualVetName],
    ["Emergencia",  pet.emergencyContactPhone ?? pet.emergencyContactName],
  ];
  const visible = infoItems.filter(([, v]) => v != null && v !== "");
  const hasNotes = !!(pet.healthStatus || pet.generalNotes);
  const hasExtra = !!(pet.allergies || pet.diseases);
  const hasAnything = visible.length > 0 || hasNotes || hasExtra;

  return (
    <div className="space-y-4">
      {visible.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white px-4">
          {visible.map(([label, value]) => <DataRow key={label} label={label} value={value} />)}
        </div>
      )}

      {hasNotes && (
        <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-2">Observaciones</p>
          <p className="text-[13px] leading-relaxed text-slate-600">{pet.healthStatus || pet.generalNotes}</p>
        </div>
      )}

      {pet.allergies && (
        <div className="flex gap-3 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3.5">
          <span className="text-lg shrink-0">⚠️</span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-0.5">Alergias</p>
            <p className="text-[13px] text-amber-800 leading-relaxed">{pet.allergies}</p>
          </div>
        </div>
      )}

      {pet.diseases && (
        <div className="flex gap-3 rounded-2xl bg-red-50 border border-red-100 px-4 py-3.5">
          <span className="text-lg shrink-0">🩺</span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-0.5">Condiciones</p>
            <p className="text-[13px] text-red-700 leading-relaxed">{pet.diseases}</p>
          </div>
        </div>
      )}

      {!hasAnything && (
        <WarmEmptyState
          emoji="📋"
          title="Ficha incompleta"
          body="Agrega los datos básicos de tu mascota para tener todo en un solo lugar."
          action={
            <Link href={`/pets/${pet.id}/edit`} className="rounded-full bg-[hsl(var(--primary))] px-4 py-1.5 text-[12px] font-semibold text-white">
              Completar ficha
            </Link>
          }
        />
      )}
    </div>
  );
}

function TabSalud({ pet, vaccineCard }: { pet: Pet; vaccineCard: PetVaccineCard | null }) {
  const tone = healthTone(vaccineCard);

  const statusCfg = {
    ok:    { from: "from-emerald-500", to: "to-emerald-600", label: "Todo en orden", sub: "Vacunas al día",    dot: "bg-emerald-400" },
    warn:  { from: "from-amber-400",   to: "to-amber-500",   label: "Atención pronto", sub: "Próxima dosis",  dot: "bg-amber-300"   },
    error: { from: "from-red-500",     to: "to-red-600",     label: "Requiere atención", sub: "Vacuna vencida",dot: "bg-red-400"   },
    none:  { from: "from-slate-400",   to: "to-slate-500",   label: "Sin carnet",      sub: "Sin registros",   dot: "bg-slate-300"   },
  }[tone];

  const nextVaccine = vaccineCard?.upcoming[0];

  return (
    <div className="space-y-4">
      {/* Status card */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${statusCfg.from} ${statusCfg.to} px-4 py-4`}>
        <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Estado de vacunación</p>
            <p className="mt-0.5 text-[16px] font-bold text-white">{statusCfg.label}</p>
            {nextVaccine && (
              <p className="mt-0.5 text-[11px] text-white/70">
                Próx.: {nextVaccine.vaccineName} · {formatDate(nextVaccine.nextDoseAt)}
              </p>
            )}
          </div>
          <Link
            href={`/pets/${pet.id}/vaccines`}
            className="shrink-0 rounded-xl bg-white/20 px-3 py-2 text-[11px] font-bold text-white hover:bg-white/30 transition-colors backdrop-blur-sm"
          >
            Ver carnet
          </Link>
        </div>
      </div>

      {/* Metrics */}
      {vaccineCard && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { n: vaccineCard.summary.upToDateCount,  label: "Al día",     color: "text-emerald-600", bg: "bg-emerald-50" },
            { n: vaccineCard.summary.dueSoonCount,   label: "Por vencer", color: "text-amber-600",   bg: "bg-amber-50"   },
            { n: vaccineCard.summary.overdueCount,   label: "Vencidas",   color: "text-red-600",     bg: "bg-red-50"     },
          ].map(({ n, label, color, bg }) => (
            <div key={label} className={`rounded-2xl border border-slate-100 ${n > 0 ? bg : "bg-white"} py-3.5 text-center`}>
              <p className={`text-2xl font-black ${color}`}>{n}</p>
              <p className="mt-0.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent history */}
      {vaccineCard && vaccineCard.history.length > 0 ? (
        <div className="space-y-2">
          <SectionLabel>Aplicadas recientemente</SectionLabel>
          {vaccineCard.history.slice(0, 4).map((record) => (
            <div key={record.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                  <IcoSyringe />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-slate-800">{record.vaccineName}</p>
                  <p className="text-[11px] text-slate-400">{formatDate(record.appliedAt)}{record.providerName ? ` · ${record.providerName}` : ""}</p>
                </div>
              </div>
              {record.nextDoseAt && (
                <span className="shrink-0 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 border border-slate-100">
                  Próx. {formatDate(record.nextDoseAt)}
                </span>
              )}
            </div>
          ))}
          <Link href={`/pets/${pet.id}/vaccines`} className="flex w-full items-center justify-center py-2 text-[12px] font-semibold text-[hsl(var(--primary))] hover:opacity-70 transition-opacity">
            Ver carnet completo →
          </Link>
        </div>
      ) : (
        <WarmEmptyState
          emoji="💉"
          title="Sin vacunas todavía"
          body="Registra las vacunas de tu mascota para llevar un historial ordenado y recibir recordatorios automáticos."
          action={
            <Link href={`/pets/${pet.id}/vaccines`} className="rounded-full bg-[hsl(var(--primary))] px-4 py-1.5 text-[12px] font-semibold text-white">
              Ir al carnet
            </Link>
          }
        />
      )}

      {/* Health extras */}
      {(pet.allergies || pet.diseases || pet.medications) && (
        <div className="space-y-2">
          <SectionLabel>Información clínica</SectionLabel>
          {pet.allergies && (
            <div className="flex gap-3 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3.5">
              <span className="text-base shrink-0">⚠️</span>
              <div><p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Alergias</p><p className="text-[12px] text-amber-800 mt-0.5 leading-relaxed">{pet.allergies}</p></div>
            </div>
          )}
          {pet.diseases && (
            <div className="flex gap-3 rounded-2xl bg-red-50 border border-red-100 px-4 py-3.5">
              <span className="text-base shrink-0">🩺</span>
              <div><p className="text-[10px] font-bold uppercase tracking-widest text-red-400">Condiciones</p><p className="text-[12px] text-red-700 mt-0.5 leading-relaxed">{pet.diseases}</p></div>
            </div>
          )}
          {pet.medications && (
            <div className="flex gap-3 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3.5">
              <span className="text-base shrink-0">💊</span>
              <div><p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Medicación</p><p className="text-[12px] text-blue-700 mt-0.5 leading-relaxed">{pet.medications}</p></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TabIdentidad({ pet, identity }: { pet: Pet; identity: PetPublicIdentityManaged | null }) {
  return (
    <div className="space-y-3">
      {identity ? (
        <>
          {/* ID card visual */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 px-5 py-5">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute -bottom-4 left-8 h-16 w-16 rounded-full bg-white/5" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-2xl">
                <IcoQr />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Identidad digital</p>
                <p className="font-bold text-white">{pet.name}</p>
                <p className="text-[11px] text-white/50">
                  {identity.identity.emergencyStatus === "ACTIVE" ? "Perfil de emergencia activo" : identity.identity.emergencyStatus}
                </p>
              </div>
              <div className="ml-auto">
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                  Activo
                </span>
              </div>
            </div>
            {pet.microchipNumber && (
              <div className="relative mt-4 border-t border-white/10 pt-3">
                <p className="text-[10px] text-white/30 mb-0.5">Microchip</p>
                <p className="font-mono text-[12px] font-semibold text-white/70">{pet.microchipNumber}</p>
              </div>
            )}
          </div>

          <ActionRow href={identity.identity.urls.publicUrl}  label="Ver perfil público"     sublabel="Cualquiera puede ver este enlace" external accent />
          <ActionRow href={identity.identity.urls.qrImageUrl} label="Descargar código QR"    sublabel="Para collar, placa o ficha de emergencia" external />
          <ActionRow href={`/pets/${pet.id}/identity`}         label="Gestionar identidad"    sublabel="Editar información de emergencia y NFC" />
        </>
      ) : (
        <>
          <WarmEmptyState
            emoji="🏷️"
            title="Sin identidad configurada"
            body={`Configura la identidad digital de ${pet.name} para que quien lo encuentre sepa inmediatamente a quién llamar.`}
            action={
              <Link href={`/pets/${pet.id}/identity`} className="rounded-full bg-[hsl(var(--primary))] px-4 py-1.5 text-[12px] font-semibold text-white">
                Configurar ahora
              </Link>
            }
          />
        </>
      )}

      <div className="rounded-2xl border border-slate-100 bg-white px-4">
        <DataRow label="Microchip" value={pet.microchipNumber ?? "—"} />
        <DataRow label="Perfil público" value={pet.isPublic ? "Activo" : "Privado"} />
      </div>
    </div>
  );
}

function TabAlertas({ pet, activeAlerts }: { pet: Pet; activeAlerts: LostPetAlert[] }) {
  return (
    <div className="space-y-3">
      {activeAlerts.length === 0 ? (
        <WarmEmptyState
          emoji="🐾"
          title={`${pet.name} está a salvo`}
          body="No hay alertas activas. Si alguna vez lo pierdes, puedes crear una alerta para que la comunidad te ayude a encontrarlo."
          action={
            <Link href="/lost-pets/report" className="rounded-full border border-slate-200 px-4 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              Crear alerta de extravío
            </Link>
          }
        />
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-2xl bg-red-50 border border-red-100 px-4 py-3">
            <span className="text-base">🚨</span>
            <p className="text-[12px] font-semibold text-red-700">
              {activeAlerts.length === 1 ? "Hay 1 alerta activa" : `Hay ${activeAlerts.length} alertas activas`} para {pet.name}
            </p>
          </div>
          {activeAlerts.map((alert) => (
            <div key={alert.id} className="rounded-2xl border border-red-100 bg-white px-4 py-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-bold text-slate-800">{alert.lastSeenAddress || "Última ubicación registrada"}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">Reportada el {formatDate(alert.lastSeenAt)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-[9px] font-black uppercase text-red-600 tracking-wider">Activa</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Link href={`/lost-pets/${alert.id}`} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[12px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
                  Ver alerta
                </Link>
                <Link href={`/lost-pets/${alert.id}#report-sighting`} className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-center text-[12px] font-semibold text-white hover:bg-red-700 transition-colors">
                  Reportar avistamiento
                </Link>
              </div>
            </div>
          ))}
          <Link href="/lost-pets/report" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 py-3 text-[12px] font-semibold text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors">
            + Nueva alerta
          </Link>
        </>
      )}
    </div>
  );
}

function TabDocumentos({ pet, vaccineCard, certificateLinks }: {
  pet: Pet;
  vaccineCard: PetVaccineCard | null;
  certificateLinks: PetVaccineCard["history"];
}) {
  const hasContent = pet.isPublic || vaccineCard || certificateLinks.length > 0;

  return (
    <div className="space-y-4">
      {/* Public profile */}
      <div>
        <SectionLabel>Perfil compartible</SectionLabel>
        <div className="mt-2 rounded-2xl border border-slate-100 bg-white px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-slate-800">
                {pet.isPublic ? "Perfil público activo" : "Perfil privado"}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {pet.isPublic
                  ? "Cualquier persona con el enlace puede ver la ficha."
                  : "Solo tú puedes ver este perfil."}
              </p>
            </div>
            {pet.isPublic && pet.shareUrl ? (
              <a href={pet.shareUrl} target="_blank" rel="noreferrer"
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-3 py-1.5 text-[11px] font-bold text-white hover:opacity-90 transition-opacity">
                <IcoShare /> Abrir
              </a>
            ) : (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-400">Privado</span>
            )}
          </div>
        </div>
      </div>

      {vaccineCard && (
        <div>
          <SectionLabel>Carnet de vacunación</SectionLabel>
          <div className="mt-2 space-y-2">
            <ActionRow href={vaccineCard.share.printableSheetUrl} label="Hoja imprimible" sublabel="Formato A4 — ideal para llevar al veterinario" external />
            <ActionRow href={vaccineCard.share.printableCardUrl}  label="Tarjeta de bolsillo" sublabel="Tamaño carné para collar o billetera" external />
          </div>
        </div>
      )}

      {certificateLinks.length > 0 && (
        <div>
          <SectionLabel>Certificados médicos</SectionLabel>
          <div className="mt-2 space-y-2">
            {certificateLinks.map((record) => (
              <ActionRow
                key={record.id}
                href={record.certificateUrl!}
                label={record.vaccineName}
                sublabel={`Aplicada ${formatDate(record.appliedAt)}`}
                external
              />
            ))}
          </div>
        </div>
      )}

      {!hasContent && (
        <WarmEmptyState
          emoji="📁"
          title="Sin documentos aún"
          body="Activa el perfil público o agrega vacunas para ver aquí los documentos compartibles."
          action={
            <Link href={`/pets/${pet.id}/vaccines`} className="rounded-full border border-slate-200 px-4 py-1.5 text-[12px] font-semibold text-slate-600">
              Ir al carnet
            </Link>
          }
        />
      )}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────── */
export default function PetDetailsPage() {
  const params = useParams<{ id: string }>();
  const petId = typeof params.id === "string" ? params.id : "";
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.tokens.accessToken;

  const [pet, setPet] = useState<Pet | null>(null);
  const [vaccineCard, setVaccineCard] = useState<PetVaccineCard | null>(null);
  const [identity, setIdentity] = useState<PetPublicIdentityManaged | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<LostPetAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("resumen");

  useEffect(() => {
    if (!accessToken || !petId) return;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [petData, vaccineData, identityData, alertData] = await Promise.all([
          getPet(accessToken, petId),
          getVaccineCard(accessToken, petId).catch(() => null),
          getPetPublicIdentity(accessToken, petId).catch(() => null),
          listLostPetAlerts(accessToken, { petId, activeOnly: true, limit: 5 }).catch(() => [])
        ]);
        setPet(petData);
        setVaccineCard(vaccineData);
        setIdentity(identityData);
        setActiveAlerts(alertData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo cargar la mascota.");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [accessToken, petId]);

  const certificateLinks = useMemo(
    () => vaccineCard?.history.filter((r) => r.certificateUrl).slice(0, 3) ?? [],
    [vaccineCard]
  );

  const handleVisibility = async () => {
    if (!accessToken || !pet) return;
    try {
      const updated = await updatePetVisibility(accessToken, pet.id, !pet.isPublic);
      setPet(updated);
      showToast({
        tone: "success",
        title: updated.isPublic ? "Perfil público activado" : "Perfil privado",
        description: updated.isPublic
          ? "Ahora puedes compartir la ficha de " + updated.name + "."
          : updated.name + " es ahora privado.",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar visibilidad.");
    }
  };

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: "resumen",    label: "Resumen"    },
    { id: "salud",      label: "Salud"      },
    { id: "identidad",  label: "Identidad"  },
    { id: "alertas",    label: "Alertas",  badge: activeAlerts.length || undefined },
    { id: "documentos", label: "Docs"       },
  ];

  return (
    <AuthGate>
      <div className="mx-auto max-w-2xl">
        {error && <InlineBanner tone="error">{error}</InlineBanner>}

        {isLoading ? (
          <div className="space-y-4 p-4">
            <SurfaceSkeleton blocks={3} />
            <SurfaceSkeleton blocks={5} />
          </div>
        ) : !pet ? (
          <div className="p-4">
            <EmptyState
              eyebrow="Mascota"
              title="No encontramos esta mascota"
              description="La ficha solicitada no existe, fue archivada o ya no pertenece a esta cuenta."
            />
          </div>
        ) : (
          <div>
            {/* ══ HERO HEADER ═══════════════════════════════════════ */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[hsl(164_32%_16%)] via-[hsl(164_30%_20%)] to-[hsl(164_26%_24%)] px-5 pb-8 pt-7">
              {/* Texture dots */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }}
              />
              {/* Decorative blur circles */}
              <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[hsl(22_92%_60%/0.08)] blur-2xl" />
              <div className="pointer-events-none absolute -bottom-8 left-0 h-32 w-32 rounded-full bg-white/5 blur-xl" />

              <div className="relative flex items-start gap-4">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="h-[88px] w-[88px] overflow-hidden rounded-[1.6rem] border-2 border-white/15 shadow-xl ring-1 ring-black/10">
                    {pet.primaryPhotoUrl ? (
                      <img src={pet.primaryPhotoUrl} alt={pet.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-white/10">
                        <span className="text-3xl">{speciesEmoji(pet.species)}</span>
                        <span className="text-[11px] font-bold text-white/60">{pet.name.slice(0, 1)}</span>
                      </div>
                    )}
                  </div>
                  {/* Alert badge */}
                  {activeAlerts.length > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-lg ring-2 ring-white/20">
                      {activeAlerts.length}
                    </span>
                  )}
                </div>

                {/* Identity block */}
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h1 className="font-display text-[26px] font-black leading-tight tracking-tight text-white">
                        {pet.name}
                      </h1>
                      <p className="mt-0.5 text-[12px] text-white/55">
                        {[pet.species, pet.breed || null, ageLabel(pet)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {/* Health badge */}
                    {(() => {
                      const tone = healthTone(vaccineCard);
                      const cfg = {
                        ok:    { bg: "bg-emerald-400/20 border-emerald-400/30", text: "text-emerald-300", dot: "bg-emerald-400", label: "Al día" },
                        warn:  { bg: "bg-amber-400/20 border-amber-400/30",     text: "text-amber-300",   dot: "bg-amber-400",   label: "Próxima" },
                        error: { bg: "bg-red-400/20 border-red-400/30",         text: "text-red-300",     dot: "bg-red-400",     label: "Vencida" },
                        none:  { bg: "bg-white/10 border-white/15",             text: "text-white/50",    dot: "bg-white/30",    label: "Sin carnet" },
                      }[tone];
                      return (
                        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </div>

                  {/* CTA buttons */}
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    <Link href={`/pets/${pet.id}/vaccines`}
                      className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-[12px] font-bold text-[hsl(164_30%_18%)] shadow-sm hover:bg-white/90 transition-colors">
                      <IcoSyringe /> Carnet
                    </Link>
                    <Link href={`/pets/${pet.id}/edit`}
                      className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-[12px] font-bold text-white backdrop-blur-sm hover:bg-white/20 transition-colors">
                      <IcoPen /> Editar
                    </Link>
                    <Link href="/lost-pets/report"
                      className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-[12px] font-bold text-white backdrop-blur-sm hover:bg-white/20 transition-colors">
                      <IcoAlert /> Alerta
                    </Link>
                    <button type="button" onClick={() => void handleVisibility()}
                      className="ml-auto flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 p-2 text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
                      title={pet.isPublic ? "Marcar privado" : "Activar perfil público"}>
                      <IcoShare />
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats strip */}
              <div className="relative mt-5 grid grid-cols-3 divide-x divide-white/10 overflow-hidden rounded-2xl bg-black/15 backdrop-blur-sm">
                {[
                  { n: vaccineCard?.summary.totalVaccines ?? 0, label: "Vacunas" },
                  { n: activeAlerts.length,                      label: "Alertas"  },
                  { n: pet.isPublic ? "Sí" : "No",              label: "Público"  },
                ].map(({ n, label }) => (
                  <div key={label} className="py-3.5 text-center">
                    <p className="text-[18px] font-black text-white leading-none">{n}</p>
                    <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/40">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ══ TABS ══════════════════════════════════════════════ */}
            <div className="sticky top-0 z-10 border-b border-slate-100 bg-white">
              <div className="flex overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {TABS.map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex shrink-0 items-center gap-1.5 px-5 py-3.5 text-[12px] font-semibold transition-colors ${
                        active ? "text-[hsl(var(--primary))]" : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {tab.label}
                      {tab.badge != null && tab.badge > 0 && (
                        <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
                          {tab.badge}
                        </span>
                      )}
                      {active && (
                        <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[hsl(var(--primary))]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ══ TAB CONTENT ═══════════════════════════════════════ */}
            <div className="px-4 py-5">
              {activeTab === "resumen"    && <TabResumen pet={pet} />}
              {activeTab === "salud"      && <TabSalud pet={pet} vaccineCard={vaccineCard} />}
              {activeTab === "identidad"  && <TabIdentidad pet={pet} identity={identity} />}
              {activeTab === "alertas"    && <TabAlertas pet={pet} activeAlerts={activeAlerts} />}
              {activeTab === "documentos" && <TabDocumentos pet={pet} vaccineCard={vaccineCard} certificateLinks={certificateLinks} />}
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  );
}

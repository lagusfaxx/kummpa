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

type HealthTone = "ok" | "warn" | "error" | "none";

function healthTone(card: PetVaccineCard | null): HealthTone {
  if (!card) return "none";
  if (card.summary.overallStatus === "OVERDUE") return "error";
  if (card.summary.overallStatus === "DUE_SOON") return "warn";
  return "ok";
}

function HealthBadge({ card }: { card: PetVaccineCard | null }) {
  const tone = healthTone(card);
  const cfg = {
    ok:    { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Vacunas al día" },
    warn:  { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500",   label: "Próxima vacuna" },
    error: { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500",     label: "Vacuna vencida" },
    none:  { bg: "bg-slate-100",  text: "text-slate-500",   dot: "bg-slate-400",   label: "Sin carnet" },
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

/* ─── Icons ───────────────────────────────────────────────────── */
function IcoPen() {
  return <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>;
}
function IcoVaccine() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M19 9l-7 7-4-4"/><rect x="3" y="3" width="18" height="18" rx="4"/></svg>;
}
function IcoQr() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3" rx="0.5"/><path d="M17 14h4M14 17v4M17 20h4M20 17v4"/></svg>;
}
function IcoAlert() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>;
}
function IcoDoc() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>;
}
function IcoChevronRight() {
  return <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-slate-300"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>;
}
function IcoShare() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>;
}

/* ─── Tab types ───────────────────────────────────────────────── */
type Tab = "resumen" | "salud" | "identidad" | "alertas" | "documentos";

const TABS: { id: Tab; label: string; icon: () => JSX.Element }[] = [
  { id: "resumen",    label: "Resumen",    icon: () => <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10z" clipRule="evenodd"/></svg> },
  { id: "salud",      label: "Salud",      icon: IcoVaccine },
  { id: "identidad",  label: "Identidad",  icon: IcoQr },
  { id: "alertas",    label: "Alertas",    icon: IcoAlert },
  { id: "documentos", label: "Docs",       icon: IcoDoc },
];

/* ─── Small reusable atoms ────────────────────────────────────── */
function DataRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-[12px] text-slate-400 font-medium">{label}</span>
      <span className="text-[13px] font-semibold text-slate-700 text-right max-w-[56%]">{value}</span>
    </div>
  );
}

function CompactEmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-slate-300">
          <circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/>
        </svg>
      </div>
      <p className="text-[13px] text-slate-400">{message}</p>
      {action}
    </div>
  );
}

function ActionRow({ href, label, sublabel, external }: { href: string; label: string; sublabel?: string; external?: boolean }) {
  const cls = "flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors";
  const content = (
    <>
      <div>
        <p className="text-[13px] font-semibold text-slate-800">{label}</p>
        {sublabel && <p className="mt-0.5 text-[11px] text-slate-400">{sublabel}</p>}
      </div>
      <IcoChevronRight />
    </>
  );
  if (external) return <a href={href} target="_blank" rel="noreferrer" className={cls}>{content}</a>;
  return <Link href={href} className={cls}>{content}</Link>;
}

/* ─── Tab panels ─────────────────────────────────────────────── */

function TabResumen({ pet }: { pet: Pet }) {
  const infoItems: [string, string | number | null | undefined][] = [
    ["Sexo", pet.sex],
    ["Tamaño", pet.size],
    ["Peso", pet.weightKg ? `${pet.weightKg} kg` : null],
    ["Color", pet.color],
    ["Microchip", pet.microchipNumber],
    ["Esterilizado", pet.isSterilized ? "Sí" : "No"],
    ["Veterinaria", pet.usualVetName],
    ["Emergencia", pet.emergencyContactPhone ?? pet.emergencyContactName],
  ];

  const visibleItems = infoItems.filter(([, v]) => v != null && v !== "");

  return (
    <div className="space-y-4">
      {visibleItems.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white px-4">
          {visibleItems.map(([label, value]) => (
            <DataRow key={label} label={label} value={value} />
          ))}
        </div>
      )}
      {(pet.healthStatus || pet.generalNotes) && (
        <div className="rounded-2xl bg-slate-50 px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Observaciones</p>
          <p className="text-[13px] leading-relaxed text-slate-600">{pet.healthStatus || pet.generalNotes}</p>
        </div>
      )}
      {pet.allergies && (
        <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500 mb-1">Alergias</p>
          <p className="text-[13px] text-amber-800">{pet.allergies}</p>
        </div>
      )}
      {pet.diseases && (
        <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-red-400 mb-1">Condiciones</p>
          <p className="text-[13px] text-red-700">{pet.diseases}</p>
        </div>
      )}
    </div>
  );
}

function TabSalud({ pet, vaccineCard }: { pet: Pet; vaccineCard: PetVaccineCard | null }) {
  const tone = healthTone(vaccineCard);
  const toneCfg = {
    ok:    { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
    warn:  { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-100" },
    error: { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-100" },
    none:  { bg: "bg-slate-50",   text: "text-slate-500",   border: "border-slate-100" },
  }[tone];

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 ${toneCfg.bg} ${toneCfg.border}`}>
        <div>
          <p className={`text-[13px] font-bold ${toneCfg.text}`}>
            {vaccineCard ? { ok: "Vacunas al día", warn: "Próxima vacuna pronto", error: "Vacuna vencida" }[tone as "ok"|"warn"|"error"] : "Sin carnet registrado"}
          </p>
          {vaccineCard?.upcoming[0] && (
            <p className={`mt-0.5 text-[11px] ${toneCfg.text} opacity-70`}>
              {vaccineCard.upcoming[0].vaccineName} · {formatDate(vaccineCard.upcoming[0].nextDoseAt)}
            </p>
          )}
        </div>
        <Link href={`/pets/${pet.id}/vaccines`} className="shrink-0 rounded-xl bg-white/60 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-white transition-colors">
          Ver carnet
        </Link>
      </div>

      {/* Metrics */}
      {vaccineCard && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { n: vaccineCard.summary.upToDateCount,  label: "Al día",    color: "text-emerald-600" },
            { n: vaccineCard.summary.dueSoonCount,   label: "Por vencer",color: "text-amber-600"   },
            { n: vaccineCard.summary.overdueCount,   label: "Vencidas",  color: "text-red-600"     },
          ].map(({ n, label, color }) => (
            <div key={label} className="rounded-2xl border border-slate-100 bg-white py-3 text-center">
              <p className={`text-xl font-bold ${color}`}>{n}</p>
              <p className="mt-0.5 text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Historial */}
      {vaccineCard && vaccineCard.history.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Historial reciente</p>
          <div className="space-y-2">
            {vaccineCard.history.slice(0, 4).map((record) => (
              <div key={record.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-slate-800">{record.vaccineName}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {formatDate(record.appliedAt)}
                    {record.providerName ? ` · ${record.providerName}` : ""}
                  </p>
                </div>
                {record.nextDoseAt && (
                  <span className="shrink-0 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    Próx. {formatDate(record.nextDoseAt)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <CompactEmptyState
          message="Aún no hay vacunas registradas"
          action={
            <Link href={`/pets/${pet.id}/vaccines`} className="rounded-full bg-[hsl(var(--primary))] px-4 py-1.5 text-[12px] font-semibold text-white">
              Registrar vacuna
            </Link>
          }
        />
      )}

      {/* Alergias / condiciones (compacto) */}
      {(pet.allergies || pet.diseases || pet.medications) && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Salud adicional</p>
          {pet.allergies && <div className="rounded-2xl bg-amber-50 px-4 py-3"><p className="text-[11px] font-bold text-amber-500 mb-1">Alergias</p><p className="text-[12px] text-amber-800">{pet.allergies}</p></div>}
          {pet.diseases && <div className="rounded-2xl bg-red-50 px-4 py-3"><p className="text-[11px] font-bold text-red-400 mb-1">Condiciones</p><p className="text-[12px] text-red-700">{pet.diseases}</p></div>}
          {pet.medications && <div className="rounded-2xl bg-blue-50 px-4 py-3"><p className="text-[11px] font-bold text-blue-400 mb-1">Medicación</p><p className="text-[12px] text-blue-700">{pet.medications}</p></div>}
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
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-slate-800">Estado de emergencia</p>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">{identity.identity.emergencyStatus}</span>
            </div>
          </div>
          <ActionRow href={identity.identity.urls.publicUrl} label="Ver perfil público" sublabel="URL compartible con cualquier persona" external />
          <ActionRow href={identity.identity.urls.qrImageUrl} label="Descargar QR" sublabel="Para collar, ficha o placa de emergencia" external />
          <ActionRow href={`/pets/${pet.id}/identity`} label="Gestionar identidad NFC/QR" sublabel="Configurar información de emergencia" />
        </>
      ) : (
        <>
          <CompactEmptyState
            message="Identidad digital no configurada"
            action={
              <Link href={`/pets/${pet.id}/identity`} className="rounded-full bg-[hsl(var(--primary))] px-4 py-1.5 text-[12px] font-semibold text-white">
                Configurar identidad
              </Link>
            }
          />
        </>
      )}
      <div className="rounded-2xl border border-slate-100 bg-white px-4">
        <DataRow label="Microchip" value={pet.microchipNumber ?? "No registrado"} />
        <DataRow label="Perfil público" value={pet.isPublic ? "Activo" : "Privado"} />
      </div>
    </div>
  );
}

function TabAlertas({ pet, activeAlerts }: { pet: Pet; activeAlerts: LostPetAlert[] }) {
  return (
    <div className="space-y-3">
      {activeAlerts.length === 0 ? (
        <CompactEmptyState
          message="No hay alertas activas"
          action={
            <Link href="/lost-pets/report" className="rounded-full bg-[hsl(var(--primary))] px-4 py-1.5 text-[12px] font-semibold text-white">
              Crear alerta
            </Link>
          }
        />
      ) : (
        activeAlerts.map((alert) => (
          <div key={alert.id} className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-bold text-red-800">{alert.lastSeenAddress || "Última ubicación registrada"}</p>
                <p className="mt-0.5 text-[11px] text-red-600">Reportada {formatDate(alert.lastSeenAt)}</p>
              </div>
              <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-black uppercase text-white tracking-wider">Activa</span>
            </div>
            <div className="mt-3 flex gap-2">
              <Link href={`/lost-pets/${alert.id}`} className="flex-1 rounded-xl border border-red-200 bg-white px-3 py-2 text-center text-[12px] font-semibold text-red-700">
                Ver alerta
              </Link>
              <Link href={`/lost-pets/${alert.id}#report-sighting`} className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-center text-[12px] font-semibold text-white">
                Avistamiento
              </Link>
            </div>
          </div>
        ))
      )}
      {activeAlerts.length > 0 && (
        <Link href="/lost-pets/report" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 py-3 text-[12px] font-semibold text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors">
          + Nueva alerta
        </Link>
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
    <div className="space-y-3">
      {/* Perfil público */}
      <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-slate-800">Perfil compartible</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{pet.isPublic ? "Activo y listo para compartir" : "Actualmente privado"}</p>
          </div>
          {pet.isPublic && pet.shareUrl ? (
            <a href={pet.shareUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-xl bg-[hsl(var(--primary))] px-3 py-1.5 text-[11px] font-bold text-white">
              <IcoShare /> Abrir
            </a>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-400">Privado</span>
          )}
        </div>
      </div>

      {/* Carnet imprimible */}
      {vaccineCard && (
        <>
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Carnet de vacunación</p>
          <ActionRow href={vaccineCard.share.printableSheetUrl} label="Hoja imprimible" sublabel="Formato A4 para veterinaria" external />
          <ActionRow href={vaccineCard.share.printableCardUrl} label="Tarjeta de vacunación" sublabel="Formato bolsillo" external />
        </>
      )}

      {/* Certificados */}
      {certificateLinks.length > 0 && (
        <>
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Documentos médicos</p>
          {certificateLinks.map((record) => (
            <ActionRow
              key={record.id}
              href={record.certificateUrl!}
              label={record.vaccineName}
              sublabel={formatDate(record.appliedAt)}
              external
            />
          ))}
        </>
      )}

      {!hasContent && (
        <CompactEmptyState message="No hay documentos disponibles aún" />
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
        description: updated.isPublic ? "Ahora puedes compartir la ficha." : "La mascota es ahora privada."
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar visibilidad.");
    }
  };

  return (
    <AuthGate>
      <div className="mx-auto max-w-xl">
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
            {/* ── Hero header ──────────────────────────────────────── */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(164_38%_24%)] px-5 pb-6 pt-6">
              {/* Background texture */}
              <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 70% 30%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

              <div className="relative flex items-start gap-4">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="h-20 w-20 overflow-hidden rounded-[1.4rem] border-2 border-white/20 shadow-lg">
                    {pet.primaryPhotoUrl ? (
                      <img src={pet.primaryPhotoUrl} alt={pet.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-white/15 text-2xl font-bold text-white">
                        {pet.name.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  {activeAlerts.length > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white shadow">
                      {activeAlerts.length}
                    </span>
                  )}
                </div>

                {/* Identity */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h1 className="font-display text-2xl font-bold leading-tight text-white">{pet.name}</h1>
                      <p className="mt-0.5 text-[12px] text-white/70">
                        {[pet.species, pet.breed || null, ageLabel(pet)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <HealthBadge card={vaccineCard} />
                  </div>

                  {/* Primary actions */}
                  <div className="mt-3.5 flex gap-2">
                    <Link
                      href={`/pets/${pet.id}/vaccines`}
                      className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-[12px] font-bold text-[hsl(var(--primary))] shadow-sm"
                    >
                      <IcoVaccine /> Carnet
                    </Link>
                    <Link
                      href={`/pets/${pet.id}/edit`}
                      className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-[12px] font-bold text-white backdrop-blur-sm border border-white/20"
                    >
                      <IcoPen /> Editar
                    </Link>
                    <Link
                      href="/lost-pets/report"
                      className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-[12px] font-bold text-white backdrop-blur-sm border border-white/20"
                    >
                      <IcoAlert /> Alerta
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleVisibility()}
                      className="ml-auto flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-[12px] font-bold text-white backdrop-blur-sm border border-white/20"
                      title={pet.isPublic ? "Marcar privado" : "Activar perfil público"}
                    >
                      <IcoShare />
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="relative mt-5 grid grid-cols-3 divide-x divide-white/10 rounded-2xl bg-white/10 backdrop-blur-sm">
                {[
                  { n: vaccineCard?.summary.totalVaccines ?? 0, label: "Vacunas" },
                  { n: activeAlerts.length, label: "Alertas" },
                  { n: pet.isPublic ? "Sí" : "No", label: "Público" },
                ].map(({ n, label }) => (
                  <div key={label} className="py-3 text-center">
                    <p className="text-lg font-bold text-white">{n}</p>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-white/60">{label}</p>
                  </div>
                ))}
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

            {/* ── Tab content ───────────────────────────────────── */}
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

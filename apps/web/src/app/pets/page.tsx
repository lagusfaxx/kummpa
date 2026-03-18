"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { useAuth } from "@/features/auth/auth-context";
import { deletePet, listPets, updatePetVisibility } from "@/features/pets/pets-api";
import type { Pet } from "@/features/pets/types";
import { useToast } from "@/features/ui/toast-context";
import { getVaccineCard } from "@/features/vaccines/vaccines-api";
import type { PetVaccineCard } from "@/features/vaccines/types";

/* ─── types ────────────────────────────────────────────────────── */
interface PetCardState {
  pet: Pet;
  vaccineCard: PetVaccineCard | null;
}

/* ─── helpers ───────────────────────────────────────────────────── */
function cls(...args: (string | false | undefined | null)[]) {
  return args.filter(Boolean).join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

type VacStatus = "ok" | "soon" | "overdue" | "none";

function vaccineStatus(card: PetVaccineCard | null): VacStatus {
  if (!card) return "none";
  if (card.summary.overallStatus === "OVERDUE") return "overdue";
  if (card.summary.overallStatus === "DUE_SOON") return "soon";
  return "ok";
}

const STATUS_CONF: Record<VacStatus, { label: string; dot: string; badge: string }> = {
  ok:      { label: "Al día",     dot: "bg-emerald-400",  badge: "bg-emerald-100 text-emerald-800" },
  soon:    { label: "Pendiente",  dot: "bg-amber-400",    badge: "bg-amber-100 text-amber-800" },
  overdue: { label: "Urgente",    dot: "bg-red-400",      badge: "bg-red-100 text-red-800" },
  none:    { label: "Sin carnet", dot: "bg-slate-300",    badge: "bg-slate-100 text-slate-500" },
};

const SPECIES_CONF: Record<string, { emoji: string; gradient: string }> = {
  Perro: { emoji: "🐕", gradient: "from-[hsl(155_48%_28%)] to-[hsl(155_48%_16%)]" },
  Gato:  { emoji: "🐈", gradient: "from-[hsl(250_40%_35%)] to-[hsl(250_40%_20%)]" },
};
function speciesConf(species: string) {
  return SPECIES_CONF[species] ?? { emoji: "🐾", gradient: "from-[hsl(22_70%_38%)] to-[hsl(22_70%_22%)]" };
}

/* ─── skeleton ──────────────────────────────────────────────────── */
function PetCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white/70">
      <div className="h-44 animate-pulse bg-[hsl(var(--muted))]" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
        <div className="h-3 w-1/2 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
        <div className="h-10 animate-pulse rounded-2xl bg-[hsl(var(--muted))]" />
        <div className="flex gap-2">
          <div className="h-9 flex-1 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
          <div className="h-9 flex-1 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
        </div>
      </div>
    </div>
  );
}

/* ─── pet card ──────────────────────────────────────────────────── */
function PetCard({
  item,
  workingId,
  onCopyProfile,
  onToggleVisibility,
  onArchive,
}: {
  item: PetCardState;
  workingId: string | null;
  onCopyProfile: (pet: Pet) => void;
  onToggleVisibility: (pet: Pet) => void;
  onArchive: (pet: Pet) => void;
}) {
  const { pet, vaccineCard } = item;
  const status = vaccineStatus(vaccineCard);
  const conf = STATUS_CONF[status];
  const sp = speciesConf(pet.species);

  const lastVaccine = vaccineCard?.history[0]?.appliedAt
    ? `Última vacuna ${formatDate(vaccineCard.history[0].appliedAt)}`
    : null;
  const nextDose = vaccineCard?.upcoming[0]?.nextDoseAt
    ? `Próxima dosis ${formatDate(vaccineCard.upcoming[0].nextDoseAt)}`
    : null;

  const metaParts = [
    pet.species,
    pet.breed && pet.breed !== "Mestizo" ? pet.breed : (pet.breed || null),
    pet.ageYears ? `${pet.ageYears} año${pet.ageYears !== 1 ? "s" : ""}` : null,
  ].filter(Boolean);

  return (
    <article className="group overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white/80 shadow-sm transition-shadow hover:shadow-md">

      {/* ── photo / fallback header ── */}
      <div className="relative h-44 overflow-hidden">
        {pet.primaryPhotoUrl ? (
          <>
            <img
              src={pet.primaryPhotoUrl}
              alt={pet.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          </>
        ) : (
          <div className={cls("flex h-full w-full items-center justify-center bg-gradient-to-br", sp.gradient)}>
            <div className="text-center">
              <div className="text-6xl leading-none">{sp.emoji}</div>
              <div className="mt-2 text-3xl font-black text-white/40 tracking-widest">
                {pet.name.slice(0, 1).toUpperCase()}
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </div>
        )}

        {/* status badge — top right */}
        <span className={cls(
          "absolute right-3 top-3 flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold shadow-sm backdrop-blur-sm",
          conf.badge
        )}>
          <span className={cls("h-1.5 w-1.5 rounded-full", conf.dot)} />
          {conf.label}
        </span>

        {/* public badge — top left */}
        {pet.isPublic && (
          <span className="absolute left-3 top-3 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
            Público
          </span>
        )}

        {/* name + meta overlay */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h2 className="text-2xl font-black leading-none text-white drop-shadow">
            {pet.name}
          </h2>
          {metaParts.length > 0 && (
            <p className="mt-1 text-xs font-medium text-white/75 drop-shadow">
              {metaParts.join(" · ")}
            </p>
          )}
        </div>
      </div>

      {/* ── body ── */}
      <div className="space-y-4 p-5">

        {/* health snapshot */}
        <div className={cls(
          "flex items-center gap-3 rounded-2xl px-4 py-3",
          status === "ok"      && "bg-emerald-50 border border-emerald-100",
          status === "soon"    && "bg-amber-50 border border-amber-100",
          status === "overdue" && "bg-red-50 border border-red-100",
          status === "none"    && "bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))]",
        )}>
          <span className={cls("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base",
            status === "ok"      && "bg-emerald-100",
            status === "soon"    && "bg-amber-100",
            status === "overdue" && "bg-red-100",
            status === "none"    && "bg-[hsl(var(--muted))]",
          )}>
            {status === "ok" && "✅"}
            {status === "soon" && "⏰"}
            {status === "overdue" && "🚨"}
            {status === "none" && "📋"}
          </span>
          <div className="min-w-0 flex-1">
            <p className={cls("text-sm font-bold",
              status === "ok"      && "text-emerald-800",
              status === "soon"    && "text-amber-800",
              status === "overdue" && "text-red-800",
              status === "none"    && "text-[hsl(var(--muted-foreground))]",
            )}>
              {status === "ok"      && "Vacunas al día"}
              {status === "soon"    && "Vacuna próxima"}
              {status === "overdue" && "Vacuna vencida — revisar"}
              {status === "none"    && "Sin carnet digital aún"}
            </p>
            <p className="mt-0.5 truncate text-xs text-[hsl(var(--muted-foreground))]">
              {nextDose ?? lastVaccine ?? "Sin dosis registradas por ahora"}
            </p>
          </div>
        </div>

        {/* primary actions */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/pets/${pet.id}/vaccines`}
            className="flex items-center justify-center gap-1.5 rounded-full bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90"
          >
            💉 Ver carnet
          </Link>
          <Link
            href={`/pets/${pet.id}`}
            className="flex items-center justify-center gap-1.5 rounded-full border-2 border-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary))] transition hover:bg-[hsl(var(--primary)/0.06)]"
          >
            Ver perfil ›
          </Link>
        </div>

        {/* secondary actions */}
        <div className="flex items-center justify-center gap-0 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] divide-x divide-[hsl(var(--border))] overflow-hidden">
          {[
            { label: "Editar", href: `/pets/${pet.id}/edit` },
            { label: "Compartir", onClick: () => onCopyProfile(pet) },
            { label: "QR / ID", href: `/pets/${pet.id}/identity` },
            { label: "Historial", href: `/pets/${pet.id}/vaccines` },
          ].map((action) =>
            action.href ? (
              <Link
                key={action.label}
                href={action.href}
                className="flex-1 py-2 text-center text-[11px] font-semibold text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
              >
                {action.label}
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="flex-1 py-2 text-center text-[11px] font-semibold text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
              >
                {action.label}
              </button>
            )
          )}
        </div>

        {/* tertiary actions */}
        <div className="flex items-center justify-between border-t border-[hsl(var(--border)/0.5)] pt-3">
          <button
            type="button"
            disabled={workingId === `visibility-${pet.id}`}
            onClick={() => onToggleVisibility(pet)}
            className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] underline-offset-2 transition hover:text-[hsl(var(--foreground))] hover:underline disabled:opacity-40"
          >
            {pet.isPublic ? "Marcar privado" : "Hacer público"}
          </button>
          <button
            type="button"
            disabled={workingId === `delete-${pet.id}`}
            onClick={() => onArchive(pet)}
            className="text-[11px] font-medium text-red-400 underline-offset-2 transition hover:text-red-600 hover:underline disabled:opacity-40"
          >
            Archivar
          </button>
        </div>
      </div>
    </article>
  );
}

/* ─── empty state ───────────────────────────────────────────────── */
function EmptyPets() {
  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-3xl bg-[hsl(155_48%_42%/0.1)] text-5xl">
        🐾
      </div>
      <h2 className="text-xl font-black tracking-tight text-[hsl(var(--foreground))]">
        Tu primera mascota
      </h2>
      <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
        Agrégala y desbloquea el carnet digital, vacunas y recordatorios, alertas de pérdida, identidad compartible y reservas asociadas.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
        {["💉 Carnet digital", "🗺 Alerta de pérdida", "🆔 Identidad NFC", "📋 Historial médico"].map((f) => (
          <span key={f} className="rounded-full bg-[hsl(var(--muted))] px-3 py-1">{f}</span>
        ))}
      </div>
      <Link
        href="/pets/new"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--secondary))] px-8 py-3.5 text-sm font-bold text-white shadow-md transition hover:opacity-90"
      >
        Agregar mi primera mascota
      </Link>
    </div>
  );
}

/* ─── page ──────────────────────────────────────────────────────── */
export default function PetsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.tokens.accessToken;

  const [pets, setPets] = useState<PetCardState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const rows = await listPets(accessToken);
        const enriched = await Promise.all(
          rows.map(async (pet) => {
            try {
              const vaccineCard = await getVaccineCard(accessToken, pet.id);
              return { pet, vaccineCard };
            } catch {
              return { pet, vaccineCard: null };
            }
          })
        );
        setPets(enriched);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar tus mascotas.");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [accessToken]);

  const totals = useMemo(() => ({
    total:    pets.length,
    overdue:  pets.filter((i) => i.vaccineCard?.summary.overallStatus === "OVERDUE").length,
    dueSoon:  pets.filter((i) => i.vaccineCard?.summary.overallStatus === "DUE_SOON").length,
    public_:  pets.filter((i) => i.pet.isPublic).length,
  }), [pets]);

  const handleCopyProfile = async (pet: Pet) => {
    try {
      await navigator.clipboard.writeText(pet.shareUrl);
      showToast({ tone: "success", title: "Link copiado", description: "El perfil público quedó listo para compartir." });
    } catch {
      setError("No se pudo copiar el perfil público.");
    }
  };

  const handleToggleVisibility = async (pet: Pet) => {
    if (!accessToken) return;
    try {
      setWorkingId(`visibility-${pet.id}`);
      const updated = await updatePetVisibility(accessToken, pet.id, !pet.isPublic);
      setPets((cur) => cur.map((i) => i.pet.id === pet.id ? { ...i, pet: updated } : i));
      showToast({
        tone: "success",
        title: updated.isPublic ? "Perfil público activado" : "Perfil privado activado",
        description: updated.isPublic ? "Ahora puedes compartir la identidad de tu mascota." : "La mascota dejó de mostrarse de forma pública.",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar visibilidad.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleArchive = async (pet: Pet) => {
    if (!accessToken) return;
    if (!window.confirm(`¿Archivar a ${pet.name}?`)) return;
    try {
      setWorkingId(`delete-${pet.id}`);
      await deletePet(accessToken, pet.id);
      setPets((cur) => cur.filter((i) => i.pet.id !== pet.id));
      showToast({ tone: "success", title: "Mascota archivada", description: "Puedes volver a crearla más adelante." });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo archivar la mascota.");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <AuthGate>
      <div className="space-y-8 pb-16">

        {/* ── header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
              Mis mascotas
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[hsl(var(--foreground))]">
              {isLoading
                ? "Cargando…"
                : pets.length === 0
                ? "Agrega tu primera mascota"
                : pets.length === 1
                ? `${pets[0]!.pet.name} y tú`
                : `${pets.length} mascotas`}
            </h1>
            {!isLoading && pets.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  { val: totals.total,   label: "total",     color: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]" },
                  { val: totals.overdue, label: "urgentes",  color: totals.overdue > 0 ? "bg-red-100 text-red-700" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]" },
                  { val: totals.dueSoon, label: "pendientes",color: totals.dueSoon > 0 ? "bg-amber-100 text-amber-700" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]" },
                  { val: totals.public_, label: "públicas",  color: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]" },
                ].map(({ val, label, color }) => (
                  <span key={label} className={cls("rounded-full px-3 py-1 text-xs font-semibold", color)}>
                    {val} {label}
                  </span>
                ))}
              </div>
            )}
          </div>
          {!isLoading && (
            <Link
              href="/pets/new"
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-[hsl(var(--secondary))] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 sm:self-auto"
            >
              + Agregar mascota
            </Link>
          )}
        </div>

        {error && <InlineBanner tone="error">{error}</InlineBanner>}

        {/* ── content ── */}
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <PetCardSkeleton />
            <PetCardSkeleton />
            <PetCardSkeleton />
          </div>
        ) : pets.length === 0 ? (
          <EmptyPets />
        ) : (
          <div className={cls(
            "grid gap-5",
            pets.length === 1 ? "max-w-sm" : "sm:grid-cols-2 lg:grid-cols-3"
          )}>
            {pets.map((item) => (
              <PetCard
                key={item.pet.id}
                item={item}
                workingId={workingId}
                onCopyProfile={handleCopyProfile}
                onToggleVisibility={handleToggleVisibility}
                onArchive={handleArchive}
              />
            ))}
          </div>
        )}

      </div>
    </AuthGate>
  );
}

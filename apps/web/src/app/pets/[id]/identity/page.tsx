"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/features/auth/auth-context";
import { getPetPublicIdentity } from "@/features/pets/pets-api";
import type { PetPublicIdentityManaged } from "@/features/pets/types";

/* ─── Helpers ────────────────────────────────────────────────── */
function ageLabel(years?: number | null) {
  if (years == null) return null;
  if (years < 1) return "Cachorro";
  if (years === 1) return "1 año";
  return `${years} años`;
}

function speciesEmoji(species: string) {
  const s = species.toLowerCase();
  if (s.includes("perro") || s.includes("dog")) return "🐕";
  if (s.includes("gato") || s.includes("cat")) return "🐈";
  if (s.includes("conejo")) return "🐇";
  if (s.includes("pájaro") || s.includes("ave")) return "🦜";
  return "🐾";
}

function zeroPad(n: number) {
  return String(n).padStart(4, "0");
}

/* ─── DNI card ───────────────────────────────────────────────── */
function DniCard({ data, cardRef }: { data: PetPublicIdentityManaged; ref?: React.Ref<HTMLDivElement>; cardRef?: React.RefObject<HTMLDivElement> }) {
  const { pet, owner, identity } = data;
  const shortId = zeroPad(parseInt(identity.id.replace(/\D/g, "").slice(-4) || "1", 10));
  const age = ageLabel(pet.ageYears);

  return (
    <div
      ref={cardRef}
      className="overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5"
      style={{ fontFamily: "system-ui, sans-serif" }}
    >
      {/* ── Header strip ─────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[hsl(164_32%_16%)] via-[hsl(164_28%_22%)] to-[hsl(164_24%_26%)] px-5 py-4">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5 blur-xl" />
        <div className="relative flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(22_92%_60%)] text-sm font-black text-white">K</div>
            <span className="text-[13px] font-black tracking-widest text-white">KUMMPA</span>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">Identificación</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">de Mascota</p>
          </div>
        </div>
      </div>

      {/* ── Main body ─────────────────────────────────────────── */}
      <div className="flex gap-0">
        {/* Photo column */}
        <div className="w-[140px] shrink-0 bg-slate-50 p-4">
          <div className="aspect-square w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-inner">
            {pet.primaryPhotoUrl ? (
              <img src={pet.primaryPhotoUrl} alt={pet.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-slate-100">
                <span className="text-4xl">{speciesEmoji(pet.species)}</span>
                <span className="text-[11px] font-bold text-slate-300">{pet.name.slice(0, 1)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Data column */}
        <div className="flex-1 px-5 py-4">
          {/* Name */}
          <h2 className="text-[22px] font-black leading-none tracking-tight text-slate-900">
            {pet.name}
          </h2>

          {/* Species + breed */}
          <p className="mt-1 text-[12px] font-semibold text-slate-500">
            {pet.species} · {pet.breed}
          </p>

          <div className="my-3 h-px bg-slate-100" />

          {/* Data rows */}
          <div className="space-y-2">
            {age && (
              <div className="flex items-center gap-2">
                <span className="w-16 text-[10px] font-bold uppercase tracking-wider text-slate-300">Edad</span>
                <span className="text-[12px] font-semibold text-slate-700">{age}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="w-16 text-[10px] font-bold uppercase tracking-wider text-slate-300">Tutor</span>
              <span className="text-[12px] font-semibold text-slate-700">{owner.fullName}</span>
            </div>
            {owner.city && (
              <div className="flex items-center gap-2">
                <span className="w-16 text-[10px] font-bold uppercase tracking-wider text-slate-300">Ciudad</span>
                <span className="text-[12px] font-semibold text-slate-700">{owner.city}</span>
              </div>
            )}
            {pet.microchipNumber && (
              <div className="flex items-center gap-2">
                <span className="w-16 text-[10px] font-bold uppercase tracking-wider text-slate-300">Chip</span>
                <span className="font-mono text-[11px] font-semibold text-slate-600">{pet.microchipNumber}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer strip ──────────────────────────────────────── */}
      <div className="flex items-center gap-4 border-t border-slate-100 bg-slate-50 px-5 py-4">
        {/* QR */}
        <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <img
            src={identity.urls.qrImageUrl}
            alt={`QR ${pet.name}`}
            className="h-16 w-16 rounded-lg object-cover"
          />
        </div>

        {/* Scan hint + ID */}
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">Escanea para ver perfil</p>
          <p className="mt-0.5 truncate font-mono text-[10px] text-slate-400">{identity.urls.publicUrl}</p>
          <div className="mt-2 flex items-center gap-1.5">
            <div className="h-1 w-4 rounded-full bg-[hsl(22_92%_60%)]" />
            <span className="font-mono text-[9px] font-bold text-slate-300">KMP-{shortId}</span>
          </div>
        </div>

        {/* Corner brand watermark */}
        <div className="shrink-0 text-right">
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-200">kummpa.cl</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Action button ──────────────────────────────────────────── */
function ActionBtn({
  icon,
  label,
  sublabel,
  onClick,
  href,
  download,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick?: () => void;
  href?: string;
  download?: string;
  accent?: boolean;
}) {
  const cls = `flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors w-full ${
    accent
      ? "border-[hsl(var(--primary)/0.2)] bg-[hsl(var(--primary)/0.05)] hover:bg-[hsl(var(--primary)/0.10)]"
      : "border-slate-100 bg-white hover:bg-slate-50"
  }`;

  const content = (
    <>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accent ? "bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]" : "bg-slate-100 text-slate-500"}`}>
        {icon}
      </div>
      <div>
        <p className={`text-[13px] font-semibold ${accent ? "text-[hsl(var(--primary))]" : "text-slate-800"}`}>{label}</p>
        {sublabel && <p className="mt-0.5 text-[11px] text-slate-400">{sublabel}</p>}
      </div>
    </>
  );

  if (href) {
    return (
      <a href={href} download={download} target={download ? undefined : "_blank"} rel="noreferrer" className={cls}>
        {content}
      </a>
    );
  }
  return <button type="button" onClick={onClick} className={cls}>{content}</button>;
}

/* ─── Icons ──────────────────────────────────────────────────── */
const IcoPrint   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;
const IcoDownload= () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IcoLink    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
const IcoEye     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;

/* ─── Page ────────────────────────────────────────────────────── */
export default function PetIdentityPage() {
  const params = useParams<{ id: string }>();
  const petId = typeof params.id === "string" ? params.id : "";
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;

  const [data, setData] = useState<PetPublicIdentityManaged | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!accessToken || !petId) return;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const payload = await getPetPublicIdentity(accessToken, petId);
        setData(payload);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo cargar el DNI digital.");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [accessToken, petId]);

  const copyLink = async () => {
    if (!data?.identity.urls.publicUrl) return;
    await navigator.clipboard.writeText(data.identity.urls.publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <AuthGate>
      <div className="mx-auto max-w-lg">

        {/* ── Top bar ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <Link
            href={`/pets/${petId}`}
            className="flex items-center gap-1 text-[12px] font-semibold text-slate-400 hover:text-slate-700 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
            {data?.pet.name ?? "Volver"}
          </Link>
          <span className="text-[12px] font-bold text-slate-400">DNI Digital</span>
        </div>

        {isLoading ? (
          <div className="space-y-4 p-4">
            <div className="h-[280px] w-full animate-pulse rounded-3xl bg-slate-100" />
            <div className="h-14 w-full animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-14 w-full animate-pulse rounded-2xl bg-slate-100" />
          </div>
        ) : error || !data ? (
          <div className="p-4">
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-slate-200 py-16 text-center">
              <span className="text-4xl">🪪</span>
              <div>
                <p className="font-semibold text-slate-700">DNI no disponible</p>
                <p className="mt-1 text-[12px] text-slate-400">{error ?? "No se pudo generar la identificación."}</p>
              </div>
              <Link href={`/pets/${petId}`} className="rounded-xl border border-slate-200 px-4 py-2 text-[12px] font-semibold text-slate-600">
                Volver a la ficha
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5 px-4 py-5">

            {/* ── DNI Card ────────────────────────────────────── */}
            <DniCard data={data} />

            {/* ── Hint ────────────────────────────────────────── */}
            <p className="px-1 text-center text-[11px] text-slate-400">
              Comparte, imprime o descarga el DNI y el código QR de {data.pet.name}.
            </p>

            {/* ── Actions ─────────────────────────────────────── */}
            <div className="space-y-2">
              <ActionBtn
                icon={<IcoPrint />}
                label="Imprimir DNI"
                sublabel="Abre el diálogo de impresión del navegador"
                onClick={() => window.print()}
              />
              <ActionBtn
                icon={<IcoDownload />}
                label="Descargar código QR"
                sublabel="Imagen PNG lista para usar en collar o placa"
                href={data.identity.urls.qrImageUrl}
                download={`qr-${data.pet.name}.png`}
              />
              <ActionBtn
                icon={<IcoLink />}
                label={copied ? "¡Enlace copiado!" : "Copiar enlace público"}
                sublabel="Cualquier persona con este enlace puede ver el perfil"
                onClick={() => void copyLink()}
                accent
              />
              <ActionBtn
                icon={<IcoEye />}
                label="Ver perfil público"
                sublabel="Lo que ve alguien al escanear el QR"
                href={data.identity.urls.publicUrl}
              />
            </div>

            {/* ── Configure link ──────────────────────────────── */}
            <div className="rounded-2xl border border-dashed border-slate-100 px-4 py-3 text-center">
              <p className="text-[11px] text-slate-400">
                ¿Quieres ajustar la información de emergencia que aparece al escanear el QR?{" "}
                <Link href={`/pets/${petId}/edit`} className="font-semibold text-[hsl(var(--primary))]">
                  Editar ficha
                </Link>
              </p>
            </div>

          </div>
        )}
      </div>
    </AuthGate>
  );
}

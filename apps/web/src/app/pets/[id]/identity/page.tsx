"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/features/auth/auth-context";
import {
  getPetPublicIdentity,
  updatePetPublicIdentity
} from "@/features/pets/pets-api";
import type { PetEmergencyStatus, PetPublicIdentityManaged, PetPublicIdentityWritePayload } from "@/features/pets/types";

/* ─── Emergency status config ────────────────────────────────── */
const emergencyStatuses: Array<{
  value: PetEmergencyStatus;
  label: string;
  sublabel: string;
  emoji: string;
  badge: string;
  activeBorder: string;
  activeBg: string;
}> = [
  {
    value: "NORMAL",
    label: "Todo bien",
    sublabel: "Sin indicaciones especiales",
    emoji: "✅",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    activeBorder: "border-emerald-400",
    activeBg: "bg-emerald-50",
  },
  {
    value: "LOST",
    label: "Perdido/a",
    sublabel: "Reportar si me ven",
    emoji: "🚨",
    badge: "bg-red-50 text-red-700 border-red-200",
    activeBorder: "border-red-400",
    activeBg: "bg-red-50",
  },
  {
    value: "IN_TREATMENT",
    label: "En tratamiento",
    sublabel: "Requiere medicación",
    emoji: "💊",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    activeBorder: "border-amber-400",
    activeBg: "bg-amber-50",
  },
  {
    value: "FOUND",
    label: "Encontrado/a",
    sublabel: "Buscando a su tutor",
    emoji: "🏠",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    activeBorder: "border-blue-400",
    activeBg: "bg-blue-50",
  },
];

function getStatusCfg(value: PetEmergencyStatus) {
  return emergencyStatuses.find((s) => s.value === value) ?? emergencyStatuses[0]!;
}

/* ─── Toggle atom ────────────────────────────────────────────── */
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between py-2.5 text-left"
    >
      <span className={`text-[13px] font-medium ${checked ? "text-slate-800" : "text-slate-400"}`}>
        {label}
      </span>
      <div className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-[hsl(var(--primary))]" : "bg-slate-200"}`}>
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
    </button>
  );
}

/* ─── Input atom ─────────────────────────────────────────────── */
const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-300 focus:border-[hsl(var(--primary))] focus:bg-white focus:outline-none transition-colors";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10px] text-slate-400">{hint}</span>}
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-3">{children}</p>;
}

/* ─── Public preview card ────────────────────────────────────── */
function PublicPreviewCard({
  pet,
  form,
  status,
}: {
  pet: PetPublicIdentityManaged["pet"];
  form: PetPublicIdentityWritePayload;
  status: (typeof emergencyStatuses)[0];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Preview header */}
      <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 flex items-center gap-2">
        <div className="flex gap-1">
          <div className="h-2 w-2 rounded-full bg-red-300" />
          <div className="h-2 w-2 rounded-full bg-amber-300" />
          <div className="h-2 w-2 rounded-full bg-emerald-300" />
        </div>
        <span className="text-[10px] text-slate-300 truncate">kummpa.cl/p/{pet.name.toLowerCase()}</span>
      </div>

      {/* Preview content */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-100">
            {pet.primaryPhotoUrl ? (
              <img src={pet.primaryPhotoUrl} alt={pet.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xl">🐾</div>
            )}
          </div>
          <div>
            <p className="font-bold text-[15px] text-slate-900">{pet.name}</p>
            <p className="text-[11px] text-slate-400">{[pet.species, pet.breed].filter(Boolean).join(" · ")}</p>
          </div>
          <span className={`ml-auto shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${status.badge}`}>
            {status.emoji} {status.label}
          </span>
        </div>

        {/* Visible fields preview */}
        <div className="space-y-1.5 text-[12px]">
          {form.showOwnerName && (
            <div className="flex items-center gap-2 text-slate-600">
              <span className="text-[10px]">👤</span> Tutor visible
            </div>
          )}
          {form.showOwnerPhone && (
            <div className="flex items-center gap-2 text-slate-600">
              <span className="text-[10px]">📞</span> Teléfono visible
            </div>
          )}
          {form.showAllergies && (
            <div className="flex items-center gap-2 text-amber-700">
              <span className="text-[10px]">⚠️</span> Alergias visibles
            </div>
          )}
          {form.showMedications && (
            <div className="flex items-center gap-2 text-blue-600">
              <span className="text-[10px]">💊</span> Medicación visible
            </div>
          )}
          {form.showEmergencyInstructions && form.emergencyInstructions && (
            <div className="flex items-start gap-2 text-slate-600">
              <span className="text-[10px] mt-0.5">📋</span>
              <p className="line-clamp-2">{form.emergencyInstructions}</p>
            </div>
          )}
        </div>

        {!form.showOwnerName && !form.showOwnerPhone && !form.showAllergies && !form.showMedications && (
          <p className="text-[11px] text-slate-300 italic">Sin información adicional visible</p>
        )}
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────── */
export default function PetIdentityPage() {
  const params = useParams<{ id: string }>();
  const petId = typeof params.id === "string" ? params.id : "";
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;

  const [data, setData] = useState<PetPublicIdentityManaged | null>(null);
  const [form, setForm] = useState<PetPublicIdentityWritePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadIdentity = async () => {
    if (!accessToken || !petId) return;
    setIsLoading(true);
    setError(null);
    try {
      const payload = await getPetPublicIdentity(accessToken, petId);
      setData(payload);
      setForm({
        emergencyStatus: payload.identity.emergencyStatus,
        secondaryContactName: payload.identity.secondaryContactName ?? "",
        secondaryContactPhone: payload.identity.secondaryContactPhone ?? "",
        cityZone: payload.identity.cityZone ?? "",
        emergencyInstructions: payload.identity.emergencyInstructions ?? "",
        nfcCode: payload.identity.nfcCode ?? "",
        showOwnerName: payload.identity.visibility.showOwnerName,
        showOwnerPhone: payload.identity.visibility.showOwnerPhone,
        showSecondaryContact: payload.identity.visibility.showSecondaryContact,
        showCityZone: payload.identity.visibility.showCityZone,
        showAllergies: payload.identity.visibility.showAllergies,
        showDiseases: payload.identity.visibility.showDiseases,
        showMedications: payload.identity.visibility.showMedications,
        showUsualVet: payload.identity.visibility.showUsualVet,
        showEmergencyInstructions: payload.identity.visibility.showEmergencyInstructions,
        showGeneralNotes: payload.identity.visibility.showGeneralNotes,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el perfil de emergencia.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadIdentity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, petId]);

  const set = <K extends keyof PetPublicIdentityWritePayload>(k: K, v: PetPublicIdentityWritePayload[K]) => {
    setForm((cur) => cur ? { ...cur, [k]: v } : cur);
  };

  const textHandler =
    (key: "secondaryContactName" | "secondaryContactPhone" | "cityZone" | "emergencyInstructions" | "nfcCode") =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(key, e.target.value);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !petId || !form) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updatePetPublicIdentity(accessToken, petId, form);
      setData(updated);
      setSuccess("Perfil de emergencia guardado.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  const copyLink = async () => {
    if (!data?.identity.urls.publicUrl) return;
    await navigator.clipboard.writeText(data.identity.urls.publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AuthGate>
      <div className="mx-auto max-w-xl">

        {/* ── Back bar ─────────────────────────────────────────── */}
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
          <span className="text-[12px] font-bold text-slate-400">QR y emergencia</span>
        </div>

        {isLoading || !data || !form ? (
          <div className="space-y-3 p-4">
            <div className="h-52 w-full animate-pulse rounded-3xl bg-slate-100" />
            <div className="h-32 w-full animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-48 w-full animate-pulse rounded-2xl bg-slate-100" />
          </div>
        ) : (
          <form onSubmit={(e) => void handleSave(e)}>

            {/* ── QR Hero ────────────────────────────────────────── */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[hsl(164_32%_16%)] via-[hsl(164_30%_20%)] to-[hsl(164_26%_24%)] px-5 py-6">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 blur-xl" />

              <div className="relative flex items-start gap-5">
                {/* QR code */}
                <div className="shrink-0 rounded-2xl border-2 border-white/20 bg-white p-2 shadow-xl">
                  <img
                    src={data.identity.urls.qrImageUrl}
                    alt={`QR de ${data.pet.name}`}
                    className="h-28 w-28 rounded-xl object-cover"
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-1 flex-col gap-3 min-w-0">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Perfil de emergencia</p>
                    <h1 className="font-bold text-[20px] text-white leading-tight mt-0.5">{data.pet.name}</h1>
                    <div className="mt-1">
                      {(() => {
                        const cfg = getStatusCfg(form.emergencyStatus);
                        return (
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${cfg.badge}`}>
                            {cfg.emoji} {cfg.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={data.identity.urls.qrImageUrl}
                      download={`qr-${data.pet.name}.png`}
                      className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-slate-800 shadow-sm hover:bg-white/90 transition-colors"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                      </svg>
                      Descargar QR
                    </a>
                    <button
                      type="button"
                      onClick={() => void copyLink()}
                      className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[11px] font-bold text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
                    >
                      {copied ? "✓ Copiado" : "Copiar enlace"}
                    </button>
                    <a
                      href={data.identity.urls.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[11px] font-bold text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
                    >
                      Ver perfil →
                    </a>
                  </div>
                </div>
              </div>

              {/* URL strip */}
              <div className="relative mt-4 flex items-center gap-2 rounded-xl bg-black/15 px-3 py-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">URL</span>
                <p className="flex-1 truncate font-mono text-[11px] text-white/50">{data.identity.urls.publicUrl}</p>
              </div>
            </div>

            <div className="px-4 py-5 space-y-6">

              {/* ── Alerts ──────────────────────────────────────── */}
              {error && (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[12px] text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-[12px] text-emerald-700">
                  {success}
                </div>
              )}

              {/* ── Public preview ───────────────────────────────── */}
              <div>
                <SectionTitle>Vista previa pública</SectionTitle>
                <p className="mb-3 text-[11px] text-slate-400">Así ve el perfil quien escanea tu QR.</p>
                <PublicPreviewCard pet={data.pet} form={form} status={getStatusCfg(form.emergencyStatus)} />
              </div>

              {/* ── Emergency status ─────────────────────────────── */}
              <div>
                <SectionTitle>Estado actual</SectionTitle>
                <p className="mb-3 text-[11px] text-slate-400">¿Cómo está {data.pet.name} en este momento?</p>
                <div className="grid grid-cols-2 gap-2">
                  {emergencyStatuses.map((s) => {
                    const active = form.emergencyStatus === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => set("emergencyStatus", s.value)}
                        className={`rounded-2xl border-2 p-3.5 text-left transition-all ${
                          active ? `${s.activeBorder} ${s.activeBg}` : "border-slate-100 bg-white hover:border-slate-200"
                        }`}
                      >
                        <p className="text-xl mb-1">{s.emoji}</p>
                        <p className={`text-[13px] font-bold ${active ? "text-slate-800" : "text-slate-600"}`}>{s.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{s.sublabel}</p>
                        {active && (
                          <div className="mt-2 flex items-center gap-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-semibold text-slate-400">Activo</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Contact info ──────────────────────────────────── */}
              <div>
                <SectionTitle>Información de contacto</SectionTitle>
                <div className="rounded-2xl border border-slate-100 bg-white divide-y divide-slate-50">
                  <div className="px-4">
                    <Toggle checked={form.showOwnerName} onChange={(v) => set("showOwnerName", v)} label="Mostrar nombre del tutor" />
                  </div>
                  <div className="px-4">
                    <Toggle checked={form.showOwnerPhone} onChange={(v) => set("showOwnerPhone", v)} label="Mostrar teléfono del tutor" />
                  </div>
                  <div className="px-4">
                    <Toggle checked={form.showSecondaryContact} onChange={(v) => set("showSecondaryContact", v)} label="Mostrar contacto secundario" />
                  </div>
                </div>

                {form.showSecondaryContact && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <Field label="Nombre del contacto">
                      <input value={form.secondaryContactName ?? ""} onChange={textHandler("secondaryContactName")} className={inputCls} placeholder="Nombre completo" />
                    </Field>
                    <Field label="Teléfono del contacto">
                      <input value={form.secondaryContactPhone ?? ""} onChange={textHandler("secondaryContactPhone")} className={inputCls} placeholder="+56 9 …" />
                    </Field>
                  </div>
                )}

                <div className="mt-3">
                  <Field label="Ciudad o zona visible" hint="Aparece en el perfil para contextualizar la búsqueda si se pierde.">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <input value={form.cityZone ?? ""} onChange={textHandler("cityZone")} className={inputCls} placeholder="p. ej. Providencia, Santiago" />
                      </div>
                      <div className={`shrink-0 rounded-xl border px-2 py-1.5 transition-colors cursor-pointer ${form.showCityZone ? "border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.06)] text-[hsl(var(--primary))]" : "border-slate-200 text-slate-400"}`}
                        onClick={() => set("showCityZone", !form.showCityZone)}>
                        <span className="text-[10px] font-bold">{form.showCityZone ? "Visible" : "Oculta"}</span>
                      </div>
                    </div>
                  </Field>
                </div>
              </div>

              {/* ── Medical info ──────────────────────────────────── */}
              <div>
                <SectionTitle>Información médica visible</SectionTitle>
                <p className="mb-3 text-[11px] text-slate-400">Activa solo lo que quieras que vea quien encuentre a tu mascota.</p>
                <div className="rounded-2xl border border-slate-100 bg-white divide-y divide-slate-50">
                  <div className="px-4">
                    <Toggle checked={form.showAllergies} onChange={(v) => set("showAllergies", v)} label="Mostrar alergias" />
                  </div>
                  <div className="px-4">
                    <Toggle checked={form.showDiseases} onChange={(v) => set("showDiseases", v)} label="Mostrar condiciones / enfermedades" />
                  </div>
                  <div className="px-4">
                    <Toggle checked={form.showMedications} onChange={(v) => set("showMedications", v)} label="Mostrar medicación" />
                  </div>
                  <div className="px-4">
                    <Toggle checked={form.showUsualVet} onChange={(v) => set("showUsualVet", v)} label="Mostrar veterinaria habitual" />
                  </div>
                  <div className="px-4">
                    <Toggle checked={form.showGeneralNotes} onChange={(v) => set("showGeneralNotes", v)} label="Mostrar notas generales" />
                  </div>
                </div>
              </div>

              {/* ── Emergency message ─────────────────────────────── */}
              <div>
                <SectionTitle>Mensaje de emergencia</SectionTitle>
                <div className="rounded-2xl border border-slate-100 bg-white px-4 pb-4 pt-2">
                  <div className="mb-3">
                    <Toggle checked={form.showEmergencyInstructions} onChange={(v) => set("showEmergencyInstructions", v)} label="Mostrar instrucciones al encontrador" />
                  </div>
                  <textarea
                    rows={3}
                    value={form.emergencyInstructions ?? ""}
                    onChange={textHandler("emergencyInstructions")}
                    className={inputCls + " resize-none"}
                    placeholder="p. ej. Soy tranquilo, tengo mis vacunas al día. Por favor llama al tutor o llévame a la veterinaria más cercana."
                  />
                </div>
              </div>

              {/* ── NFC (secondary) ───────────────────────────────── */}
              <div>
                <SectionTitle>Placa NFC</SectionTitle>
                <div className="rounded-2xl border border-dashed border-slate-100 bg-slate-50 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-base">📡</div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-slate-600">Código NFC</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                        Si tienes una placa NFC física, puedes vincularla con este código. El QR es suficiente para identificación inmediata.
                      </p>
                      <input
                        value={form.nfcCode ?? ""}
                        onChange={textHandler("nfcCode")}
                        className={inputCls + " mt-2"}
                        placeholder="NFC-PET-001 (opcional)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Save ──────────────────────────────────────────── */}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-2xl bg-[hsl(var(--primary))] py-3.5 text-[14px] font-bold text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {isSaving ? "Guardando…" : "Guardar perfil de emergencia"}
              </button>

            </div>
          </form>
        )}
      </div>
    </AuthGate>
  );
}

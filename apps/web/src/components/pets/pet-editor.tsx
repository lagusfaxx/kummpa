"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { Pet, PetSize, PetSex, PetWritePayload } from "@/features/pets/types";

/* ─── Types / constants ───────────────────────────────────────── */

interface PetEditorProps {
  initialPet?: Pet | null;
  submitLabel: string;
  isSubmitting: boolean;
  error?: string | null;
  onSubmit: (payload: PetWritePayload) => Promise<void>;
  onDelete?: () => Promise<void>;
  isDeleting?: boolean;
}

const sexOptions: Array<{ value: PetSex; label: string }> = [
  { value: "UNKNOWN", label: "No definido" },
  { value: "MALE",    label: "Macho" },
  { value: "FEMALE",  label: "Hembra" }
];

const sizeOptions: Array<{ value: PetSize; label: string }> = [
  { value: "UNKNOWN", label: "No definido" },
  { value: "XS", label: "XS · Muy pequeño" },
  { value: "S",  label: "S · Pequeño" },
  { value: "M",  label: "M · Mediano" },
  { value: "L",  label: "L · Grande" },
  { value: "XL", label: "XL · Muy grande" }
];

function listToText(value: string[] | undefined) {
  return value?.length ? value.join("\n") : "";
}

function textToList(value: string) {
  return value.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
}

function isoToDateInput(value?: string | null) {
  return value ? (value.split("T")[0] ?? "") : "";
}

/* ─── Reusable atoms ──────────────────────────────────────────── */

type Tab = "basico" | "salud" | "contactos" | "privacidad";

const TABS: { id: Tab; label: string }[] = [
  { id: "basico",     label: "Básico"     },
  { id: "salud",      label: "Salud"      },
  { id: "contactos",  label: "Contactos"  },
  { id: "privacidad", label: "Privacidad" },
];

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-300 focus:border-[hsl(var(--primary))] focus:bg-white focus:outline-none transition-colors";

const textareaCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-300 focus:border-[hsl(var(--primary))] focus:bg-white focus:outline-none transition-colors resize-none";

function Field({
  label,
  required,
  hint,
  children,
  span2,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  span2?: boolean;
}) {
  return (
    <label className={`block ${span2 ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
        {required && <span className="text-red-400">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[10px] text-slate-400">{hint}</span>}
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-300">{children}</p>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors ${
        checked
          ? "border-[hsl(var(--primary)/0.25)] bg-[hsl(var(--primary)/0.04)]"
          : "border-slate-100 bg-slate-50"
      }`}
    >
      <div>
        <p className={`text-[13px] font-semibold ${checked ? "text-[hsl(var(--primary))]" : "text-slate-700"}`}>{label}</p>
        {description && <p className="mt-0.5 text-[11px] text-slate-400">{description}</p>}
      </div>
      <div className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-[hsl(var(--primary))]" : "bg-slate-200"}`}>
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </div>
    </button>
  );
}

/* ─── PetEditor ───────────────────────────────────────────────── */

export function PetEditor({
  initialPet,
  submitLabel,
  isSubmitting,
  error,
  onSubmit,
  onDelete,
  isDeleting,
}: PetEditorProps) {
  const [activeTab, setActiveTab] = useState<Tab>("basico");

  const [name, setName] = useState(initialPet?.name ?? "");
  const [primaryPhotoUrl, setPrimaryPhotoUrl] = useState(initialPet?.primaryPhotoUrl ?? "");
  const [galleryText, setGalleryText] = useState(listToText(initialPet?.galleryUrls));
  const [species, setSpecies] = useState(initialPet?.species ?? "");
  const [breed, setBreed] = useState(initialPet?.breed ?? "");
  const [sex, setSex] = useState<PetSex>(initialPet?.sex ?? "UNKNOWN");
  const [birthDate, setBirthDate] = useState(isoToDateInput(initialPet?.birthDate));
  const [weightKg, setWeightKg] = useState(
    initialPet?.weightKg !== null && initialPet?.weightKg !== undefined
      ? String(initialPet.weightKg)
      : ""
  );
  const [color, setColor] = useState(initialPet?.color ?? "");
  const [size, setSize] = useState<PetSize>(initialPet?.size ?? "UNKNOWN");
  const [isSterilized, setIsSterilized] = useState(Boolean(initialPet?.isSterilized));
  const [microchipNumber, setMicrochipNumber] = useState(initialPet?.microchipNumber ?? "");
  const [allergies, setAllergies] = useState(initialPet?.allergies ?? "");
  const [diseases, setDiseases] = useState(initialPet?.diseases ?? "");
  const [medications, setMedications] = useState(initialPet?.medications ?? "");
  const [feeding, setFeeding] = useState(initialPet?.feeding ?? "");
  const [usualVetName, setUsualVetName] = useState(initialPet?.usualVetName ?? "");
  const [usualVetContact, setUsualVetContact] = useState(initialPet?.usualVetContact ?? "");
  const [emergencyContactName, setEmergencyContactName] = useState(initialPet?.emergencyContactName ?? "");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(initialPet?.emergencyContactPhone ?? "");
  const [generalNotes, setGeneralNotes] = useState(initialPet?.generalNotes ?? "");
  const [healthStatus, setHealthStatus] = useState(initialPet?.healthStatus ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  const composedError = useMemo(() => localError ?? error ?? null, [error, localError]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError("El nombre de la mascota es obligatorio.");
      setActiveTab("basico");
      return;
    }
    if (!species.trim()) {
      setLocalError("La especie es obligatoria.");
      setActiveTab("basico");
      return;
    }
    if (!breed.trim()) {
      setLocalError("La raza es obligatoria.");
      setActiveTab("basico");
      return;
    }

    const weightNumber = weightKg.trim() ? Number(weightKg) : undefined;
    if (weightKg.trim() && Number.isNaN(weightNumber)) {
      setLocalError("El peso debe ser numérico.");
      setActiveTab("basico");
      return;
    }

    await onSubmit({
      name: name.trim(),
      primaryPhotoUrl: primaryPhotoUrl.trim() || undefined,
      galleryUrls: textToList(galleryText),
      species: species.trim(),
      breed: breed.trim(),
      sex,
      birthDate: birthDate.trim() || undefined,
      weightKg: weightNumber,
      color: color.trim() || undefined,
      size,
      isSterilized,
      microchipNumber: microchipNumber.trim() || undefined,
      allergies: allergies.trim() || undefined,
      diseases: diseases.trim() || undefined,
      medications: medications.trim() || undefined,
      feeding: feeding.trim() || undefined,
      usualVetName: usualVetName.trim() || undefined,
      usualVetContact: usualVetContact.trim() || undefined,
      emergencyContactName: emergencyContactName.trim() || undefined,
      emergencyContactPhone: emergencyContactPhone.trim() || undefined,
      generalNotes: generalNotes.trim() || undefined,
      healthStatus: healthStatus.trim() || undefined,
      isPublic: true
    });
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)}>
      {/* ── Sticky tabs ───────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="flex overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center border-b-2 px-5 py-3 text-[12px] font-semibold transition-colors ${
                  active
                    ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Error banner ──────────────────────────────────────── */}
      {composedError && (
        <div className="mx-4 mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[12px] text-red-700">
          {composedError}
        </div>
      )}

      {/* ── Tab panels — all rendered, shown/hidden via CSS ───── */}
      <div className="px-4 py-5 space-y-4">

        {/* BÁSICO */}
        <div className={activeTab === "basico" ? "space-y-4" : "hidden"}>
          {/* Photo preview */}
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-slate-200 bg-white">
              {primaryPhotoUrl ? (
                <img src={primaryPhotoUrl} alt="Foto" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl text-slate-300">
                  {name.slice(0, 1) || "?"}
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Foto principal (URL)</p>
              <input
                type="url"
                value={primaryPhotoUrl}
                onChange={(e) => setPrimaryPhotoUrl(e.target.value)}
                className={inputCls}
                placeholder="https://…"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre" required>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="p. ej. Luna" />
            </Field>
            <Field label="Especie" required>
              <input value={species} onChange={(e) => setSpecies(e.target.value)} className={inputCls} placeholder="p. ej. Perro, Gato…" />
            </Field>
            <Field label="Raza" required>
              <input value={breed} onChange={(e) => setBreed(e.target.value)} className={inputCls} placeholder="p. ej. Labrador" />
            </Field>
            <Field label="Sexo">
              <select value={sex} onChange={(e) => setSex(e.target.value as PetSex)} className={inputCls}>
                {sexOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Fecha de nacimiento">
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Peso (kg)">
              <input type="number" min={0} step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className={inputCls} placeholder="p. ej. 12.5" />
            </Field>
            <Field label="Color / pelaje">
              <input value={color} onChange={(e) => setColor(e.target.value)} className={inputCls} placeholder="p. ej. Negro con manchas blancas" />
            </Field>
            <Field label="Tamaño">
              <select value={size} onChange={(e) => setSize(e.target.value as PetSize)} className={inputCls}>
                {sizeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>

          <Toggle
            checked={isSterilized}
            onChange={setIsSterilized}
            label="Esterilizado/a"
            description="Indica si la mascota fue esterilizada o castrada."
          />
        </div>

        {/* SALUD */}
        <div className={activeTab === "salud" ? "space-y-4" : "hidden"}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Microchip">
              <input value={microchipNumber} onChange={(e) => setMicrochipNumber(e.target.value)} className={inputCls} placeholder="Número de microchip" />
            </Field>
            <Field label="Estado de salud general">
              <input value={healthStatus} onChange={(e) => setHealthStatus(e.target.value)} className={inputCls} placeholder="p. ej. Sano, Crónico…" />
            </Field>
          </div>

          <SectionTitle>Condiciones y cuidados</SectionTitle>

          <div className="space-y-3">
            <Field label="Alergias" hint="Describe alergias conocidas a alimentos, medicamentos o ambientales.">
              <textarea rows={2} value={allergies} onChange={(e) => setAllergies(e.target.value)} className={textareaCls} placeholder="p. ej. Alérgico al maíz, al polvo de ácaros…" />
            </Field>
            <Field label="Enfermedades / condiciones" hint="Diagnósticos relevantes o enfermedades crónicas.">
              <textarea rows={2} value={diseases} onChange={(e) => setDiseases(e.target.value)} className={textareaCls} placeholder="p. ej. Displasia de cadera, epilepsia leve…" />
            </Field>
            <Field label="Medicamentos" hint="Tratamientos o medicamentos en curso.">
              <textarea rows={2} value={medications} onChange={(e) => setMedications(e.target.value)} className={textareaCls} placeholder="p. ej. Fenobarbital 30mg, Omega 3…" />
            </Field>
            <Field label="Alimentación" hint="Tipo de dieta, marca o restricciones alimenticias.">
              <textarea rows={2} value={feeding} onChange={(e) => setFeeding(e.target.value)} className={textareaCls} placeholder="p. ej. Royal Canin Adult, 2 tazas/día…" />
            </Field>
          </div>
        </div>

        {/* CONTACTOS */}
        <div className={activeTab === "contactos" ? "space-y-4" : "hidden"}>
          <SectionTitle>Veterinaria habitual</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre de la clínica / veterinario">
              <input value={usualVetName} onChange={(e) => setUsualVetName(e.target.value)} className={inputCls} placeholder="p. ej. Clínica Vetlife" />
            </Field>
            <Field label="Teléfono / email de la clínica">
              <input value={usualVetContact} onChange={(e) => setUsualVetContact(e.target.value)} className={inputCls} placeholder="+56 9 …" />
            </Field>
          </div>

          <SectionTitle>Contacto de emergencia</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre del contacto">
              <input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} className={inputCls} placeholder="Nombre completo" />
            </Field>
            <Field label="Teléfono de emergencia">
              <input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} className={inputCls} placeholder="+56 9 …" />
            </Field>
          </div>

          <Field label="Notas generales" hint="Información adicional útil para el cuidado o emergencias.">
            <textarea rows={4} value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} className={textareaCls} placeholder="Cualquier dato adicional útil para el cuidado de tu mascota…" />
          </Field>
        </div>

        {/* PRIVACIDAD */}
        <div className={activeTab === "privacidad" ? "space-y-4" : "hidden"}>
          <div className="rounded-2xl border border-blue-50 bg-blue-50 px-4 py-3">
            <p className="text-[12px] font-semibold text-blue-700">Perfil siempre visible</p>
            <p className="mt-0.5 text-[11px] text-blue-600">En Kummpa todos los perfiles son visibles por defecto. Comparte el enlace desde la sección DNI.</p>
          </div>

          <Field
            label="Galería de fotos (una URL por línea)"
            hint="Agrega fotos adicionales de tu mascota. Cada URL en una línea separada."
          >
            <textarea
              rows={5}
              value={galleryText}
              onChange={(e) => setGalleryText(e.target.value)}
              className={textareaCls}
              placeholder={"https://imagen1.com/foto.jpg\nhttps://imagen2.com/foto.jpg"}
            />
          </Field>

          {/* Danger zone */}
          {onDelete && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-red-400 mb-1">Zona de peligro</p>
              <p className="text-[12px] text-red-600 mb-3">
                Eliminar esta mascota borrará permanentemente su ficha, carnet de vacunación e historial. Esta acción no se puede deshacer.
              </p>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void onDelete()}
                className="rounded-xl border border-red-300 bg-white px-4 py-2 text-[12px] font-bold text-red-600 hover:bg-red-100 transition-colors disabled:opacity-60"
              >
                {isDeleting ? "Eliminando…" : "Eliminar mascota"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Submit ─────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 px-4 py-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-[hsl(var(--primary))] py-3.5 text-[14px] font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

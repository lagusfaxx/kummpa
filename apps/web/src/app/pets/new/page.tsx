"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/features/auth/auth-context";
import { createPet } from "@/features/pets/pets-api";
import type { PetSex, PetSize, PetWritePayload } from "@/features/pets/types";

/* ─── helpers ─────────────────────────────────────────── */
function cls(...args: (string | false | undefined | null)[]) {
  return args.filter(Boolean).join(" ");
}

function weightToSize(kg: number | null): PetSize {
  if (!kg || kg <= 0) return "UNKNOWN";
  if (kg < 5) return "XS";
  if (kg < 10) return "S";
  if (kg < 25) return "M";
  if (kg < 45) return "L";
  return "XL";
}

/* ─── sub-components ──────────────────────────────────── */
function ChoiceCard({
  emoji,
  label,
  selected,
  onClick,
}: {
  emoji: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cls(
        "relative flex flex-col items-center justify-center gap-3 rounded-3xl border-2 p-6 transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--secondary))] focus-visible:ring-offset-2",
        selected
          ? "border-[hsl(var(--secondary))] bg-[hsl(155_48%_42%/0.08)] shadow-md scale-[1.03]"
          : "border-[hsl(var(--border))] bg-white/70 hover:border-[hsl(var(--secondary)/0.4)] hover:bg-[hsl(155_48%_42%/0.04)] hover:scale-[1.01]"
      )}
    >
      {selected && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--secondary))] text-white text-[10px] font-bold shadow">
          ✓
        </span>
      )}
      <span className="text-5xl leading-none">{emoji}</span>
      <span
        className={cls(
          "text-sm font-bold tracking-wide",
          selected ? "text-[hsl(155_48%_28%)]" : "text-[hsl(var(--foreground))]"
        )}
      >
        {label}
      </span>
    </button>
  );
}

function PillChoice({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cls(
        "rounded-full border-2 px-5 py-2 text-sm font-semibold transition-all duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--secondary))] focus-visible:ring-offset-2",
        selected
          ? "border-[hsl(var(--secondary))] bg-[hsl(155_48%_42%/0.1)] text-[hsl(155_48%_24%)]"
          : "border-[hsl(var(--border))] bg-white/70 text-[hsl(var(--foreground))] hover:border-[hsl(var(--secondary)/0.4)]"
      )}
    >
      {label}
    </button>
  );
}

function StyledInput({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = "text",
  optional,
  min,
  step,
}: {
  label: string;
  hint?: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "textarea";
  optional?: boolean;
  min?: number;
  step?: number;
}) {
  const baseInput =
    "w-full rounded-2xl border border-[hsl(var(--border))] bg-white/80 px-4 py-3 text-base outline-none transition-all focus:border-[hsl(var(--secondary))] focus:shadow-[0_0_0_3px_hsl(155_48%_42%/0.12)] placeholder:text-[hsl(var(--muted-foreground)/0.5)]";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-[hsl(var(--foreground))]">
          {label}
        </label>
        {optional && (
          <span className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            opcional
          </span>
        )}
      </div>
      {hint && (
        <p className="text-xs text-[hsl(var(--muted-foreground))]">{hint}</p>
      )}
      {type === "textarea" ? (
        <textarea
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={cls(baseInput, "resize-none leading-relaxed")}
        />
      ) : (
        <input
          type={type}
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          step={step}
          className={baseInput}
        />
      )}
    </div>
  );
}

/* ─── progress bar ────────────────────────────────────── */
function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round(((step + 1) / total) * 100);
  const labels = ["Identidad", "Rasgos", "Salud", "Resumen"];
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-[11px] font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
        <span>{labels[step]}</span>
        <span>{step + 1} / {total}</span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]">
        <div
          className="h-full rounded-full bg-[hsl(var(--secondary))] transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cls(
              "h-1.5 flex-1 rounded-full transition-all duration-300",
              i <= step
                ? "bg-[hsl(var(--secondary))]"
                : "bg-[hsl(var(--muted))]"
            )}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── summary item ────────────────────────────────────── */
function SummaryRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[hsl(var(--border)/0.5)] last:border-0">
      <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
        {label}
      </span>
      <span className="text-sm font-medium text-[hsl(var(--foreground))]">{value}</span>
    </div>
  );
}

/* ─── main form state ─────────────────────────────────── */
interface FormData {
  species: string;
  name: string;
  sex: PetSex | "";
  breed: string;
  isNoBreed: boolean;
  weightKg: string;
  character: string;
  diseases: string;
  allergies: string;
  microchipNumber: string;
}

const TOTAL_STEPS = 4;

/* ─── page ────────────────────────────────────────────── */
export default function NewPetPage() {
  const router = useRouter();
  const { session } = useAuth();

  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [direction, setDirection] = useState<"fwd" | "back">("fwd");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    species: "",
    name: "",
    sex: "",
    breed: "",
    isNoBreed: false,
    weightKg: "",
    character: "",
    diseases: "",
    allergies: "",
    microchipNumber: "",
  });

  function set<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function navigate(dir: "fwd" | "back") {
    setDirection(dir);
    setVisible(false);
    setTimeout(() => {
      setStep((s) => (dir === "fwd" ? s + 1 : s - 1));
      setVisible(true);
    }, 180);
  }

  function canProceedStep0() {
    return form.species !== "" && form.name.trim() !== "" && form.sex !== "";
  }
  function canProceedStep1() {
    return (form.breed.trim() !== "" || form.isNoBreed);
  }

  async function handleCreate() {
    const accessToken = session?.tokens.accessToken;
    if (!accessToken) { setError("Sesión no disponible."); return; }

    const weightNum = parseFloat(form.weightKg) || null;
    const breedVal = form.isNoBreed ? "Mestizo" : (form.breed.trim() || "Mestizo");
    const notesArr: string[] = [];
    if (form.character.trim()) notesArr.push(`Carácter: ${form.character.trim()}`);

    const payload: PetWritePayload = {
      name: form.name.trim(),
      species: form.species,
      breed: breedVal,
      sex: form.sex as PetSex,
      size: weightToSize(weightNum),
      weightKg: weightNum ?? undefined,
      diseases: form.diseases.trim() || undefined,
      allergies: form.allergies.trim() || undefined,
      microchipNumber: form.microchipNumber.trim() || undefined,
      generalNotes: notesArr.join("\n") || undefined,
      isPublic: false,
    };

    setSubmitting(true);
    setError(null);
    try {
      const pet = await createPet(accessToken, payload);
      setCreatedId(pet.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la mascota.");
    } finally {
      setSubmitting(false);
    }
  }

  const speciesEmoji =
    form.species === "Perro" ? "🐕" : form.species === "Gato" ? "🐈" : form.species ? "🐾" : "";
  const sexLabel =
    form.sex === "MALE" ? "Macho" : form.sex === "FEMALE" ? "Hembra" : form.sex === "UNKNOWN" ? "No sé" : "";

  /* ── success screen ── */
  if (createdId) {
    return (
      <AuthGate>
        <div className="mx-auto max-w-lg space-y-8 pb-16 text-center">
          <div className="space-y-4 pt-6">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[hsl(155_48%_42%/0.12)] text-6xl">
              {speciesEmoji || "🐾"}
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[hsl(var(--foreground))]">
                ¡{form.name || "Tu mascota"} ya está en Kummpa!
              </h1>
              <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">
                Perfil creado con éxito. Ahora puedes completarlo con más detalles.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-[hsl(var(--border))] bg-white/70 p-5 text-left space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-4">
              Completa su perfil
            </p>
            {[
              { icon: "📸", label: "Subir foto principal", href: `/pets/${createdId}/edit` },
              { icon: "🩺", label: "Agregar veterinaria habitual", href: `/pets/${createdId}/edit` },
              { icon: "💉", label: "Registrar vacunas", href: `/pets/${createdId}/vaccines` },
              { icon: "🆔", label: "Perfil de identidad NFC", href: `/pets/${createdId}/identity` },
              { icon: "👤", label: "Ver perfil completo", href: `/pets/${createdId}` },
            ].map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 transition hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.4)]"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
                <span className="ml-auto text-[hsl(var(--muted-foreground))]">›</span>
              </Link>
            ))}
          </div>

          <Link
            href={`/pets/${createdId}`}
            className="inline-block rounded-full bg-[hsl(var(--primary))] px-10 py-3.5 text-sm font-bold text-white shadow-md transition hover:opacity-90"
          >
            Ver a {form.name || "mi mascota"}
          </Link>
        </div>
      </AuthGate>
    );
  }

  /* ── animation wrapper classes ── */
  const animCls = cls(
    "transition-all duration-200 ease-out",
    visible
      ? "opacity-100 translate-x-0"
      : direction === "fwd"
      ? "opacity-0 translate-x-5"
      : "opacity-0 -translate-x-5"
  );

  return (
    <AuthGate>
      <div className="mx-auto max-w-lg space-y-8 pb-16">

        {/* header */}
        <div className="space-y-2 pt-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
            Nueva mascota
          </p>
          <h1 className="text-2xl font-black tracking-tight text-[hsl(var(--foreground))]">
            {step === 0 && "¿Quién se une a Kummpa?"}
            {step === 1 && `Cuéntanos más de ${form.name || "tu mascota"}`}
            {step === 2 && `Salud de ${form.name || "tu mascota"}`}
            {step === 3 && `Todo listo${form.name ? `, ${form.name}` : ""}! 🎉`}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {step === 0 && "Empecemos con lo básico. Solo toma un momento."}
            {step === 1 && "Rasgos físicos y personalidad."}
            {step === 2 && "Información médica básica. Todo es opcional."}
            {step === 3 && "Revisa el resumen antes de crear el perfil."}
          </p>
        </div>

        {/* progress */}
        <ProgressBar step={step} total={TOTAL_STEPS} />

        {/* step content */}
        <div className={animCls}>

          {/* ─── step 0: identidad ─── */}
          {step === 0 && (
            <div className="space-y-7">
              <div>
                <p className="mb-3 text-sm font-semibold text-[hsl(var(--foreground))]">
                  Tipo de animal
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <ChoiceCard
                    emoji="🐕"
                    label="Perro"
                    selected={form.species === "Perro"}
                    onClick={() => set("species", "Perro")}
                  />
                  <ChoiceCard
                    emoji="🐈"
                    label="Gato"
                    selected={form.species === "Gato"}
                    onClick={() => set("species", "Gato")}
                  />
                  <ChoiceCard
                    emoji="🐾"
                    label="Otro"
                    selected={form.species !== "" && form.species !== "Perro" && form.species !== "Gato"}
                    onClick={() => set("species", "Otro")}
                  />
                </div>
                {form.species !== "" && form.species !== "Perro" && form.species !== "Gato" && (
                  <input
                    autoFocus
                    className="mt-3 w-full rounded-2xl border border-[hsl(var(--border))] bg-white/80 px-4 py-3 text-sm outline-none transition-all focus:border-[hsl(var(--secondary))] focus:shadow-[0_0_0_3px_hsl(155_48%_42%/0.12)]"
                    placeholder="¿Qué tipo de animal? Ej: Conejo, Pájaro…"
                    value={form.species === "Otro" ? "" : form.species}
                    onChange={(e) => set("species", e.target.value || "Otro")}
                  />
                )}
              </div>

              <StyledInput
                label="¿Cómo se llama?"
                placeholder={`Ej: Luna, Simba, Pelusa…`}
                value={form.name}
                onChange={(v) => set("name", v)}
              />

              <div>
                <p className="mb-3 text-sm font-semibold text-[hsl(var(--foreground))]">Género</p>
                <div className="flex flex-wrap gap-2">
                  <PillChoice label="♂ Macho" selected={form.sex === "MALE"} onClick={() => set("sex", "MALE")} />
                  <PillChoice label="♀ Hembra" selected={form.sex === "FEMALE"} onClick={() => set("sex", "FEMALE")} />
                  <PillChoice label="No lo sé" selected={form.sex === "UNKNOWN"} onClick={() => set("sex", "UNKNOWN")} />
                </div>
              </div>
            </div>
          )}

          {/* ─── step 1: rasgos ─── */}
          {step === 1 && (
            <div className="space-y-7">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-semibold text-[hsl(var(--foreground))]">Raza</p>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {["Mestizo", "Sin raza definida", "No aplica"].map((opt) => (
                    <PillChoice
                      key={opt}
                      label={opt}
                      selected={form.isNoBreed && form.breed === opt}
                      onClick={() => {
                        set("isNoBreed", true);
                        set("breed", opt);
                      }}
                    />
                  ))}
                </div>
                <input
                  className="w-full rounded-2xl border border-[hsl(var(--border))] bg-white/80 px-4 py-3 text-sm outline-none transition-all focus:border-[hsl(var(--secondary))] focus:shadow-[0_0_0_3px_hsl(155_48%_42%/0.12)] placeholder:text-[hsl(var(--muted-foreground)/0.5)]"
                  placeholder={`O escribe la raza… Ej: Labrador, Persa`}
                  value={form.isNoBreed ? "" : form.breed}
                  onChange={(e) => {
                    set("isNoBreed", false);
                    set("breed", e.target.value);
                  }}
                />
              </div>

              <div>
                <p className="mb-1.5 text-sm font-semibold text-[hsl(var(--foreground))]">
                  Peso aproximado
                  <span className="ml-2 text-xs font-normal text-[hsl(var(--muted-foreground))]">(kg)</span>
                </p>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  className="w-full rounded-2xl border border-[hsl(var(--border))] bg-white/80 px-4 py-3 text-sm outline-none transition-all focus:border-[hsl(var(--secondary))] focus:shadow-[0_0_0_3px_hsl(155_48%_42%/0.12)] placeholder:text-[hsl(var(--muted-foreground)/0.5)]"
                  placeholder="Ej: 8.5"
                  value={form.weightKg}
                  onChange={(e) => set("weightKg", e.target.value)}
                />
              </div>

              <StyledInput
                label="Carácter y personalidad"
                hint={`¿Cómo es ${form.name || "tu mascota"}?`}
                placeholder="Ej: Muy juguetón, tranquilo con extraños, ansioso solo…"
                value={form.character}
                onChange={(v) => set("character", v)}
                type="textarea"
                optional
              />
            </div>
          )}

          {/* ─── step 2: salud ─── */}
          {step === 2 && (
            <div className="space-y-7">
              <div className="rounded-2xl bg-[hsl(22_92%_60%/0.07)] border border-[hsl(22_92%_60%/0.2)] p-4 text-sm text-[hsl(22_62%_36%)]">
                Todo en esta fase es <strong>opcional</strong>. Puedes completarlo ahora o más adelante desde el perfil de {form.name || "tu mascota"}.
              </div>

              <StyledInput
                label="Enfermedades o condiciones"
                hint="Condiciones crónicas, diagnósticos previos…"
                placeholder="Ej: Displasia de cadera, alergia a pulgas, hipotiroidismo…"
                value={form.diseases}
                onChange={(v) => set("diseases", v)}
                type="textarea"
                optional
              />

              <StyledInput
                label="Alergias"
                hint="Alimentos, medicamentos, materiales…"
                placeholder="Ej: Pollo, penicilina, ninguna conocida…"
                value={form.allergies}
                onChange={(v) => set("allergies", v)}
                optional
              />

              <StyledInput
                label="Número de microchip"
                hint="Solo si tiene chip de identificación"
                placeholder="Ej: 985112345678901"
                value={form.microchipNumber}
                onChange={(v) => set("microchipNumber", v)}
                optional
              />
            </div>
          )}

          {/* ─── step 3: resumen ─── */}
          {step === 3 && (
            <div className="space-y-5">
              {/* pet card preview */}
              <div className="rounded-3xl border-2 border-[hsl(var(--secondary)/0.3)] bg-gradient-to-br from-[hsl(155_48%_42%/0.07)] to-[hsl(155_48%_42%/0.02)] p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm text-4xl">
                    {speciesEmoji}
                  </div>
                  <div>
                    <p className="text-xl font-black text-[hsl(var(--foreground))]">
                      {form.name || "—"}
                    </p>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      {[form.species, sexLabel].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              </div>

              {/* detail rows */}
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-white/70 px-5 py-1">
                <SummaryRow label="Tipo" value={form.species} />
                <SummaryRow label="Nombre" value={form.name} />
                <SummaryRow label="Género" value={sexLabel} />
                <SummaryRow
                  label="Raza"
                  value={form.isNoBreed ? form.breed : form.breed || undefined}
                />
                <SummaryRow
                  label="Peso"
                  value={form.weightKg ? `${form.weightKg} kg` : undefined}
                />
                <SummaryRow label="Carácter" value={form.character} />
                <SummaryRow label="Enfermedades" value={form.diseases} />
                <SummaryRow label="Alergias" value={form.allergies} />
                <SummaryRow label="Microchip" value={form.microchipNumber} />
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                onClick={handleCreate}
                disabled={submitting}
                className="w-full rounded-full bg-[hsl(var(--secondary))] py-4 text-base font-bold text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Creando perfil…" : `Crear a ${form.name || "mi mascota"} 🐾`}
              </button>
            </div>
          )}
        </div>

        {/* navigation buttons */}
        <div className="flex items-center justify-between gap-4">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => navigate("back")}
              className="flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-white/70 px-6 py-3 text-sm font-semibold text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--muted)/0.5)]"
            >
              ‹ Atrás
            </button>
          ) : (
            <Link
              href="/pets"
              className="flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-white/70 px-6 py-3 text-sm font-semibold text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--muted)/0.5)]"
            >
              ‹ Cancelar
            </Link>
          )}

          {step < 3 && (
            <button
              type="button"
              onClick={() => navigate("fwd")}
              disabled={
                (step === 0 && !canProceedStep0()) ||
                (step === 1 && !canProceedStep1())
              }
              className="ml-auto flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-8 py-3 text-sm font-bold text-white shadow transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {step === 2 ? "Ver resumen" : "Siguiente"} ›
            </button>
          )}
        </div>

      </div>
    </AuthGate>
  );
}

"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { Pet, PetSize, PetSex, PetWritePayload } from "@/features/pets/types";

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
  { value: "MALE", label: "Macho" },
  { value: "FEMALE", label: "Hembra" }
];

const sizeOptions: Array<{ value: PetSize; label: string }> = [
  { value: "UNKNOWN", label: "No definido" },
  { value: "XS", label: "XS" },
  { value: "S", label: "S" },
  { value: "M", label: "M" },
  { value: "L", label: "L" },
  { value: "XL", label: "XL" }
];

function listToText(value: string[] | undefined) {
  if (!value || value.length === 0) {
    return "";
  }

  return value.join("\n");
}

function textToList(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function isoToDateInput(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.split("T")[0] ?? "";
}

export function PetEditor({
  initialPet,
  submitLabel,
  isSubmitting,
  error,
  onSubmit,
  onDelete,
  isDeleting
}: PetEditorProps) {
  const [name, setName] = useState(initialPet?.name ?? "");
  const [primaryPhotoUrl, setPrimaryPhotoUrl] = useState(initialPet?.primaryPhotoUrl ?? "");
  const [galleryText, setGalleryText] = useState(listToText(initialPet?.galleryUrls));
  const [species, setSpecies] = useState(initialPet?.species ?? "");
  const [breed, setBreed] = useState(initialPet?.breed ?? "");
  const [sex, setSex] = useState<PetSex>(initialPet?.sex ?? "UNKNOWN");
  const [birthDate, setBirthDate] = useState(isoToDateInput(initialPet?.birthDate));
  const [weightKg, setWeightKg] = useState(
    initialPet?.weightKg !== null && initialPet?.weightKg !== undefined ? String(initialPet.weightKg) : ""
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
  const [isPublic, setIsPublic] = useState(initialPet?.isPublic ?? false);
  const [localError, setLocalError] = useState<string | null>(null);

  const composedError = useMemo(() => localError ?? error ?? null, [error, localError]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError("El nombre de la mascota es obligatorio.");
      return;
    }

    if (!species.trim()) {
      setLocalError("La especie es obligatoria.");
      return;
    }

    if (!breed.trim()) {
      setLocalError("La raza es obligatoria.");
      return;
    }

    const weightNumber = weightKg.trim() ? Number(weightKg) : undefined;
    if (weightKg.trim() && Number.isNaN(weightNumber)) {
      setLocalError("El peso debe ser numerico.");
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
      isPublic
    });
  };

  return (
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-bold text-slate-900">Datos principales</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Nombre*
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Especie*
            <input
              required
              value={species}
              onChange={(event) => setSpecies(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Raza*
            <input
              required
              value={breed}
              onChange={(event) => setBreed(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Sexo
            <select
              value={sex}
              onChange={(event) => setSex(event.target.value as PetSex)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              {sexOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Fecha de nacimiento
            <input
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Peso (kg)
            <input
              type="number"
              min={0}
              step="0.1"
              value={weightKg}
              onChange={(event) => setWeightKg(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Color
            <input
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Tamano
            <select
              value={size}
              onChange={(event) => setSize(event.target.value as PetSize)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              {sizeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={isSterilized}
              onChange={(event) => setIsSterilized(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
            />
            Esterilizado
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-bold text-slate-900">Identidad y salud</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Numero de microchip
            <input
              value={microchipNumber}
              onChange={(event) => setMicrochipNumber(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Estado de salud
            <input
              value={healthStatus}
              onChange={(event) => setHealthStatus(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-3 grid gap-3">
          <label className="text-sm font-semibold text-slate-700">
            Alergias
            <textarea
              rows={2}
              value={allergies}
              onChange={(event) => setAllergies(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Enfermedades
            <textarea
              rows={2}
              value={diseases}
              onChange={(event) => setDiseases(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Medicamentos
            <textarea
              rows={2}
              value={medications}
              onChange={(event) => setMedications(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Alimentacion
            <textarea
              rows={2}
              value={feeding}
              onChange={(event) => setFeeding(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-bold text-slate-900">Contactos y visibilidad</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Veterinaria habitual
            <input
              value={usualVetName}
              onChange={(event) => setUsualVetName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Contacto veterinaria
            <input
              value={usualVetContact}
              onChange={(event) => setUsualVetContact(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Contacto de emergencia
            <input
              value={emergencyContactName}
              onChange={(event) => setEmergencyContactName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Telefono de emergencia
            <input
              value={emergencyContactPhone}
              onChange={(event) => setEmergencyContactPhone(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            Foto principal (URL)
            <input
              type="url"
              value={primaryPhotoUrl}
              onChange={(event) => setPrimaryPhotoUrl(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            Galeria (una URL por linea)
            <textarea
              rows={4}
              value={galleryText}
              onChange={(event) => setGalleryText(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            Notas generales
            <textarea
              rows={4}
              value={generalNotes}
              onChange={(event) => setGeneralNotes(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(event) => setIsPublic(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
            />
            Perfil publico
          </label>
        </div>
      </section>

      {composedError && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{composedError}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          {isSubmitting ? "Guardando..." : submitLabel}
        </button>
        {onDelete && (
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => {
              void onDelete();
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-rose-300 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
          >
            {isDeleting ? "Eliminando..." : "Eliminar mascota"}
          </button>
        )}
      </div>
    </form>
  );
}

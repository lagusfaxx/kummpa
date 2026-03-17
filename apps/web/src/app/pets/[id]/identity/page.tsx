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

const emergencyStatusOptions: Array<{ value: PetEmergencyStatus; label: string }> = [
  { value: "NORMAL", label: "Normal" },
  { value: "LOST", label: "Perdida" },
  { value: "FOUND", label: "Encontrada" },
  { value: "IN_TREATMENT", label: "En tratamiento" }
];

function statusBadgeClass(value: PetEmergencyStatus) {
  if (value === "LOST") return "bg-rose-100 text-rose-700";
  if (value === "FOUND") return "bg-emerald-100 text-emerald-700";
  if (value === "IN_TREATMENT") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

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
        showGeneralNotes: payload.identity.visibility.showGeneralNotes
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar identidad digital.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadIdentity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, petId]);

  const updateField = <K extends keyof PetPublicIdentityWritePayload>(
    key: K,
    value: PetPublicIdentityWritePayload[K]
  ) => {
    setForm((current) => {
      if (!current) return current;
      return {
        ...current,
        [key]: value
      };
    });
  };

  const handleTextInput =
    (key: "secondaryContactName" | "secondaryContactPhone" | "cityZone" | "emergencyInstructions" | "nfcCode") =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      updateField(key, event.target.value);
    };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !petId || !form) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updatePetPublicIdentity(accessToken, petId, form);
      setData(updated);
      setSuccess("Identidad digital actualizada.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar identidad digital.");
    } finally {
      setIsSaving(false);
    }
  };

  const copyPublicUrl = async () => {
    if (!data?.identity.urls.publicUrl) return;
    await navigator.clipboard.writeText(data.identity.urls.publicUrl);
    setSuccess("URL publica copiada al portapapeles.");
  };

  return (
    <AuthGate>
      <div className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Identidad digital QR/NFC</h1>
            <p className="text-sm text-slate-600">
              Configura el perfil de emergencia publico de tu mascota para QR y futura placa NFC.
            </p>
          </div>
          <Link
            href={`/pets/${petId}`}
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700"
          >
            Volver
          </Link>
        </header>

        {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {success && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}

        {isLoading || !data || !form ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Cargando identidad digital...
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {data.pet.name}{" "}
                  <span className={`ml-2 rounded-lg px-2 py-1 text-xs ${statusBadgeClass(form.emergencyStatus)}`}>
                    {emergencyStatusOptions.find((item) => item.value === form.emergencyStatus)?.label}
                  </span>
                </h2>
                <a
                  href={data.identity.urls.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-brand-700 underline"
                >
                  Abrir perfil publico
                </a>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                URL publica: {data.identity.urls.publicUrl}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void copyPublicUrl();
                  }}
                  className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700"
                >
                  Copiar URL
                </button>
                <a
                  href={data.identity.urls.qrImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={`qr-${data.pet.name}.png`}
                  className="inline-flex min-h-10 items-center rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white"
                >
                  Descargar QR
                </a>
              </div>
              <div className="mt-3 w-fit rounded-xl border border-slate-200 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.identity.urls.qrImageUrl}
                  alt={`QR de ${data.pet.name}`}
                  className="h-44 w-44 rounded-lg object-cover"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-bold text-slate-900">Datos y privacidad</h2>
              <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void handleSave(event)}>
                <label className="text-sm font-semibold text-slate-700">
                  Estado de emergencia
                  <select
                    value={form.emergencyStatus}
                    onChange={(event) => updateField("emergencyStatus", event.target.value as PetEmergencyStatus)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {emergencyStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Codigo NFC (opcional)
                  <input
                    value={form.nfcCode ?? ""}
                    onChange={handleTextInput("nfcCode")}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    placeholder="NFC-PET-001"
                  />
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Contacto secundario
                  <input
                    value={form.secondaryContactName ?? ""}
                    onChange={handleTextInput("secondaryContactName")}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Telefono secundario
                  <input
                    value={form.secondaryContactPhone ?? ""}
                    onChange={handleTextInput("secondaryContactPhone")}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                  Ciudad / zona visible
                  <input
                    value={form.cityZone ?? ""}
                    onChange={handleTextInput("cityZone")}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Santiago Centro, La Florida, etc."
                  />
                </label>

                <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                  Instrucciones de emergencia
                  <textarea
                    rows={3}
                    value={form.emergencyInstructions ?? ""}
                    onChange={handleTextInput("emergencyInstructions")}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Indicaciones criticas para quien encuentre a la mascota."
                  />
                </label>

                <div className="sm:col-span-2">
                  <p className="mb-2 text-sm font-semibold text-slate-700">Visibilidad publica</p>
                  <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={form.showOwnerName} onChange={(event) => updateField("showOwnerName", event.target.checked)} />
                      Mostrar nombre tutor
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={form.showOwnerPhone} onChange={(event) => updateField("showOwnerPhone", event.target.checked)} />
                      Mostrar telefono tutor
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={form.showSecondaryContact} onChange={(event) => updateField("showSecondaryContact", event.target.checked)} />
                      Mostrar contacto secundario
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={form.showCityZone} onChange={(event) => updateField("showCityZone", event.target.checked)} />
                      Mostrar ciudad/zona
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={form.showAllergies} onChange={(event) => updateField("showAllergies", event.target.checked)} />
                      Mostrar alergias
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={form.showDiseases} onChange={(event) => updateField("showDiseases", event.target.checked)} />
                      Mostrar enfermedades
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={form.showMedications} onChange={(event) => updateField("showMedications", event.target.checked)} />
                      Mostrar medicamentos
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={form.showUsualVet} onChange={(event) => updateField("showUsualVet", event.target.checked)} />
                      Mostrar veterinaria habitual
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={form.showEmergencyInstructions} onChange={(event) => updateField("showEmergencyInstructions", event.target.checked)} />
                      Mostrar instrucciones de emergencia
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={form.showGeneralNotes} onChange={(event) => updateField("showGeneralNotes", event.target.checked)} />
                      Mostrar notas generales
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isSaving ? "Guardando..." : "Guardar identidad digital"}
                  </button>
                </div>
              </form>
            </section>
          </>
        )}
      </div>
    </AuthGate>
  );
}

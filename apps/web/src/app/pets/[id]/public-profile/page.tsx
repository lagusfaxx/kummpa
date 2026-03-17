"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { SurfaceSkeleton } from "@/components/feedback/skeleton";
import { useAuth } from "@/features/auth/auth-context";
import { getPetPublicProfile, updatePetPublicProfile } from "@/features/pets/pets-api";
import type {
  PetPublicProfileManaged,
  PetPublicProfileWritePayload
} from "@/features/pets/types";
import { useToast } from "@/features/ui/toast-context";

function toTraitsInput(traits: string[]) {
  return traits.join(", ");
}

function parseTraitsInput(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function PetPublicProfilePage() {
  const params = useParams<{ id: string }>();
  const petId = typeof params.id === "string" ? params.id : "";
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.tokens.accessToken;

  const [data, setData] = useState<PetPublicProfileManaged | null>(null);
  const [form, setForm] = useState<PetPublicProfileWritePayload | null>(null);
  const [traitsInput, setTraitsInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPublicProfile = async () => {
    if (!accessToken || !petId) return;
    setIsLoading(true);
    setError(null);

    try {
      const payload = await getPetPublicProfile(accessToken, petId);
      setData(payload);
      setForm({
        headline: payload.publicProfile.headline ?? "",
        biography: payload.publicProfile.biography ?? "",
        cityLabel: payload.publicProfile.cityLabel ?? "",
        traits: payload.publicProfile.traits,
        showOwnerName: payload.publicProfile.visibility.showOwnerName,
        showOwnerPhone: payload.publicProfile.visibility.showOwnerPhone,
        showHealthDetails: payload.publicProfile.visibility.showHealthDetails,
        showEmergencyContacts: payload.publicProfile.visibility.showEmergencyContacts
      });
      setTraitsInput(toTraitsInput(payload.publicProfile.traits));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el perfil publico.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPublicProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, petId]);

  const updateField = <K extends keyof PetPublicProfileWritePayload>(
    key: K,
    value: PetPublicProfileWritePayload[K]
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
    (key: "headline" | "biography" | "cityLabel") =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      updateField(key, event.target.value);
    };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !petId || !form) return;

    const payload: PetPublicProfileWritePayload = {
      ...form,
      traits: parseTraitsInput(traitsInput)
    };

    setIsSaving(true);
    setError(null);

    try {
      const updated = await updatePetPublicProfile(accessToken, petId, payload);
      setData(updated);
      setForm({
        headline: updated.publicProfile.headline ?? "",
        biography: updated.publicProfile.biography ?? "",
        cityLabel: updated.publicProfile.cityLabel ?? "",
        traits: updated.publicProfile.traits,
        showOwnerName: updated.publicProfile.visibility.showOwnerName,
        showOwnerPhone: updated.publicProfile.visibility.showOwnerPhone,
        showHealthDetails: updated.publicProfile.visibility.showHealthDetails,
        showEmergencyContacts: updated.publicProfile.visibility.showEmergencyContacts
      });
      setTraitsInput(toTraitsInput(updated.publicProfile.traits));
      showToast({
        tone: "success",
        title: "Perfil publico actualizado",
        description: "Los cambios visibles de esta mascota ya quedaron publicados."
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el perfil publico.");
    } finally {
      setIsSaving(false);
    }
  };

  const previewTraits = useMemo(() => parseTraitsInput(traitsInput), [traitsInput]);

  const copyPublicUrl = async () => {
    if (!data?.pet.shareUrl) return;
    try {
      await navigator.clipboard.writeText(data.pet.shareUrl);
      showToast({
        tone: "success",
        title: "URL copiada",
        description: "El enlace publico quedo copiado al portapapeles."
      });
    } catch {
      showToast({
        tone: "error",
        title: "No se pudo copiar la URL",
        description: "Intenta nuevamente desde un navegador con permisos de portapapeles."
      });
    }
  };

  return (
    <AuthGate>
      <div className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Perfil publico</h1>
            <p className="text-sm text-slate-600">
              Controla la version compartible del perfil social y sanitario de tu mascota.
            </p>
          </div>
          <Link
            href={`/pets/${petId}`}
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700"
          >
            Volver
          </Link>
        </header>

        {error && <InlineBanner tone="error">{error}</InlineBanner>}

        {isLoading || !data || !form ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <SurfaceSkeleton blocks={6} />
            <SurfaceSkeleton blocks={4} />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <form className="grid gap-3" onSubmit={(event) => void handleSave(event)}>
                <h2 className="text-lg font-bold text-slate-900">Contenido visible</h2>
                <input
                  value={form.headline ?? ""}
                  onChange={handleTextInput("headline")}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Titular corto para el perfil publico"
                />
                <input
                  value={form.cityLabel ?? ""}
                  onChange={handleTextInput("cityLabel")}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Ciudad o zona visible"
                />
                <textarea
                  rows={5}
                  value={form.biography ?? ""}
                  onChange={handleTextInput("biography")}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Historia breve, personalidad y datos utiles."
                />
                <input
                  value={traitsInput}
                  onChange={(event) => setTraitsInput(event.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Sociable, jugueton, senior, rescue"
                />

                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">Privacidad</p>
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
                      <input type="checkbox" checked={form.showHealthDetails} onChange={(event) => updateField("showHealthDetails", event.target.checked)} />
                      Mostrar salud y vet
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={form.showEmergencyContacts} onChange={(event) => updateField("showEmergencyContacts", event.target.checked)} />
                      Mostrar contactos de emergencia
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isSaving ? "Guardando..." : "Guardar perfil publico"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void copyPublicUrl();
                    }}
                    className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700"
                  >
                    Copiar URL
                  </button>
                </div>
              </form>
            </section>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="text-lg font-bold text-slate-900">Preview publico</h2>
                <p className="mt-1 text-xs text-slate-500">{data.pet.shareUrl}</p>
                <a
                  href={data.pet.shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-xs font-semibold text-brand-700 underline"
                >
                  Abrir perfil compartido
                </a>
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-lg font-black text-slate-900">{data.pet.name}</p>
                  <p className="text-sm text-slate-600">
                    {data.pet.species} · {data.pet.breed}
                  </p>
                  {form.headline && <p className="mt-2 text-sm font-semibold text-slate-800">{form.headline}</p>}
                  {form.cityLabel && <p className="mt-1 text-xs text-slate-500">{form.cityLabel}</p>}
                  {form.biography && <p className="mt-2 text-sm text-slate-700">{form.biography}</p>}
                  {previewTraits.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {previewTraits.map((trait) => (
                        <span key={trait} className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">
                          {trait}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="text-lg font-bold text-slate-900">Datos visibles hoy</h2>
                <div className="mt-2 space-y-2 text-sm text-slate-700">
                  <p>Tutor: {data.preview.ownerName ?? "Oculto"}</p>
                  <p>Telefono: {data.preview.ownerPhone ?? "Oculto"}</p>
                  <p>Salud: {data.preview.healthSummary ? "Visible" : "Oculta"}</p>
                  <p>Emergencia: {data.preview.emergencyContacts ? "Visible" : "Oculta"}</p>
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </AuthGate>
  );
}

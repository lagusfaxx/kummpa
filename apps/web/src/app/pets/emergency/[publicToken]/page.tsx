import type { PublicEmergencyPetProfile } from "@/features/pets/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function fetchEmergencyProfile(publicToken: string): Promise<PublicEmergencyPetProfile | null> {
  const response = await fetch(`${API_URL}/api/v1/pets/public-identity/${publicToken}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { ok: boolean; data?: PublicEmergencyPetProfile };
  if (!payload.ok || !payload.data) {
    return null;
  }

  return payload.data;
}

function statusLabel(value: PublicEmergencyPetProfile["pet"]["emergencyStatus"]) {
  if (value === "LOST") return "Perdida";
  if (value === "FOUND") return "Encontrada";
  if (value === "IN_TREATMENT") return "En tratamiento";
  return "Normal";
}

function statusClass(value: PublicEmergencyPetProfile["pet"]["emergencyStatus"]) {
  if (value === "LOST") return "bg-rose-100 text-rose-700";
  if (value === "FOUND") return "bg-emerald-100 text-emerald-700";
  if (value === "IN_TREATMENT") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

interface PageProps {
  params: {
    publicToken: string;
  };
}

export default async function EmergencyPublicProfilePage({ params }: PageProps) {
  const profile = await fetchEmergencyProfile(params.publicToken);

  if (!profile) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Perfil de emergencia no disponible.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{profile.pet.name}</h1>
            <p className="text-sm text-slate-600">
              {profile.pet.species} - {profile.pet.breed}
            </p>
          </div>
          <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusClass(profile.pet.emergencyStatus)}`}>
            {statusLabel(profile.pet.emergencyStatus)}
          </span>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-900">Contacto inmediato</h2>
        <div className="mt-3 grid gap-2 text-sm text-slate-700">
          {profile.contacts.ownerName && (
            <p>
              <span className="font-semibold">Tutor:</span> {profile.contacts.ownerName}
            </p>
          )}
          {profile.contacts.ownerPhone && (
            <p>
              <span className="font-semibold">Telefono tutor:</span>{" "}
              <a href={`tel:${profile.contacts.ownerPhone.replace(/\s+/g, "")}`} className="font-semibold text-brand-700 underline">
                {profile.contacts.ownerPhone}
              </a>
            </p>
          )}
          {profile.contacts.secondaryContact && (
            <p>
              <span className="font-semibold">Contacto secundario:</span>{" "}
              {profile.contacts.secondaryContact.name ?? "-"}{" "}
              {profile.contacts.secondaryContact.phone ? `(${profile.contacts.secondaryContact.phone})` : ""}
            </p>
          )}
          {profile.contacts.cityZone && (
            <p>
              <span className="font-semibold">Ciudad/zona:</span> {profile.contacts.cityZone}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-900">Ficha de salud</h2>
        <div className="mt-3 grid gap-2 text-sm text-slate-700">
          {profile.health.allergies && (
            <p>
              <span className="font-semibold">Alergias:</span> {profile.health.allergies}
            </p>
          )}
          {profile.health.diseases && (
            <p>
              <span className="font-semibold">Enfermedades:</span> {profile.health.diseases}
            </p>
          )}
          {profile.health.medications && (
            <p>
              <span className="font-semibold">Medicamentos:</span> {profile.health.medications}
            </p>
          )}
          {profile.health.usualVet && (profile.health.usualVet.name || profile.health.usualVet.contact) && (
            <p>
              <span className="font-semibold">Veterinaria habitual:</span>{" "}
              {profile.health.usualVet.name ?? "-"}{" "}
              {profile.health.usualVet.contact ? `(${profile.health.usualVet.contact})` : ""}
            </p>
          )}
          {profile.health.emergencyInstructions && (
            <p>
              <span className="font-semibold">Instrucciones de emergencia:</span>{" "}
              {profile.health.emergencyInstructions}
            </p>
          )}
          {profile.health.generalNotes && (
            <p>
              <span className="font-semibold">Notas:</span> {profile.health.generalNotes}
            </p>
          )}
          {!profile.health.allergies &&
            !profile.health.diseases &&
            !profile.health.medications &&
            !profile.health.usualVet?.name &&
            !profile.health.usualVet?.contact &&
            !profile.health.emergencyInstructions &&
            !profile.health.generalNotes && (
              <p className="text-slate-500">Este perfil no expone datos medicos adicionales.</p>
            )}
        </div>
      </section>
    </div>
  );
}

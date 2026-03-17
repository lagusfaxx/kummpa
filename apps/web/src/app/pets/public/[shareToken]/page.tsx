import type { PublicPetProfile } from "@/features/pets/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function fetchPublicPet(shareToken: string): Promise<PublicPetProfile | null> {
  const response = await fetch(`${API_URL}/api/v1/pets/public/${shareToken}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    ok: boolean;
    data?: PublicPetProfile;
  };

  if (!payload.ok || !payload.data) {
    return null;
  }

  return payload.data;
}

interface PageProps {
  params: {
    shareToken: string;
  };
}

export default async function PublicPetPage({ params }: PageProps) {
  const pet = await fetchPublicPet(params.shareToken);

  if (!pet) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Perfil publico no disponible.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">{pet.name}</h1>
        <p className="text-sm text-slate-600">
          {pet.species} · {pet.breed} · {pet.sex}
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-900">Informacion de emergencia</h2>
        <div className="mt-3 grid gap-2 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Tutor:</span> {pet.owner.fullName}
          </p>
          <p>
            <span className="font-semibold">Telefono:</span> {pet.owner.phone ?? "-"}
          </p>
          <p>
            <span className="font-semibold">Ubicacion:</span> {pet.owner.city ?? "-"} {pet.owner.district ?? ""}
          </p>
          <p>
            <span className="font-semibold">Alergias:</span> {pet.allergies ?? "-"}
          </p>
          <p>
            <span className="font-semibold">Enfermedades:</span> {pet.diseases ?? "-"}
          </p>
          <p>
            <span className="font-semibold">Medicamentos:</span> {pet.medications ?? "-"}
          </p>
          <p>
            <span className="font-semibold">Contacto emergencia:</span> {pet.emergencyContactName ?? "-"}{" "}
            {pet.emergencyContactPhone ? `(${pet.emergencyContactPhone})` : ""}
          </p>
          <p>
            <span className="font-semibold">Notas:</span> {pet.generalNotes ?? "-"}
          </p>
        </div>
      </section>
    </div>
  );
}

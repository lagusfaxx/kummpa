import type { PublicVaccineCard } from "@/features/vaccines/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function fetchPublicVaccineCard(shareToken: string): Promise<PublicVaccineCard | null> {
  const response = await fetch(`${API_URL}/api/v1/pets/public/${shareToken}/vaccine-card`, {
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { ok: boolean; data?: PublicVaccineCard };
  if (!payload.ok || !payload.data) {
    return null;
  }

  return payload.data;
}

function isoToDateInput(value?: string | null) {
  if (!value) return "-";
  return value.split("T")[0] ?? "-";
}

interface PageProps {
  params: {
    shareToken: string;
  };
}

export default async function PublicVaccineCardPage({ params }: PageProps) {
  const card = await fetchPublicVaccineCard(params.shareToken);

  if (!card) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Carnet publico no disponible.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Carnet de vacunacion de {card.pet.name}
        </h1>
        <p className="text-sm text-slate-600">
          {card.pet.species} · {card.pet.breed} · Tutor: {card.pet.ownerName}
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
          <p>
            <span className="font-semibold">Estado general:</span> {card.summary.overallStatus}
          </p>
          <p>
            <span className="font-semibold">Total vacunas:</span> {card.summary.totalVaccines}
          </p>
          <p>
            <span className="font-semibold">Vencidas:</span> {card.summary.overdueCount}
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-2">Vacuna</th>
                <th className="py-2">Aplicacion</th>
                <th className="py-2">Proxima dosis</th>
                <th className="py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {card.history.map((record) => (
                <tr key={record.id} className="border-b border-slate-100">
                  <td className="py-2">{record.vaccineName}</td>
                  <td className="py-2">{isoToDateInput(record.appliedAt)}</td>
                  <td className="py-2">{isoToDateInput(record.nextDoseAt)}</td>
                  <td className="py-2">{record.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/features/auth/auth-context";
import { getVaccineCard } from "@/features/vaccines/vaccines-api";
import type { PetVaccineCard } from "@/features/vaccines/types";

function isoToDateInput(value?: string | null) {
  if (!value) return "-";
  return value.split("T")[0] ?? "-";
}

function PrintableCardContent() {
  const params = useParams<{ id: string }>();
  const petId = typeof params.id === "string" ? params.id : "";
  const searchParams = useSearchParams();
  const format = searchParams.get("format") === "card" ? "card" : "sheet";
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;
  const [card, setCard] = useState<PetVaccineCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !petId) return;

    const load = async () => {
      setError(null);
      try {
        const data = await getVaccineCard(accessToken, petId);
        setCard(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el carnet.");
      }
    };

    void load();
  }, [accessToken, petId]);

  return (
    <AuthGate>
      <div className="space-y-4">
        <div className="print:hidden flex items-center justify-between">
          <h1 className="text-xl font-black text-slate-900">Vista imprimible del carnet</h1>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Descargar PDF / Imprimir
          </button>
        </div>

        {error && <p className="print:hidden rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

        {!card ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Cargando carnet...
          </div>
        ) : (
          <div
            className={`rounded-2xl border border-slate-300 bg-white p-5 ${
              format === "card" ? "mx-auto max-w-xl" : ""
            }`}
          >
            <header className="border-b border-slate-200 pb-3">
              <h2 className="text-xl font-black text-slate-900">Carnet de vacunacion</h2>
              <p className="text-sm text-slate-600">
                {card.pet.name} · {card.pet.species} · {card.pet.breed}
              </p>
              <p className="text-xs text-slate-500">
                Tutor: {card.pet.ownerName} · Microchip: {card.pet.microchipNumber ?? "-"}
              </p>
            </header>

            <div className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
              <p>
                <span className="font-semibold">Nacimiento:</span> {isoToDateInput(card.pet.birthDate)}
              </p>
              <p>
                <span className="font-semibold">Estado sanitario:</span> {card.pet.healthStatus ?? "-"}
              </p>
              <p>
                <span className="font-semibold">Total vacunas:</span> {card.summary.totalVaccines}
              </p>
              <p>
                <span className="font-semibold">Estado:</span> {card.summary.overallStatus}
              </p>
            </div>

            <table className="mt-4 w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-2">Vacuna</th>
                  <th className="py-2">Aplicacion</th>
                  <th className="py-2">Proxima dosis</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {card.history.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-2">{item.vaccineName}</td>
                    <td className="py-2">{isoToDateInput(item.appliedAt)}</td>
                    <td className="py-2">{isoToDateInput(item.nextDoseAt)}</td>
                    <td className="py-2">{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AuthGate>
  );
}

export default function VaccinePrintPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Preparando vista imprimible...
        </div>
      }
    >
      <PrintableCardContent />
    </Suspense>
  );
}

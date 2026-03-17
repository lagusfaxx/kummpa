"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listBenefits } from "@/features/benefits/benefits-api";
import type { BenefitItem } from "@/features/benefits/types";
import { useAuth } from "@/features/auth/auth-context";
import { listPets } from "@/features/pets/pets-api";
import { getVaccineCard } from "@/features/vaccines/vaccines-api";

export function HomeHub() {
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;
  const [petStatus, setPetStatus] = useState("Sin mascotas");
  const [benefits, setBenefits] = useState<BenefitItem[]>([]);

  useEffect(() => {
    if (!accessToken) return;
    void (async () => {
      const pets = await listPets(accessToken);
      const firstPet = pets[0];
      if (!firstPet) return;
      const card = await getVaccineCard(accessToken, firstPet.id).catch(() => null);
      setPetStatus(card?.summary.overallStatus === "OVERDUE" ? "Vacuna vencida" : "Al dia");
      const featured = await listBenefits(accessToken, { featuredOnly: true, limit: 3, validOnly: true });
      setBenefits(featured);
    })();
  }, [accessToken]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-4">
      <section className="flex flex-col items-center gap-4 py-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Encuentra todo para tu mascota
        </h1>
        <p className="max-w-lg text-base text-[hsl(var(--muted-foreground))]">
          Busca servicios, productos y lugares cerca de ti.
        </p>
        <Link
          href="/explore"
          className="mt-2 flex w-full max-w-xl items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left text-base text-slate-400 shadow-sm transition hover:shadow-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" /></svg>
          Buscar peluqueria, veterinaria, bravery...
        </Link>
      </section>

      <section className="card p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Estado de mascota</p>
        <p className="mt-2 text-2xl font-semibold">{petStatus}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Link className="card flex items-center gap-3 p-4 text-sm font-semibold transition hover:shadow-md" href="/explore">
          <span className="text-lg">🔍</span> Explorar y reservar
        </Link>
        <Link className="card flex items-center gap-3 p-4 text-sm font-semibold transition hover:shadow-md" href="/pets/new">
          <span className="text-lg">🐾</span> Agregar mascota
        </Link>
        <Link className="card flex items-center gap-3 p-4 text-sm font-semibold transition hover:shadow-md" href="/lost-pets">
          <span className="text-lg">🚨</span> Ver alertas
        </Link>
      </section>

      {benefits.length > 0 && (
        <section className="card p-5">
          <h2 className="text-lg font-semibold">Descuentos destacados</h2>
          <div className="mt-3 space-y-2 text-sm">
            {benefits.map((benefit) => (
              <div key={benefit.id} className="rounded-xl border border-slate-200 p-3">
                <p className="font-semibold">{benefit.title}</p>
                <p className="text-[hsl(var(--muted-foreground))]">{benefit.discountLabel ?? "Oferta activa"}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

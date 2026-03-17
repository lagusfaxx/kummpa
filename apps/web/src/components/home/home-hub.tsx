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
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="kumpa-hero p-6">
        <h1 className="text-3xl font-bold">Explorar primero</h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Busca servicios, productos y lugares desde una sola barra.</p>
        <Link href="/explore" className="mt-4 inline-flex w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm">Buscar peluqueria, bravery, veterinaria...</Link>
      </section>

      <section className="card p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Estado de mascota</p>
        <p className="mt-2 text-2xl font-semibold">{petStatus}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Link className="card p-4 text-sm font-semibold" href="/explore">Explorar y reservar</Link>
        <Link className="card p-4 text-sm font-semibold" href="/pets/new">Agregar mascota</Link>
        <Link className="card p-4 text-sm font-semibold" href="/lost-pets">Ver alertas</Link>
      </section>

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
    </div>
  );
}

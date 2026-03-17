"use client";

import { useEffect, useState } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/features/auth/auth-context";
import { getBusinessDashboard } from "@/features/profiles/business-api";

export default function BusinessPage() {
  const { session } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const token = session?.tokens.accessToken;
    if (!token) return;
    void getBusinessDashboard(token).then(setData).catch(() => setData(null));
  }, [session?.tokens.accessToken]);

  return (
    <AuthGate>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Panel de comercios</h1>
        <p className="text-sm text-slate-600">Gestiona perfil, servicios, precios, promociones y horarios.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <section className="card p-4"><h2 className="font-semibold">Perfil</h2><pre className="mt-2 text-xs">{JSON.stringify(data?.profile ?? {}, null, 2)}</pre></section>
          <section className="card p-4"><h2 className="font-semibold">Reservas</h2><p className="mt-2 text-2xl font-bold">{data?.appointments ?? 0}</p></section>
        </div>
        <section className="card p-4">
          <h2 className="font-semibold">Promociones activas</h2>
          <ul className="mt-2 space-y-2 text-sm">{(data?.promotions ?? []).map((promo: any) => <li key={promo.id}>{promo.title} - {promo.discountLabel ?? "Oferta"}</li>)}</ul>
        </section>
      </div>
    </AuthGate>
  );
}

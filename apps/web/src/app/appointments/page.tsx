"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AppointmentsRedirect() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const providerType = params.get("providerType");
    const providerId   = params.get("providerId");

    if (providerId && providerType === "VET") {
      router.replace(`/explore/vet/${providerId}`);
      return;
    }
    if (providerId && providerType === "SHOP") {
      router.replace(`/explore/shop/${providerId}`);
      return;
    }
    if (providerId && providerType === "GROOMING") {
      router.replace(`/explore/groomer/${providerId}`);
      return;
    }
    if (providerId) {
      router.replace(`/explore`);
    }
  }, [params, router]);

  const providerType = params.get("providerType");
  const providerId   = params.get("providerId");
  const isRedirecting = !!(providerId);

  if (isRedirecting) {
    return (
      <div className="mx-auto max-w-3xl">
        <section className="card p-8 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Redirigiendo...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <section className="card p-8 text-center">
        <span className="kumpa-eyebrow">Reservas</span>
        <h1 className="mt-3 text-3xl font-bold">Busca y reserva desde Cerca de ti</h1>
        <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          Busca veterinarias, peluquerías, paseos y más. Selecciona un servicio y reserva directamente desde su ficha.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/explore" className="btn btn-primary">Ir a Cerca de ti</Link>
          <Link href="/account" className="btn btn-outline">Ver mi historial</Link>
        </div>
      </section>
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-3xl">
        <section className="card p-8 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent" />
        </section>
      </div>
    }>
      <AppointmentsRedirect />
    </Suspense>
  );
}

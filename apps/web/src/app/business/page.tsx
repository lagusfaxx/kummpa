"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { SurfaceSkeleton } from "@/components/feedback/skeleton";
import { PageIntro } from "@/components/layout/page-intro";
import { useAuth } from "@/features/auth/auth-context";
import { getBusinessDashboard } from "@/features/profiles/business-api";

export default function BusinessPage() {
  const { session } = useAuth();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = session?.tokens.accessToken;
    if (!token) return;
    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getBusinessDashboard(token);
        setData(response);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el dashboard.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [session?.tokens.accessToken]);

  const metrics = useMemo(() => ([
    { value: String(data?.appointments ?? 0), label: "reservas" },
    { value: String(data?.promotions?.length ?? 0), label: "promos" },
    { value: String(data?.services?.length ?? 0), label: "servicios" },
    { value: data?.profile?.businessName || data?.profile?.clinicName || "negocio", label: "perfil" }
  ]), [data]);

  return (
    <AuthGate>
      <div className="space-y-6">
        <PageIntro
          eyebrow="Dashboard"
          title="Panel para comercios y servicios"
          description="Veterinarias, tiendas, peluquerias y hoteles gestionan su perfil, promociones, horarios y visibilidad desde aqui."
          tone="health"
          metrics={metrics}
        />

        {error ? <InlineBanner tone="error">{error}</InlineBanner> : null}

        {isLoading ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <SurfaceSkeleton blocks={5} />
            <SurfaceSkeleton blocks={5} />
            <SurfaceSkeleton blocks={5} />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="card p-5">
              <span className="kumpa-eyebrow">Perfil negocio</span>
              <h2 className="mt-3 text-2xl font-bold">{data?.profile?.businessName || data?.profile?.clinicName || "Tu negocio"}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.2rem] border border-[hsl(var(--border))] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Direccion</p>
                  <p className="mt-2 text-sm font-medium">{data?.profile?.address || "No configurada"}</p>
                </div>
                <div className="rounded-[1.2rem] border border-[hsl(var(--border))] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Contacto</p>
                  <p className="mt-2 text-sm font-medium">{data?.profile?.contactPhone || data?.profile?.contactEmail || "No configurado"}</p>
                </div>
                <div className="rounded-[1.2rem] border border-[hsl(var(--border))] p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Servicios / catalogo</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(data?.services ?? data?.profile?.services ?? data?.profile?.basicCatalog ?? []).slice(0, 8).map((item: string) => (
                      <span key={item} className="kumpa-chip">{item}</span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <div className="space-y-4">
              <section className="card p-5">
                <span className="kumpa-eyebrow">Promociones activas</span>
                <div className="mt-4 space-y-3">
                  {(data?.promotions ?? []).length === 0 ? (
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Aun no tienes promociones activas.</p>
                  ) : (
                    (data?.promotions ?? []).map((promo: any) => (
                      <article key={promo.id} className="rounded-[1.2rem] border border-[hsl(var(--border))] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold">{promo.title}</p>
                          <span className="rounded-full bg-[hsl(var(--accent))] px-3 py-1 text-xs font-bold text-white">{promo.discountLabel ?? "Promo"}</span>
                        </div>
                        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{promo.description || "Promocion visible en explorar."}</p>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="card p-5">
                <span className="kumpa-eyebrow">Actividad</span>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.2rem] border border-[hsl(var(--border))] p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Reservas</p>
                    <p className="mt-2 text-3xl font-bold">{data?.appointments ?? 0}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-[hsl(var(--border))] p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Promos</p>
                    <p className="mt-2 text-3xl font-bold">{data?.promotions?.length ?? 0}</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  );
}

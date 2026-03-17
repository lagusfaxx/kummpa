"use client";

import { useEffect, useState } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/features/auth/auth-context";
import { getBusinessDashboard, getBusinessServices, getBusinessPromotions, getBusinessSchedule } from "@/features/profiles/business-api";

type TabId = "perfil" | "servicios" | "promociones" | "horarios";

const TABS: { id: TabId; label: string }[] = [
  { id: "perfil", label: "Perfil" },
  { id: "servicios", label: "Servicios y precios" },
  { id: "promociones", label: "Promociones" },
  { id: "horarios", label: "Horarios" },
];

export default function BusinessPage() {
  const { session } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("perfil");

  useEffect(() => {
    const token = session?.tokens.accessToken;
    if (!token) return;
    void getBusinessDashboard(token).then(setDashboard).catch(() => setDashboard(null));
    void getBusinessServices(token).then(setServices).catch(() => setServices([]));
    void getBusinessPromotions(token).then(setPromotions).catch(() => setPromotions([]));
    void getBusinessSchedule(token).then(setSchedule).catch(() => setSchedule([]));
  }, [session?.tokens.accessToken]);

  return (
    <AuthGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Panel de comercio</h1>
          <p className="mt-1 text-sm text-slate-600">Gestiona tu negocio, servicios, promociones y horarios.</p>
        </div>

        <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "perfil" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="card p-5">
              <h2 className="font-semibold">Perfil del negocio</h2>
              <p className="mt-1 text-xs text-slate-500">Rol: {dashboard?.role ?? "-"}</p>
              <pre className="mt-3 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">{JSON.stringify(dashboard?.profile ?? {}, null, 2)}</pre>
            </section>
            <section className="card p-5">
              <h2 className="font-semibold">Resumen de reservas</h2>
              <p className="mt-3 text-4xl font-bold">{dashboard?.appointments ?? 0}</p>
              <p className="mt-1 text-sm text-slate-500">reservas totales</p>
            </section>
          </div>
        )}

        {activeTab === "servicios" && (
          <section className="card p-5">
            <h2 className="font-semibold">Servicios y precios</h2>
            {services.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No tienes servicios registrados.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {services.map((svc: any) => (
                  <div key={svc.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                    <div>
                      <p className="font-medium">{svc.name ?? svc.serviceType}</p>
                      <p className="text-xs text-slate-500">{svc.durationMinutes ? `${svc.durationMinutes} min` : ""}</p>
                    </div>
                    <p className="font-semibold">{svc.priceCents ? `$${(svc.priceCents / 100).toFixed(0)}` : "Sin precio"}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "promociones" && (
          <section className="card p-5">
            <h2 className="font-semibold">Promociones activas</h2>
            {promotions.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Sin promociones activas.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {promotions.map((promo: any) => (
                  <div key={promo.id} className="rounded-xl border border-slate-200 p-3">
                    <p className="font-medium">{promo.title}</p>
                    <p className="text-xs text-slate-500">{promo.discountLabel ?? "Oferta activa"}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "horarios" && (
          <section className="card p-5">
            <h2 className="font-semibold">Horarios de atencion</h2>
            {schedule.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Sin horarios configurados.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {schedule.map((slot: any, idx: number) => (
                  <div key={slot.id ?? idx} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm">
                    <p className="font-medium">Dia {slot.dayOfWeek}</p>
                    <p className="text-slate-600">{slot.startTime} - {slot.endTime}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </AuthGate>
  );
}

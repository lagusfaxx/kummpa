import { FEATURE_ROADMAP } from "@kumpa/config";
import { SectionCard } from "@kumpa/ui";
import Link from "next/link";

export function RoadmapGrid() {
  return (
    <SectionCard
      title="Ecosistema Pet"
      subtitle="Fase 1 deja la base lista para lanzar web en Coolify y evolucionar a app movil con Capacitor."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURE_ROADMAP.map((item, index) => (
          <article
            key={item.id}
            className={`rounded-2xl border p-3 transition ${
              index % 3 === 0
                ? "border-brand-100 bg-brand-50/70"
                : index % 3 === 1
                  ? "border-accent-100 bg-accent-50/80"
                  : "border-rose-100 bg-rose-50/70"
            }`}
          >
            <span
              className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                index % 3 === 0
                  ? "bg-white text-brand-700"
                  : index % 3 === 1
                    ? "bg-white text-accent-700"
                    : "bg-white text-rose-700"
              }`}
            >
              {index % 3 === 0 ? "Salud" : index % 3 === 1 ? "Comunidad" : "Alertas"}
            </span>
            <h3 className="text-sm font-semibold text-slate-900">{item.label}</h3>
            <p className="mt-1 text-xs text-slate-600">Modulo: {item.id}</p>
          </article>
        ))}
      </div>
      <div className="mt-4">
        <Link
          href="/architecture"
          className="inline-flex min-h-11 items-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition active:scale-[0.98]"
        >
          Ver arquitectura inicial
        </Link>
      </div>
    </SectionCard>
  );
}

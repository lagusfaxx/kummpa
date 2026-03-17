import type { ReactNode } from "react";

type PageIntroTone = "default" | "community" | "care" | "alert" | "health";

interface PageIntroMetric {
  value: string;
  label: string;
}

interface PageIntroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  tone?: PageIntroTone;
  metrics?: PageIntroMetric[];
}

const toneClasses: Record<PageIntroTone, string> = {
  default:
    "from-white/90 via-white/80 to-amber-50/80 border-[hsl(var(--border))]",
  community:
    "from-white/90 via-orange-50/80 to-rose-50/75 border-orange-200",
  care:
    "from-white/92 via-emerald-50/80 to-teal-50/70 border-emerald-200",
  health:
    "from-white/92 via-sky-50/80 to-emerald-50/70 border-sky-200",
  alert:
    "from-white/92 via-red-50/82 to-orange-50/70 border-red-200"
};

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
  tone = "default",
  metrics = []
}: PageIntroProps) {
  return (
    <header
      className={`kumpa-soft-section relative mb-6 overflow-hidden border bg-gradient-to-br p-5 sm:mb-8 sm:p-6 ${toneClasses[tone]}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)/0.15),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-40 bg-[radial-gradient(circle_at_center,hsl(var(--secondary)/0.15),transparent_58%)]" />

      <div className="relative flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            {eyebrow && <span className="kumpa-eyebrow">{eyebrow}</span>}
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h1>
            {description && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))] sm:text-base">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>

        {metrics.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <div key={`${metric.label}-${metric.value}`} className="kumpa-metric">
                <p className="text-xl font-bold text-[hsl(var(--foreground))] sm:text-2xl">
                  {metric.value}
                </p>
                <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

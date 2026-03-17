import type { ReactNode } from "react";

type PageIntroTone = "health" | "community" | "alert";

interface PageIntroMetric {
  label: string;
  value: string;
}

interface PageIntroProps {
  eyebrow: string;
  title: string;
  description: string;
  tone?: PageIntroTone;
  actions?: ReactNode;
  metrics?: PageIntroMetric[];
}

const toneClasses: Record<
  PageIntroTone,
  {
    container: string;
    eyebrow: string;
    text: string;
    metric: string;
  }
> = {
  health: {
    container:
      "border-[#d6ebdf] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(235,248,241,0.94),rgba(248,243,234,0.88))]",
    eyebrow: "border-[#c9e8dc] bg-white/85 text-[#0d6d56]",
    text: "text-slate-700",
    metric: "border-[#d5eadf] bg-white/88 text-slate-700"
  },
  community: {
    container:
      "border-[#f0dec2] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,244,228,0.94),rgba(250,247,241,0.9))]",
    eyebrow: "border-[#f0d7ab] bg-white/85 text-[#ad6400]",
    text: "text-slate-700",
    metric: "border-[#efdfc3] bg-white/88 text-slate-700"
  },
  alert: {
    container:
      "border-[#f3d5dd] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,240,244,0.94),rgba(250,247,241,0.9))]",
    eyebrow: "border-[#f3c4d0] bg-white/85 text-[#be2449]",
    text: "text-slate-700",
    metric: "border-[#f1d6dd] bg-white/88 text-slate-700"
  }
};

export function PageIntro({
  eyebrow,
  title,
  description,
  tone = "health",
  actions,
  metrics
}: PageIntroProps) {
  const styles = toneClasses[tone];

  return (
    <header
      className={`relative overflow-hidden rounded-[2.1rem] border px-5 py-5 shadow-[0_26px_70px_rgba(17,32,29,0.12)] sm:px-6 sm:py-6 ${styles.container}`}
    >
      <div className="pointer-events-none absolute left-0 top-0 h-32 w-44 bg-[radial-gradient(circle_at_top_left,rgba(0,200,150,0.18),transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-28 w-36 bg-[radial-gradient(circle_at_bottom_right,rgba(255,159,28,0.14),transparent_72%)]" />
      <div className="relative space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${styles.eyebrow}`}
            >
              {eyebrow}
            </span>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-[2rem]">
              {title}
            </h1>
            <p className={`mt-3 max-w-2xl text-sm leading-6 sm:text-[0.98rem] ${styles.text}`}>
              {description}
            </p>
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        {metrics && metrics.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((item) => (
              <div
                key={`${item.label}-${item.value}`}
                className={`rounded-[1.35rem] border px-4 py-3 ${styles.metric}`}
              >
                <p className="text-xl font-black tracking-tight text-slate-900">{item.value}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  eyebrow?: string;
  align?: "left" | "center";
}

export function EmptyState({
  title,
  description,
  action,
  eyebrow = "Sin contenido",
  align = "left"
}: EmptyStateProps) {
  const alignment = align === "center" ? "items-center text-center" : "items-start text-left";

  return (
    <section className="rounded-[1.75rem] border border-dashed border-slate-300/90 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(240,249,255,0.72))] p-6 shadow-[0_12px_24px_rgba(15,23,42,0.05)] sm:p-7">
      <div className={`flex flex-col gap-3 ${alignment}`}>
        <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
          {eyebrow}
        </span>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">{title}</h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {action && <div className="pt-1">{action}</div>}
      </div>
    </section>
  );
}

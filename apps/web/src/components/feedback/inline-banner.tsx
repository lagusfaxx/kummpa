import type { ReactNode } from "react";

type BannerTone = "error" | "success" | "info" | "warning";

const toneClasses: Record<BannerTone, string> = {
  error: "border-rose-200 bg-rose-50/90 text-rose-700",
  success: "border-emerald-200 bg-emerald-50/90 text-emerald-700",
  info: "border-sky-200 bg-sky-50/90 text-sky-700",
  warning: "border-amber-200 bg-amber-50/90 text-amber-700"
};

interface InlineBannerProps {
  tone?: BannerTone;
  title?: string;
  children: ReactNode;
}

export function InlineBanner({
  tone = "info",
  title,
  children
}: InlineBannerProps) {
  return (
    <div className={`rounded-2xl border p-3 text-sm shadow-sm ${toneClasses[tone]}`}>
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? "mt-1" : ""}>{children}</div>
    </div>
  );
}

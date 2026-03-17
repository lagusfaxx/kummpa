import type { ReactNode } from "react";

type BannerTone = "error" | "success" | "info" | "warning";

const toneClasses: Record<BannerTone, string> = {
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700"
};

interface InlineBannerProps {
  tone?: BannerTone;
  title?: string;
  children: ReactNode;
}

export function InlineBanner({ tone = "info", title, children }: InlineBannerProps) {
  return (
    <div className={`rounded-xl border p-4 text-sm ${toneClasses[tone]}`}>
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? "mt-1" : ""}>{children}</div>
    </div>
  );
}

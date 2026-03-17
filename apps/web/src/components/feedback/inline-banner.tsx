import type { ReactNode } from "react";

type BannerTone = "error" | "success" | "info" | "warning";

const toneClasses: Record<BannerTone, string> = {
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  success: "border-secondary/30 bg-secondary/10 text-secondary",
  info: "border-primary/20 bg-primary/5 text-primary",
  warning: "border-accent/40 bg-accent/10 text-accent-foreground"
};

interface InlineBannerProps {
  tone?: BannerTone;
  title?: string;
  children: ReactNode;
}

export function InlineBanner({ tone = "info", title, children }: InlineBannerProps) {
  return (
    <div className={`rounded-lg border p-3 text-sm ${toneClasses[tone]}`}>
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? "mt-1" : ""}>{children}</div>
    </div>
  );
}

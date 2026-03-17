import { clsx } from "clsx";
import type { HTMLAttributes, PropsWithChildren } from "react";

export interface SectionCardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
}

export function SectionCard({
  children,
  className,
  title,
  subtitle,
  ...props
}: PropsWithChildren<SectionCardProps>) {
  return (
    <section
      className={clsx(
        "rounded-[1.75rem] border border-white/70 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur sm:p-5",
        className
      )}
      {...props}
    >
      {(title || subtitle) && (
        <header className="mb-3 space-y-1">
          {title && <h2 className="text-lg font-semibold text-slate-900">{title}</h2>}
          {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

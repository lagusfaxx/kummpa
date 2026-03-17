import type { PropsWithChildren } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";

interface AuthCardProps extends PropsWithChildren {
  title: string;
  subtitle: string;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="relative mx-auto w-full max-w-lg overflow-hidden rounded-[2.25rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(249,247,242,0.94))] p-5 shadow-[0_28px_60px_rgba(17,32,29,0.14)] backdrop-blur sm:p-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.18),transparent_68%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-28 w-28 bg-[radial-gradient(circle_at_center,rgba(255,159,28,0.14),transparent_68%)]" />
      <div className="relative">
        <span className="inline-flex rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
          Acceso a Kumpa
        </span>
        <BrandLogo variant="wordmark" className="mt-4 h-20 w-44 sm:h-24 sm:w-52" priority />
        <header className="mt-5">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-[2.15rem]">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
          <p className="mt-3 max-w-md text-xs uppercase tracking-[0.16em] text-slate-500">
            Una sola cuenta para cuidado, agenda, comunidad y alertas.
          </p>
        </header>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

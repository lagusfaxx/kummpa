import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#0F172A] px-5 py-6 text-white shadow-[0_30px_70px_rgba(15,23,42,0.28)] sm:px-6 sm:py-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(0,200,150,0.22),transparent_48%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-52 bg-[radial-gradient(circle_at_center,rgba(255,159,28,0.16),transparent_55%)]" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-center">
        <div>
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-500">
            Electric Trust
          </span>
          <BrandLogo
            variant="wordmark"
            className="mt-4 h-24 w-52 sm:h-28 sm:w-60"
            priority
          />
          <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Salud, identidad y comunidad pet en una sola plataforma.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            Arquitectura full-stack con foco mobile-first, reservas, carnet digital, mapa,
            alertas, beneficios y preparacion real para Coolify y futura app con Capacitor.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/pets"
              className="inline-flex min-h-11 items-center rounded-2xl bg-brand-500 px-4 text-sm font-semibold text-slate-950 shadow-[0_12px_24px_rgba(0,200,150,0.26)] transition active:scale-[0.98]"
            >
              Explorar modulos
            </Link>
            <Link
              href="/deploy"
              className="inline-flex min-h-11 items-center rounded-2xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition active:scale-[0.98]"
            >
              Guia de deploy
            </Link>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-400">
                Salud
              </p>
              <p className="mt-2 text-sm text-slate-100">DNI pet, vacunas y recordatorios</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-500">
                Comunidad
              </p>
              <p className="mt-2 text-sm text-slate-100">Marketplace, beneficios y vida social</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FF4D6D]">
                Alertas
              </p>
              <p className="mt-2 text-sm text-slate-100">Mascotas perdidas y acciones rapidas</p>
            </article>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(30,41,59,0.82),rgba(15,23,42,0.98))] p-3 shadow-[0_24px_50px_rgba(0,0,0,0.24)]">
            <BrandLogo variant="dark-showcase" className="h-[16rem] w-[15rem] sm:h-[19rem] sm:w-[17rem]" priority />
          </div>
        </div>
      </div>
    </section>
  );
}

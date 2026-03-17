"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { useAuth } from "@/features/auth/auth-context";
import {
  AUDIENCE_HIGHLIGHTS,
  HOME_FLOW_STEPS,
  PRODUCT_SECTIONS,
  SECONDARY_SHORTCUTS,
  getQuickActions
} from "@/features/navigation/site-map";

const toneStyles = {
  health: {
    container:
      "border-[#d6ebdf] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(235,248,241,0.94),rgba(248,243,234,0.88))]",
    eyebrow: "border-[#c9e8dc] bg-white/85 text-[#0d6d56]"
  },
  community: {
    container:
      "border-[#f0dec2] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,244,228,0.94),rgba(250,247,241,0.9))]",
    eyebrow: "border-[#f0d7ab] bg-white/85 text-[#ad6400]"
  },
  alert: {
    container:
      "border-[#f3d5dd] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,240,244,0.94),rgba(250,247,241,0.9))]",
    eyebrow: "border-[#f3c4d0] bg-white/85 text-[#be2449]"
  }
} as const;

const roleLabels = {
  OWNER: "Tutor",
  VET: "Veterinaria",
  CAREGIVER: "Cuidador",
  SHOP: "Tienda",
  ADMIN: "Administracion"
} as const;

export function HomeHub() {
  const { isReady, isAuthenticated, session } = useAuth();
  const role = session?.user.role ?? null;
  const quickActions = getQuickActions(role);
  const isSignedIn = isReady && isAuthenticated;
  const audienceHighlights =
    role === "ADMIN"
      ? AUDIENCE_HIGHLIGHTS
      : AUDIENCE_HIGHLIGHTS.filter((item) => item.href !== "/admin");

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-[#10211d] bg-[#0f1f1d] px-5 py-6 text-white shadow-[0_36px_90px_rgba(15,31,29,0.28)] sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top_left,rgba(0,200,150,0.22),transparent_54%)]" />
        <div className="pointer-events-none absolute right-0 top-0 h-56 w-64 bg-[radial-gradient(circle_at_top,rgba(255,159,28,0.18),transparent_54%)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-44 w-60 bg-[radial-gradient(circle_at_bottom_left,rgba(255,77,109,0.15),transparent_55%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_360px] xl:items-start">
          <div>
            <span className="inline-flex rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
              Plataforma pet organizada
            </span>
            <BrandLogo
              variant="wordmark"
              className="mt-4 h-24 w-52 sm:h-28 sm:w-60"
              priority
            />
            <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-[3.1rem]">
              Cuidado, comunidad y alertas en una experiencia mucho mas clara.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">
              Kumpa ahora ordena sus funciones por momento de uso: primero el cuidado de tus
              mascotas, despues la agenda, luego el descubrimiento y finalmente la capa social y
              editorial. Nada tecnico, nada mezclado, nada fuera de lugar.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {isSignedIn ? (
                <>
                  <Link href="/pets" className="kumpa-button-primary">
                    Abrir mi ecosistema
                  </Link>
                  <Link href="/account" className="kumpa-button-secondary">
                    Ajustar mi perfil
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/register" className="kumpa-button-primary">
                    Crear cuenta
                  </Link>
                  <Link href="/login" className="kumpa-button-secondary">
                    Ingresar
                  </Link>
                </>
              )}
              <a href="#explorar" className="kumpa-button-accent">
                Explorar modulos
              </a>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-[1.45rem] border border-white/12 bg-white/7 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                  Mascotas
                </p>
                <p className="mt-2 text-sm text-slate-100">
                  Perfiles, carnet, identidad y enlaces publicos.
                </p>
              </article>
              <article className="rounded-[1.45rem] border border-white/12 bg-white/7 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200">
                  Agenda
                </p>
                <p className="mt-2 text-sm text-slate-100">
                  Reservas, disponibilidad y servicios operativos.
                </p>
              </article>
              <article className="rounded-[1.45rem] border border-white/12 bg-white/7 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">
                  Descubrimiento
                </p>
                <p className="mt-2 text-sm text-slate-100">
                  Mapa, beneficios y contenido para decidir mejor.
                </p>
              </article>
              <article className="rounded-[1.45rem] border border-white/12 bg-white/7 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-200">
                  Alertas
                </p>
                <p className="mt-2 text-sm text-slate-100">
                  Casos criticos con acceso rapido y prioridad visual.
                </p>
              </article>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/12 bg-white/8 p-4 backdrop-blur-xl sm:p-5">
            <span className="inline-flex rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
              {isSignedIn ? "Panel recomendado" : "Primeros pasos"}
            </span>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-white">
              {isSignedIn
                ? `${session?.user.firstName ?? "Tu cuenta"} en modo ${roleLabels[role as keyof typeof roleLabels]}`
                : "Empieza sin ruido"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              {isSignedIn
                ? "Estas son las acciones que mas sentido tienen para tu rol dentro de la app."
                : "Puedes revisar el mapa ahora mismo y crear cuenta cuando quieras activar agenda, comunidad o beneficios."}
            </p>
            <div className="mt-4 space-y-3">
              {quickActions.map((action) => (
                <Link
                  key={`${action.href}-${action.label}`}
                  href={action.href}
                  className="block rounded-[1.5rem] border border-white/10 bg-white/7 p-4 transition hover:bg-white/10"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{action.label}</p>
                    <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                      {action.badge}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{action.description}</p>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_360px]">
        <article className="kumpa-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <span className="inline-flex rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                Recorrido recomendado
              </span>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                La app se entiende mejor siguiendo un orden de uso real.
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                El flujo principal ya no depende de fases internas ni de la tecnologia. Primero se
                configura la base, luego se activa la operacion y despues se expande a comunidad y
                contenido.
              </p>
            </div>
            {!isSignedIn && (
              <Link href="/register" className="kumpa-button-primary">
                Crear mi cuenta
              </Link>
            )}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {HOME_FLOW_STEPS.map((step, index) => (
              <article
                key={step.title}
                className="rounded-[1.6rem] border border-black/8 bg-white/72 p-4"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#11201d] text-sm font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-3 text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="kumpa-panel-muted p-5 sm:p-6">
          <span className="inline-flex rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            Modulos complementarios
          </span>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
            Lo social y editorial queda accesible, pero no invade lo critico.
          </h2>
          <div className="mt-5 space-y-3">
            {SECONDARY_SHORTCUTS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="block rounded-[1.45rem] border border-black/8 bg-white/78 p-4 transition hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(17,32,29,0.08)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <span className="rounded-full border border-black/8 bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                    {item.badge}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section id="explorar" className="space-y-4 scroll-mt-24">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            Exploracion por areas
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
            Cada bloque ahora responde a un contexto de uso claro.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            En lugar de mostrar arquitectura, stack o fases de construccion en la portada, la app
            presenta directamente lo que cada persona necesita resolver.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {PRODUCT_SECTIONS.map((section) => (
            <article
              key={section.id}
              className={`relative overflow-hidden rounded-[2rem] border p-5 shadow-[0_24px_60px_rgba(17,32,29,0.08)] ${toneStyles[section.tone].container}`}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.45),transparent_72%)]" />
              <div className="relative">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${toneStyles[section.tone].eyebrow}`}
                >
                  {section.eyebrow}
                </span>
                <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                  {section.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{section.description}</p>
                <div className="mt-5 grid gap-3">
                  {section.links.map((link) => (
                    <Link
                      key={`${section.id}-${link.label}`}
                      href={link.href}
                      className="group rounded-[1.55rem] border border-black/8 bg-white/84 p-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(17,32,29,0.08)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="max-w-xl">
                          <h4 className="text-base font-bold text-slate-900">{link.label}</h4>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {link.description}
                          </p>
                        </div>
                        <span className="rounded-full border border-black/8 bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                          {link.badge}
                        </span>
                      </div>
                      <span className="mt-4 inline-flex text-sm font-semibold text-slate-900">
                        Abrir modulo
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {audienceHighlights.map((item) => (
          <article key={item.title} className="kumpa-panel p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {item.title}
            </p>
            <p className="mt-3 text-lg font-bold text-slate-900">{item.description}</p>
            <Link href={item.href} className="mt-4 inline-flex text-sm font-semibold text-slate-900">
              {item.cta}
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}

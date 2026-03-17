"use client";

import Link from "next/link";
import { useRef } from "react";
import { useAuth } from "@/features/auth/auth-context";

/* ─── SVG Icons ─────────────────────────────────────────────── */
function IcoMap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}
function IcoSyringe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <line x1="5" y1="19" x2="19" y2="5" />
      <path d="M15 5l4 4" />
      <path d="M9 11l4 4" />
      <path d="M9 19l-4-4 9-9 4 4z" />
    </svg>
  );
}
function IcoId() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="8" cy="12" r="2" />
      <path d="M14 10h4M14 14h3" />
    </svg>
  );
}
function IcoPaw() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="7" cy="6" r="1.5" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="17" cy="6" r="1.5" />
      <circle cx="4.5" cy="10.5" r="1.5" />
      <path d="M12 20c-3 0-7-4-7-7.5 0-2 1.5-3.5 3.5-3.5 1.2 0 2.2.5 3.5.5s2.3-.5 3.5-.5c2 0 3.5 1.5 3.5 3.5 0 3.5-4 7.5-7 7.5z" />
    </svg>
  );
}
function IcoChat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="9" y1="10" x2="15" y2="10" />
      <line x1="9" y1="14" x2="13" y2="14" />
    </svg>
  );
}
function IcoBag() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
function IcoHeart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function IcoBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      <line x1="12" y1="2" x2="12" y2="4" />
    </svg>
  );
}
function IcoTag() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}
function IcoNews() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <line x1="18" y1="14" x2="12" y2="14" />
      <line x1="18" y1="18" x2="12" y2="18" />
      <polyline points="10 10 12 10 12 6" />
      <line x1="10" y1="6" x2="18" y2="6" />
    </svg>
  );
}
function IcoArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function IcoChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function IcoChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

/* ─── Data ───────────────────────────────────────────────────── */
const QUICK_NAV = [
  { label: "Veterinarias",  href: "/map",         Icon: IcoMap     },
  { label: "Vacunas",       href: "/pets",        Icon: IcoSyringe },
  { label: "Mascotas",      href: "/pets",        Icon: IcoPaw     },
  { label: "Alertas",       href: "/lost-pets",   Icon: IcoBell    },
  { label: "Marketplace",   href: "/marketplace", Icon: IcoBag     },
  { label: "Foro",          href: "/forum",       Icon: IcoChat    },
  { label: "Beneficios",    href: "/benefits",    Icon: IcoTag     },
  { label: "Noticias",      href: "/news",        Icon: IcoNews    },
] as const;

type FeatureDef = {
  id: string;
  Icon: () => JSX.Element;
  label: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  accent: string;
  iconBg: string;
  ctaStyle: string;
};

const FEATURES: FeatureDef[] = [
  {
    id: "map",
    Icon: IcoMap,
    label: "Veterinarias",
    title: "Clínicas cerca, precios a la vista",
    body: "Busca por zona, filtra por precio y reserva hora sin llamar. Ves descuentos activos antes de ir.",
    href: "/map",
    cta: "Abrir mapa",
    accent: "bg-[hsl(155_48%_42%/0.08)]",
    iconBg: "bg-[hsl(155_48%_42%/0.15)] text-[hsl(155_48%_30%)]",
    ctaStyle: "text-[hsl(155_48%_32%)] bg-[hsl(155_48%_42%/0.12)] hover:bg-[hsl(155_48%_42%/0.2)]",
  },
  {
    id: "vaccines",
    Icon: IcoSyringe,
    label: "Salud",
    title: "El carnet de vacunas en tu teléfono",
    body: "Te avisamos antes de que venza cada dosis. Sin papeles, sin olvidar fechas.",
    href: "/pets",
    cta: "Ver carnet",
    accent: "bg-[hsl(22_92%_60%/0.07)]",
    iconBg: "bg-[hsl(22_92%_60%/0.14)] text-[hsl(22_62%_38%)]",
    ctaStyle: "text-[hsl(22_62%_38%)] bg-[hsl(22_92%_60%/0.12)] hover:bg-[hsl(22_92%_60%/0.2)]",
  },
  {
    id: "nfc",
    Icon: IcoId,
    label: "Identidad",
    title: "DNI con NFC para tu mascota",
    body: "Un chip físico que al escanearlo muestra el perfil, el dueño y el estado de salud. Sin app, sin contraseña.",
    href: "/pets",
    cta: "Más info",
    accent: "bg-[hsl(240_60%_58%/0.07)]",
    iconBg: "bg-[hsl(240_60%_58%/0.12)] text-[hsl(240_60%_42%)]",
    ctaStyle: "text-[hsl(240_60%_42%)] bg-[hsl(240_60%_58%/0.1)] hover:bg-[hsl(240_60%_58%/0.18)]",
  },
  {
    id: "community",
    Icon: IcoPaw,
    label: "Comunidad",
    title: "Perfiles para mascotas y cuidadores",
    body: "Tu mascota tiene su propio perfil. Conecta con cuidadores de confianza y otros dueños del barrio.",
    href: "/community",
    cta: "Explorar",
    accent: "bg-[hsl(164_30%_18%/0.05)]",
    iconBg: "bg-[hsl(164_30%_18%/0.1)] text-[hsl(164_30%_20%)]",
    ctaStyle: "text-[hsl(164_30%_20%)] bg-[hsl(164_30%_18%/0.08)] hover:bg-[hsl(164_30%_18%/0.14)]",
  },
  {
    id: "forum",
    Icon: IcoChat,
    label: "Foro",
    title: "Consultas reales, respuestas reales",
    body: "Pregunta sobre salud, comportamiento o alimentación. La comunidad y veterinarios responden.",
    href: "/forum",
    cta: "Ir al foro",
    accent: "bg-[hsl(22_92%_60%/0.07)]",
    iconBg: "bg-[hsl(22_92%_60%/0.14)] text-[hsl(22_62%_38%)]",
    ctaStyle: "text-[hsl(22_62%_38%)] bg-[hsl(22_92%_60%/0.12)] hover:bg-[hsl(22_92%_60%/0.2)]",
  },
  {
    id: "marketplace",
    Icon: IcoBag,
    label: "Marketplace",
    title: "Vende lo que no usas, compra lo que falta",
    body: "Accesorios, ropa, juguetes — de dueño a dueño. Sin intermediarios ni costos escondidos.",
    href: "/marketplace",
    cta: "Ver productos",
    accent: "bg-[hsl(155_48%_42%/0.08)]",
    iconBg: "bg-[hsl(155_48%_42%/0.15)] text-[hsl(155_48%_30%)]",
    ctaStyle: "text-[hsl(155_48%_32%)] bg-[hsl(155_48%_42%/0.12)] hover:bg-[hsl(155_48%_42%/0.2)]",
  },
  {
    id: "social",
    Icon: IcoHeart,
    label: "Social",
    title: "Paseos, citas y encuentros entre mascotas",
    body: "Organiza salidas grupales o busca compañía para el parque. Tu perro también necesita amigos.",
    href: "/community",
    cta: "Conectar",
    accent: "bg-[hsl(340_80%_55%/0.07)]",
    iconBg: "bg-[hsl(340_80%_55%/0.12)] text-[hsl(340_70%_40%)]",
    ctaStyle: "text-[hsl(340_70%_40%)] bg-[hsl(340_80%_55%/0.1)] hover:bg-[hsl(340_80%_55%/0.18)]",
  },
  {
    id: "lost",
    Icon: IcoBell,
    label: "Alertas",
    title: "Mascota perdida — aviso instantáneo",
    body: "Si se escapa, todos los usuarios cercanos reciben la alerta. Con el botón «Yo la vi» la comunidad ayuda a encontrarla.",
    href: "/lost-pets",
    cta: "Ver alertas",
    accent: "bg-[hsl(4_74%_58%/0.07)]",
    iconBg: "bg-[hsl(4_74%_58%/0.12)] text-[hsl(4_70%_42%)]",
    ctaStyle: "text-[hsl(4_70%_42%)] bg-[hsl(4_74%_58%/0.1)] hover:bg-[hsl(4_74%_58%/0.18)]",
  },
  {
    id: "benefits",
    Icon: IcoTag,
    label: "Beneficios",
    title: "Descuentos según dónde estás",
    body: "Convenios con veterinarias, tiendas y tarjetas de la zona. Los mejores precios sin buscarlos.",
    href: "/benefits",
    cta: "Ver descuentos",
    accent: "bg-[hsl(45_90%_55%/0.08)]",
    iconBg: "bg-[hsl(45_90%_55%/0.15)] text-[hsl(45_70%_32%)]",
    ctaStyle: "text-[hsl(45_70%_32%)] bg-[hsl(45_90%_55%/0.12)] hover:bg-[hsl(45_90%_55%/0.2)]",
  },
  {
    id: "news",
    Icon: IcoNews,
    label: "Noticias",
    title: "Lo nuevo del mundo animal",
    body: "Gadgets, alimentos, estudios y tendencias. Sin spam, solo lo que le importa a un dueño de verdad.",
    href: "/news",
    cta: "Leer",
    accent: "bg-[hsl(164_30%_18%/0.05)]",
    iconBg: "bg-[hsl(164_30%_18%/0.1)] text-[hsl(164_30%_20%)]",
    ctaStyle: "text-[hsl(164_30%_20%)] bg-[hsl(164_30%_18%/0.08)] hover:bg-[hsl(164_30%_18%/0.14)]",
  },
];

/* ─── Component ─────────────────────────────────────────────── */
export function HomeHub() {
  const { isAuthenticated } = useAuth();
  const carouselRef = useRef<HTMLDivElement>(null);

  function scroll(dir: "left" | "right") {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "right" ? 310 : -310, behavior: "smooth" });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-12">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[2rem] bg-[hsl(var(--primary))] px-8 py-12 text-white sm:px-14 sm:py-18">
        {/* ambient blobs */}
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[hsl(22_92%_60%/0.35)] blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-12 h-60 w-60 rounded-full bg-[hsl(155_60%_40%/0.3)] blur-3xl" />

        <div className="relative">
          <span className="inline-block rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
            Kumpa · Pet superapp
          </span>

          <h1 className="mt-5 text-[2.6rem] font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            Tu mascota, ordenada.<br />
            <span className="text-[hsl(var(--accent))]">Todo en un lugar.</span>
          </h1>

          <p className="mt-5 max-w-lg text-[1.05rem] leading-relaxed text-white/65">
            Veterinarias con mapa, vacunas digitales, alertas de mascotas perdidas, marketplace y comunidad — sin cambiar de app.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/map" className="group flex items-center gap-2 rounded-full bg-[hsl(var(--accent))] px-7 py-3.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90 active:scale-95">
              Buscar veterinaria
              <span className="transition group-hover:translate-x-0.5"><IcoArrow /></span>
            </Link>
            {isAuthenticated ? (
              <Link href="/pets" className="rounded-full border border-white/25 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/18 active:scale-95">
                Mis mascotas
              </Link>
            ) : (
              <Link href="/login" className="rounded-full border border-white/25 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/18 active:scale-95">
                Crear cuenta gratis
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Quick nav pills ───────────────────────────────────── */}
      <nav>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          {QUICK_NAV.map(({ label, href, Icon }) => (
            <Link
              key={label}
              href={href}
              className="flex shrink-0 items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-white/70 px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] backdrop-blur transition hover:border-[hsl(var(--secondary)/0.4)] hover:bg-white active:scale-95"
            >
              <span className="text-[hsl(var(--secondary))]"><Icon /></span>
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* ── Feature carousel ─────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
              Qué hay en Kumpa
            </p>
            <h2 className="mt-0.5 text-xl font-bold">Todo desde una app</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => scroll("left")}
              aria-label="Anterior"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white/80 text-[hsl(var(--foreground))] shadow-sm transition hover:bg-white active:scale-90"
            >
              <IcoChevronLeft />
            </button>
            <button
              onClick={() => scroll("right")}
              aria-label="Siguiente"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white/80 text-[hsl(var(--foreground))] shadow-sm transition hover:bg-white active:scale-90"
            >
              <IcoChevronRight />
            </button>
          </div>
        </div>

        {/* scrollable strip */}
        <div
          ref={carouselRef}
          className="flex gap-4 overflow-x-auto pb-3"
          style={{ scrollbarWidth: "none", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
        >
          {FEATURES.map((f) => (
            <Link
              key={f.id}
              href={f.href}
              className={`group flex w-[270px] shrink-0 flex-col justify-between rounded-[1.5rem] border border-[hsl(var(--border))] p-5 transition hover:shadow-xl active:scale-[0.97] sm:w-[290px] ${f.accent}`}
              style={{ scrollSnapAlign: "start" }}
            >
              <div>
                <div className={`mb-4 inline-flex rounded-xl p-2.5 ${f.iconBg}`}>
                  <f.Icon />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                  {f.label}
                </p>
                <h3 className="mt-1 text-[1.05rem] font-bold leading-snug">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                  {f.body}
                </p>
              </div>
              <div className="mt-5 flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition ${f.ctaStyle}`}>
                  {f.cta}
                  <span className="transition group-hover:translate-x-0.5"><IcoChevronRight /></span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Two highlight blocks ──────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2">
        {/* lost pets — urgent feel */}
        <Link
          href="/lost-pets"
          className="group relative overflow-hidden rounded-[1.75rem] bg-[hsl(4_74%_58%/0.08)] border border-[hsl(4_74%_58%/0.2)] p-6 transition hover:shadow-lg active:scale-[0.98]"
        >
          <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-[hsl(4_74%_58%/0.12)] blur-2xl" />
          <div className="relative">
            <div className="mb-4 inline-flex rounded-xl bg-[hsl(4_74%_58%/0.15)] p-3 text-[hsl(4_70%_42%)]">
              <IcoBell />
            </div>
            <h3 className="text-lg font-bold">¿Perdiste a tu mascota?</h3>
            <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              Publica una alerta y toda la comunidad cercana recibe la notificación al instante.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[hsl(4_70%_42%)] transition group-hover:gap-2.5">
              Ver alertas activas <IcoArrow />
            </span>
          </div>
        </Link>

        {/* benefits */}
        <Link
          href="/benefits"
          className="group relative overflow-hidden rounded-[1.75rem] bg-[hsl(45_90%_55%/0.08)] border border-[hsl(45_90%_55%/0.22)] p-6 transition hover:shadow-lg active:scale-[0.98]"
        >
          <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-[hsl(45_90%_55%/0.15)] blur-2xl" />
          <div className="relative">
            <div className="mb-4 inline-flex rounded-xl bg-[hsl(45_90%_55%/0.18)] p-3 text-[hsl(45_70%_32%)]">
              <IcoTag />
            </div>
            <h3 className="text-lg font-bold">Descuentos en tu zona</h3>
            <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              Convenios con veterinarias, tiendas locales y tarjetas. Siempre actualizados según dónde estás.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[hsl(45_70%_32%)] transition group-hover:gap-2.5">
              Ver beneficios <IcoArrow />
            </span>
          </div>
        </Link>
      </section>

      {/* ── Bottom CTA (guests) ───────────────────────────────── */}
      {!isAuthenticated && (
        <section className="relative overflow-hidden rounded-[1.75rem] border border-[hsl(var(--border))] bg-white/65 px-8 py-10 text-center backdrop-blur-sm">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-full bg-gradient-to-r from-[hsl(var(--secondary))] via-[hsl(var(--accent))] to-[hsl(var(--secondary))]" />
          <p className="text-3xl font-bold">Únete gratis</p>
          <p className="mx-auto mt-3 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
            Crea el perfil de tu mascota, activa vacunas y únete a la comunidad en menos de dos minutos.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="rounded-full bg-[hsl(var(--primary))] px-8 py-3.5 text-sm font-bold text-white shadow transition hover:opacity-90 active:scale-95">
              Crear cuenta
            </Link>
            <Link href="/explore" className="rounded-full border border-[hsl(var(--border))] bg-white px-8 py-3.5 text-sm font-bold transition hover:bg-[hsl(var(--muted))] active:scale-95">
              Explorar sin registrarse
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

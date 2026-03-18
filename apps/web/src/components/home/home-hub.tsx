"use client";

import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
function IcoBag() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
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
  { label: "Mapa",        href: "/explore",    Icon: IcoMap      },
  { label: "Mis mascotas",href: "/pets",        Icon: IcoPaw      },
  { label: "Alertas",     href: "/lost-pets",  Icon: IcoBell     },
  { label: "Beneficios",  href: "/benefits",   Icon: IcoTag      },
  { label: "Marketplace", href: "/marketplace",Icon: IcoBag      },
];

interface FeatureDef {
  id: string;
  Icon: React.FC;
  label: string;
  title: string;
  href: string;
  cta: string;
  accent: string;
  iconBg: string;
  ctaStyle: string;
}

const FEATURES: FeatureDef[] = [
  {
    id: "map",
    Icon: IcoMap,
    label: "Mapa",
    title: "Vets, tiendas y parques cerca",
    href: "/explore",
    cta: "Abrir mapa",
    accent: "bg-[hsl(155_48%_42%/0.08)]",
    iconBg: "bg-[hsl(155_48%_42%/0.15)] text-[hsl(155_48%_30%)]",
    ctaStyle: "text-[hsl(155_48%_32%)] bg-[hsl(155_48%_42%/0.12)] hover:bg-[hsl(155_48%_42%/0.2)]",
  },
  {
    id: "vaccines",
    Icon: IcoSyringe,
    label: "Salud",
    title: "Carnet de vacunas digital",
    href: "/pets",
    cta: "Ver carnet",
    accent: "bg-[hsl(22_92%_60%/0.07)]",
    iconBg: "bg-[hsl(22_92%_60%/0.14)] text-[hsl(22_62%_38%)]",
    ctaStyle: "text-[hsl(22_62%_38%)] bg-[hsl(22_92%_60%/0.12)] hover:bg-[hsl(22_92%_60%/0.2)]",
  },
  {
    id: "nfc",
    Icon: IcoId,
    label: "Identidad NFC",
    title: "ID con chip NFC para tu mascota",
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
    title: "Perfil para tu mascota y tu barrio",
    href: "/community",
    cta: "Explorar",
    accent: "bg-[hsl(164_30%_18%/0.05)]",
    iconBg: "bg-[hsl(164_30%_18%/0.1)] text-[hsl(164_30%_20%)]",
    ctaStyle: "text-[hsl(164_30%_20%)] bg-[hsl(164_30%_18%/0.08)] hover:bg-[hsl(164_30%_18%/0.14)]",
  },
  {
    id: "marketplace",
    Icon: IcoBag,
    label: "Marketplace",
    title: "Compra y vende entre dueños",
    href: "/marketplace",
    cta: "Ver productos",
    accent: "bg-[hsl(155_48%_42%/0.08)]",
    iconBg: "bg-[hsl(155_48%_42%/0.15)] text-[hsl(155_48%_30%)]",
    ctaStyle: "text-[hsl(155_48%_32%)] bg-[hsl(155_48%_42%/0.12)] hover:bg-[hsl(155_48%_42%/0.2)]",
  },
];

interface NewsItem {
  id: string;
  category: string;
  categoryColor: string;
  title: string;
  date: string;
  readMin: number;
}

const NEWS: NewsItem[] = [
  {
    id: "1",
    category: "Salud",
    categoryColor: "bg-teal-100 text-teal-800",
    title: "¿Con qué frecuencia debe ir tu perro al veterinario?",
    date: "14 mar 2026",
    readMin: 4,
  },
  {
    id: "2",
    category: "Nutrición",
    categoryColor: "bg-orange-100 text-orange-800",
    title: "Alimentos prohibidos que todo dueño de gato debe conocer",
    date: "11 mar 2026",
    readMin: 3,
  },
  {
    id: "3",
    category: "Tendencias",
    categoryColor: "bg-violet-100 text-violet-800",
    title: "Los barrios más pet-friendly para vivir con mascotas",
    date: "8 mar 2026",
    readMin: 5,
  },
];

const SEARCH_PHRASES = [
  "Busca veterinarias cerca de ti...",
  "Encuentra paseadores y cuidadores...",
  "Peluquerías, tiendas, parques...",
  "¿Dónde vacunar a tu mascota?",
];

/* ─── Typing placeholder hook ────────────────────────────────── */
function useTypingPlaceholder(phrases: string[]) {
  const [text, setText] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIdx];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && text === current) {
      timeout = setTimeout(() => setDeleting(true), 2200);
    } else if (deleting && text === "") {
      setDeleting(false);
      setPhraseIdx((p) => (p + 1) % phrases.length);
    } else if (deleting) {
      timeout = setTimeout(() => setText((t) => t.slice(0, -1)), 35);
    } else {
      timeout = setTimeout(() => setText(current.slice(0, text.length + 1)), 55);
    }

    return () => clearTimeout(timeout);
  }, [text, deleting, phraseIdx, phrases]);

  return text;
}

/* ─── Component ─────────────────────────────────────────────── */
export function HomeHub() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const carouselRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const typingPlaceholder = useTypingPlaceholder(SEARCH_PHRASES);

  /* Auto-rotate carousel */
  const advance = useCallback(() => {
    setCarouselIndex((prev) => (prev + 1) % FEATURES.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(advance, 3800);
    return () => clearInterval(timer);
  }, [isPaused, advance]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const cardWidth = 264 + 16;
    el.scrollTo({ left: carouselIndex * cardWidth, behavior: "smooth" });
  }, [carouselIndex]);

  function scrollTo(dir: "left" | "right") {
    setCarouselIndex((prev) => {
      const next = dir === "right" ? (prev + 1) % FEATURES.length : (prev - 1 + FEATURES.length) % FEATURES.length;
      return next;
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
  }

  const showTyping = !inputFocused && searchQuery === "";

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16 pt-2">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[2rem] bg-[hsl(var(--primary))] px-6 py-14 text-white sm:px-12 sm:py-18">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[hsl(22_92%_60%/0.3)] blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-[hsl(155_60%_40%/0.28)] blur-3xl" />

        <div className="relative flex flex-col items-center text-center">
          {/* Badge */}
          <span className="mb-5 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/80 backdrop-blur-sm">
            Todo para tu mascota en un solo lugar
          </span>

          <h1 className="text-[2.2rem] font-bold leading-[1.1] tracking-tight sm:text-[3rem]">
            Tu mascota,{" "}
            <span className="text-[hsl(var(--accent))]">más protegida.</span>
          </h1>

          <p className="mt-4 max-w-sm text-[0.98rem] leading-relaxed text-white/60">
            Salud, comunidad, alertas y beneficios — desde una sola app.
          </p>

          {/* Search bar with typing animation */}
          <form
            onSubmit={handleSearch}
            className="relative mt-8 w-full max-w-md"
          >
            <div className="flex overflow-hidden rounded-2xl bg-white shadow-xl">
              <div className="relative flex-1">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder=""
                  className="w-full bg-transparent px-5 py-4 text-sm text-[hsl(var(--foreground))] outline-none"
                />
                {showTyping && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-sm text-[hsl(var(--muted-foreground))]"
                  >
                    {typingPlaceholder}
                    <span className="ml-px inline-block h-[1em] w-px animate-pulse bg-current align-middle opacity-70" />
                  </span>
                )}
              </div>
              <button
                type="submit"
                className="m-1.5 rounded-xl bg-[hsl(var(--accent))] px-6 py-2.5 text-sm font-bold text-white shadow transition hover:opacity-90 active:scale-95"
              >
                Buscar
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ── Quick nav pills ───────────────────────────────────── */}
      <nav>
        <div className="flex justify-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
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
      <section
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="mb-5 flex items-center">
          <div className="w-[72px] shrink-0" />
          <div className="flex-1 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
              Qué hay en Kummpa
            </p>
            <h2 className="mt-0.5 text-xl font-bold">Todo desde una app</h2>
          </div>
          <div className="flex w-[72px] shrink-0 justify-end gap-2">
            <button
              onClick={() => scrollTo("left")}
              aria-label="Anterior"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white/80 text-[hsl(var(--foreground))] shadow-sm transition hover:bg-white active:scale-90"
            >
              <IcoChevronLeft />
            </button>
            <button
              onClick={() => scrollTo("right")}
              aria-label="Siguiente"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white/80 text-[hsl(var(--foreground))] shadow-sm transition hover:bg-white active:scale-90"
            >
              <IcoChevronRight />
            </button>
          </div>
        </div>

        {/* Dot indicators */}
        <div className="mb-4 flex justify-center gap-1.5">
          {FEATURES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCarouselIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === carouselIndex
                  ? "w-5 bg-[hsl(var(--secondary))]"
                  : "w-1.5 bg-[hsl(var(--border))]"
              }`}
              aria-label={`Ir a ${FEATURES[i].label}`}
            />
          ))}
        </div>

        <div
          ref={carouselRef}
          className="flex gap-4 overflow-x-auto pb-3"
          style={{ scrollbarWidth: "none", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
        >
          {FEATURES.map((f) => (
            <Link
              key={f.id}
              href={f.href}
              className={`group flex w-[264px] shrink-0 flex-col rounded-[1.5rem] border border-[hsl(var(--border))] p-5 transition hover:shadow-lg active:scale-[0.97] ${f.accent}`}
              style={{ scrollSnapAlign: "start" }}
            >
              <div className={`mb-4 inline-flex rounded-xl p-2.5 ${f.iconBg}`}>
                <f.Icon />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                {f.label}
              </p>
              <h3 className="mt-1.5 text-[1rem] font-bold leading-snug">{f.title}</h3>
              <div className="mt-5">
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
        <Link
          href="/lost-pets"
          className="group relative overflow-hidden rounded-[1.75rem] border border-[hsl(4_74%_58%/0.2)] bg-[hsl(4_74%_58%/0.08)] p-6 transition hover:shadow-lg active:scale-[0.98]"
        >
          <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-[hsl(4_74%_58%/0.12)] blur-2xl" />
          <div className="relative">
            <div className="mb-4 inline-flex rounded-xl bg-[hsl(4_74%_58%/0.15)] p-3 text-[hsl(4_70%_42%)]">
              <IcoBell />
            </div>
            <h3 className="text-lg font-bold">¿Perdiste a tu mascota?</h3>
            <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">
              Publica una alerta y la comunidad cercana recibe aviso al instante.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[hsl(4_70%_42%)] transition group-hover:gap-2.5">
              Ver alertas <IcoArrow />
            </span>
          </div>
        </Link>

        <Link
          href="/benefits"
          className="group relative overflow-hidden rounded-[1.75rem] border border-[hsl(45_90%_55%/0.22)] bg-[hsl(45_90%_55%/0.08)] p-6 transition hover:shadow-lg active:scale-[0.98]"
        >
          <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-[hsl(45_90%_55%/0.15)] blur-2xl" />
          <div className="relative">
            <div className="mb-4 inline-flex rounded-xl bg-[hsl(45_90%_55%/0.18)] p-3 text-[hsl(45_70%_32%)]">
              <IcoTag />
            </div>
            <h3 className="text-lg font-bold">Descuentos en tu zona</h3>
            <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">
              Convenios con vets, tiendas y servicios. Siempre actualizados.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[hsl(45_70%_32%)] transition group-hover:gap-2.5">
              Ver beneficios <IcoArrow />
            </span>
          </div>
        </Link>
      </section>

      {/* ── News section ─────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Lo nuevo del mundo animal</h2>
          <Link
            href="/news"
            className="flex items-center gap-1 text-sm font-semibold text-[hsl(var(--secondary))] transition hover:opacity-70"
          >
            Ver todo <IcoChevronRight />
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {NEWS.map((item) => (
            <Link
              key={item.id}
              href={`/news/${item.id}`}
              className="group flex items-center gap-4 rounded-2xl border border-[hsl(var(--border))] bg-white/70 px-5 py-4 transition hover:bg-white hover:shadow-sm active:scale-[0.99]"
            >
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${item.categoryColor}`}>
                {item.category}
              </span>
              <p className="flex-1 text-sm font-semibold leading-snug">{item.title}</p>
              <span className="shrink-0 text-[11px] text-[hsl(var(--muted-foreground))]">{item.readMin} min</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA (guests) ───────────────────────────────── */}
      {!isAuthenticated && (
        <section className="relative overflow-hidden rounded-[1.75rem] border border-[hsl(var(--border))] bg-white/65 px-8 py-10 text-center backdrop-blur-sm">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-full bg-gradient-to-r from-[hsl(var(--secondary))] via-[hsl(var(--accent))] to-[hsl(var(--secondary))]" />
          <p className="text-2xl font-bold">Únete gratis</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-[hsl(var(--muted-foreground))]">
            Crea el perfil de tu mascota y comienza en menos de 2 minutos.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="rounded-full bg-[hsl(var(--primary))] px-7 py-3 text-sm font-bold text-white shadow transition hover:opacity-90 active:scale-95">
              Crear cuenta
            </Link>
            <Link href="/explore" className="rounded-full border border-[hsl(var(--border))] bg-white px-7 py-3 text-sm font-bold transition hover:bg-[hsl(var(--muted))] active:scale-95">
              Explorar antes
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

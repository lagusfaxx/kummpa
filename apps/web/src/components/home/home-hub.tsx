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

interface QuickNavItem {
  label: string;
  href: string;
  Icon: React.FC;
  iconColor: string;
  pillBg: string;
}

const QUICK_NAV: QuickNavItem[] = [
  {
    label: "Mapa",
    href: "/explore",
    Icon: IcoMap,
    iconColor: "text-[hsl(174_46%_26%)]",
    pillBg: "bg-[hsl(174_50%_93%)] border-[hsl(174_36%_82%)]",
  },
  {
    label: "Mis mascotas",
    href: "/pets",
    Icon: IcoPaw,
    iconColor: "text-[hsl(163_40%_26%)]",
    pillBg: "bg-[hsl(163_40%_93%)] border-[hsl(163_28%_82%)]",
  },
  {
    label: "Alertas",
    href: "/lost-pets",
    Icon: IcoBell,
    iconColor: "text-[hsl(6_64%_40%)]",
    pillBg: "bg-[hsl(6_68%_95%)] border-[hsl(6_52%_84%)]",
  },
  {
    label: "Beneficios",
    href: "/benefits",
    Icon: IcoTag,
    iconColor: "text-[hsl(38_72%_30%)]",
    pillBg: "bg-[hsl(38_78%_93%)] border-[hsl(38_60%_82%)]",
  },
  {
    label: "Marketplace",
    href: "/marketplace",
    Icon: IcoBag,
    iconColor: "text-[hsl(22_66%_32%)]",
    pillBg: "bg-[hsl(22_84%_94%)] border-[hsl(22_62%_84%)]",
  },
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
    label: "Cerca de ti",
    title: "Vets, tiendas y parques cerca",
    href: "/explore",
    cta: "Abrir mapa",
    accent: "bg-gradient-to-br from-[hsl(174_52%_93%)] to-[hsl(174_44%_89%)] border-[hsl(174_38%_82%)]",
    iconBg: "bg-[hsl(174_52%_83%)] text-[hsl(174_48%_22%)]",
    ctaStyle: "text-[hsl(174_48%_22%)] bg-[hsl(174_52%_84%)] hover:bg-[hsl(174_52%_78%)]",
  },
  {
    id: "vaccines",
    Icon: IcoSyringe,
    label: "Salud",
    title: "Carnet de vacunas digital",
    href: "/pets",
    cta: "Ver carnet",
    accent: "bg-gradient-to-br from-[hsl(152_52%_93%)] to-[hsl(152_44%_89%)] border-[hsl(152_38%_81%)]",
    iconBg: "bg-[hsl(152_54%_83%)] text-[hsl(152_50%_22%)]",
    ctaStyle: "text-[hsl(152_50%_22%)] bg-[hsl(152_54%_84%)] hover:bg-[hsl(152_54%_77%)]",
  },
  {
    id: "nfc",
    Icon: IcoId,
    label: "Identidad NFC",
    title: "ID con chip NFC para tu mascota",
    href: "/pets",
    cta: "Más info",
    accent: "bg-gradient-to-br from-[hsl(248_52%_94%)] to-[hsl(248_44%_90%)] border-[hsl(248_38%_83%)]",
    iconBg: "bg-[hsl(248_54%_85%)] text-[hsl(248_46%_36%)]",
    ctaStyle: "text-[hsl(248_46%_36%)] bg-[hsl(248_54%_86%)] hover:bg-[hsl(248_54%_79%)]",
  },
  {
    id: "community",
    Icon: IcoPaw,
    label: "Comunidad",
    title: "Perfil para tu mascota y tu barrio",
    href: "/community",
    cta: "Cerca de ti",
    accent: "bg-gradient-to-br from-[hsl(270_44%_94%)] to-[hsl(270_36%_90%)] border-[hsl(270_30%_83%)]",
    iconBg: "bg-[hsl(270_46%_85%)] text-[hsl(270_38%_34%)]",
    ctaStyle: "text-[hsl(270_38%_34%)] bg-[hsl(270_46%_86%)] hover:bg-[hsl(270_46%_79%)]",
  },
  {
    id: "marketplace",
    Icon: IcoBag,
    label: "Marketplace",
    title: "Compra y vende entre dueños",
    href: "/marketplace",
    cta: "Ver productos",
    accent: "bg-gradient-to-br from-[hsl(22_88%_95%)] to-[hsl(22_76%_91%)] border-[hsl(22_64%_85%)]",
    iconBg: "bg-[hsl(22_86%_85%)] text-[hsl(22_68%_30%)]",
    ctaStyle: "text-[hsl(22_68%_30%)] bg-[hsl(22_86%_86%)] hover:bg-[hsl(22_86%_79%)]",
  },
];

interface NewsItem {
  id: string;
  category: string;
  categoryBg: string;
  categoryText: string;
  title: string;
  date: string;
  readMin: number;
}

const NEWS: NewsItem[] = [
  {
    id: "1",
    category: "Salud",
    categoryBg: "bg-[hsl(152_52%_88%)]",
    categoryText: "text-[hsl(152_50%_22%)]",
    title: "¿Con qué frecuencia debe ir tu perro al veterinario?",
    date: "14 mar 2026",
    readMin: 4,
  },
  {
    id: "2",
    category: "Nutrición",
    categoryBg: "bg-[hsl(22_84%_90%)]",
    categoryText: "text-[hsl(22_66%_30%)]",
    title: "Alimentos prohibidos que todo dueño de gato debe conocer",
    date: "11 mar 2026",
    readMin: 3,
  },
  {
    id: "3",
    category: "Tendencias",
    categoryBg: "bg-[hsl(270_46%_90%)]",
    categoryText: "text-[hsl(270_38%_34%)]",
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
    } else if (current) {
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
    <div className="pb-16">

      {/* ── Hero — richer gradient with vivid glows ────────────── */}
      <section className="relative -mx-4 -mt-5 overflow-hidden px-4 pb-24 pt-20 text-white sm:-mx-6 sm:-mt-7 sm:px-6 sm:pb-28 sm:pt-24 lg:-mx-8 lg:px-8"
        style={{ background: "linear-gradient(160deg, hsl(164 34% 16%) 0%, hsl(164 30% 18%) 50%, hsl(164 28% 14%) 100%)" }}>

        {/* Vivid orange glow — top right */}
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-16 h-[32rem] w-[32rem] rounded-full bg-[hsl(22_92%_60%/0.30)] blur-3xl" />
        {/* Teal glow — left */}
        <div aria-hidden className="pointer-events-none absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-[hsl(155_62%_42%/0.26)] blur-3xl" />
        {/* Lavender glow — bottom center */}
        <div aria-hidden className="pointer-events-none absolute bottom-4 left-1/2 h-48 w-[500px] -translate-x-1/2 rounded-full bg-[hsl(248_52%_62%/0.14)] blur-3xl" />

        <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
          <span className="mb-6 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/80 backdrop-blur-sm">
            Todo para tu mascota en un solo lugar
          </span>

          <h1 className="text-[2.5rem] font-bold leading-[1.07] tracking-tight sm:text-[3.4rem]">
            Tu mascota,{" "}
            <span className="text-[hsl(22_92%_64%)]">más protegida.</span>
          </h1>

          <p className="mt-5 max-w-sm text-[1rem] leading-relaxed text-white/60">
            Salud, comunidad, alertas y beneficios — desde una sola app.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="relative mt-9 w-full max-w-md">
            <div className="flex overflow-hidden rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.28)]">
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

      {/* ── Rest in centered container ─────────────────────────── */}
      <div className="mx-auto max-w-5xl space-y-8 pt-4">

      {/* ── Quick nav pills (each with module color) ───────────── */}
      <nav>
        <div className="flex justify-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {QUICK_NAV.map(({ label, href, Icon, iconColor, pillBg }) => (
            <Link
              key={label}
              href={href}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold text-[hsl(var(--foreground))] transition hover:shadow-sm active:scale-95 ${pillBg}`}
            >
              <span className={iconColor}><Icon /></span>
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
              aria-label={`Ir a ${FEATURES[i]?.label ?? ""}`}
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
              className={`group flex w-[264px] shrink-0 flex-col rounded-[1.5rem] border p-5 shadow-sm transition hover:shadow-md active:scale-[0.97] ${f.accent}`}
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
        {/* Alert block — coral */}
        <Link
          href="/lost-pets"
          className="group relative overflow-hidden rounded-[1.75rem] border border-[hsl(6_56%_82%)] bg-gradient-to-br from-[hsl(6_70%_94%)] to-[hsl(6_58%_90%)] p-6 transition hover:shadow-lg active:scale-[0.98]"
        >
          <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-[hsl(6_70%_62%/0.18)] blur-2xl" />
          <div className="relative">
            <div className="mb-4 inline-flex rounded-xl bg-[hsl(6_68%_85%)] p-3 text-[hsl(6_62%_36%)]">
              <IcoBell />
            </div>
            <h3 className="text-lg font-bold text-[hsl(164_27%_13%)]">¿Perdiste a tu mascota?</h3>
            <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">
              Publica una alerta y la comunidad cercana recibe aviso al instante.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[hsl(6_60%_36%)] transition group-hover:gap-2.5">
              Ver alertas <IcoArrow />
            </span>
          </div>
        </Link>

        {/* Benefits block — amber/golden */}
        <Link
          href="/benefits"
          className="group relative overflow-hidden rounded-[1.75rem] border border-[hsl(38_62%_80%)] bg-gradient-to-br from-[hsl(38_80%_93%)] to-[hsl(38_68%_89%)] p-6 transition hover:shadow-lg active:scale-[0.98]"
        >
          <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-[hsl(38_80%_58%/0.20)] blur-2xl" />
          <div className="relative">
            <div className="mb-4 inline-flex rounded-xl bg-[hsl(38_76%_83%)] p-3 text-[hsl(38_68%_28%)]">
              <IcoTag />
            </div>
            <h3 className="text-lg font-bold text-[hsl(164_27%_13%)]">Descuentos en tu zona</h3>
            <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">
              Convenios con vets, tiendas y servicios. Siempre actualizados.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[hsl(38_66%_28%)] transition group-hover:gap-2.5">
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
              className="group flex items-center gap-4 rounded-2xl border border-[hsl(var(--border))] bg-white/75 px-5 py-4 transition hover:bg-white hover:shadow-sm active:scale-[0.99]"
            >
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${item.categoryBg} ${item.categoryText}`}>
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
        <section className="relative overflow-hidden rounded-[1.75rem] border border-[hsl(164_24%_82%)] px-8 py-10 text-center"
          style={{ background: "linear-gradient(135deg, hsl(164 30% 96%) 0%, hsl(164 24% 93%) 100%)" }}>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-full bg-gradient-to-r from-[hsl(var(--secondary))] via-[hsl(var(--accent))] to-[hsl(var(--secondary))]" />
          <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[hsl(22_90%_60%/0.12)] blur-2xl" />
          <div aria-hidden className="pointer-events-none absolute -left-8 bottom-0 h-36 w-36 rounded-full bg-[hsl(155_50%_42%/0.14)] blur-2xl" />
          <div className="relative">
            <p className="text-2xl font-bold">Únete gratis</p>
            <p className="mx-auto mt-2 max-w-xs text-sm text-[hsl(var(--muted-foreground))]">
              Crea el perfil de tu mascota y comienza en menos de 2 minutos.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="rounded-full bg-[hsl(var(--primary))] px-7 py-3 text-sm font-bold text-white shadow transition hover:opacity-90 active:scale-95">
                Crear cuenta
              </Link>
              <Link href="/explore" className="rounded-full border border-[hsl(var(--border))] bg-white px-7 py-3 text-sm font-bold transition hover:bg-[hsl(var(--muted))] active:scale-95">
                Ver lugares
              </Link>
            </div>
          </div>
        </section>
      )}
      </div>
    </div>
  );
}

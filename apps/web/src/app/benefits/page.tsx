"use client";

import Image from "next/image";
import Link from "next/link";

/* ─── Data ───────────────────────────────────────────────────── */
interface BdcPromo {
  id: string;
  name: string;
  discount: string;
  schedule: string;
  gradient: string;
  initials: string;
  initialsColor: string;
}

const BDC_PROMOS: BdcPromo[] = [
  {
    id: "wildvet",
    name: "WildVet",
    discount: "15% dto.",
    schedule: "lunes, miércoles y domingo presencial",
    gradient: "from-teal-400 to-cyan-600",
    initials: "WV",
    initialsColor: "text-white",
  },
  {
    id: "sense",
    name: "Sense",
    discount: "30% dto.",
    schedule: "todos los días en compra online",
    gradient: "from-violet-400 to-purple-600",
    initials: "Se",
    initialsColor: "text-white",
  },
  {
    id: "puppies-kittens",
    name: "Puppies & Kittens",
    discount: "Hasta 30% dto.",
    schedule: "jueves y viernes presencial y online",
    gradient: "from-pink-400 to-rose-500",
    initials: "P&K",
    initialsColor: "text-white",
  },
  {
    id: "pet-family",
    name: "PET FAMILY",
    discount: "Hasta 15% dto.",
    schedule: "todos los días",
    gradient: "from-orange-400 to-amber-500",
    initials: "PF",
    initialsColor: "text-white",
  },
  {
    id: "orangepet",
    name: "OrangePet",
    discount: "Hasta 20% dto.",
    schedule: "martes y miércoles presencial",
    gradient: "from-orange-500 to-red-500",
    initials: "OP",
    initialsColor: "text-white",
  },
  {
    id: "my-family-pets",
    name: "MY FAMILY PETS",
    discount: "Hasta 15% dto.",
    schedule: "todos los días",
    gradient: "from-slate-500 to-slate-700",
    initials: "MFP",
    initialsColor: "text-white",
  },
  {
    id: "laqu",
    name: "Laqu",
    discount: "20% dto.",
    schedule: "todos los días",
    gradient: "from-green-400 to-emerald-600",
    initials: "Lq",
    initialsColor: "text-white",
  },
  {
    id: "bug-me",
    name: "BUG ME",
    discount: "20% dto.",
    schedule: "todos los días en compra online",
    gradient: "from-yellow-400 to-lime-500",
    initials: "BM",
    initialsColor: "text-slate-800",
  },
];

/* ─── Sub-components ─────────────────────────────────────────── */
function IcoTag() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function IcoChevRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function PromoCard({ promo }: { promo: BdcPromo }) {
  return (
    <div className="group flex-shrink-0 w-[160px] sm:w-auto overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
      <div className={`relative flex h-[120px] sm:h-[140px] items-center justify-center bg-gradient-to-br ${promo.gradient}`}>
        <span className={`select-none text-3xl font-black tracking-tight opacity-90 ${promo.initialsColor}`}>
          {promo.initials}
        </span>
      </div>
      <div className="px-3.5 py-3 sm:px-4 sm:py-3.5">
        <p className="text-[12.5px] sm:text-[13px] font-bold text-slate-900 leading-tight">{promo.name}</p>
        <p className="mt-1 text-[13px] sm:text-[14px] font-bold" style={{ color: "#0033A0" }}>
          {promo.discount}
        </p>
        <p className="mt-0.5 text-[11px] sm:text-[11.5px] text-slate-500 leading-snug">{promo.schedule}</p>
      </div>
    </div>
  );
}

/* ─── Carousel wrapper (mobile) / Grid (desktop) ─────────────── */
function PromoList({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Mobile: horizontal carousel */}
      <div className="sm:hidden -mx-4 px-4">
        <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </div>
      </div>
      {/* Desktop: grid */}
      <div className="hidden sm:grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {children}
      </div>
    </>
  );
}

/* ─── Section bank header ─────────────────────────────────────── */
interface BankHeaderProps {
  logoSrc: string;
  logoAlt: string;
  logoBg?: string;
  logoContain?: boolean;
  title: string;
  subtitle: string;
  badge: string;
  gradient: string;
  infoColor: string;
  infoText: string;
}

function BankHeader({
  logoSrc, logoAlt, logoBg, logoContain,
  title, subtitle, badge,
  gradient, infoColor, infoText,
}: BankHeaderProps) {
  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="px-5 py-4 sm:px-6 sm:py-5" style={{ background: gradient }}>
        {/* Mobile layout: logo + badge row, then text */}
        <div className="flex items-center justify-between gap-3 sm:hidden">
          <div className={`relative h-11 w-24 shrink-0 overflow-hidden rounded-xl shadow-md ${logoBg ?? ""}`}>
            <Image
              src={logoSrc}
              alt={logoAlt}
              fill
              sizes="96px"
              className={logoContain ? "object-contain p-1.5" : "object-cover"}
            />
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur whitespace-nowrap">
            {badge} <IcoChevRight />
          </span>
        </div>
        <div className="mt-2.5 text-white sm:hidden">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Convenio vigente</p>
          <h2 className="text-base font-bold leading-tight">{title}</h2>
          <p className="mt-0.5 text-[12px] opacity-75">{subtitle}</p>
        </div>

        {/* Desktop layout: everything in one row */}
        <div className="hidden sm:flex items-center gap-5">
          <div className={`relative h-14 w-32 shrink-0 overflow-hidden rounded-xl shadow-md ${logoBg ?? ""}`}>
            <Image
              src={logoSrc}
              alt={logoAlt}
              fill
              sizes="128px"
              className={logoContain ? "object-contain p-2" : "object-cover"}
            />
          </div>
          <div className="text-white">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Convenio vigente</p>
            <h2 className="text-lg font-bold leading-tight">{title}</h2>
            <p className="mt-0.5 text-[12px] opacity-75">{subtitle}</p>
          </div>
          <div className="ml-auto shrink-0">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
              {badge} <IcoChevRight />
            </span>
          </div>
        </div>
      </div>

      {/* How to use */}
      <div className="flex items-start gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3 sm:px-6 sm:py-3.5">
        <span
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold"
          style={{ background: infoColor }}
        >
          i
        </span>
        <p className="text-[12px] text-slate-600 leading-relaxed">{infoText}</p>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function BenefitsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-16 pt-2">

      {/* ── Page header ────────────────────────────────────────── */}
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[hsl(45_70%_32%)]">
          <IcoTag />
          <span className="text-xs font-bold uppercase tracking-widest">Convenios y descuentos</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Beneficios exclusivos</h1>
        <p className="text-sm text-slate-500">
          Descuentos y convenios negociados para la comunidad Kummpa. Presenta tu tarjeta o código al momento de comprar.
        </p>
      </header>

      {/* ── Banco de Chile section ─────────────────────────────── */}
      <section>
        <BankHeader
          logoSrc="/brand/banco-chile-logo.png"
          logoAlt="Banco de Chile"
          title="Tarjetas Banco de Chile"
          subtitle="Descuentos exclusivos para titulares de tarjetas de crédito y débito"
          badge={`${BDC_PROMOS.length} comercios`}
          gradient="linear-gradient(135deg, #001F5B 0%, #0033A0 60%, #0055CC 100%)"
          infoColor="#0033A0"
          infoText="Presenta tu tarjeta Banco de Chile al momento de comprar o indica que eres cliente. En compras online ingresa el código de descuento asociado a tu tarjeta."
        />
        <PromoList>
          {BDC_PROMOS.map((promo) => (
            <div key={promo.id} className="snap-start">
              <PromoCard promo={promo} />
            </div>
          ))}
        </PromoList>
      </section>

      {/* ── BCI section ───────────────────────────────────────── */}
      <section>
        <BankHeader
          logoSrc="/brand/bci-logo.png"
          logoAlt="BCI"
          logoBg="bg-white"
          logoContain
          title="Tarjetas BCI"
          subtitle="Descuento exclusivo para clientes BCI en tiendas de mascotas asociadas"
          badge="1 comercio"
          gradient="linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 60%, #404040 100%)"
          infoColor="#2d2d2d"
          infoText="Presenta tu tarjeta BCI al momento de pagar en la tienda. Válido para compras presenciales y online en comercios adheridos."
        />
        <PromoList>
          <div className="snap-start flex-shrink-0 w-[160px] sm:w-auto overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
            <div className="relative h-[120px] sm:h-[140px] w-full overflow-hidden">
              <Image
                src="/brand/club-perros-gatos.png"
                alt="Club de Perros y Gatos"
                fill
                sizes="(max-width: 640px) 160px, 25vw"
                className="object-cover"
              />
            </div>
            <div className="px-3.5 py-3 sm:px-4 sm:py-3.5">
              <p className="text-[12.5px] sm:text-[13px] font-bold text-slate-900 leading-tight">Club de Perros y Gatos</p>
              <p className="mt-1 text-[13px] sm:text-[14px] font-bold text-[#2d2d2d]">10% dto.</p>
              <p className="mt-0.5 text-[11px] sm:text-[11.5px] text-slate-500 leading-snug">todos los días</p>
            </div>
          </div>
        </PromoList>
      </section>

      {/* ── More benefits CTA ──────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl border border-[hsl(45_90%_55%/0.25)] bg-[hsl(45_90%_55%/0.07)] px-7 py-8 text-center">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[hsl(45_90%_55%/0.18)] blur-3xl" />
        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(45_70%_32%)]">Próximamente</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">Más convenios en camino</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            Estamos incorporando nuevas alianzas con veterinarias, tiendas y servicios pet de todo Chile.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[hsl(45_70%_32%)] px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90 active:scale-95"
          >
            Volver al inicio
          </Link>
        </div>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/auth-context";

const FEATURES = [
  {
    id: "map",
    emoji: "🗺️",
    eyebrow: "Veterinarias",
    title: "Mapa con precios y reservas",
    description:
      "Encuentra clínicas y veterinarias cercanas, compara precios, ve descuentos activos y reserva tu hora directamente desde el mapa.",
    href: "/map",
    cta: "Abrir mapa",
    bg: "bg-[hsl(155_48%_42%/0.09)] border-[hsl(155_48%_42%/0.2)]",
    ctaClass: "bg-[hsl(var(--secondary))] text-white"
  },
  {
    id: "vaccines",
    emoji: "💉",
    eyebrow: "Salud",
    title: "Carnet digital de vacunación",
    description:
      "Historial completo de vacunas con recordatorios automáticos antes de cada dosis. Nunca más una vacuna olvidada.",
    href: "/pets",
    cta: "Ver carnet",
    bg: "bg-[hsl(22_92%_60%/0.08)] border-[hsl(22_92%_60%/0.22)]",
    ctaClass: "bg-[hsl(var(--accent))] text-white"
  },
  {
    id: "nfc",
    emoji: "📲",
    eyebrow: "Identidad",
    title: "DNI físico con NFC",
    description:
      "Tu mascota con su propio chip NFC. Al escanearlo muestra su perfil, datos del dueño y estado de salud al instante.",
    href: "/pets",
    cta: "Conocer más",
    bg: "bg-[hsl(164_30%_18%/0.05)] border-[hsl(164_30%_18%/0.15)]",
    ctaClass: "bg-[hsl(var(--primary))] text-white"
  },
  {
    id: "community",
    emoji: "🐾",
    eyebrow: "Comunidad",
    title: "Perfiles de mascotas y cuidadores",
    description:
      "Crea el perfil de tu mascota, sigue a otros dueños y cuidadores, y construye una red de confianza alrededor del mundo animal.",
    href: "/community",
    cta: "Explorar comunidad",
    bg: "bg-[hsl(155_48%_42%/0.09)] border-[hsl(155_48%_42%/0.2)]",
    ctaClass: "bg-[hsl(var(--secondary))] text-white"
  },
  {
    id: "forum",
    emoji: "💬",
    eyebrow: "Foro",
    title: "Consultas y tips de salud animal",
    description:
      "Resuelve dudas con veterinarios y dueños expertos. Tips reales sobre alimentación, comportamiento y cuidados especiales.",
    href: "/forum",
    cta: "Ir al foro",
    bg: "bg-[hsl(22_92%_60%/0.08)] border-[hsl(22_92%_60%/0.22)]",
    ctaClass: "bg-[hsl(var(--accent))] text-white"
  },
  {
    id: "marketplace",
    emoji: "🛒",
    eyebrow: "Marketplace",
    title: "Compra y vende productos usados",
    description:
      "Mercado entre dueños: ropa, juguetes, accesorios y más. Compra de otros dueños o vende lo que ya no usas.",
    href: "/marketplace",
    cta: "Ver productos",
    bg: "bg-[hsl(164_30%_18%/0.05)] border-[hsl(164_30%_18%/0.15)]",
    ctaClass: "bg-[hsl(var(--primary))] text-white"
  },
  {
    id: "social",
    emoji: "🐶",
    eyebrow: "Social",
    title: "Paseos, encuentros y citas",
    description:
      "Organiza paseos grupales, planifica encuentros entre mascotas y conecta con dueños cerca. Socializa para ti y tu peludo.",
    href: "/community",
    cta: "Conocer mascotas",
    bg: "bg-[hsl(155_48%_42%/0.09)] border-[hsl(155_48%_42%/0.2)]",
    ctaClass: "bg-[hsl(var(--secondary))] text-white"
  },
  {
    id: "lost",
    emoji: "🚨",
    eyebrow: "Alertas",
    title: "Mascotas perdidas",
    description:
      "Publica una alerta y notifica a todos los usuarios cercanos. Con el botón \"Yo la vi\" ayudas a reunir familias.",
    href: "/lost-pets",
    cta: "Ver alertas",
    bg: "bg-[hsl(4_74%_58%/0.07)] border-[hsl(4_74%_58%/0.22)]",
    ctaClass: "bg-[hsl(var(--destructive))] text-white"
  },
  {
    id: "benefits",
    emoji: "🎟️",
    eyebrow: "Beneficios",
    title: "Descuentos y convenios locales",
    description:
      "Promociones exclusivas en veterinarias, tiendas y convenios con bancos o tarjetas según tu zona. Ahorra en lo que necesita.",
    href: "/benefits",
    cta: "Ver beneficios",
    bg: "bg-[hsl(22_92%_60%/0.08)] border-[hsl(22_92%_60%/0.22)]",
    ctaClass: "bg-[hsl(var(--accent))] text-white"
  },
  {
    id: "news",
    emoji: "📰",
    eyebrow: "Noticias",
    title: "Novedades del mundo animal",
    description:
      "Últimos alimentos, gadgets y tendencias del universo de las mascotas. Contenido curado para dueños informados.",
    href: "/news",
    cta: "Leer noticias",
    bg: "bg-[hsl(164_30%_18%/0.05)] border-[hsl(164_30%_18%/0.15)]",
    ctaClass: "bg-[hsl(var(--primary))] text-white"
  }
] as const;

const QUICK_ACTIONS = [
  { emoji: "🗺️", label: "Mapa Vets",   href: "/map",         bg: "bg-[hsl(155_48%_42%/0.12)]" },
  { emoji: "💉", label: "Vacunas",      href: "/pets",        bg: "bg-[hsl(22_92%_60%/0.11)]"  },
  { emoji: "🚨", label: "Perdidos",     href: "/lost-pets",   bg: "bg-[hsl(4_74%_58%/0.09)]"   },
  { emoji: "🎟️", label: "Beneficios",  href: "/benefits",    bg: "bg-[hsl(164_30%_18%/0.07)]" },
  { emoji: "🛒", label: "Tienda",       href: "/marketplace", bg: "bg-[hsl(22_92%_60%/0.11)]"  },
  { emoji: "💬", label: "Foro",         href: "/forum",       bg: "bg-[hsl(155_48%_42%/0.12)]" },
  { emoji: "🐾", label: "Comunidad",    href: "/community",   bg: "bg-[hsl(164_30%_18%/0.07)]" },
  { emoji: "📰", label: "Noticias",     href: "/news",        bg: "bg-[hsl(22_92%_60%/0.09)]"  }
] as const;

export function HomeHub() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[2rem] bg-[hsl(var(--primary))] px-7 py-11 text-white sm:px-12 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 85% 15%, hsl(22 92% 60% / 0.45), transparent 45%), " +
              "radial-gradient(circle at 8% 85%, hsl(155 48% 42% / 0.4), transparent 42%)"
          }}
        />

        <div className="relative max-w-2xl">
          <span className="inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest">
            Pet superapp
          </span>

          <h1 className="mt-5 text-4xl font-bold leading-[1.15] tracking-tight sm:text-[3.2rem]">
            Todo para tu mascota,{" "}
            <span className="text-[hsl(var(--accent))]">en un solo lugar.</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70">
            Mapa de veterinarias, vacunas digitales, comunidad, marketplace, alertas de mascotas perdidas y mucho más — todo conectado para ti y tu peludo.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/map"
              className="rounded-full bg-[hsl(var(--accent))] px-7 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90 active:scale-95"
            >
              Buscar veterinarias →
            </Link>
            {isAuthenticated ? (
              <Link
                href="/pets"
                className="rounded-full border border-white/25 bg-white/10 px-7 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
              >
                Mis mascotas 🐾
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-white/25 bg-white/10 px-7 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
              >
                Crear cuenta gratis
              </Link>
            )}
          </div>
        </div>

        {/* floating feature pills */}
        <div
          aria-hidden
          className="absolute right-6 top-8 hidden flex-col gap-2 text-xs sm:flex"
        >
          {["🗺️ Veterinarias", "💉 Vacunas", "🐶 Pet-Tinder", "🚨 Alertas"].map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1 backdrop-blur"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ── Quick actions ───────────────────────────────── */}
      <section>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
          Acceso rápido
        </p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className={`flex flex-col items-center gap-1.5 rounded-2xl ${a.bg} p-3 text-center transition hover:scale-[1.06] active:scale-95`}
            >
              <span className="text-2xl leading-none">{a.emoji}</span>
              <span className="text-[10px] font-semibold leading-tight text-[hsl(var(--foreground))]">
                {a.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
          Todo lo que incluye Kumpa
        </p>

        {/* top 2 large */}
        <div className="grid gap-3 sm:grid-cols-2">
          <FeatureCard f={FEATURES[0]} size="lg" />
          <FeatureCard f={FEATURES[1]} size="lg" />
        </div>

        {/* row of 3 */}
        <div className="grid gap-3 sm:grid-cols-3">
          <FeatureCard f={FEATURES[2]} />
          <FeatureCard f={FEATURES[3]} />
          <FeatureCard f={FEATURES[4]} />
        </div>

        {/* row of 2 */}
        <div className="grid gap-3 sm:grid-cols-2">
          <FeatureCard f={FEATURES[5]} />
          <FeatureCard f={FEATURES[6]} />
        </div>

        {/* bottom row of 3 */}
        <div className="grid gap-3 sm:grid-cols-3">
          <FeatureCard f={FEATURES[7]} />
          <FeatureCard f={FEATURES[8]} />
          <FeatureCard f={FEATURES[9]} />
        </div>
      </section>

      {/* ── Bottom CTA (guests only) ─────────────────── */}
      {!isAuthenticated && (
        <section className="overflow-hidden rounded-[1.75rem] border border-[hsl(var(--border))] bg-white/70 px-7 py-10 text-center backdrop-blur-sm">
          <div className="text-5xl">🐾</div>
          <h2 className="mt-4 text-2xl font-bold">Únete a Kumpa gratis</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
            Crea el perfil de tu mascota, activa el carnet de vacunas, accede al mapa y conecta con la comunidad.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="rounded-full bg-[hsl(var(--primary))] px-8 py-3 text-sm font-bold text-white shadow transition hover:opacity-90 active:scale-95"
            >
              Crear cuenta gratis
            </Link>
            <Link
              href="/explore"
              className="rounded-full border border-[hsl(var(--border))] bg-white px-8 py-3 text-sm font-bold transition hover:bg-[hsl(var(--muted))] active:scale-95"
            >
              Explorar sin cuenta
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

type Feature = (typeof FEATURES)[number];

function FeatureCard({ f, size = "sm" }: { f: Feature; size?: "lg" | "sm" }) {
  return (
    <Link
      href={f.href}
      className={`group flex flex-col justify-between rounded-[1.4rem] border p-5 transition hover:shadow-lg active:scale-[0.98] sm:p-6 ${f.bg} ${size === "lg" ? "min-h-[210px]" : "min-h-[175px]"}`}
    >
      <div>
        <div className="mb-3 flex items-center gap-2.5">
          <span className="text-3xl leading-none">{f.emoji}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
            {f.eyebrow}
          </span>
        </div>
        <h3 className="text-[1.05rem] font-bold leading-snug">{f.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
          {f.description}
        </p>
      </div>
      <div className="mt-5">
        <span
          className={`inline-block rounded-full px-4 py-1.5 text-[11px] font-bold shadow-sm transition group-hover:opacity-90 ${f.ctaClass}`}
        >
          {f.cta} →
        </span>
      </div>
    </Link>
  );
}

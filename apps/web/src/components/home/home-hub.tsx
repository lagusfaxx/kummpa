"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { useAuth } from "@/features/auth/auth-context";

const MAIN_FEATURES = [
  {
    href: "/pets",
    title: "Mascotas",
    description: "Perfiles, carnet digital e identidad",
  },
  {
    href: "/appointments",
    title: "Agenda",
    description: "Reservas y turnos de servicio",
  },
  {
    href: "/map",
    title: "Mapa",
    description: "Servicios y lugares pet-friendly",
  },
  {
    href: "/lost-pets",
    title: "Alertas",
    description: "Mascotas perdidas y emergencias",
  },
] as const;

const SECONDARY_FEATURES = [
  {
    href: "/community",
    title: "Comunidad",
    description: "Red social y encuentros",
  },
  {
    href: "/benefits",
    title: "Beneficios",
    description: "Descuentos y convenios",
  },
  {
    href: "/marketplace",
    title: "Marketplace",
    description: "Compra y venta",
  },
  {
    href: "/news",
    title: "Noticias",
    description: "Novedades y contenido",
  },
] as const;

export function HomeHub() {
  const { isReady, isAuthenticated, session } = useAuth();
  const isSignedIn = isReady && isAuthenticated;
  const firstName = session?.user.firstName;

  return (
    <div className="space-y-16 py-8 sm:py-12">
      {/* Hero Section - Clean and Centered */}
      <section className="text-center">
        <BrandLogo
          variant="wordmark"
          className="mx-auto h-16 w-36 sm:h-20 sm:w-44"
          priority
        />
        <h1 className="mx-auto mt-6 max-w-2xl text-balance font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Todo el cuidado de tus mascotas en un solo lugar
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-[hsl(var(--muted-foreground))] sm:text-lg">
          Organiza salud, agenda, comunidad y alertas desde una plataforma pensada para ti y tus mascotas.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {isSignedIn ? (
            <>
              <Link href="/pets" className="btn btn-primary">
                {firstName ? `Hola, ${firstName}` : "Ir a mis mascotas"}
              </Link>
              <Link href="/account" className="btn btn-outline">
                Mi cuenta
              </Link>
            </>
          ) : (
            <>
              <Link href="/register" className="btn btn-primary">
                Crear cuenta gratis
              </Link>
              <Link href="/login" className="btn btn-outline">
                Ya tengo cuenta
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Main Features Grid */}
      <section>
        <h2 className="text-center font-display text-xl font-semibold sm:text-2xl">
          Funciones principales
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MAIN_FEATURES.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="card group p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <h3 className="font-display text-lg font-semibold">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                {feature.description}
              </p>
              <span className="mt-4 inline-flex text-sm font-medium text-[hsl(var(--secondary))] transition-colors group-hover:text-[hsl(var(--secondary)/0.8)]">
                Abrir
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Alert Banner */}
      <section className="overflow-hidden rounded-2xl bg-[hsl(var(--destructive))] p-6 text-white sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
              Emergencias
            </p>
            <h3 className="mt-2 font-display text-xl font-bold sm:text-2xl">
              Reporta una mascota perdida
            </h3>
            <p className="mt-2 max-w-lg text-sm text-white/90">
              Crea una alerta visible para toda la comunidad y aumenta las posibilidades de encontrarla.
            </p>
          </div>
          <Link
            href="/lost-pets/report"
            className="btn shrink-0 bg-white font-semibold text-[hsl(var(--destructive))] hover:bg-white/90"
          >
            Crear alerta
          </Link>
        </div>
      </section>

      {/* Secondary Features */}
      <section>
        <h2 className="text-center font-display text-xl font-semibold sm:text-2xl">
          Explora mas
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SECONDARY_FEATURES.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="group flex items-center gap-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-all hover:border-[hsl(var(--secondary)/0.3)] hover:bg-[hsl(var(--muted))]"
            >
              <div className="min-w-0 flex-1">
                <h3 className="font-medium">{feature.title}</h3>
                <p className="mt-0.5 text-sm text-[hsl(var(--muted-foreground))]">
                  {feature.description}
                </p>
              </div>
              <svg
                className="h-5 w-5 shrink-0 text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="rounded-2xl bg-[hsl(var(--primary))] p-8 text-white sm:p-12">
        <h2 className="text-center font-display text-xl font-bold sm:text-2xl">
          Como funciona
        </h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          <div className="text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/15 font-display text-xl font-bold">
              1
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold">
              Crea tu cuenta
            </h3>
            <p className="mt-2 text-sm text-white/80">
              Registrate gratis como tutor o proveedor de servicios.
            </p>
          </div>
          <div className="text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/15 font-display text-xl font-bold">
              2
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold">
              Agrega tus mascotas
            </h3>
            <p className="mt-2 text-sm text-white/80">
              Cada mascota tiene su perfil, carnet de vacunas y QR de emergencia.
            </p>
          </div>
          <div className="text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/15 font-display text-xl font-bold">
              3
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold">
              Usa la plataforma
            </h3>
            <p className="mt-2 text-sm text-white/80">
              Agenda turnos, encuentra servicios y conecta con la comunidad.
            </p>
          </div>
        </div>
        {!isSignedIn && (
          <div className="mt-10 text-center">
            <Link
              href="/register"
              className="btn bg-white font-semibold text-[hsl(var(--primary))] hover:bg-white/90"
            >
              Empezar ahora
            </Link>
          </div>
        )}
      </section>

      {/* User Types */}
      <section>
        <h2 className="text-center font-display text-xl font-semibold sm:text-2xl">
          Para todos los que aman a sus mascotas
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <div className="card p-6">
            <h3 className="font-display text-lg font-semibold">Tutores</h3>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              Organiza la salud, identidad y cuidado de tus mascotas en un solo lugar.
            </p>
            <Link
              href="/pets"
              className="mt-4 inline-flex text-sm font-medium text-[hsl(var(--secondary))]"
            >
              Ir a mascotas
            </Link>
          </div>
          <div className="card p-6">
            <h3 className="font-display text-lg font-semibold">Veterinarias</h3>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              Gestiona tu agenda, servicios y presencia en el mapa de forma simple.
            </p>
            <Link
              href="/appointments"
              className="mt-4 inline-flex text-sm font-medium text-[hsl(var(--secondary))]"
            >
              Ver agenda
            </Link>
          </div>
          <div className="card p-6">
            <h3 className="font-display text-lg font-semibold">Cuidadores</h3>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              Ofrece tus servicios, coordina turnos y conecta con nuevos clientes.
            </p>
            <Link
              href="/community"
              className="mt-4 inline-flex text-sm font-medium text-[hsl(var(--secondary))]"
            >
              Ver comunidad
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

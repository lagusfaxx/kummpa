"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { listBenefits } from "@/features/benefits/benefits-api";
import type { BenefitItem } from "@/features/benefits/types";
import { useAuth } from "@/features/auth/auth-context";
import { listPets } from "@/features/pets/pets-api";
import type { Pet } from "@/features/pets/types";
import { getVaccineCard } from "@/features/vaccines/vaccines-api";
import type { PetVaccineCard } from "@/features/vaccines/types";

const QUICK_SEARCHES = [
  { label: "Veterinarias", query: "veterinaria" },
  { label: "Comida", query: "comida para perros" },
  { label: "Peluquerias", query: "peluqueria canina" },
  { label: "Paseos", query: "paseos" },
  { label: "Parques", query: "plazas para perros" }
] as const;

const HERO_LANES = [
  {
    eyebrow: "Salud",
    title: "Veterinarias, vacunas y urgencias"
  },
  {
    eyebrow: "Compra",
    title: "Tiendas, marcas y beneficios"
  },
  {
    eyebrow: "Vida diaria",
    title: "Paseos, peluquerias y lugares pet-friendly"
  }
] as const;

const EXPLORE_CARDS = [
  {
    eyebrow: "Salud",
    title: "Buscar veterinarias y urgencias",
    description: "Compara cercania, horarios y atencion disponible para resolver rapido.",
    href: "/explore?q=veterinaria",
    action: "Ver opciones"
  },
  {
    eyebrow: "Alimento",
    title: "Explorar comida y tiendas",
    description: "Encuentra marcas, formatos y puntos de compra en un solo flujo.",
    href: "/explore?q=comida",
    action: "Buscar productos"
  },
  {
    eyebrow: "Cuidado",
    title: "Reservar paseos o peluqueria",
    description: "Parte desde servicios concretos para la rutina diaria de tu mascota.",
    href: "/explore?q=peluqueria",
    action: "Abrir servicios"
  },
  {
    eyebrow: "Lugares",
    title: "Descubrir parques y plazas",
    description: "Usa explorar para encontrar espacios donde salir, jugar y socializar.",
    href: "/explore?q=parques",
    action: "Ver lugares"
  }
] as const;

function vaccineState(card: PetVaccineCard | null) {
  if (!card) {
    return {
      label: "Sin carnet",
      detail: "Carga vacunas para ver recordatorios",
      chipClass: "bg-slate-100 text-slate-700"
    };
  }

  if (card.summary.overallStatus === "OVERDUE") {
    return {
      label: "Urgente",
      detail: "Tienes una vacuna vencida",
      chipClass: "bg-red-100 text-red-700"
    };
  }

  if (card.summary.overallStatus === "DUE_SOON") {
    return {
      label: "Pendiente",
      detail: "Hay una dosis cercana",
      chipClass: "bg-amber-100 text-amber-700"
    };
  }

  return {
    label: "Al dia",
    detail: "No hay vacunas urgentes",
    chipClass: "bg-emerald-100 text-emerald-700"
  };
}

function nextAction(card: PetVaccineCard | null) {
  const next = card?.upcoming?.[0];
  if (!next?.nextDoseAt) {
    return "Todo tranquilo por ahora";
  }

  return `Proxima dosis ${new Date(next.nextDoseAt).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short"
  })}`;
}

export function HomeHub() {
  const router = useRouter();
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;
  const [search, setSearch] = useState("");
  const [pets, setPets] = useState<Pet[]>([]);
  const [primaryCard, setPrimaryCard] = useState<PetVaccineCard | null>(null);
  const [benefits, setBenefits] = useState<BenefitItem[]>([]);

  useEffect(() => {
    if (!accessToken) return;

    void (async () => {
      const petRows = await listPets(accessToken).catch(() => []);
      setPets(petRows);

      const firstPet = petRows[0] ?? null;
      if (firstPet) {
        const card = await getVaccineCard(accessToken, firstPet.id).catch(() => null);
        setPrimaryCard(card);
      } else {
        setPrimaryCard(null);
      }

      const featured = await listBenefits(accessToken, {
        featuredOnly: true,
        validOnly: true,
        limit: 3
      }).catch(() => []);
      setBenefits(featured);
    })();
  }, [accessToken]);

  const primaryPet = pets[0] ?? null;
  const status = useMemo(() => vaccineState(primaryCard), [primaryCard]);
  const reminderText = useMemo(() => nextAction(primaryCard), [primaryCard]);
  const isAuthenticated = Boolean(accessToken);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    router.push(`/explore${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 sm:space-y-10">
      <section className="relative overflow-hidden rounded-[2.4rem] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--card)/0.98),hsl(34_72%_94%/0.96))] p-6 shadow-[0_32px_90px_hsl(var(--foreground)/0.12)] sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)/0.18),transparent_45%)]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-80 bg-[radial-gradient(circle_at_center,hsl(var(--secondary)/0.16),transparent_58%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_320px] lg:items-end">
          <div>
            <span className="kumpa-eyebrow">Explorar</span>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.55rem]">
              Encuentra servicios, productos y lugares para tu mascota.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[hsl(var(--muted-foreground))] sm:text-lg">
              Busca una necesidad puntual o explora categorias cercanas desde un solo punto de entrada.
            </p>

            <form
              onSubmit={submitSearch}
              className="mt-8 rounded-[2rem] border border-[hsl(var(--border)/0.9)] bg-white/92 p-4 shadow-[0_20px_55px_hsl(var(--foreground)/0.08)] sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Busca veterinarias, comida, peluqueria, paseos o plazas..."
                  className="!min-h-[4.2rem] !rounded-[1.6rem] !border-[hsl(var(--border)/0.85)] !bg-[hsl(var(--muted)/0.3)] px-5 text-base"
                />
                <button type="submit" className="btn btn-primary min-h-[4.2rem] px-6 text-base sm:min-w-[180px]">
                  Buscar ahora
                </button>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                  Categorias rapidas
                </p>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {QUICK_SEARCHES.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => router.push(`/explore?q=${encodeURIComponent(item.query)}`)}
                      className="kumpa-chip bg-white/90"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </form>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {HERO_LANES.map((lane) => (
                <article
                  key={lane.title}
                  className="rounded-[1.5rem] border border-white/60 bg-white/56 p-4 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.7)]"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--secondary))]">
                    {lane.eyebrow}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[hsl(var(--foreground))]">
                    {lane.title}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <aside className="kumpa-soft-section relative overflow-hidden p-5 sm:p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,hsl(var(--accent)/0.12),transparent_70%)]" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                Ruta clara
              </p>
              <h2 className="mt-3 text-2xl font-bold">Donde mirar primero</h2>
              <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                El hero concentra la accion principal para que entrar, buscar y decidir sea inmediato.
              </p>

              <div className="mt-5 space-y-3">
                {[
                  "Escribe lo que necesitas hoy.",
                  "Explora resultados con mapa y filtros.",
                  "Reserva, compra o guarda tus opciones."
                ].map((item, index) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-[1.35rem] border border-[hsl(var(--border)/0.85)] bg-white/70 p-3.5"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <p className="pt-1 text-sm font-medium leading-6 text-[hsl(var(--foreground))]">{item}</p>
                  </div>
                ))}
              </div>

              <Link href="/explore" className="btn btn-outline mt-6 w-full">
                Abrir explorar
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <article className="card p-6 sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="kumpa-eyebrow">Resumen personal</span>
              <h2 className="mt-3 text-3xl font-bold">Estado de mis mascotas</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Tu informacion sigue visible, pero debajo del buscador para no competir con la accion principal.
              </p>
            </div>
            <Link href="/pets" className="text-sm font-semibold text-[hsl(var(--primary))]">
              Ver todas
            </Link>
          </div>

          {isAuthenticated ? (
            primaryPet ? (
              <>
                <div className="mt-6 flex flex-col gap-4 rounded-[1.8rem] border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.34)] p-5 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-4">
                    {primaryPet.primaryPhotoUrl ? (
                      <img
                        src={primaryPet.primaryPhotoUrl}
                        alt={primaryPet.name}
                        className="h-20 w-20 rounded-[1.4rem] object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-[1.4rem] bg-white text-3xl font-semibold">
                        {primaryPet.name.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-2xl font-semibold">{primaryPet.name}</p>
                      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        {primaryPet.species} / {primaryPet.breed || "Sin raza"}
                      </p>
                    </div>
                  </div>
                  <div className="sm:ml-auto">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${status.chipClass}`}>
                      {status.label}
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-[1.6rem] border border-[hsl(var(--border))] bg-white/78 p-4">
                  <p className="text-sm font-semibold">{status.detail}</p>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{reminderText}</p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <article className="rounded-[1.4rem] border border-[hsl(var(--border))] bg-white/86 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                      Estado actual
                    </p>
                    <p className="mt-2 text-lg font-semibold">{status.label}</p>
                  </article>
                  <article className="rounded-[1.4rem] border border-[hsl(var(--border))] bg-white/86 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                      Proxima accion
                    </p>
                    <p className="mt-2 text-lg font-semibold">{reminderText}</p>
                  </article>
                  <article className="rounded-[1.4rem] border border-[hsl(var(--border))] bg-white/86 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                      Mascotas
                    </p>
                    <p className="mt-2 text-lg font-semibold">
                      {pets.length} registrad{pets.length === 1 ? "a" : "as"}
                    </p>
                  </article>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  <Link href="/pets" className="btn btn-outline w-full">
                    Mis mascotas
                  </Link>
                  <Link href={`/pets/${primaryPet.id}/vaccines`} className="btn btn-outline w-full">
                    Ver carnet
                  </Link>
                  <Link href="/explore" className="btn btn-primary w-full">
                    Explorar
                  </Link>
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-[1.8rem] border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.34)] p-5">
                <p className="text-2xl font-semibold">Aun no registras mascotas</p>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  Agrega la primera para ordenar vacunas, carnet digital, QR y recordatorios en un solo lugar.
                </p>
                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  <Link href="/pets/new" className="btn btn-primary w-full">
                    Agregar mascota
                  </Link>
                  <Link href="/pets" className="btn btn-outline w-full">
                    Ver modulo
                  </Link>
                  <Link href="/explore" className="btn btn-outline w-full">
                    Explorar
                  </Link>
                </div>
              </div>
            )
          ) : (
            <div className="mt-6 rounded-[1.8rem] border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.34)] p-5">
              <p className="text-2xl font-semibold">Activa tu resumen personal</p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Inicia sesion para ver estado de vacunas, recordatorios y accesos rapidos a tus mascotas.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <Link href="/login" className="btn btn-primary w-full">
                  Ingresar
                </Link>
                <Link href="/register" className="btn btn-outline w-full">
                  Crear cuenta
                </Link>
                <Link href="/explore" className="btn btn-outline w-full">
                  Explorar
                </Link>
              </div>
            </div>
          )}
        </article>

        <div className="grid gap-4">
          <article className="kumpa-soft-section p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
              Recordatorios
            </p>
            <h3 className="mt-3 text-2xl font-bold">Lo importante a mano</h3>
            <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              {isAuthenticated
                ? primaryPet
                  ? `${status.detail}. ${reminderText}.`
                  : "Agrega tu primera mascota para activar vacunas, carnet y alertas de salud."
                : "Inicia sesion para transformar este bloque en un resumen real de salud y actividad."}
            </p>
            <div className="mt-4 rounded-[1.35rem] border border-[hsl(var(--border)/0.85)] bg-white/78 p-4">
              <p className="text-sm font-semibold">{primaryPet ? primaryPet.name : "Tu cuenta Kumpa"}</p>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                {primaryPet ? reminderText : "Tus alertas, carnets y accesos rapidos apareceran aqui."}
              </p>
            </div>
          </article>

          <article className="kumpa-soft-section p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
              Gestion rapida
            </p>
            <h3 className="mt-3 text-2xl font-bold">Acciones personales</h3>
            <div className="mt-4 grid gap-3">
              {isAuthenticated ? (
                primaryPet ? (
                  <>
                    <Link
                      href={`/pets/${primaryPet.id}`}
                      className="rounded-[1.35rem] border border-[hsl(var(--border))] bg-white/82 p-4 transition hover:border-[hsl(var(--secondary)/0.3)]"
                    >
                      <p className="font-semibold">Ver perfil de {primaryPet.name}</p>
                      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        Historial, identidad y estado general.
                      </p>
                    </Link>
                    <Link
                      href={`/pets/${primaryPet.id}/vaccines`}
                      className="rounded-[1.35rem] border border-[hsl(var(--border))] bg-white/82 p-4 transition hover:border-[hsl(var(--secondary)/0.3)]"
                    >
                      <p className="font-semibold">Abrir carnet y vacunas</p>
                      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        Revisa dosis, proximos vencimientos y recordatorios.
                      </p>
                    </Link>
                    <Link
                      href="/pets/new"
                      className="rounded-[1.35rem] border border-[hsl(var(--border))] bg-white/82 p-4 transition hover:border-[hsl(var(--secondary)/0.3)]"
                    >
                      <p className="font-semibold">Agregar otra mascota</p>
                      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        Mantiene tu ecosistema personal ordenado.
                      </p>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/pets/new"
                      className="rounded-[1.35rem] border border-[hsl(var(--border))] bg-white/82 p-4 transition hover:border-[hsl(var(--secondary)/0.3)]"
                    >
                      <p className="font-semibold">Registrar primera mascota</p>
                      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        Activa carnet, vacunas, QR y recordatorios.
                      </p>
                    </Link>
                    <Link
                      href="/pets"
                      className="rounded-[1.35rem] border border-[hsl(var(--border))] bg-white/82 p-4 transition hover:border-[hsl(var(--secondary)/0.3)]"
                    >
                      <p className="font-semibold">Entrar a mis mascotas</p>
                      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        Ordena tu informacion personal desde el modulo central.
                      </p>
                    </Link>
                    <Link
                      href="/explore"
                      className="rounded-[1.35rem] border border-[hsl(var(--border))] bg-white/82 p-4 transition hover:border-[hsl(var(--secondary)/0.3)]"
                    >
                      <p className="font-semibold">Seguir explorando</p>
                      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        Mientras completas tu cuenta, explora servicios y lugares.
                      </p>
                    </Link>
                  </>
                )
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-[1.35rem] border border-[hsl(var(--border))] bg-white/82 p-4 transition hover:border-[hsl(var(--secondary)/0.3)]"
                  >
                    <p className="font-semibold">Ingresar a mi cuenta</p>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                      Desbloquea carnets, alertas y resumen personal.
                    </p>
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-[1.35rem] border border-[hsl(var(--border))] bg-white/82 p-4 transition hover:border-[hsl(var(--secondary)/0.3)]"
                  >
                    <p className="font-semibold">Crear cuenta premium</p>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                      Empieza a ordenar la vida de tu mascota desde hoy.
                    </p>
                  </Link>
                  <Link
                    href="/explore"
                    className="rounded-[1.35rem] border border-[hsl(var(--border))] bg-white/82 p-4 transition hover:border-[hsl(var(--secondary)/0.3)]"
                  >
                    <p className="font-semibold">Explorar sin registrarte</p>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                      Busca servicios, productos y lugares desde el hero principal.
                    </p>
                  </Link>
                </>
              )}
            </div>
          </article>
        </div>
      </section>

      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="kumpa-eyebrow">Exploracion</span>
            <h2 className="mt-3 text-3xl font-bold">Accesos utiles para partir rapido</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              Esta seccion ya no es un bloque neutro: cada acceso representa una necesidad concreta y accionable.
            </p>
          </div>
          <Link href="/explore" className="text-sm font-semibold text-[hsl(var(--primary))]">
            Ir a explorar
          </Link>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {EXPLORE_CARDS.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="card flex h-full flex-col rounded-[1.7rem] p-5 transition hover:border-[hsl(var(--secondary)/0.35)]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--secondary))]">
                {item.eyebrow}
              </p>
              <h3 className="mt-3 text-xl font-bold leading-tight">{item.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                {item.description}
              </p>
              <span className="mt-5 text-sm font-semibold text-[hsl(var(--primary))]">{item.action}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <article className="kumpa-soft-section p-5 sm:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <span className="kumpa-eyebrow">Complementario</span>
              <h2 className="mt-3 text-2xl font-bold">Descuentos y convenios</h2>
            </div>
            <Link href="/explore?withDiscount=1" className="text-sm font-semibold text-[hsl(var(--primary))]">
              Ver todo
            </Link>
          </div>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Siguen visibles, pero bajan de protagonismo para dejar a explorar como accion principal del Home.
          </p>

          <div className="mt-5 grid gap-3">
            {benefits.length > 0 ? (
              benefits.map((benefit) => (
                <article
                  key={benefit.id}
                  className="rounded-[1.45rem] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,#fff8f3,#ffffff)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold leading-tight">{benefit.title}</p>
                      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        {benefit.provider.name || benefit.summary || "Convenio"}
                      </p>
                    </div>
                    <span className="rounded-full bg-[hsl(var(--accent))] px-3 py-1 text-xs font-bold text-white">
                      {benefit.discountLabel ?? "Promo"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    {benefit.description || "Beneficio destacado para revisar dentro de explorar."}
                  </p>
                </article>
              ))
            ) : (
              <div className="rounded-[1.45rem] border border-dashed border-[hsl(var(--border))] bg-white/55 p-5 text-sm text-[hsl(var(--muted-foreground))]">
                Cuando existan promociones activas, apareceran aqui como apoyo y no como foco principal.
              </div>
            )}
          </div>
        </article>

        <article className="kumpa-soft-section p-5 sm:p-6">
          <span className="kumpa-eyebrow">Comunidad</span>
          <h2 className="mt-3 text-2xl font-bold">Contenido secundario con contexto</h2>
          <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Cuando ya sabes donde buscar, estas rutas complementan la experiencia con apoyo social y alertas utiles.
          </p>

          <div className="mt-5 grid gap-3">
            <Link
              href="/community"
              className="rounded-[1.45rem] border border-[hsl(var(--border))] bg-white/82 p-4 transition hover:border-[hsl(var(--secondary)/0.3)]"
            >
              <p className="font-semibold">Ir a comunidad</p>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                Recomendaciones, perfiles, publicaciones y vida pet compartida.
              </p>
            </Link>
            <Link
              href="/lost-pets"
              className="rounded-[1.45rem] border border-[hsl(var(--border))] bg-white/82 p-4 transition hover:border-[hsl(var(--secondary)/0.3)]"
            >
              <p className="font-semibold">Ver alertas cercanas</p>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                Mascotas perdidas y avistamientos cuando la prioridad es ayudar rapido.
              </p>
            </Link>
            <Link
              href="/benefits"
              className="rounded-[1.45rem] border border-[hsl(var(--border))] bg-white/82 p-4 transition hover:border-[hsl(var(--secondary)/0.3)]"
            >
              <p className="font-semibold">Abrir beneficios</p>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                Convenios y promociones listos para consultar con mas detalle.
              </p>
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}

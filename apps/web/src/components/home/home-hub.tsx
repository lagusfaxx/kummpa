"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { EmptyState } from "@/components/feedback/empty-state";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { SurfaceSkeleton } from "@/components/feedback/skeleton";
import { listAppointments } from "@/features/appointments/appointments-api";
import type { AppointmentRecord } from "@/features/appointments/types";
import { useAuth } from "@/features/auth/auth-context";
import { listBenefits } from "@/features/benefits/benefits-api";
import type { BenefitItem } from "@/features/benefits/types";
import { listLostPetAlerts, listNearbyLostPetAlerts } from "@/features/lost-pets/lost-pets-api";
import type { LostPetAlert } from "@/features/lost-pets/types";
import { listMapServices } from "@/features/map/map-api";
import type { MapServicePoint } from "@/features/map/types";
import { listMarketplaceListings } from "@/features/marketplace/marketplace-api";
import type { MarketplaceListing } from "@/features/marketplace/types";
import { listNewsArticles } from "@/features/news/news-api";
import type { NewsArticleListItem } from "@/features/news/types";
import { listPets } from "@/features/pets/pets-api";
import type { Pet } from "@/features/pets/types";
import { getVaccineCard, listMyNotifications } from "@/features/vaccines/vaccines-api";
import type { PetVaccineCard } from "@/features/vaccines/types";

interface DashboardPetCard {
  pet: Pet;
  vaccineCard: PetVaccineCard | null;
}

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

function formatDate(iso?: string | null) {
  if (!iso) return "Sin fecha";
  return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

function formatMoney(cents?: number | null, currencyCode = "CLP") {
  if (cents === null || cents === undefined) return null;
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(cents);
}

function formatDistance(distanceKm?: number | null) {
  if (distanceKm === null || distanceKm === undefined) return null;
  return `${distanceKm.toFixed(1)} km`;
}

function appointmentStatusLabel(status: AppointmentRecord["status"]) {
  if (status === "PENDING") return "Pendiente";
  if (status === "CONFIRMED") return "Confirmada";
  if (status === "COMPLETED") return "Completada";
  if (status === "CANCELLED") return "Cancelada";
  if (status === "REJECTED") return "Rechazada";
  return "Reagendada";
}

function serviceCategoryLabel(type: MapServicePoint["type"]) {
  if (type === "VET") return "Veterinaria";
  if (type === "GROOMING") return "Peluqueria";
  if (type === "CAREGIVER") return "Cuidador";
  if (type === "HOTEL") return "Hotel o guarderia";
  if (type === "SHOP") return "Tienda pet";
  if (type === "PARK") return "Parque";
  return "Servicio pet";
}

function vaccineTone(card: PetVaccineCard | null) {
  if (!card) return "bg-slate-100 text-slate-700";
  if (card.summary.overallStatus === "OVERDUE") return "bg-red-100 text-red-700";
  if (card.summary.overallStatus === "DUE_SOON") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-700";
}

function vaccineLabel(card: PetVaccineCard | null) {
  if (!card) return "Sin carnet";
  if (card.summary.overallStatus === "OVERDUE") return "Vacuna vencida";
  if (card.summary.overallStatus === "DUE_SOON") return "Proxima vacuna";
  return "Vacunas al dia";
}

function savingsCopy(discountLabel?: string | null) {
  if (!discountLabel) return "Oferta activa";
  if (discountLabel.toLowerCase().includes("ahorra")) return discountLabel;
  return `Ahorra ${discountLabel}`;
}

function petPriorityValue(card: PetVaccineCard | null) {
  if (!card) return 3;
  if (card.summary.overallStatus === "OVERDUE") return 0;
  if (card.summary.overallStatus === "DUE_SOON") return 1;
  return 2;
}

function petTimeline(card: PetVaccineCard | null) {
  if (!card) {
    return [
      "Sin carnet cargado",
      "Agrega vacunas para recibir recordatorios",
      "Identidad y salud en una sola ficha"
    ];
  }

  return [
    card.history[0]?.appliedAt
      ? `Ultima vacuna ${formatDate(card.history[0].appliedAt)}`
      : "Sin vacuna registrada",
    card.upcoming[0]?.nextDoseAt
      ? `Proxima dosis ${formatDate(card.upcoming[0].nextDoseAt)}`
      : "Sin proxima dosis pendiente",
    card.pet.healthStatus || "Estado general estable"
  ];
}

function serviceSmartChips(service: MapServicePoint) {
  const chips: string[] = [];
  if (service.isOpenNow) chips.push("rapido");
  if ((service.priceFrom ?? 0) > 0 && (service.priceFrom ?? 0) <= 20000) chips.push("economico");
  if ((service.rating ?? 0) >= 4.6 || service.reviewsCount >= 20) chips.push("popular");
  if (service.hasDiscount) chips.push("con descuento");
  return chips.slice(0, 3);
}

function SectionHeader({
  title,
  description,
  href,
  cta
}: {
  title: string;
  description?: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="kumpa-section-title">{title}</h2>
        {description && <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{description}</p>}
      </div>
      {href && cta && (
        <Link href={href} className="text-sm font-semibold text-[hsl(var(--primary))]">
          {cta}
        </Link>
      )}
    </div>
  );
}

function GuestHome() {
  return (
    <div className="space-y-6 py-3 sm:space-y-8">
      <section className="kumpa-soft-section relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)/0.18),transparent_52%)]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-48 bg-[radial-gradient(circle_at_center,hsl(var(--secondary)/0.18),transparent_58%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_320px] lg:items-center">
          <div>
            <span className="kumpa-eyebrow">Superapp pet</span>
            <BrandLogo variant="wordmark" className="mt-5 h-16 w-36 sm:h-20 sm:w-44" priority />
            <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Cuidado, reservas, beneficios y alertas en una sola app pet.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))] sm:text-base">
              Kumpa organiza la experiencia por tareas reales del tutor, no por modulos tecnicos.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/register" className="btn btn-primary">
                Crear cuenta
              </Link>
              <Link href="/login" className="btn btn-outline">
                Ya tengo cuenta
              </Link>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="kumpa-metric">
              <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                Todo en uno
              </p>
              <p className="mt-2 text-2xl font-bold">Mascotas, reservas, explorar, comunidad y alertas</p>
            </div>
            <div className="kumpa-metric">
              <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                Mobile first
              </p>
              <p className="mt-2 text-lg font-semibold">Simple de escanear, calida y lista para usar rapido.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function HomeHub() {
  const { isReady, isAuthenticated, session } = useAuth();
  const accessToken = session?.tokens.accessToken;
  const firstName = session?.user.firstName ?? "hola";

  const [pets, setPets] = useState<DashboardPetCard[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [benefits, setBenefits] = useState<BenefitItem[]>([]);
  const [services, setServices] = useState<MapServicePoint[]>([]);
  const [products, setProducts] = useState<MarketplaceListing[]>([]);
  const [alerts, setAlerts] = useState<LostPetAlert[]>([]);
  const [articles, setArticles] = useState<NewsArticleListItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState("destacados hoy");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || typeof navigator === "undefined") return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationLabel("cerca de ti");
      },
      () => {
        setLocation(null);
        setLocationLabel("destacados hoy");
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 600000 }
    );
  }, [isAuthenticated]);

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    const loadDashboard = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [petRows, appointmentRows, benefitRows, serviceRows, productRows, alertRows, articleRows, notificationRows] =
          await Promise.all([
            listPets(accessToken),
            listAppointments(accessToken, { view: "owner", limit: 12 }),
            listBenefits(accessToken, { featuredOnly: true, validOnly: true, limit: 6, sortBy: "featured" }),
            listMapServices({
              featuredOnly: true,
              sortBy: location ? "distance" : "rating",
              lat: location?.lat,
              lng: location?.lng,
              radiusKm: location ? 20 : undefined,
              limit: 6
            }),
            listMarketplaceListings(accessToken, { sortBy: "recent", limit: 4 }),
            location
              ? listNearbyLostPetAlerts(accessToken, { lat: location.lat, lng: location.lng, radiusKm: 20, limit: 4 })
              : listLostPetAlerts(accessToken, { activeOnly: true, limit: 4 }),
            listNewsArticles(accessToken, { featuredOnly: true, publishedOnly: true, sortBy: "featured", limit: 4 }),
            listMyNotifications(accessToken, true)
          ]);

        const petCards = await Promise.all(
          petRows.map(async (pet) => {
            try {
              const vaccineCard = await getVaccineCard(accessToken, pet.id);
              return { pet, vaccineCard };
            } catch {
              return { pet, vaccineCard: null };
            }
          })
        );

        setPets(petCards);
        setAppointments(appointmentRows);
        setBenefits(benefitRows);
        setServices(serviceRows.items);
        setProducts(productRows);
        setAlerts(alertRows);
        setArticles(articleRows);
        setNotifications(notificationRows);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar tu inicio.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadDashboard();
  }, [accessToken, location]);

  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.status === "PENDING" || appointment.status === "CONFIRMED")
        .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt)),
    [appointments]
  );

  const nextVaccine = useMemo(() => {
    const candidates = pets
      .flatMap((item) =>
        item.vaccineCard?.upcoming.map((record) => ({
          petName: item.pet.name,
          vaccineName: record.vaccineName,
          nextDoseAt: record.nextDoseAt ?? null
        })) ?? []
      )
      .filter((item) => item.nextDoseAt)
      .sort((left, right) => (left.nextDoseAt ?? "").localeCompare(right.nextDoseAt ?? ""));

    return candidates[0] ?? null;
  }, [pets]);

  const featuredPet = useMemo(() => {
    return [...pets].sort((left, right) => {
      const priorityDiff =
        petPriorityValue(left.vaccineCard) - petPriorityValue(right.vaccineCard);
      if (priorityDiff !== 0) return priorityDiff;
      return left.pet.name.localeCompare(right.pet.name);
    })[0] ?? null;
  }, [pets]);

  const highlightedAction = useMemo(() => {
    if (notifications[0]) {
      return {
        title: notifications[0].title,
        detail: notifications[0].body,
        tone: "kumpa-status-warning",
        ctaHref: "/pets",
        ctaLabel: "Revisar salud"
      };
    }

    if (upcomingAppointments[0]) {
      return {
        title: `${upcomingAppointments[0].pet.name} tiene una reserva cercana`,
        detail: `${upcomingAppointments[0].provider.providerName} · ${formatDateTime(
          upcomingAppointments[0].scheduledAt
        )}`,
        tone: "kumpa-status-success",
        ctaHref: "/appointments",
        ctaLabel: "Abrir reservas"
      };
    }

    if (nextVaccine) {
      return {
        title: `${nextVaccine.petName} tiene una dosis pendiente`,
        detail: `${nextVaccine.vaccineName} · ${formatDate(nextVaccine.nextDoseAt)}`,
        tone: "kumpa-status-warning",
        ctaHref: "/pets",
        ctaLabel: "Ver carnet"
      };
    }

    return {
      title: "Todo al dia por ahora",
      detail: "Aprovecha para revisar beneficios, servicios y comunidad.",
      tone: "kumpa-status-success",
      ctaHref: "/map",
      ctaLabel: "Explorar ahora"
    };
  }, [nextVaccine, notifications, upcomingAppointments]);

  const topBenefitDeals = useMemo(
    () =>
      benefits
        .filter((benefit) => benefit.flags.isActive)
        .sort((left, right) => Number(right.flags.isFeatured) - Number(left.flags.isFeatured))
        .slice(0, 5),
    [benefits]
  );

  const recommendedServices = useMemo(
    () =>
      [...services]
        .sort((left, right) => {
          const rightScore =
            Number(right.hasDiscount) * 4 +
            Number(right.isOpenNow) * 3 +
            (right.rating ?? 0);
          const leftScore =
            Number(left.hasDiscount) * 4 +
            Number(left.isOpenNow) * 3 +
            (left.rating ?? 0);
          return rightScore - leftScore;
        })
        .slice(0, 3),
    [services]
  );

  const nearbyNowServices = useMemo(
    () =>
      services
        .filter((service) => service.isOpenNow || service.hasDiscount)
        .slice(0, 4),
    [services]
  );

  const urgentAlerts = useMemo(
    () =>
      [...alerts]
        .sort((left, right) => {
          const rightScore =
            Number(right.medicalPriority) * 4 - (right.distanceKm ?? 99);
          const leftScore =
            Number(left.medicalPriority) * 4 - (left.distanceKm ?? 99);
          return rightScore - leftScore;
        })
        .slice(0, 3),
    [alerts]
  );

  if (!isReady) {
    return (
      <div className="space-y-4 py-4">
        <SurfaceSkeleton blocks={5} />
        <div className="grid gap-4 lg:grid-cols-2">
          <SurfaceSkeleton blocks={4} />
          <SurfaceSkeleton blocks={4} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <GuestHome />;
  }

  return (
    <div className="space-y-6 py-3 sm:space-y-8">
      {error && <InlineBanner tone="error">{error}</InlineBanner>}

      {isLoading ? (
        <>
          <SurfaceSkeleton blocks={5} />
          <div className="grid gap-4 lg:grid-cols-3">
            <SurfaceSkeleton blocks={4} />
            <SurfaceSkeleton blocks={4} />
            <SurfaceSkeleton blocks={4} />
          </div>
        </>
      ) : (
        <>
          <section className="kumpa-soft-section relative overflow-hidden p-5 sm:p-7">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)/0.18),transparent_52%)]" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-52 bg-[radial-gradient(circle_at_center,hsl(var(--secondary)/0.18),transparent_60%)]" />
            <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_380px]">
              <div className="space-y-4">
                <div>
                  <span className="kumpa-eyebrow">Inicio</span>
                  <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                    Hola, {firstName}. Esto ya te sirve ahora mismo para tu mascota.
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))] sm:text-base">
                    Tu portada prioriza la siguiente accion importante, ofertas activas, servicios utiles y alertas cercanas.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="kumpa-highlight-card p-5">
                    <p className="kumpa-eyebrow">Mascota destacada</p>
                    {featuredPet ? (
                      <div className="mt-4 flex items-center gap-4">
                        <div className="h-24 w-24 overflow-hidden rounded-[1.5rem] bg-[hsl(var(--muted))]">
                          {featuredPet.pet.primaryPhotoUrl ? (
                            <img
                              src={featuredPet.pet.primaryPhotoUrl}
                              alt={featuredPet.pet.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-[hsl(var(--muted-foreground))]">
                              {featuredPet.pet.name.slice(0, 1)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xl font-semibold">{featuredPet.pet.name}</p>
                          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                            Basado en su carnet y estado actual
                          </p>
                          <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${vaccineTone(featuredPet.vaccineCard)}`}>
                            {vaccineLabel(featuredPet.vaccineCard)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">
                        Agrega una mascota para ver prioridades y acciones personalizadas.
                      </p>
                    )}
                  </div>

                  <div className="kumpa-highlight-card p-5">
                    <p className="kumpa-eyebrow">Proxima accion relevante</p>
                    <p className="mt-4 text-xl font-semibold">{highlightedAction.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                      {highlightedAction.detail}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${highlightedAction.tone}`}>
                        Prioridad de hoy
                      </span>
                      <Link href={highlightedAction.ctaHref} className="btn btn-primary text-xs">
                        {highlightedAction.ctaLabel}
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Link href="/pets/new" className="btn btn-primary">
                    Agregar mascota
                  </Link>
                  <Link href="/appointments" className="btn btn-outline">
                    Reservar hora
                  </Link>
                  <Link href="/map" className="btn btn-outline">
                    Explorar cerca
                  </Link>
                  <Link href="/lost-pets/report" className="btn btn-secondary">
                    Reportar perdida
                  </Link>
                </div>
              </div>

              <aside className="grid gap-3">
                <div className="kumpa-urgent-card rounded-[1.7rem] p-5">
                  <p className="kumpa-eyebrow">Cerca de ti ahora</p>
                  <p className="mt-3 text-xl font-semibold">
                    {urgentAlerts[0]
                      ? `${urgentAlerts[0].pet.name} necesita ayuda cerca`
                      : "Sin emergencias activas en este momento"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    {urgentAlerts[0]
                      ? `${urgentAlerts[0].lastSeenAddress ?? "Zona cercana"} · ${
                          formatDistance(urgentAlerts[0].distanceKm) ?? "distancia estimada"
                        }`
                      : "Tu inicio seguira priorizando alertas cercanas cuando aparezcan."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href="/lost-pets" className="btn btn-secondary text-xs">
                      Ver alertas
                    </Link>
                    {urgentAlerts[0] ? (
                      <Link
                        href={`/lost-pets/${urgentAlerts[0].id}#report-sighting`}
                        className="btn btn-outline text-xs"
                      >
                        Yo la vi
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="kumpa-metric">
                  <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                    Recomendado para ti
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {featuredPet
                      ? `Sugerencias basadas en ${featuredPet.pet.name}`
                      : "Activa recomendaciones con tu primera mascota"}
                  </p>
                  <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                    Priorizamos lugares con descuento, abiertos ahora y bien valorados para reducir friccion.
                  </p>
                </div>
              </aside>
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader
              title="Ofertas activas cerca de ti"
              description="Descuentos con mas valor visible desde el primer scroll."
              href="/map"
              cta="Ver todas"
            />
            <div className="flex gap-4 overflow-x-auto pb-2">
              {topBenefitDeals.length === 0 ? (
                <div className="card min-w-[280px] p-5">
                  <p className="text-base font-semibold">Aun no hay ofertas destacadas</p>
                  <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                    En cuanto haya convenios o descuentos activos apareceran aqui con prioridad visual.
                  </p>
                </div>
              ) : (
                topBenefitDeals.map((benefit) => (
                  <article
                    key={benefit.id}
                    className="kumpa-highlight-card min-w-[300px] p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="kumpa-eyebrow">Oferta activa</p>
                        <h3 className="mt-3 text-xl font-semibold">{benefit.title}</h3>
                      </div>
                      {benefit.discountLabel ? (
                        <span className="kumpa-offer-badge">{savingsCopy(benefit.discountLabel)}</span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                      {benefit.summary}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="kumpa-chip">
                        {benefit.provider.name ?? "Convenio pet"}
                      </span>
                      {benefit.location.district ? (
                        <span className="kumpa-chip">{benefit.location.district}</span>
                      ) : null}
                      <span className="kumpa-chip">
                        {benefit.validity.daysRemaining} dias restantes
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href="/map" className="btn btn-primary text-xs">
                        Usar oferta
                      </Link>
                      <Link href="/appointments" className="btn btn-outline text-xs">
                        Reservar con promo
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div className="space-y-4">
              <SectionHeader
                title="Recomendado para ti"
                description={
                  featuredPet
                    ? `Basado en ${featuredPet.pet.name}, tu ubicacion y lo que hoy ofrece mejor valor.`
                    : "Basado en servicios con alta utilidad inmediata."
                }
                href="/map"
                cta="Explorar"
              />
              <div className="grid gap-4 lg:grid-cols-3">
                {recommendedServices.map((service) => (
                  <article key={service.id} className="kumpa-highlight-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">{service.name}</h3>
                        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                          {service.address ?? serviceCategoryLabel(service.type)}
                        </p>
                      </div>
                      {service.hasDiscount ? (
                        <span className="kumpa-offer-badge">
                          {savingsCopy(service.discountLabel)}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {serviceSmartChips(service).map((chip) => (
                        <span key={`${service.id}-${chip}`} className="kumpa-chip">
                          {chip}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                          Precio desde
                        </p>
                        <p className="mt-1 text-2xl font-bold text-[hsl(var(--primary))]">
                          {formatMoney(service.priceFrom) ?? "Consultar"}
                        </p>
                      </div>
                      <Link href="/appointments" className="btn btn-primary text-xs">
                        Reservar
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeader
                title="Cerca de ti ahora"
                description="Lo que puedes usar rapido porque esta abierto, cerca o con mejor precio."
              />
              <div className="space-y-3">
                {nearbyNowServices.length === 0 ? (
                  <div className="card p-5">
                    <p className="text-base font-semibold">No hay servicios rapidos destacados ahora</p>
                    <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                      Explora el mapa para ampliar el radio o revisar categorias especificas.
                    </p>
                  </div>
                ) : (
                  nearbyNowServices.map((service) => (
                    <article key={service.id} className="card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">{service.name}</h3>
                          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                            {formatDistance(service.distanceKm) ?? "Cerca"} | {service.address ?? serviceCategoryLabel(service.type)}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${service.isOpenNow ? "kumpa-status-success" : "kumpa-status-warning"}`}>
                          {service.isOpenNow ? "Abierto" : "Por revisar"}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {service.priceFrom !== null ? (
                          <span className="kumpa-chip">{formatMoney(service.priceFrom)}</span>
                        ) : null}
                        {service.hasDiscount ? (
                          <span className="kumpa-offer-badge">{savingsCopy(service.discountLabel)}</span>
                        ) : null}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader title="Tus mascotas" description="Perfiles, vacunas e identidad en una sola vista." href="/pets" cta="Ver todas" />

            {pets.length === 0 ? (
              <EmptyState
                eyebrow="Mis mascotas"
                title="Tu primera mascota desbloquea el verdadero valor de Kumpa"
                description="Crea su perfil para tener carnet digital, recordatorios, alertas de perdida, identidad QR y reservas asociadas."
                highlights={["Carnet digital", "Recordatorios", "Identidad QR", "Reservas asociadas"]}
                action={
                  <Link href="/pets/new" className="btn btn-primary">
                    Crear mi primera mascota
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                {pets.slice(0, 3).map((item) => (
                  <article key={item.pet.id} className="card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold">{item.pet.name}</h3>
                        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                          {item.pet.species} · {item.pet.breed || "Sin raza"} · {item.pet.ageYears ?? "?"} anos
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${vaccineTone(item.vaccineCard)}`}>
                        {vaccineLabel(item.vaccineCard)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm">
                      {item.vaccineCard?.upcoming[0]?.nextDoseAt
                        ? `Siguiente dosis ${formatDate(item.vaccineCard.upcoming[0].nextDoseAt)}`
                        : "Sin dosis pendiente"}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/pets/${item.pet.id}`} className="btn btn-outline text-xs">
                        Ver perfil
                      </Link>
                      <Link href={`/pets/${item.pet.id}/vaccines`} className="btn btn-outline text-xs">
                        Ver carnet
                      </Link>
                      <Link href={`/pets/${item.pet.id}/identity`} className="btn btn-outline text-xs">
                        Ver QR
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <SectionHeader title="Reservas y controles" description="Lo que viene hoy y lo pendiente." href="/appointments" cta="Abrir reservas" />
            <div className="grid gap-4 lg:grid-cols-2">
              {upcomingAppointments.length === 0 ? (
                <div className="card p-5">
                  <p className="text-base font-semibold">Todavia no tienes horas agendadas.</p>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    Busca veterinarias, peluquerias, cuidadores y hoteles desde una sola experiencia.
                  </p>
                </div>
              ) : (
                upcomingAppointments.slice(0, 4).map((appointment) => (
                  <article key={appointment.id} className="card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold">{appointment.pet.name}</p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          {appointment.provider.providerName}
                        </p>
                      </div>
                      <span className="rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 text-xs font-semibold">
                        {appointmentStatusLabel(appointment.status)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm">{appointment.serviceTypeLabel}</p>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                      {formatDateTime(appointment.scheduledAt)}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader title="Beneficios activos" description="Campanas y convenios que siguen activos para ti." href="/map" cta="Explorar todos" />
            <div className="grid gap-4 lg:grid-cols-3">
              {benefits.slice(0, 6).map((benefit) => (
                <article key={benefit.id} className="kumpa-highlight-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                        {benefit.provider.name ?? "Beneficio pet"}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold">{benefit.title}</h3>
                    </div>
                    {benefit.discountLabel && (
                      <span className="kumpa-offer-badge">
                        {savingsCopy(benefit.discountLabel)}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{benefit.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {benefit.location.district ? (
                      <span className="kumpa-chip">{benefit.location.district}</span>
                    ) : null}
                    <span className="kumpa-chip">{benefit.validity.daysRemaining} dias</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
            <div className="space-y-4">
              <SectionHeader title={`Servicios ${locationLabel}`} description="Veterinarias, peluquerias, hoteles y mas para actuar rapido." href="/map" cta="Ver explorar" />
              <div className="grid gap-4 lg:grid-cols-2">
                {services.slice(0, 4).map((service) => (
                  <article key={service.id} className="card p-4">
                    <h3 className="text-lg font-semibold">{service.name}</h3>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                      {service.address ?? serviceCategoryLabel(service.type)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                      {service.isOpenNow !== null && <span>{service.isOpenNow ? "Abierto ahora" : "Cerrado"}</span>}
                      {formatDistance(service.distanceKm) && <span>{formatDistance(service.distanceKm)}</span>}
                      {service.priceFrom !== null && <span>{formatMoney(service.priceFrom)}</span>}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href="/map" className="btn btn-outline text-xs">
                        Ver mas
                      </Link>
                      <Link href="/appointments" className="btn btn-primary text-xs">
                        Reservar
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeader title="Tiendas y productos" description="Promociones y destacados pet." href="/map" cta="Ver tiendas" />
              <div className="space-y-3">
                {products.slice(0, 4).map((listing) => (
                  <article key={listing.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold">{listing.title}</h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          {listing.district ?? "Marketplace pet"}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-[hsl(var(--primary))]">
                        {formatMoney(listing.priceCents, "CLP")}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader title={`Alertas activas ${locationLabel}`} description="Difusion rapida y ayuda comunitaria." href="/lost-pets" cta="Abrir alertas" />
            <div className="grid gap-4 lg:grid-cols-2">
              {alerts.length === 0 ? (
                <div className="card p-5">
                  <p className="text-base font-semibold">No hay alertas activas para mostrar ahora.</p>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    Si necesitas ayuda, puedes reportar una perdida en pocos pasos.
                  </p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <article key={alert.id} className="kumpa-urgent-card rounded-[1.6rem] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">{alert.pet.name}</h3>
                        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                          {alert.lastSeenAddress ?? "Ubicacion por confirmar"}
                        </p>
                      </div>
                      <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
                        {alert.medicalPriority ? "Urgente" : "Activa"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {formatDistance(alert.distanceKm) ? (
                        <span className="kumpa-chip">{formatDistance(alert.distanceKm)}</span>
                      ) : null}
                      <span className="kumpa-chip">{formatDateTime(alert.lastSeenAt)}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/lost-pets/${alert.id}`} className="btn btn-outline text-xs">
                        Ver alerta
                      </Link>
                      <Link href={`/lost-pets/${alert.id}#report-sighting`} className="btn btn-secondary">
                        Yo la vi
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div className="space-y-4">
              <SectionHeader title="Tips y noticias pet" description="Campanas, consejos y novedades con valor inmediato." href="/community" cta="Ir a comunidad" />
              <div className="grid gap-4 lg:grid-cols-2">
                {articles.slice(0, 4).map((article) => (
                  <article key={article.id} className="card overflow-hidden">
                    {article.coverImageUrl ? (
                      <img src={article.coverImageUrl} alt={article.title} className="h-44 w-full object-cover" />
                    ) : (
                      <div className="h-44 w-full bg-[linear-gradient(135deg,hsl(var(--accent)/0.22),hsl(var(--secondary)/0.16))]" />
                    )}
                    <div className="p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                        {article.category.label}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold">{article.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{article.excerpt}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeader title="Campanas utiles" description="Accesos directos a acciones de alto valor dentro de la app." />
              <div className="grid gap-3">
                <div className="card p-5">
                  <p className="text-sm font-semibold">Vacunas y controles</p>
                  <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    Usa el carnet digital y configura recordatorios para que ninguna vacuna se te pase.
                  </p>
                  <div className="mt-4">
                    <Link href="/pets" className="btn btn-outline text-xs">
                      Revisar mascotas
                    </Link>
                  </div>
                </div>
                <div className="card p-5">
                  <p className="text-sm font-semibold">Paseos y comunidad</p>
                  <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    Conecta con otros tutores, revisa paseos grupales y encuentra recomendaciones reales.
                  </p>
                  <div className="mt-4">
                    <Link href="/community" className="btn btn-outline text-xs">
                      Ver comunidad
                    </Link>
                  </div>
                </div>
                <div className="card p-5">
                  <p className="text-sm font-semibold">Perdida o avistamiento</p>
                  <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    Si pasa algo urgente, el reporte guiado y la difusion comunitaria estan listos para actuar.
                  </p>
                  <div className="mt-4">
                    <Link href="/lost-pets/report" className="btn btn-secondary text-xs">
                      Crear alerta
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

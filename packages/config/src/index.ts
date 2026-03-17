export const APP_NAME = "Kumpa";

export const API_PREFIX = "/api/v1";

export const WEB_NAV_ITEMS = [
  { href: "/", label: "Inicio" },
  { href: "/pets", label: "Mascotas" },
  { href: "/appointments", label: "Reservas" },
  { href: "/map", label: "Mapa" },
  { href: "/community", label: "Comunidad" },
  { href: "/forum", label: "Foro" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/benefits", label: "Beneficios" },
  { href: "/news", label: "Noticias" }
] as const;

export const FEATURE_ROADMAP = [
  { id: "profiles", label: "Perfiles de duenos y mascotas" },
  { id: "vaccines", label: "Carnet de vacunacion virtual" },
  { id: "appointments", label: "Reservas veterinarias" },
  { id: "map", label: "Mapa geolocalizado pet" },
  { id: "lost-pets", label: "Alertas de mascotas perdidas" },
  { id: "identity", label: "Identidad digital QR/NFC" },
  { id: "community", label: "Comunidad y perfiles sociales" },
  { id: "forum", label: "Foros y tips" },
  { id: "benefits", label: "Beneficios y descuentos" },
  { id: "marketplace", label: "Marketplace pet" },
  { id: "news", label: "Noticias del mundo animal" }
] as const;

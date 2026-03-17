import type { UserRole } from "@/features/auth/types";

export interface SiteNavItem {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  matchers: string[];
}

const AUTH_ROUTE_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email"
] as const;

const STANDALONE_ROUTE_PREFIXES = [
  "/pets/public",
  "/pets/emergency",
  "/lost-pets/public"
] as const;

export const PRIMARY_NAV_ITEMS: readonly SiteNavItem[] = [
  {
    href: "/",
    label: "Inicio",
    shortLabel: "Inicio",
    description: "Tu dia con tus mascotas",
    matchers: ["/"]
  },
  {
    href: "/pets",
    label: "Mis mascotas",
    shortLabel: "Mascotas",
    description: "Perfiles, carnet e identidad",
    matchers: ["/pets"]
  },
  {
    href: "/explore",
    label: "Explorar",
    shortLabel: "Explorar",
    description: "Busqueda global y mapa sincronizado",
    matchers: ["/explore", "/map"]
  },
  {
    href: "/community",
    label: "Comunidad",
    shortLabel: "Comunidad",
    description: "Posts, paseos y consultas",
    matchers: ["/community"]
  },
  {
    href: "/lost-pets",
    label: "Alertas",
    shortLabel: "Alertas",
    description: "Perdidas, avistamientos y ayuda",
    matchers: ["/lost-pets"]
  }
] as const;

export const MOBILE_NAV_ITEMS: readonly SiteNavItem[] = PRIMARY_NAV_ITEMS;

function pathMatches(pathname: string, candidate: string) {
  if (candidate === "/") {
    return pathname === "/";
  }
  return pathname === candidate || pathname.startsWith(`${candidate}/`);
}

export function isNavItemActive(pathname: string, item: Pick<SiteNavItem, "matchers">) {
  return item.matchers.some((candidate) => pathMatches(pathname, candidate));
}

export function isAuthRoute(pathname: string) {
  return AUTH_ROUTE_PREFIXES.some((candidate) => pathMatches(pathname, candidate));
}

export function isMinimalShellRoute(pathname: string) {
  if (isAuthRoute(pathname)) {
    return true;
  }
  if (pathname.includes("/vaccines/print") || pathname.includes("/vaccine-card")) {
    return true;
  }
  return STANDALONE_ROUTE_PREFIXES.some((candidate) => pathMatches(pathname, candidate));
}

interface QuickAction {
  href: string;
  label: string;
  description: string;
}

const GUEST_QUICK_ACTIONS: readonly QuickAction[] = [
  {
    href: "/register",
    label: "Crear cuenta",
    description: "Empieza a cuidar mejor a tu mascota"
  },
  {
    href: "/explore",
    label: "Explorar",
    description: "Busca servicios y beneficios pet"
  }
];

const ROLE_QUICK_ACTIONS: Record<UserRole, readonly QuickAction[]> = {
  OWNER: [
    { href: "/pets/new", label: "Agregar mascota", description: "Crea el perfil de tu mascota" },
    { href: "/explore", label: "Reservar", description: "Reserva desde explorar" }
  ],
  VET: [
    { href: "/business", label: "Panel comercio", description: "Gestiona tu negocio" },
    { href: "/account", label: "Perfil profesional", description: "Actualiza tu ficha" }
  ],
  CAREGIVER: [
    { href: "/business", label: "Panel comercio", description: "Servicios y horarios" },
    { href: "/community/meet", label: "Paseos", description: "Coordina encuentros" }
  ],
  SHOP: [
    { href: "/business", label: "Panel comercio", description: "Servicios y precios" },
    { href: "/benefits", label: "Promociones", description: "Administra descuentos y convenios" }
  ],
  ADMIN: [
    { href: "/admin", label: "Panel admin", description: "Control y moderacion" },
    { href: "/news", label: "Contenido", description: "Gestiona noticias y campanas" }
  ]
};

export function getQuickActions(role?: UserRole | null) {
  if (!role) {
    return GUEST_QUICK_ACTIONS;
  }
  return ROLE_QUICK_ACTIONS[role];
}

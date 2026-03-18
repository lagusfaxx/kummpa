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
    description: "Buscador principal, salud y descuentos",
    matchers: ["/"]
  },
  {
    href: "/explore",
    label: "Cerca de ti",
    shortLabel: "Cerca",
    description: "El centro del producto: servicios, productos y mapa",
    matchers: ["/explore", "/map"]
  },
  {
    href: "/pets",
    label: "Mis mascotas",
    shortLabel: "Mascotas",
    description: "Perfiles, carnet, vacunas y QR",
    matchers: ["/pets"]
  },
  {
    href: "/community",
    label: "Comunidad",
    shortLabel: "Comunidad",
    description: "Posts, perfiles y vida pet",
    matchers: ["/community", "/forum", "/news"]
  },
  {
    href: "/lost-pets",
    label: "Alertas",
    shortLabel: "Alertas",
    description: "Mascotas perdidas y avistamientos",
    matchers: ["/lost-pets"]
  }
] as const;

export const ACCOUNT_NAV_ITEM: SiteNavItem = {
  href: "/account",
  label: "Cuenta",
  shortLabel: "Cuenta",
  description: "Historial, perfil y configuracion",
  matchers: ["/account", "/appointments"]
};

export const BUSINESS_NAV_ITEM: SiteNavItem = {
  href: "/business",
  label: "Dashboard",
  shortLabel: "Dashboard",
  description: "Panel para veterinarias, tiendas y comercios",
  matchers: ["/business"]
};

export const ADMIN_NAV_ITEM: SiteNavItem = {
  href: "/admin",
  label: "Admin",
  shortLabel: "Admin",
  description: "Panel administrativo",
  matchers: ["/admin"]
};

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

export function isMapRoute(pathname: string) {
  return pathname === "/explore" || pathname.startsWith("/explore/");
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
    description: "Empieza a ordenar todo de tu mascota"
  },
  {
    href: "/explore",
    label: "Cerca de ti",
    description: "Busca servicios, comida y lugares"
  }
];

const ROLE_QUICK_ACTIONS: Record<UserRole, readonly QuickAction[]> = {
  OWNER: [
    { href: "/explore", label: "Buscar", description: "Todo empieza desde explorar" },
    { href: "/pets/new", label: "Agregar mascota", description: "Crea un nuevo perfil" }
  ],
  VET: [
    { href: "/business", label: "Dashboard", description: "Servicios, horarios y promos" },
    { href: "/account", label: "Cuenta", description: "Historial y configuracion" }
  ],
  CAREGIVER: [
    { href: "/business", label: "Dashboard", description: "Servicios y cobertura" },
    { href: "/account", label: "Cuenta", description: "Historial y configuracion" }
  ],
  SHOP: [
    { href: "/business", label: "Dashboard", description: "Catalogo, stock y promos" },
    { href: "/account", label: "Cuenta", description: "Historial y configuracion" }
  ],
  ADMIN: [
    { href: "/admin", label: "Admin", description: "Moderacion y control" },
    { href: "/account", label: "Cuenta", description: "Perfil e historial" }
  ]
};

export function getQuickActions(role?: UserRole | null) {
  if (!role) {
    return GUEST_QUICK_ACTIONS;
  }
  return ROLE_QUICK_ACTIONS[role];
}

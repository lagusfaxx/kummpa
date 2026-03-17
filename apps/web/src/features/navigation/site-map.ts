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
    description: "Pagina principal",
    matchers: ["/"]
  },
  {
    href: "/pets",
    label: "Mascotas",
    shortLabel: "Mascotas",
    description: "Perfiles y carnet",
    matchers: ["/pets"]
  },
  {
    href: "/appointments",
    label: "Agenda",
    shortLabel: "Agenda",
    description: "Reservas y turnos",
    matchers: ["/appointments"]
  },
  {
    href: "/map",
    label: "Mapa",
    shortLabel: "Mapa",
    description: "Servicios cerca",
    matchers: ["/map"]
  },
  {
    href: "/community",
    label: "Comunidad",
    shortLabel: "Social",
    description: "Red y encuentros",
    matchers: ["/community"]
  },
  {
    href: "/lost-pets",
    label: "Alertas",
    shortLabel: "Alertas",
    description: "Emergencias",
    matchers: ["/lost-pets"]
  }
] as const;

export const MOBILE_NAV_ITEMS: readonly SiteNavItem[] = PRIMARY_NAV_ITEMS.filter(
  (item) => item.href !== "/community"
);

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
    description: "Empieza a usar la plataforma"
  },
  {
    href: "/map",
    label: "Ver mapa",
    description: "Explora servicios pet-friendly"
  }
];

const ROLE_QUICK_ACTIONS: Record<UserRole, readonly QuickAction[]> = {
  OWNER: [
    { href: "/pets/new", label: "Nueva mascota", description: "Agrega una mascota" },
    { href: "/appointments", label: "Agendar", description: "Reserva un turno" }
  ],
  VET: [
    { href: "/appointments", label: "Mi agenda", description: "Gestiona turnos" },
    { href: "/account", label: "Mi perfil", description: "Actualiza tus datos" }
  ],
  CAREGIVER: [
    { href: "/appointments", label: "Mis turnos", description: "Organiza tu agenda" },
    { href: "/community/meet", label: "Encuentros", description: "Coordina paseos" }
  ],
  SHOP: [
    { href: "/marketplace", label: "Marketplace", description: "Gestiona productos" },
    { href: "/benefits", label: "Convenios", description: "Crea promociones" }
  ],
  ADMIN: [
    { href: "/admin", label: "Panel admin", description: "Control y moderacion" },
    { href: "/news", label: "Contenido", description: "Gestiona noticias" }
  ]
};

export function getQuickActions(role?: UserRole | null) {
  if (!role) {
    return GUEST_QUICK_ACTIONS;
  }
  return ROLE_QUICK_ACTIONS[role];
}

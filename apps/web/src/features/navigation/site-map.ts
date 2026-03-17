import type { UserRole } from "@/features/auth/types";

export type SiteTone = "health" | "community" | "alert";

export interface SiteNavItem {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  matchers: string[];
}

export interface HomeFlowStep {
  title: string;
  description: string;
}

export interface HomeShortcut {
  href: string;
  label: string;
  description: string;
  badge: string;
}

export interface HomeSection {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  tone: SiteTone;
  links: HomeShortcut[];
}

export interface AudienceHighlight {
  title: string;
  description: string;
  href: string;
  cta: string;
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
    description: "Resumen general",
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
    description: "Servicios y zonas",
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
    description: "Urgencias y busqueda",
    matchers: ["/lost-pets"]
  }
] as const;

export const MOBILE_NAV_ITEMS: readonly SiteNavItem[] = PRIMARY_NAV_ITEMS.filter(
  (item) => item.href !== "/community"
);

export const HOME_FLOW_STEPS: readonly HomeFlowStep[] = [
  {
    title: "Configura tu cuenta",
    description: "Define tu perfil operativo y deja lista la base de tu experiencia."
  },
  {
    title: "Registra tus mascotas",
    description: "Desde aqui se ordenan carnet, identidad, perfiles publicos y alertas."
  },
  {
    title: "Activa agenda y servicios",
    description: "Reserva atenciones, publica disponibilidad o descubre proveedores."
  },
  {
    title: "Expande la experiencia",
    description: "Comunidad, marketplace, beneficios y noticias aparecen cuando ya suman valor."
  }
] as const;

export const PRODUCT_SECTIONS: readonly HomeSection[] = [
  {
    id: "care",
    eyebrow: "Cuidado diario",
    title: "Todo lo esencial para la vida de cada mascota",
    description:
      "La base operativa de Kumpa vive aqui: perfiles, carnet, identidad y agenda en un solo flujo.",
    tone: "health",
    links: [
      {
        href: "/pets",
        label: "Mis mascotas",
        description: "Administra fichas, visibilidad publica y acceso a modulos de cada mascota.",
        badge: "base"
      },
      {
        href: "/appointments",
        label: "Reservas",
        description: "Solicita horas, confirma estados y gestiona la agenda de proveedores.",
        badge: "accion"
      },
      {
        href: "/account",
        label: "Mi cuenta",
        description: "Completa datos de tutor o proveedor para que el ecosistema funcione bien.",
        badge: "perfil"
      }
    ]
  },
  {
    id: "discover",
    eyebrow: "Descubrimiento",
    title: "Servicios, contenido util y beneficios cerca de ti",
    description:
      "Lo que ayuda a decidir mejor se agrupa en un mismo bloque: mapa, convenios y novedades.",
    tone: "community",
    links: [
      {
        href: "/map",
        label: "Mapa pet",
        description: "Encuentra servicios, parques, tiendas y puntos relevantes desde una sola vista.",
        badge: "publico"
      },
      {
        href: "/benefits",
        label: "Beneficios",
        description: "Descubre descuentos y cupones cuando ya necesitas activar un ahorro concreto.",
        badge: "con cuenta"
      },
      {
        href: "/news",
        label: "Noticias",
        description: "Consulta novedades, eventos y alertas editoriales con un formato mas ordenado.",
        badge: "con cuenta"
      }
    ]
  },
  {
    id: "community",
    eyebrow: "Vida social",
    title: "Comunidad, foro y comercio sin mezclar prioridades",
    description:
      "Las funciones sociales quedan juntas para que no compitan con la gestion de salud y agenda.",
    tone: "community",
    links: [
      {
        href: "/community",
        label: "Comunidad social",
        description: "Publica, comenta, sigue perfiles y construye la identidad social de tus mascotas.",
        badge: "con cuenta"
      },
      {
        href: "/forum",
        label: "Foro",
        description: "Resuelve dudas, comparte experiencias y busca referencias con mas contexto.",
        badge: "con cuenta"
      },
      {
        href: "/marketplace",
        label: "Marketplace",
        description: "Compra, vende y conversa sin perder de vista el resto del ecosistema.",
        badge: "con cuenta"
      }
    ]
  },
  {
    id: "alerts",
    eyebrow: "Emergencias",
    title: "Respuesta rapida cuando una situacion no puede esperar",
    description:
      "Las alertas criticas se separan del resto para dar foco a perdida, ubicacion y accion inmediata.",
    tone: "alert",
    links: [
      {
        href: "/lost-pets",
        label: "Mascotas perdidas",
        description: "Centraliza alertas, avistamientos y seguimiento del caso con prioridad visual.",
        badge: "urgente"
      },
      {
        href: "/map",
        label: "Mapa de apoyo",
        description: "Usa el mapa para ubicar servicios, parques y zonas relevantes durante una busqueda.",
        badge: "publico"
      },
      {
        href: "/pets",
        label: "Identidad y emergencia",
        description: "Activa QR, perfil de emergencia y opciones de compartido desde cada mascota.",
        badge: "desde mascotas"
      }
    ]
  }
] as const;

export const SECONDARY_SHORTCUTS: readonly HomeShortcut[] = [
  {
    href: "/community/meet",
    label: "Encuentros y paseos",
    description: "Organiza salidas, invitaciones y eventos pet sin perder el contexto social.",
    badge: "social"
  },
  {
    href: "/forum",
    label: "Consultas a la comunidad",
    description: "Cuando una duda necesita respuestas largas, el foro queda aparte del feed.",
    badge: "foro"
  },
  {
    href: "/marketplace",
    label: "Compra y venta",
    description: "El comercio se mantiene accesible, pero fuera del flujo de cuidados y urgencias.",
    badge: "comercio"
  },
  {
    href: "/news",
    label: "Lectura y contexto",
    description: "Las noticias quedan como capa informativa, no como ruido dentro de acciones criticas.",
    badge: "editorial"
  }
] as const;

export const AUDIENCE_HIGHLIGHTS: readonly AudienceHighlight[] = [
  {
    title: "Para tutores",
    description: "Ordena salud, reservas, perfiles publicos y alertas desde la misma cuenta.",
    href: "/pets",
    cta: "Ir a mascotas"
  },
  {
    title: "Para proveedores",
    description: "Gestiona agenda, servicios y presencia operativa sin mezclarlo con la vida social.",
    href: "/appointments",
    cta: "Abrir agenda"
  },
  {
    title: "Para administracion",
    description: "La capa de control queda separada del uso diario para no contaminar la experiencia.",
    href: "/admin",
    cta: "Abrir admin"
  }
] as const;

export const GUEST_QUICK_ACTIONS: readonly HomeShortcut[] = [
  {
    href: "/register",
    label: "Crear cuenta",
    description: "Activa reservas, comunidad, beneficios y seguimiento de tus mascotas.",
    badge: "primer paso"
  },
  {
    href: "/map",
    label: "Explorar mapa",
    description: "Revisa servicios y zonas sin tener que autenticarte primero.",
    badge: "publico"
  },
  {
    href: "/login",
    label: "Entrar a tu cuenta",
    description: "Vuelve a tu panel si ya tienes perfiles, agenda o alertas activas.",
    badge: "acceso"
  }
] as const;

const ROLE_QUICK_ACTIONS: Record<UserRole, readonly HomeShortcut[]> = {
  OWNER: [
    {
      href: "/pets/new",
      label: "Registrar mascota",
      description: "Empieza por la ficha central que conecta carnet, identidad y alertas.",
      badge: "prioridad"
    },
    {
      href: "/appointments",
      label: "Pedir una reserva",
      description: "Organiza controles, vacunas o servicios desde una sola agenda.",
      badge: "agenda"
    },
    {
      href: "/lost-pets/report",
      label: "Crear alerta",
      description: "Activa un caso de perdida rapido cuando realmente lo necesites.",
      badge: "urgente"
    }
  ],
  VET: [
    {
      href: "/appointments",
      label: "Gestionar agenda",
      description: "Confirma turnos, ajusta disponibilidad y publica servicios reservables.",
      badge: "operacion"
    },
    {
      href: "/map",
      label: "Revisar presencia en mapa",
      description: "Comprueba como se ve tu servicio dentro del ecosistema de descubrimiento.",
      badge: "visibilidad"
    },
    {
      href: "/account",
      label: "Actualizar perfil profesional",
      description: "Mantiene direccion, contacto y servicios listos para produccion.",
      badge: "perfil"
    }
  ],
  CAREGIVER: [
    {
      href: "/appointments",
      label: "Organizar turnos",
      description: "Controla disponibilidad, servicios y reservas desde una misma pantalla.",
      badge: "operacion"
    },
    {
      href: "/community/meet",
      label: "Abrir encuentros",
      description: "Coordina paseos e invitaciones sin perder la agenda principal.",
      badge: "social"
    },
    {
      href: "/account",
      label: "Completar cobertura",
      description: "Ajusta zonas, experiencia y datos visibles para tutores.",
      badge: "perfil"
    }
  ],
  SHOP: [
    {
      href: "/appointments",
      label: "Gestionar servicios",
      description: "Publica agenda y catalogo si ofreces servicios reservables desde la tienda.",
      badge: "operacion"
    },
    {
      href: "/marketplace",
      label: "Abrir marketplace",
      description: "Mantiene el canal comercial separado del flujo de atencion principal.",
      badge: "comercio"
    },
    {
      href: "/benefits",
      label: "Revisar convenios",
      description: "Conecta promociones y valor agregado cuando ya tienes la operacion ordenada.",
      badge: "valor"
    }
  ],
  ADMIN: [
    {
      href: "/admin",
      label: "Abrir panel admin",
      description: "Usuarios, moderacion y operaciones criticas quedan fuera del uso diario.",
      badge: "control"
    },
    {
      href: "/community",
      label: "Supervisar comunidad",
      description: "Revisa actividad social y puntos de friccion desde la capa publica.",
      badge: "moderacion"
    },
    {
      href: "/news",
      label: "Gestionar contenido",
      description: "Mantiene noticias y contenido como una capa editorial ordenada.",
      badge: "editorial"
    }
  ]
};

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

export function getQuickActions(role?: UserRole | null) {
  if (!role) {
    return GUEST_QUICK_ACTIONS;
  }

  return ROLE_QUICK_ACTIONS[role];
}

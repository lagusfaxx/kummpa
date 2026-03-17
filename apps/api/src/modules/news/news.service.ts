import { NewsCategory, Prisma, UserRole } from "@prisma/client";
import { HttpError } from "../../lib/http-error";
import { prisma } from "../../lib/prisma";
import type {
  CreateArticleInput,
  ListArticlesQueryInput,
  ShareArticleInput,
  UpdateArticleInput
} from "./news.schemas";

interface NewsActor {
  id: string;
  role: UserRole;
}

const categoryLabels: Record<NewsCategory, string> = {
  FOOD: "Alimentos nuevos",
  GADGETS: "Gadgets pet",
  VET_NEWS: "Novedades veterinarias",
  HEALTH_TIPS: "Consejos de salud",
  PET_EVENTS: "Eventos pet-friendly",
  HEALTH_ALERTS: "Alertas sanitarias",
  ADOPTION: "Adopcion",
  OTHER: "Otras noticias"
};

const newsInclude = {
  _count: {
    select: {
      saves: true,
      shares: true
    }
  }
} satisfies Prisma.NewsArticleInclude;

type NewsArticleWithInclude = Prisma.NewsArticleGetPayload<{
  include: typeof newsInclude;
}>;

const defaultArticles: Array<{
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: NewsCategory;
  tags: string[];
  coverImageUrl: string;
  sourceUrl: string;
  isFeatured: boolean;
}> = [
  {
    title: "Alimentos hipoalergenicos: como elegir segun especie y edad",
    slug: "alimentos-hipoalergenicos-segun-especie-y-edad",
    excerpt:
      "Guia rapida para seleccionar dietas hipoalergenicas en perros y gatos con sensibilidad digestiva.",
    body: "Las dietas hipoalergenicas deben elegirse en conjunto con un profesional veterinario. Revisa ingredientes principales, fuente proteica y tolerancia digestiva. En cachorros y gatitos prioriza balance nutricional, mientras que en adultos considera condiciones previas y control de peso. Mantener una transicion gradual de alimento reduce riesgos de diarrea y rechazo.",
    category: NewsCategory.FOOD,
    tags: ["alimentos", "nutricion", "perros", "gatos"],
    coverImageUrl: "https://images.unsplash.com/photo-1583511655826-05700d52f4d9",
    sourceUrl: "https://kumpa.cl/news/alimentos-hipoalergenicos",
    isFeatured: true
  },
  {
    title: "Collares inteligentes 2026: que funciones realmente valen la pena",
    slug: "collares-inteligentes-2026-funciones-clave",
    excerpt:
      "Comparativa de collares con GPS, monitoreo de actividad y alertas de geocerca para mascotas.",
    body: "Los collares inteligentes con geocerca, historial de rutas y carga rapida son los mas utiles en uso diario. Antes de comprar, revisa autonomia real, cobertura de red y resistencia al agua. El monitoreo de actividad aporta valor cuando se usa junto a objetivos semanales y controles de peso para mantener salud preventiva.",
    category: NewsCategory.GADGETS,
    tags: ["gadgets", "gps", "tecnologia", "seguridad"],
    coverImageUrl: "https://images.unsplash.com/photo-1619983081563-430f63602796",
    sourceUrl: "https://kumpa.cl/news/collares-inteligentes-2026",
    isFeatured: false
  },
  {
    title: "Actualizacion de calendario preventivo: enfoque estacional en salud pet",
    slug: "actualizacion-calendario-preventivo-salud-pet",
    excerpt:
      "Especialistas recomiendan reforzar desparasitacion y control preventivo en cambios de estacion.",
    body: "En periodos de cambio estacional aumentan consultas por dermatitis, parasitos externos y cuadros respiratorios. Los equipos veterinarios recomiendan actualizar esquema preventivo, revisar vacunas pendientes y mantener controles regulares. La anticipacion disminuye urgencias y mejora bienestar general en mascotas de todas las edades.",
    category: NewsCategory.VET_NEWS,
    tags: ["veterinaria", "prevencion", "vacunas"],
    coverImageUrl: "https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def",
    sourceUrl: "https://kumpa.cl/news/calendario-preventivo",
    isFeatured: true
  },
  {
    title: "Eventos pet-friendly del mes: actividades comunitarias por comuna",
    slug: "eventos-pet-friendly-del-mes",
    excerpt:
      "Ferias, paseos y jornadas de adopcion para compartir con tu mascota en espacios seguros.",
    body: "Durante este mes se programaron ferias pet-friendly, paseos grupales y jornadas de adopcion responsable en distintas comunas. Antes de asistir revisa hidratacion, control de correa y carnet sanitario al dia. Participar en eventos bien organizados fortalece la socializacion y promueve comunidad local pet.",
    category: NewsCategory.PET_EVENTS,
    tags: ["eventos", "pet-friendly", "comunidad"],
    coverImageUrl: "https://images.unsplash.com/photo-1517849845537-4d257902454a",
    sourceUrl: "https://kumpa.cl/news/eventos-pet-friendly",
    isFeatured: false
  },
  {
    title: "Alerta sanitaria regional: recomendaciones de cuidado preventivo",
    slug: "alerta-sanitaria-regional-recomendaciones",
    excerpt:
      "Medidas de autocuidado para mascotas frente a alerta sanitaria temporal en la region.",
    body: "Ante una alerta sanitaria temporal, se recomienda restringir exposicion en zonas de riesgo, reforzar higiene y consultar rapidamente ante sintomas. Mantener vacunacion al dia y seguir indicaciones de la autoridad veterinaria reduce propagacion. Evita automedicacion y prioriza canales oficiales de informacion.",
    category: NewsCategory.HEALTH_ALERTS,
    tags: ["alerta", "salud", "prevencion"],
    coverImageUrl: "https://images.unsplash.com/photo-1548767797-d8c844163c4c",
    sourceUrl: "https://kumpa.cl/news/alerta-sanitaria-regional",
    isFeatured: true
  }
];

function toText(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function uniqueTags(tags: string[]) {
  return Array.from(
    new Set(tags.map((item) => item.trim().toLowerCase()).filter((item) => item.length > 0))
  ).slice(0, 12);
}

async function ensureDefaultNewsArticles() {
  const total = await prisma.newsArticle.count();
  if (total > 0) return;

  const publishedAt = new Date();
  await prisma.newsArticle.createMany({
    data: defaultArticles.map((article, index) => ({
      ...article,
      publishedAt: new Date(publishedAt.getTime() - index * 6 * 60 * 60 * 1000),
      isPublished: true
    })),
    skipDuplicates: true
  });
}

async function resolveSavedArticleIds(userId: string, articleIds: string[]) {
  if (articleIds.length === 0) return new Set<string>();

  const rows = await prisma.newsArticleSave.findMany({
    where: {
      userId,
      articleId: {
        in: articleIds
      }
    },
    select: {
      articleId: true
    }
  });

  return new Set(rows.map((item) => item.articleId));
}

function serializeArticleListItem(article: NewsArticleWithInclude, savedIds: Set<string>) {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    category: {
      id: article.category,
      label: categoryLabels[article.category]
    },
    tags: article.tags,
    coverImageUrl: toText(article.coverImageUrl),
    sourceUrl: toText(article.sourceUrl),
    flags: {
      isFeatured: article.isFeatured,
      isPublished: article.isPublished
    },
    stats: {
      savesCount: article._count.saves,
      sharesCount: article._count.shares
    },
    viewer: {
      isSaved: savedIds.has(article.id)
    },
    publishedAt: article.publishedAt?.toISOString() ?? null,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString()
  };
}

function serializeArticleDetail(article: NewsArticleWithInclude, savedIds: Set<string>) {
  const base = serializeArticleListItem(article, savedIds);
  return {
    ...base,
    body: article.body
  };
}

async function getArticleByIdOrThrow(articleId: string) {
  const article = await prisma.newsArticle.findUnique({
    where: {
      id: articleId
    },
    include: newsInclude
  });

  if (!article) {
    throw new HttpError(404, "News article not found");
  }

  return article;
}

function enforceArticleVisibility(actor: NewsActor, article: { isPublished: boolean }) {
  if (!article.isPublished && actor.role !== UserRole.ADMIN) {
    throw new HttpError(404, "News article not found");
  }
}

export async function listNewsCategories() {
  await ensureDefaultNewsArticles();

  const grouped = await prisma.newsArticle.groupBy({
    by: ["category"],
    where: {
      isPublished: true
    },
    _count: {
      _all: true
    }
  });

  const counts = grouped.reduce<Record<NewsCategory, number>>(
    (accumulator, item) => {
      accumulator[item.category] = item._count._all;
      return accumulator;
    },
    {
      FOOD: 0,
      GADGETS: 0,
      VET_NEWS: 0,
      HEALTH_TIPS: 0,
      PET_EVENTS: 0,
      HEALTH_ALERTS: 0,
      ADOPTION: 0,
      OTHER: 0
    }
  );

  return (Object.keys(categoryLabels) as NewsCategory[]).map((category) => ({
    id: category,
    label: categoryLabels[category],
    articlesCount: counts[category] ?? 0
  }));
}

export async function listNewsArticles(actor: NewsActor, query: ListArticlesQueryInput) {
  await ensureDefaultNewsArticles();

  const andFilters: Prisma.NewsArticleWhereInput[] = [];

  if (query.q) {
    andFilters.push({
      OR: [
        {
          title: {
            contains: query.q,
            mode: "insensitive"
          }
        },
        {
          excerpt: {
            contains: query.q,
            mode: "insensitive"
          }
        },
        {
          body: {
            contains: query.q,
            mode: "insensitive"
          }
        },
        {
          tags: {
            has: query.q.toLowerCase()
          }
        }
      ]
    });
  }

  if (query.category) {
    andFilters.push({
      category: query.category
    });
  }

  if (query.featuredOnly) {
    andFilters.push({
      isFeatured: true
    });
  }

  if (query.savedOnly) {
    andFilters.push({
      saves: {
        some: {
          userId: actor.id
        }
      }
    });
  }

  if (query.publishedOnly || actor.role !== UserRole.ADMIN) {
    andFilters.push({
      isPublished: true
    });
  }

  const where: Prisma.NewsArticleWhereInput = andFilters.length > 0 ? { AND: andFilters } : {};

  const orderBy: Prisma.NewsArticleOrderByWithRelationInput[] =
    query.sortBy === "recent"
      ? [{ publishedAt: "desc" }, { createdAt: "desc" }]
      : [{ isFeatured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }];

  const rows = await prisma.newsArticle.findMany({
    where,
    take: query.limit,
    orderBy,
    include: newsInclude
  });

  const savedIds = await resolveSavedArticleIds(
    actor.id,
    rows.map((item) => item.id)
  );

  return rows.map((article) => serializeArticleListItem(article, savedIds));
}

export async function listSavedNewsArticles(actor: NewsActor, limit: number) {
  return listNewsArticles(actor, {
    q: undefined,
    category: undefined,
    featuredOnly: false,
    savedOnly: true,
    publishedOnly: false,
    sortBy: "recent",
    limit
  });
}

export async function getNewsArticleById(actor: NewsActor, articleId: string) {
  await ensureDefaultNewsArticles();
  const article = await getArticleByIdOrThrow(articleId);
  enforceArticleVisibility(actor, article);

  const savedIds = await resolveSavedArticleIds(actor.id, [article.id]);
  return serializeArticleDetail(article, savedIds);
}

export async function saveNewsArticle(actor: NewsActor, articleId: string) {
  const article = await prisma.newsArticle.findUnique({
    where: {
      id: articleId
    },
    select: {
      id: true,
      isPublished: true
    }
  });

  if (!article) {
    throw new HttpError(404, "News article not found");
  }

  enforceArticleVisibility(actor, article);

  await prisma.newsArticleSave.upsert({
    where: {
      articleId_userId: {
        articleId,
        userId: actor.id
      }
    },
    create: {
      articleId,
      userId: actor.id
    },
    update: {}
  });

  const savesCount = await prisma.newsArticleSave.count({
    where: {
      articleId
    }
  });

  return {
    articleId,
    savesCount,
    isSaved: true
  };
}

export async function unsaveNewsArticle(actor: NewsActor, articleId: string) {
  await prisma.newsArticleSave.deleteMany({
    where: {
      articleId,
      userId: actor.id
    }
  });

  const savesCount = await prisma.newsArticleSave.count({
    where: {
      articleId
    }
  });

  return {
    articleId,
    savesCount,
    isSaved: false
  };
}

export async function shareNewsArticle(actor: NewsActor, articleId: string, input: ShareArticleInput) {
  const article = await prisma.newsArticle.findUnique({
    where: {
      id: articleId
    },
    select: {
      id: true,
      isPublished: true
    }
  });

  if (!article) {
    throw new HttpError(404, "News article not found");
  }

  enforceArticleVisibility(actor, article);

  await prisma.newsArticleShare.create({
    data: {
      articleId,
      userId: actor.id,
      channel: input.channel
    }
  });

  const sharesCount = await prisma.newsArticleShare.count({
    where: {
      articleId
    }
  });

  return {
    articleId,
    sharesCount,
    channel: input.channel
  };
}

export async function createNewsArticle(actor: NewsActor, input: CreateArticleInput) {
  if (actor.role !== UserRole.ADMIN) {
    throw new HttpError(403, "Only admin can create news articles");
  }

  const created = await prisma.newsArticle.create({
    data: {
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      body: input.body,
      category: input.category,
      tags: uniqueTags(input.tags),
      coverImageUrl: input.coverImageUrl,
      sourceUrl: input.sourceUrl,
      isFeatured: input.isFeatured ?? false,
      isPublished: input.isPublished ?? true,
      publishedAt: input.publishedAt ?? new Date()
    },
    select: {
      id: true
    }
  });

  return getNewsArticleById(actor, created.id);
}

export async function updateNewsArticle(actor: NewsActor, articleId: string, input: UpdateArticleInput) {
  if (actor.role !== UserRole.ADMIN) {
    throw new HttpError(403, "Only admin can update news articles");
  }

  await getArticleByIdOrThrow(articleId);

  await prisma.newsArticle.update({
    where: {
      id: articleId
    },
    data: {
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      body: input.body,
      category: input.category,
      tags: input.tags ? uniqueTags(input.tags) : undefined,
      coverImageUrl: input.coverImageUrl,
      sourceUrl: input.sourceUrl,
      isFeatured: input.isFeatured,
      isPublished: input.isPublished,
      publishedAt: input.publishedAt
    }
  });

  return getNewsArticleById(actor, articleId);
}

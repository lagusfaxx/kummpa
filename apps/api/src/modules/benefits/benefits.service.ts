import { randomUUID } from "node:crypto";
import { BenefitRedemptionStatus, Prisma, ProviderType, UserRole } from "@prisma/client";
import { HttpError } from "../../lib/http-error";
import { prisma } from "../../lib/prisma";
import type {
  CreateBenefitInput,
  ListBenefitsQueryInput,
  ListMyRedemptionsQueryInput,
  UpdateBenefitInput
} from "./benefits.schemas";

interface BenefitActor {
  id: string;
  role: UserRole;
}

type BenefitValidityStatus = "ACTIVE" | "UPCOMING" | "EXPIRED" | "INACTIVE";

type RedemptionSnapshot = {
  id: string;
  benefitId: string;
  activationCode: string;
  status: BenefitRedemptionStatus;
  expiresAt: Date;
  usedAt: Date | null;
  cancelledAt: Date | null;
};

const benefitInclude = {
  _count: {
    select: {
      saves: true,
      redemptions: true
    }
  }
} satisfies Prisma.BenefitInclude;

type BenefitWithInclude = Prisma.BenefitGetPayload<{
  include: typeof benefitInclude;
}>;

function toText(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveBenefitValidity(benefit: {
  isActive: boolean;
  validFrom: Date;
  validTo: Date;
}): BenefitValidityStatus {
  const now = Date.now();
  if (!benefit.isActive) return "INACTIVE";
  if (benefit.validFrom.getTime() > now) return "UPCOMING";
  if (benefit.validTo.getTime() < now) return "EXPIRED";
  return "ACTIVE";
}

function calculateDaysRemaining(validTo: Date): number {
  const diffMs = validTo.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function sanitizeCouponPrefix(rawCode: string | null | undefined): string {
  const normalized = (rawCode ?? "KUMPA").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized.length > 0 ? normalized.slice(0, 10) : "KUMPA";
}

function createActivationCode(prefix: string): string {
  const nonce = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `${prefix}-${nonce}`;
}

function serializeRedemption(redemption: RedemptionSnapshot | null) {
  if (!redemption) return null;

  return {
    id: redemption.id,
    activationCode: redemption.activationCode,
    status: redemption.status,
    expiresAt: redemption.expiresAt.toISOString(),
    usedAt: redemption.usedAt?.toISOString() ?? null,
    cancelledAt: redemption.cancelledAt?.toISOString() ?? null
  };
}

function serializeBenefit(
  benefit: BenefitWithInclude,
  savedIds: Set<string>,
  redemptionsByBenefitId: Map<string, RedemptionSnapshot>
) {
  const validityStatus = resolveBenefitValidity(benefit);
  const redemption = redemptionsByBenefitId.get(benefit.id) ?? null;
  const isSaved = savedIds.has(benefit.id);
  const maxReached =
    benefit.maxRedemptions !== null &&
    benefit.maxRedemptions !== undefined &&
    benefit.redemptionsCount >= benefit.maxRedemptions;

  return {
    id: benefit.id,
    title: benefit.title,
    summary: benefit.summary,
    description: toText(benefit.description),
    provider: {
      type: benefit.providerType,
      name: toText(benefit.providerName)
    },
    discountLabel: toText(benefit.discountLabel),
    couponCode: toText(benefit.couponCode),
    terms: toText(benefit.terms),
    landingUrl: toText(benefit.landingUrl),
    location: {
      city: toText(benefit.city),
      district: toText(benefit.district)
    },
    validity: {
      status: validityStatus,
      validFrom: benefit.validFrom.toISOString(),
      validTo: benefit.validTo.toISOString(),
      daysRemaining: calculateDaysRemaining(benefit.validTo)
    },
    flags: {
      isFeatured: benefit.isFeatured,
      isActive: benefit.isActive
    },
    stats: {
      savesCount: benefit._count.saves,
      redemptionsCount: benefit.redemptionsCount,
      maxRedemptions: benefit.maxRedemptions
    },
    viewer: {
      isSaved,
      redemption: serializeRedemption(redemption),
      canRedeem: validityStatus === "ACTIVE" && !redemption && !maxReached
    },
    createdAt: benefit.createdAt.toISOString(),
    updatedAt: benefit.updatedAt.toISOString()
  };
}

const defaultBenefitsSeed: Array<{
  title: string;
  summary: string;
  description: string;
  providerType: ProviderType;
  providerName: string;
  discountLabel: string;
  couponCode: string;
  terms: string;
  city: string;
  district: string;
  landingUrl: string;
  maxRedemptions: number;
  isFeatured: boolean;
}> = [
  {
    title: "10% en consulta general veterinaria",
    summary: "Descuento en consulta general para primeras atenciones.",
    description:
      "Beneficio valido para primera consulta general de mascota en clinicas adheridas.",
    providerType: ProviderType.VET,
    providerName: "Clinica Vet Norte",
    discountLabel: "10% OFF",
    couponCode: "VET10",
    terms: "Una vez por usuario. No acumulable con otras promociones.",
    city: "Santiago",
    district: "Providencia",
    landingUrl: "https://kumpa.cl/benefits/vet10",
    maxRedemptions: 300,
    isFeatured: true
  },
  {
    title: "2x1 en bano y peluqueria",
    summary: "Promocion de higiene para perros pequenos y medianos.",
    description:
      "Al agendar dos servicios de bano/peluqueria se aplica 2x1 en el de menor valor.",
    providerType: ProviderType.GROOMING,
    providerName: "Pelo Feliz Grooming",
    discountLabel: "2x1",
    couponCode: "GROOM2X1",
    terms: "Aplica de lunes a jueves. Sujetos a disponibilidad de agenda.",
    city: "Santiago",
    district: "Nunoa",
    landingUrl: "https://kumpa.cl/benefits/groom2x1",
    maxRedemptions: 200,
    isFeatured: true
  },
  {
    title: "15% en alimentos premium",
    summary: "Descuento en alimento premium para perros y gatos.",
    description:
      "Valido para formatos seleccionados de alimento premium en tienda asociada.",
    providerType: ProviderType.SHOP,
    providerName: "Pet Store Central",
    discountLabel: "15% OFF",
    couponCode: "FOOD15",
    terms: "Tope de descuento CLP 20.000 por canje.",
    city: "Santiago",
    district: "Las Condes",
    landingUrl: "https://kumpa.cl/benefits/food15",
    maxRedemptions: 500,
    isFeatured: false
  },
  {
    title: "Vacunacion comunitaria con precio preferente",
    summary: "Jornada de vacunacion con cupos limitados por comuna.",
    description:
      "Campana de vacunacion preventiva para perros y gatos en operativos vecinales.",
    providerType: ProviderType.VET,
    providerName: "Red Vet Comunitaria",
    discountLabel: "Desde CLP 7.990",
    couponCode: "VACUNA7990",
    terms: "Sujeto a calendario del operativo y stock de dosis.",
    city: "Santiago",
    district: "Maipu",
    landingUrl: "https://kumpa.cl/benefits/vacuna7990",
    maxRedemptions: 600,
    isFeatured: false
  },
  {
    title: "Convenio tarjetas vecinas pet",
    summary: "Beneficio de descuento por convenio municipal.",
    description:
      "Presenta tarjeta vecina adherida y activa descuento en servicios pet participantes.",
    providerType: ProviderType.OTHER,
    providerName: "Convenio Municipal Pet",
    discountLabel: "Hasta 20% OFF",
    couponCode: "VECINOPET",
    terms: "Requiere validar tarjeta vecina vigente al momento del canje.",
    city: "Santiago",
    district: "La Florida",
    landingUrl: "https://kumpa.cl/benefits/vecinopet",
    maxRedemptions: 1000,
    isFeatured: true
  }
];

async function ensureDefaultBenefits() {
  const total = await prisma.benefit.count();
  if (total > 0) return;

  const now = new Date();
  const validFrom = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const validTo = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  await prisma.benefit.createMany({
    data: defaultBenefitsSeed.map((item) => ({
      ...item,
      validFrom,
      validTo,
      isActive: true
    }))
  });
}

async function resolveSavedBenefitIds(userId: string, benefitIds: string[]) {
  if (benefitIds.length === 0) return new Set<string>();

  const rows = await prisma.benefitSave.findMany({
    where: {
      userId,
      benefitId: {
        in: benefitIds
      }
    },
    select: {
      benefitId: true
    }
  });

  return new Set(rows.map((item) => item.benefitId));
}

async function resolveRedemptionsByBenefitId(userId: string, benefitIds: string[]) {
  if (benefitIds.length === 0) return new Map<string, RedemptionSnapshot>();

  const rows = await prisma.benefitRedemption.findMany({
    where: {
      userId,
      benefitId: {
        in: benefitIds
      }
    },
    select: {
      id: true,
      benefitId: true,
      activationCode: true,
      status: true,
      expiresAt: true,
      usedAt: true,
      cancelledAt: true
    }
  });

  return rows.reduce<Map<string, RedemptionSnapshot>>((accumulator, row) => {
    accumulator.set(row.benefitId, row);
    return accumulator;
  }, new Map<string, RedemptionSnapshot>());
}

async function getBenefitByIdOrThrow(benefitId: string) {
  const benefit = await prisma.benefit.findUnique({
    where: {
      id: benefitId
    },
    include: benefitInclude
  });

  if (!benefit) {
    throw new HttpError(404, "Benefit not found");
  }

  return benefit;
}

export async function listBenefits(actor: BenefitActor, query: ListBenefitsQueryInput) {
  await ensureDefaultBenefits();

  const now = new Date();
  const andFilters: Prisma.BenefitWhereInput[] = [];

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
          summary: {
            contains: query.q,
            mode: "insensitive"
          }
        },
        {
          description: {
            contains: query.q,
            mode: "insensitive"
          }
        },
        {
          providerName: {
            contains: query.q,
            mode: "insensitive"
          }
        },
        {
          discountLabel: {
            contains: query.q,
            mode: "insensitive"
          }
        }
      ]
    });
  }

  if (query.city) {
    andFilters.push({
      city: {
        contains: query.city,
        mode: "insensitive"
      }
    });
  }

  if (query.district) {
    andFilters.push({
      district: {
        contains: query.district,
        mode: "insensitive"
      }
    });
  }

  if (query.providerType) {
    andFilters.push({
      providerType: query.providerType
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

  if (query.activeOnly) {
    andFilters.push({
      isActive: true
    });
  }

  if (query.validOnly) {
    andFilters.push({
      validFrom: {
        lte: now
      }
    });
    andFilters.push({
      validTo: {
        gte: now
      }
    });
  }

  const where: Prisma.BenefitWhereInput = andFilters.length > 0 ? { AND: andFilters } : {};

  const orderBy: Prisma.BenefitOrderByWithRelationInput[] =
    query.sortBy === "recent"
      ? [{ createdAt: "desc" }]
      : query.sortBy === "expiring"
        ? [{ validTo: "asc" }, { createdAt: "desc" }]
        : [{ isFeatured: "desc" }, { validTo: "asc" }, { createdAt: "desc" }];

  const rows = await prisma.benefit.findMany({
    where,
    take: query.limit,
    orderBy,
    include: benefitInclude
  });

  const benefitIds = rows.map((item) => item.id);
  const [savedIds, redemptionsByBenefitId] = await Promise.all([
    resolveSavedBenefitIds(actor.id, benefitIds),
    resolveRedemptionsByBenefitId(actor.id, benefitIds)
  ]);

  return rows.map((benefit) => serializeBenefit(benefit, savedIds, redemptionsByBenefitId));
}

export async function listSavedBenefits(actor: BenefitActor, limit: number) {
  return listBenefits(actor, {
    q: undefined,
    city: undefined,
    district: undefined,
    providerType: undefined,
    featuredOnly: false,
    savedOnly: true,
    activeOnly: false,
    validOnly: false,
    sortBy: "recent",
    limit
  });
}

export async function getBenefitById(actor: BenefitActor, benefitId: string) {
  await ensureDefaultBenefits();
  const benefit = await getBenefitByIdOrThrow(benefitId);

  if (!benefit.isActive && actor.role !== UserRole.ADMIN) {
    throw new HttpError(404, "Benefit not found");
  }

  const [savedIds, redemptionsByBenefitId] = await Promise.all([
    resolveSavedBenefitIds(actor.id, [benefit.id]),
    resolveRedemptionsByBenefitId(actor.id, [benefit.id])
  ]);

  return serializeBenefit(benefit, savedIds, redemptionsByBenefitId);
}

export async function saveBenefit(actor: BenefitActor, benefitId: string) {
  const benefit = await prisma.benefit.findUnique({
    where: {
      id: benefitId
    },
    select: {
      id: true
    }
  });

  if (!benefit) {
    throw new HttpError(404, "Benefit not found");
  }

  await prisma.benefitSave.upsert({
    where: {
      benefitId_userId: {
        benefitId,
        userId: actor.id
      }
    },
    create: {
      benefitId,
      userId: actor.id
    },
    update: {}
  });

  const savesCount = await prisma.benefitSave.count({
    where: {
      benefitId
    }
  });

  return {
    benefitId,
    savesCount,
    isSaved: true
  };
}

export async function unsaveBenefit(actor: BenefitActor, benefitId: string) {
  await prisma.benefitSave.deleteMany({
    where: {
      benefitId,
      userId: actor.id
    }
  });

  const savesCount = await prisma.benefitSave.count({
    where: {
      benefitId
    }
  });

  return {
    benefitId,
    savesCount,
    isSaved: false
  };
}

export async function redeemBenefit(actor: BenefitActor, benefitId: string) {
  const benefit = await prisma.benefit.findUnique({
    where: {
      id: benefitId
    },
    select: {
      id: true,
      title: true,
      couponCode: true,
      validFrom: true,
      validTo: true,
      isActive: true,
      maxRedemptions: true,
      redemptionsCount: true
    }
  });

  if (!benefit) {
    throw new HttpError(404, "Benefit not found");
  }

  if (!benefit.isActive) {
    throw new HttpError(409, "Benefit is not active");
  }

  const now = Date.now();
  if (benefit.validFrom.getTime() > now) {
    throw new HttpError(409, "Benefit redemption is not available yet");
  }

  if (benefit.validTo.getTime() < now) {
    throw new HttpError(409, "Benefit redemption has expired");
  }

  if (benefit.maxRedemptions !== null && benefit.redemptionsCount >= benefit.maxRedemptions) {
    throw new HttpError(409, "Benefit redemption limit reached");
  }

  const existing = await prisma.benefitRedemption.findUnique({
    where: {
      benefitId_userId: {
        benefitId,
        userId: actor.id
      }
    },
    select: {
      id: true
    }
  });

  if (existing) {
    throw new HttpError(409, "Benefit already redeemed by user");
  }

  const activationCode = createActivationCode(sanitizeCouponPrefix(benefit.couponCode));

  const [redemption] = await prisma.$transaction([
    prisma.benefitRedemption.create({
      data: {
        benefitId,
        userId: actor.id,
        activationCode,
        status: BenefitRedemptionStatus.ACTIVE,
        expiresAt: benefit.validTo
      },
      select: {
        id: true,
        benefitId: true,
        activationCode: true,
        status: true,
        expiresAt: true,
        usedAt: true,
        cancelledAt: true,
        createdAt: true
      }
    }),
    prisma.benefit.update({
      where: {
        id: benefitId
      },
      data: {
        redemptionsCount: {
          increment: 1
        }
      }
    })
  ]);

  return {
    id: redemption.id,
    benefitId: redemption.benefitId,
    benefitTitle: benefit.title,
    activationCode: redemption.activationCode,
    status: redemption.status,
    expiresAt: redemption.expiresAt.toISOString(),
    usedAt: redemption.usedAt?.toISOString() ?? null,
    cancelledAt: redemption.cancelledAt?.toISOString() ?? null,
    createdAt: redemption.createdAt.toISOString()
  };
}

export async function listMyRedemptions(
  actor: BenefitActor,
  query: ListMyRedemptionsQueryInput
) {
  await prisma.benefitRedemption.updateMany({
    where: {
      userId: actor.id,
      status: BenefitRedemptionStatus.ACTIVE,
      expiresAt: {
        lt: new Date()
      }
    },
    data: {
      status: BenefitRedemptionStatus.EXPIRED
    }
  });

  const rows = await prisma.benefitRedemption.findMany({
    where: {
      userId: actor.id,
      status: query.status
    },
    orderBy: {
      createdAt: "desc"
    },
    take: query.limit,
    include: {
      benefit: {
        select: {
          id: true,
          title: true,
          summary: true,
          discountLabel: true,
          couponCode: true,
          providerType: true,
          providerName: true,
          validTo: true
        }
      }
    }
  });

  return rows.map((item) => ({
    id: item.id,
    activationCode: item.activationCode,
    status: item.status,
    expiresAt: item.expiresAt.toISOString(),
    usedAt: item.usedAt?.toISOString() ?? null,
    cancelledAt: item.cancelledAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    benefit: {
      id: item.benefit.id,
      title: item.benefit.title,
      summary: item.benefit.summary,
      discountLabel: toText(item.benefit.discountLabel),
      couponCode: toText(item.benefit.couponCode),
      provider: {
        type: item.benefit.providerType,
        name: toText(item.benefit.providerName)
      },
      validTo: item.benefit.validTo.toISOString()
    }
  }));
}

export async function createBenefit(actor: BenefitActor, input: CreateBenefitInput) {
  if (actor.role !== UserRole.ADMIN) {
    throw new HttpError(403, "Only admin can create benefits");
  }

  const created = await prisma.benefit.create({
    data: {
      title: input.title,
      summary: input.summary,
      description: input.description,
      providerType: input.providerType,
      providerName: input.providerName,
      discountLabel: input.discountLabel,
      couponCode: input.couponCode,
      terms: input.terms,
      city: input.city,
      district: input.district,
      landingUrl: input.landingUrl,
      validFrom: input.validFrom,
      validTo: input.validTo,
      maxRedemptions: input.maxRedemptions,
      isFeatured: input.isFeatured ?? false,
      isActive: input.isActive ?? true
    },
    select: {
      id: true
    }
  });

  return getBenefitById(actor, created.id);
}

export async function updateBenefit(actor: BenefitActor, benefitId: string, input: UpdateBenefitInput) {
  if (actor.role !== UserRole.ADMIN) {
    throw new HttpError(403, "Only admin can update benefits");
  }

  await getBenefitByIdOrThrow(benefitId);

  const updateData: Prisma.BenefitUpdateInput = {
    title: input.title,
    summary: input.summary,
    description: input.description,
    providerType: input.providerType,
    providerName: input.providerName,
    discountLabel: input.discountLabel,
    couponCode: input.couponCode,
    terms: input.terms,
    city: input.city,
    district: input.district,
    landingUrl: input.landingUrl,
    validFrom: input.validFrom,
    validTo: input.validTo,
    maxRedemptions: input.maxRedemptions,
    isFeatured: input.isFeatured,
    isActive: input.isActive
  };

  if (input.maxRedemptions === null) {
    updateData.maxRedemptions = null;
  }

  await prisma.benefit.update({
    where: {
      id: benefitId
    },
    data: updateData
  });

  return getBenefitById(actor, benefitId);
}

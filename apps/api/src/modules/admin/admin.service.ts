import { Prisma } from "@prisma/client";
import { env } from "../../config/env";
import { HttpError } from "../../lib/http-error";
import { prisma } from "../../lib/prisma";
import type {
  ListAdminPetsQueryInput,
  ListAdminUsersQueryInput,
  UpdateAdminPetInput,
  UpdateAdminUserInput
} from "./admin.schemas";

const adminUserSelect = {
  id: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  phone: true,
  city: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  _count: {
    select: {
      pets: true,
      posts: true,
      providedAppointments: true
    }
  }
} satisfies Prisma.UserSelect;

const adminPetSelect = {
  id: true,
  name: true,
  species: true,
  breed: true,
  isPublic: true,
  shareToken: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  owner: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true
    }
  },
  _count: {
    select: {
      vaccines: true,
      appointments: true,
      lostAlerts: true
    }
  }
} satisfies Prisma.PetSelect;

type AdminUserRow = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>;
type AdminPetRow = Prisma.PetGetPayload<{ select: typeof adminPetSelect }>;

function fullName(firstName?: string | null, lastName?: string | null) {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ").trim();
}

function toIsoOrNull(value?: Date | null) {
  return value ? value.toISOString() : null;
}

function baseUrl() {
  return env.APP_BASE_URL.replace(/\/$/, "");
}

function serializeAdminUser(user: AdminUserRow) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    fullName: fullName(user.firstName, user.lastName) || "Sin nombre",
    phone: user.phone ?? null,
    city: user.city ?? null,
    emailVerifiedAt: toIsoOrNull(user.emailVerifiedAt),
    lastLoginAt: toIsoOrNull(user.lastLoginAt),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    deletedAt: toIsoOrNull(user.deletedAt),
    flags: {
      isDeleted: Boolean(user.deletedAt),
      isVerified: Boolean(user.emailVerifiedAt)
    },
    stats: {
      petsCount: user._count.pets,
      postsCount: user._count.posts,
      providedAppointmentsCount: user._count.providedAppointments
    }
  };
}

function serializeAdminPet(pet: AdminPetRow) {
  return {
    id: pet.id,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    isPublic: pet.isPublic,
    shareToken: pet.shareToken,
    shareUrl: `${baseUrl()}/pets/public/${pet.shareToken}`,
    createdAt: pet.createdAt.toISOString(),
    updatedAt: pet.updatedAt.toISOString(),
    deletedAt: toIsoOrNull(pet.deletedAt),
    owner: {
      id: pet.owner.id,
      email: pet.owner.email,
      fullName: fullName(pet.owner.firstName, pet.owner.lastName) || "Sin nombre"
    },
    flags: {
      isDeleted: Boolean(pet.deletedAt)
    },
    stats: {
      vaccinesCount: pet._count.vaccines,
      appointmentsCount: pet._count.appointments,
      lostAlertsCount: pet._count.lostAlerts
    }
  };
}

export async function getAdminSummary() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    activeUsers,
    deletedUsers,
    unverifiedUsers,
    recentUsers,
    activePets,
    deletedPets,
    publicPets,
    recentPets,
    totalAppointments,
    pendingAppointments,
    confirmedAppointments,
    upcomingAppointments,
    activeLostPetAlerts,
    openCommunityReports,
    openForumReports,
    activeBenefits,
    publishedNews,
    activeSocialPosts
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: { not: null } } }),
    prisma.user.count({ where: { deletedAt: null, emailVerifiedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, createdAt: { gte: sevenDaysAgo } } }),
    prisma.pet.count({ where: { deletedAt: null } }),
    prisma.pet.count({ where: { deletedAt: { not: null } } }),
    prisma.pet.count({ where: { deletedAt: null, isPublic: true } }),
    prisma.pet.count({ where: { deletedAt: null, createdAt: { gte: sevenDaysAgo } } }),
    prisma.appointment.count(),
    prisma.appointment.count({ where: { status: "PENDING" } }),
    prisma.appointment.count({ where: { status: "CONFIRMED" } }),
    prisma.appointment.count({ where: { scheduledAt: { gte: now } } }),
    prisma.lostPetAlert.count({ where: { status: "ACTIVE" } }),
    prisma.socialReport.count({ where: { status: "OPEN" } }),
    prisma.forumReport.count({ where: { status: "OPEN" } }),
    prisma.benefit.count({ where: { isActive: true } }),
    prisma.newsArticle.count({ where: { isPublished: true } }),
    prisma.socialPost.count({ where: { deletedAt: null } })
  ]);

  return {
    users: {
      active: activeUsers,
      deleted: deletedUsers,
      unverified: unverifiedUsers,
      newLast7d: recentUsers
    },
    pets: {
      active: activePets,
      deleted: deletedPets,
      public: publicPets,
      newLast7d: recentPets
    },
    appointments: {
      total: totalAppointments,
      pending: pendingAppointments,
      confirmed: confirmedAppointments,
      upcoming: upcomingAppointments
    },
    moderation: {
      communityReportsOpen: openCommunityReports,
      forumReportsOpen: openForumReports,
      lostPetAlertsActive: activeLostPetAlerts
    },
    content: {
      activeBenefits,
      publishedNews,
      activeSocialPosts
    }
  };
}

export async function listAdminUsers(query: ListAdminUsersQueryInput) {
  const where: Prisma.UserWhereInput = {};

  if (query.q) {
    where.OR = [
      { email: { contains: query.q, mode: "insensitive" } },
      { firstName: { contains: query.q, mode: "insensitive" } },
      { lastName: { contains: query.q, mode: "insensitive" } },
      { phone: { contains: query.q, mode: "insensitive" } },
      { city: { contains: query.q, mode: "insensitive" } }
    ];
  }

  if (query.role) {
    where.role = query.role;
  }

  if (query.status === "active") {
    where.deletedAt = null;
  }

  if (query.status === "deleted") {
    where.deletedAt = { not: null };
  }

  if (query.status === "unverified") {
    where.deletedAt = null;
    where.emailVerifiedAt = null;
  }

  const rows = await prisma.user.findMany({
    where,
    select: adminUserSelect,
    take: query.limit,
    orderBy: [{ createdAt: "desc" }]
  });

  return rows.map((row) => serializeAdminUser(row));
}

export async function updateAdminUser(actorId: string, userId: string, input: UpdateAdminUserInput) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      deletedAt: true,
      emailVerifiedAt: true
    }
  });

  if (!existing) {
    throw new HttpError(404, "User not found");
  }

  if (actorId === userId && input.deleted === true) {
    throw new HttpError(400, "Admin cannot deactivate their own account");
  }

  const deletedAt = input.deleted === undefined ? undefined : input.deleted ? new Date() : null;
  const emailVerifiedAt = input.markEmailVerified
    ? existing.emailVerifiedAt ?? new Date()
    : undefined;

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.user.update({
      where: { id: userId },
      data: {
        ...(deletedAt !== undefined ? { deletedAt } : {}),
        ...(emailVerifiedAt !== undefined ? { emailVerifiedAt } : {})
      },
      select: adminUserSelect
    });

    if (input.deleted === true) {
      await tx.authSession.updateMany({
        where: {
          userId,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    }

    return next;
  });

  return serializeAdminUser(updated);
}

export async function listAdminPets(query: ListAdminPetsQueryInput) {
  const where: Prisma.PetWhereInput = {};

  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { species: { contains: query.q, mode: "insensitive" } },
      { breed: { contains: query.q, mode: "insensitive" } },
      { microchipNumber: { contains: query.q, mode: "insensitive" } },
      { owner: { email: { contains: query.q, mode: "insensitive" } } },
      { owner: { firstName: { contains: query.q, mode: "insensitive" } } },
      { owner: { lastName: { contains: query.q, mode: "insensitive" } } }
    ];
  }

  if (query.ownerId) {
    where.ownerId = query.ownerId;
  }

  if (query.species) {
    where.species = { contains: query.species, mode: "insensitive" };
  }

  if (query.visibility === "public") {
    where.isPublic = true;
  }

  if (query.visibility === "private") {
    where.isPublic = false;
  }

  if (query.status === "active") {
    where.deletedAt = null;
  }

  if (query.status === "deleted") {
    where.deletedAt = { not: null };
  }

  const rows = await prisma.pet.findMany({
    where,
    select: adminPetSelect,
    take: query.limit,
    orderBy: [{ createdAt: "desc" }]
  });

  return rows.map((row) => serializeAdminPet(row));
}

export async function updateAdminPet(petId: string, input: UpdateAdminPetInput) {
  const existing = await prisma.pet.findUnique({
    where: { id: petId },
    select: {
      id: true
    }
  });

  if (!existing) {
    throw new HttpError(404, "Pet not found");
  }

  const updated = await prisma.pet.update({
    where: { id: petId },
    data: {
      ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
      ...(input.deleted !== undefined
        ? {
            deletedAt: input.deleted ? new Date() : null
          }
        : {})
    },
    select: adminPetSelect
  });

  return serializeAdminPet(updated);
}

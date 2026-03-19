import type { Prisma } from "@prisma/client";
import { HttpError } from "../../lib/http-error";
import { prisma } from "../../lib/prisma";
import type {
  UpdateBaseProfileInput,
  UpdateCaregiverProfileInput,
  UpdateOwnerProfileInput,
  UpdateShopProfileInput,
  UpdateVetProfileInput
} from "./profiles.schemas";

const profileInclude = {
  ownerProfile: true,
  vetProfile: {
    include: {
      businessLocation: true
    }
  },
  caregiverProfile: {
    include: {
      businessLocation: true
    }
  },
  shopProfile: {
    include: {
      businessLocation: true
    }
  },
  groomerProfile: {
    include: {
      businessLocation: true
    }
  }
} satisfies Prisma.UserInclude;

type UserWithProfiles = Prisma.UserGetPayload<{
  include: typeof profileInclude;
}>;

function serializeProfile(user: UserWithProfiles) {
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      city: user.city,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null
    },
    ownerProfile: user.ownerProfile,
    vetProfile: user.vetProfile,
    caregiverProfile: user.caregiverProfile,
    shopProfile: user.shopProfile,
    groomerProfile: user.groomerProfile
  };
}

async function loadUserWithProfiles(userId: string): Promise<UserWithProfiles> {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null
    },
    include: profileInclude
  });

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  return user;
}

function hasUsefulBusinessLocation(input: {
  label?: string;
  address?: string;
  district?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  openingHours?: string[];
  contactPhone?: string;
}) {
  return Boolean(
    input.label ||
      input.address ||
      input.district ||
      input.city ||
      input.latitude !== undefined ||
      input.longitude !== undefined ||
      (input.openingHours && input.openingHours.length > 0) ||
      input.contactPhone
  );
}

async function syncVetBusinessLocation(
  tx: Prisma.TransactionClient,
  vetProfileId: string,
  input: UpdateVetProfileInput
) {
  const locationData = {
    label: input.clinicName,
    address: input.address,
    district: input.district,
    city: input.city,
    latitude: input.latitude,
    longitude: input.longitude,
    openingHours: input.openingHours,
    contactPhone: input.contactPhone
  };

  if (!hasUsefulBusinessLocation(locationData)) {
    await tx.businessLocation.deleteMany({
      where: {
        vetProfileId
      }
    });
    return;
  }

  await tx.businessLocation.upsert({
    where: {
      vetProfileId
    },
    create: {
      vetProfileId,
      ...locationData
    },
    update: locationData
  });
}

async function syncCaregiverBusinessLocation(
  tx: Prisma.TransactionClient,
  caregiverProfileId: string,
  input: UpdateCaregiverProfileInput
) {
  const locationData = {
    label: undefined,
    address: undefined,
    district: undefined,
    city: undefined,
    latitude: input.latitude,
    longitude: input.longitude,
    openingHours: input.schedule,
    contactPhone: undefined
  };

  if (!hasUsefulBusinessLocation(locationData)) {
    await tx.businessLocation.deleteMany({
      where: {
        caregiverProfileId
      }
    });
    return;
  }

  await tx.businessLocation.upsert({
    where: {
      caregiverProfileId
    },
    create: {
      caregiverProfileId,
      ...locationData
    },
    update: locationData
  });
}

async function syncShopBusinessLocation(
  tx: Prisma.TransactionClient,
  shopProfileId: string,
  input: UpdateShopProfileInput
) {
  const locationData = {
    label: input.businessName,
    address: input.address,
    district: input.district,
    city: input.city,
    latitude: input.latitude,
    longitude: input.longitude,
    openingHours: input.openingHours,
    contactPhone: input.contactPhone
  };

  if (!hasUsefulBusinessLocation(locationData)) {
    await tx.businessLocation.deleteMany({
      where: {
        shopProfileId
      }
    });
    return;
  }

  await tx.businessLocation.upsert({
    where: {
      shopProfileId
    },
    create: {
      shopProfileId,
      ...locationData
    },
    update: locationData
  });
}

export async function getMyProfile(userId: string) {
  const user = await loadUserWithProfiles(userId);
  return serializeProfile(user);
}

export async function updateBaseProfile(userId: string, input: UpdateBaseProfileInput) {
  await prisma.user.update({
    where: {
      id: userId
    },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      city: input.city
    }
  });

  return getMyProfile(userId);
}

export async function updateOwnerProfile(userId: string, input: UpdateOwnerProfileInput) {
  await prisma.ownerProfile.upsert({
    where: {
      userId
    },
    create: {
      userId,
      avatarUrl: input.avatarUrl,
      district: input.district,
      approximateAddress: input.approximateAddress,
      biography: input.biography,
      notificationPreferences: input.notificationPreferences
    },
    update: {
      avatarUrl: input.avatarUrl,
      district: input.district,
      approximateAddress: input.approximateAddress,
      biography: input.biography,
      notificationPreferences: input.notificationPreferences
    }
  });

  return getMyProfile(userId);
}

export async function updateVetProfile(userId: string, input: UpdateVetProfileInput) {
  await prisma.$transaction(async (tx) => {
    const profile = await tx.vetProfile.upsert({
      where: {
        userId
      },
      create: {
        userId,
        clinicName: input.clinicName,
        logoUrl: input.logoUrl,
        address: input.address,
        district: input.district,
        city: input.city,
        latitude: input.latitude,
        longitude: input.longitude,
        openingHours: input.openingHours,
        services: input.services,
        referencePrices: input.referencePrices,
        isEmergency24x7: input.isEmergency24x7,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        description: input.description,
        websiteUrl: input.websiteUrl,
        socialLinks: input.socialLinks
      },
      update: {
        clinicName: input.clinicName,
        logoUrl: input.logoUrl,
        address: input.address,
        district: input.district,
        city: input.city,
        latitude: input.latitude,
        longitude: input.longitude,
        openingHours: input.openingHours,
        services: input.services,
        referencePrices: input.referencePrices,
        isEmergency24x7: input.isEmergency24x7,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        description: input.description,
        websiteUrl: input.websiteUrl,
        socialLinks: input.socialLinks
      }
    });

    await syncVetBusinessLocation(tx, profile.id, input);
  });

  return getMyProfile(userId);
}

export async function updateCaregiverProfile(userId: string, input: UpdateCaregiverProfileInput) {
  await prisma.$transaction(async (tx) => {
    const profile = await tx.caregiverProfile.upsert({
      where: {
        userId
      },
      create: {
        userId,
        avatarUrl: input.avatarUrl,
        introduction: input.introduction,
        experience: input.experience,
        latitude: input.latitude,
        longitude: input.longitude,
        services: input.services,
        coverageAreas: input.coverageAreas,
        rates: input.rates,
        schedule: input.schedule
      },
      update: {
        avatarUrl: input.avatarUrl,
        introduction: input.introduction,
        experience: input.experience,
        latitude: input.latitude,
        longitude: input.longitude,
        services: input.services,
        coverageAreas: input.coverageAreas,
        rates: input.rates,
        schedule: input.schedule
      }
    });

    await syncCaregiverBusinessLocation(tx, profile.id, input);
  });

  return getMyProfile(userId);
}

export async function updateShopProfile(userId: string, input: UpdateShopProfileInput) {
  await prisma.$transaction(async (tx) => {
    const profile = await tx.shopProfile.upsert({
      where: {
        userId
      },
      create: {
        userId,
        businessName: input.businessName,
        logoUrl: input.logoUrl,
        address: input.address,
        district: input.district,
        city: input.city,
        latitude: input.latitude,
        longitude: input.longitude,
        basicCatalog: input.basicCatalog,
        openingHours: input.openingHours,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        websiteUrl: input.websiteUrl,
        discounts: input.discounts
      },
      update: {
        businessName: input.businessName,
        logoUrl: input.logoUrl,
        address: input.address,
        district: input.district,
        city: input.city,
        latitude: input.latitude,
        longitude: input.longitude,
        basicCatalog: input.basicCatalog,
        openingHours: input.openingHours,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        websiteUrl: input.websiteUrl,
        discounts: input.discounts
      }
    });

    await syncShopBusinessLocation(tx, profile.id, input);
  });

  return getMyProfile(userId);
}

/* ─── Public shop directory ───────────────────────────────────── */
export async function listPublicShops(opts: {
  city?: string;
  district?: string;
  limit?: number;
  offset?: number;
}) {
  return prisma.shopProfile.findMany({
    where: {
      businessName: { not: null },
      ...(opts.city ? { city: { contains: opts.city, mode: "insensitive" } } : {}),
      ...(opts.district ? { district: { contains: opts.district, mode: "insensitive" } } : {})
    },
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
    take: opts.limit ?? 50,
    skip: opts.offset ?? 0,
    orderBy: { createdAt: "desc" }
  });
}

export async function getPublicShopByUserId(userId: string) {
  const shop = await prisma.shopProfile.findUnique({
    where: { userId },
    include: { user: { select: { id: true, firstName: true, lastName: true } } }
  });
  if (!shop) throw new HttpError(404, "Tienda no encontrada");
  return shop;
}

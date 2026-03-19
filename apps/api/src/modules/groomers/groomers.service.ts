import type { Prisma } from "@prisma/client";
import { HttpError } from "../../lib/http-error";
import { prisma } from "../../lib/prisma";
import type {
  CreateGroomerInput,
  ListGroomersQueryInput,
  PatchGroomerInput,
  UpdateGroomerProfileInput
} from "./groomers.schemas";

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toText(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toStringArray(value: Prisma.JsonValue | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function toServiceItems(value: Prisma.JsonValue | null | undefined): Array<{
  name: string;
  duration?: number;
  price?: number;
  type?: string;
}> {
  if (!Array.isArray(value)) return [];
  return (value as unknown[])
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item))
    .map((item) => ({
      name: typeof item["name"] === "string" ? item["name"] : "",
      duration: typeof item["duration"] === "number" ? item["duration"] : undefined,
      price: typeof item["price"] === "number" ? item["price"] : undefined,
      type: typeof item["type"] === "string" ? item["type"] : undefined
    }))
    .filter((item) => item.name.length > 0);
}

function normalizeRating(value: Prisma.Decimal | number | null | undefined): number | null {
  const parsed = decimalToNumber(value);
  if (parsed === null) return null;
  if (parsed < 0 || parsed > 5) return null;
  return Number(parsed.toFixed(1));
}

function hasUsefulBusinessLocation(input: {
  address?: string;
  district?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  openingHours?: string[];
  contactPhone?: string;
}) {
  return Boolean(
    input.address ||
      input.district ||
      input.city ||
      input.latitude !== undefined ||
      input.longitude !== undefined ||
      (input.openingHours && input.openingHours.length > 0) ||
      input.contactPhone
  );
}

const groomerInclude = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      city: true
    }
  },
  businessLocation: true
} satisfies Prisma.GroomerProfileInclude;

type GroomerWithRelations = Prisma.GroomerProfileGetPayload<{
  include: typeof groomerInclude;
}>;

function serializeGroomer(groomer: GroomerWithRelations) {
  return {
    id: groomer.id,
    userId: groomer.userId,
    businessName: toText(groomer.businessName),
    logoUrl: toText(groomer.logoUrl),
    description: toText(groomer.description),
    address: toText(groomer.businessLocation?.address) ?? toText(groomer.address),
    district: toText(groomer.businessLocation?.district) ?? toText(groomer.district),
    city: toText(groomer.businessLocation?.city) ?? toText(groomer.city),
    latitude: decimalToNumber(groomer.businessLocation?.latitude ?? groomer.latitude),
    longitude: decimalToNumber(groomer.businessLocation?.longitude ?? groomer.longitude),
    openingHours: toStringArray(groomer.businessLocation?.openingHours ?? groomer.openingHours),
    services: toServiceItems(groomer.services),
    referencePrices: toStringArray(groomer.referencePrices),
    photos: toStringArray(groomer.photos),
    paymentMethods: toStringArray(groomer.paymentMethods),
    contactPhone:
      toText(groomer.businessLocation?.contactPhone) ?? toText(groomer.contactPhone),
    contactEmail: toText(groomer.contactEmail),
    websiteUrl: toText(groomer.websiteUrl),
    ratingAverage: normalizeRating(groomer.ratingAverage),
    reviewsCount: groomer.reviewsCount,
    ownerName: [groomer.user.firstName, groomer.user.lastName].filter(Boolean).join(" ").trim() || null,
    ownerPhone: toText(groomer.user.phone),
    createdAt: groomer.createdAt.toISOString(),
    updatedAt: groomer.updatedAt.toISOString()
  };
}

async function syncGroomerBusinessLocation(
  tx: Prisma.TransactionClient,
  groomerProfileId: string,
  input: {
    businessName?: string;
    address?: string;
    district?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    openingHours?: string[];
    contactPhone?: string;
  }
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
      where: { groomerProfileId }
    });
    return;
  }

  await tx.businessLocation.upsert({
    where: { groomerProfileId },
    create: { groomerProfileId, ...locationData },
    update: locationData
  });
}

export async function listGroomers(query: ListGroomersQueryInput) {
  const andClauses: Prisma.GroomerProfileWhereInput[] = [];

  andClauses.push({
    OR: [
      { latitude: { not: null }, longitude: { not: null } },
      {
        businessLocation: {
          latitude: { not: null },
          longitude: { not: null }
        }
      }
    ]
  });

  if (query.city) {
    andClauses.push({
      OR: [
        { city: { contains: query.city, mode: "insensitive" } },
        { businessLocation: { city: { contains: query.city, mode: "insensitive" } } }
      ]
    });
  }

  if (query.district) {
    andClauses.push({
      OR: [
        { district: { contains: query.district, mode: "insensitive" } },
        { businessLocation: { district: { contains: query.district, mode: "insensitive" } } }
      ]
    });
  }

  if (query.q) {
    const q = query.q;
    andClauses.push({
      OR: [
        { businessName: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { district: { contains: q, mode: "insensitive" } },
        { businessLocation: { city: { contains: q, mode: "insensitive" } } },
        { businessLocation: { district: { contains: q, mode: "insensitive" } } },
        { businessLocation: { address: { contains: q, mode: "insensitive" } } }
      ]
    });
  }

  const groomers = await prisma.groomerProfile.findMany({
    where: { AND: andClauses },
    include: groomerInclude,
    orderBy: { updatedAt: "desc" },
    take: query.limit
  });

  let results = groomers.map(serializeGroomer);

  if (query.lat !== undefined && query.lng !== undefined) {
    const refLat = query.lat;
    const refLng = query.lng;
    results = results
      .map((g) => {
        const distKm =
          g.latitude !== null && g.longitude !== null
            ? haversineKm(refLat, refLng, g.latitude, g.longitude)
            : Infinity;
        return { ...g, distanceKm: distKm };
      })
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }

  return results;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function getGroomerById(groomerId: string) {
  const groomer = await prisma.groomerProfile.findUnique({
    where: { id: groomerId },
    include: groomerInclude
  });

  if (!groomer) {
    throw new HttpError(404, "Groomer not found");
  }

  return serializeGroomer(groomer);
}

export async function getMyGroomerProfile(userId: string) {
  const groomer = await prisma.groomerProfile.findUnique({
    where: { userId },
    include: groomerInclude
  });

  if (!groomer) {
    return null;
  }

  return serializeGroomer(groomer);
}

export async function updateMyGroomerProfile(userId: string, input: UpdateGroomerProfileInput) {
  const profileData = {
    businessName: input.businessName,
    logoUrl: input.logoUrl,
    description: input.description,
    address: input.address,
    district: input.district,
    city: input.city,
    latitude: input.latitude,
    longitude: input.longitude,
    openingHours: input.openingHours,
    services: input.services as Prisma.InputJsonValue | undefined,
    referencePrices: input.referencePrices,
    photos: input.photos,
    paymentMethods: input.paymentMethods,
    contactPhone: input.contactPhone,
    contactEmail: input.contactEmail,
    websiteUrl: input.websiteUrl
  };

  await prisma.$transaction(async (tx) => {
    const profile = await tx.groomerProfile.upsert({
      where: { userId },
      create: { userId, ...profileData },
      update: profileData
    });

    await syncGroomerBusinessLocation(tx, profile.id, input);
  });

  return getMyGroomerProfile(userId);
}

export async function createGroomerProfile(
  input: CreateGroomerInput,
  actorUserId: string,
  actorRole: string
) {
  const targetUserId = actorRole === "ADMIN" && input.userId ? input.userId : actorUserId;

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true }
  });

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  if (user.role !== "GROOMING") {
    throw new HttpError(400, "Target user must have the GROOMING role to create a groomer profile");
  }

  const existing = await prisma.groomerProfile.findUnique({ where: { userId: targetUserId } });
  if (existing) {
    throw new HttpError(409, "Groomer profile already exists for this user");
  }

  const profileData = {
    businessName: input.businessName,
    logoUrl: input.logoUrl,
    description: input.description,
    address: input.address,
    district: input.district,
    city: input.city,
    latitude: input.latitude,
    longitude: input.longitude,
    openingHours: input.openingHours,
    services: input.services as Prisma.InputJsonValue | undefined,
    referencePrices: input.referencePrices,
    photos: input.photos,
    paymentMethods: input.paymentMethods,
    contactPhone: input.contactPhone,
    contactEmail: input.contactEmail,
    websiteUrl: input.websiteUrl
  };

  let groomerId: string;

  await prisma.$transaction(async (tx) => {
    const profile = await tx.groomerProfile.create({
      data: { userId: targetUserId, ...profileData }
    });
    groomerId = profile.id;
    await syncGroomerBusinessLocation(tx, profile.id, input);
  });

  return getGroomerById(groomerId!);
}

export async function getGroomerPublicServices(groomerId: string) {
  const groomer = await prisma.groomerProfile.findUnique({
    where: { id: groomerId },
    select: { userId: true }
  });
  if (!groomer) {
    throw new HttpError(404, "Groomer not found");
  }

  const items = await prisma.appointmentService.findMany({
    where: { providerUserId: groomer.userId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }, { createdAt: "asc" }]
  });

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    serviceType: item.serviceType,
    durationMinutes: item.durationMinutes,
    priceCents: item.priceCents,
    currencyCode: item.currencyCode,
    isActive: item.isActive,
    sortOrder: item.sortOrder
  }));
}

export async function patchGroomerById(
  groomerId: string,
  input: PatchGroomerInput,
  actorUserId: string,
  actorRole: string
) {
  const groomer = await prisma.groomerProfile.findUnique({ where: { id: groomerId } });
  if (!groomer) {
    throw new HttpError(404, "Groomer not found");
  }

  if (actorRole !== "ADMIN" && groomer.userId !== actorUserId) {
    throw new HttpError(403, "You can only update your own groomer profile");
  }

  const profileData: Prisma.GroomerProfileUpdateInput = {};
  if (input.businessName !== undefined) profileData.businessName = input.businessName;
  if (input.logoUrl !== undefined) profileData.logoUrl = input.logoUrl;
  if (input.description !== undefined) profileData.description = input.description;
  if (input.address !== undefined) profileData.address = input.address;
  if (input.district !== undefined) profileData.district = input.district;
  if (input.city !== undefined) profileData.city = input.city;
  if (input.latitude !== undefined) profileData.latitude = input.latitude;
  if (input.longitude !== undefined) profileData.longitude = input.longitude;
  if (input.openingHours !== undefined) profileData.openingHours = input.openingHours;
  if (input.services !== undefined) profileData.services = input.services as Prisma.InputJsonValue;
  if (input.referencePrices !== undefined) profileData.referencePrices = input.referencePrices;
  if (input.photos !== undefined) profileData.photos = input.photos;
  if (input.paymentMethods !== undefined) profileData.paymentMethods = input.paymentMethods;
  if (input.contactPhone !== undefined) profileData.contactPhone = input.contactPhone;
  if (input.contactEmail !== undefined) profileData.contactEmail = input.contactEmail;
  if (input.websiteUrl !== undefined) profileData.websiteUrl = input.websiteUrl;

  await prisma.$transaction(async (tx) => {
    await tx.groomerProfile.update({
      where: { id: groomerId },
      data: profileData
    });
    await syncGroomerBusinessLocation(tx, groomerId, input);
  });

  return getGroomerById(groomerId);
}

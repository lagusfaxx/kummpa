import type { Prisma } from "@prisma/client";
import { HttpError } from "../../lib/http-error";
import { prisma } from "../../lib/prisma";
import type { ListGroomersQueryInput, UpdateGroomerProfileInput } from "./groomers.schemas";

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
    services: toStringArray(groomer.services),
    referencePrices: toStringArray(groomer.referencePrices),
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
  input: UpdateGroomerProfileInput
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
  const where: Prisma.GroomerProfileWhereInput = {
    OR: [
      { latitude: { not: null }, longitude: { not: null } },
      {
        businessLocation: {
          latitude: { not: null },
          longitude: { not: null }
        }
      }
    ]
  };

  if (query.city) {
    where.OR = [
      { city: { contains: query.city, mode: "insensitive" } },
      { businessLocation: { city: { contains: query.city, mode: "insensitive" } } }
    ];
  }

  if (query.district) {
    where.AND = [
      {
        OR: [
          { district: { contains: query.district, mode: "insensitive" } },
          { businessLocation: { district: { contains: query.district, mode: "insensitive" } } }
        ]
      }
    ];
  }

  const groomers = await prisma.groomerProfile.findMany({
    where,
    include: groomerInclude,
    orderBy: { updatedAt: "desc" },
    take: query.limit
  });

  return groomers.map(serializeGroomer);
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
  await prisma.$transaction(async (tx) => {
    const profile = await tx.groomerProfile.upsert({
      where: { userId },
      create: {
        userId,
        businessName: input.businessName,
        logoUrl: input.logoUrl,
        description: input.description,
        address: input.address,
        district: input.district,
        city: input.city,
        latitude: input.latitude,
        longitude: input.longitude,
        openingHours: input.openingHours,
        services: input.services,
        referencePrices: input.referencePrices,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        websiteUrl: input.websiteUrl
      },
      update: {
        businessName: input.businessName,
        logoUrl: input.logoUrl,
        description: input.description,
        address: input.address,
        district: input.district,
        city: input.city,
        latitude: input.latitude,
        longitude: input.longitude,
        openingHours: input.openingHours,
        services: input.services,
        referencePrices: input.referencePrices,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        websiteUrl: input.websiteUrl
      }
    });

    await syncGroomerBusinessLocation(tx, profile.id, input);
  });

  return getMyGroomerProfile(userId);
}

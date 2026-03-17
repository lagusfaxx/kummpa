import { LostPetAlertStatus, UserRole, type Prisma } from "@prisma/client";
import { env } from "../../config/env";
import { HttpError } from "../../lib/http-error";
import { prisma } from "../../lib/prisma";
import {
  sendLostPetAlertActivatedEmail,
  sendLostPetSightingReportedEmail
} from "../notifications/email.service";
import type {
  CreateLostPetAlertInput,
  CreateLostPetSightingInput,
  ListLostPetAlertsQueryInput,
  UpdateLostPetAlertInput
} from "./lost-pets.schemas";

interface LostPetActor {
  id: string;
  role: UserRole;
}

const lostPetAlertInclude = {
  pet: {
    select: {
      id: true,
      name: true,
      primaryPhotoUrl: true,
      species: true,
      breed: true,
      microchipNumber: true,
      ownerId: true,
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          city: true
        }
      }
    }
  },
  sightings: {
    orderBy: {
      sightingAt: "desc"
    },
    take: 1,
    select: {
      id: true,
      sightingAt: true
    }
  },
  _count: {
    select: {
      sightings: true
    }
  }
} satisfies Prisma.LostPetAlertInclude;

const lostPetAlertDetailInclude = {
  pet: {
    select: {
      id: true,
      name: true,
      primaryPhotoUrl: true,
      species: true,
      breed: true,
      microchipNumber: true,
      ownerId: true,
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          city: true,
          email: true
        }
      }
    }
  },
  sightings: {
    orderBy: {
      sightingAt: "desc"
    },
    include: {
      reporterUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  },
  _count: {
    select: {
      sightings: true
    }
  }
} satisfies Prisma.LostPetAlertInclude;

type LostPetAlertWithSummary = Prisma.LostPetAlertGetPayload<{
  include: typeof lostPetAlertInclude;
}>;

type LostPetAlertWithDetails = Prisma.LostPetAlertGetPayload<{
  include: typeof lostPetAlertDetailInclude;
}>;

function fullName(firstName?: string | null, lastName?: string | null) {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ").trim();
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function haversineDistanceKm(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((earthRadiusKm * c).toFixed(2));
}

function serializeLostPetAlert(
  alert: LostPetAlertWithSummary,
  distanceKm?: number | null
) {
  const ownerFullName =
    fullName(alert.pet.owner.firstName, alert.pet.owner.lastName) || "Tutor Kumpa";
  const lastSighting = alert.sightings[0];

  return {
    id: alert.id,
    pet: {
      id: alert.pet.id,
      name: alert.pet.name,
      primaryPhotoUrl: alert.pet.primaryPhotoUrl,
      species: alert.pet.species,
      breed: alert.pet.breed,
      microchipNumber: alert.pet.microchipNumber
    },
    owner: {
      id: alert.pet.owner.id,
      fullName: ownerFullName,
      phone: alert.pet.owner.phone,
      city: alert.pet.owner.city
    },
    status: alert.status,
    lastSeenAt: alert.lastSeenAt.toISOString(),
    lastSeenLat: decimalToNumber(alert.lastSeenLat),
    lastSeenLng: decimalToNumber(alert.lastSeenLng),
    lastSeenAddress: alert.lastSeenAddress,
    description: alert.description,
    emergencyNotes: alert.emergencyNotes,
    medicalPriority: alert.medicalPriority,
    searchRadiusKm: alert.searchRadiusKm,
    broadcastEnabled: alert.broadcastEnabled,
    shareToken: alert.shareToken,
    foundAt: alert.foundAt?.toISOString() ?? null,
    closedAt: alert.closedAt?.toISOString() ?? null,
    stats: {
      sightingsCount: alert._count.sightings,
      lastSightingAt: lastSighting?.sightingAt.toISOString() ?? null
    },
    distanceKm: distanceKm ?? null,
    createdAt: alert.createdAt.toISOString(),
    updatedAt: alert.updatedAt.toISOString()
  };
}

function serializeLostPetAlertDetail(
  alert: LostPetAlertWithDetails,
  actor?: LostPetActor
) {
  const ownerFullName =
    fullName(alert.pet.owner.firstName, alert.pet.owner.lastName) || "Tutor Kumpa";
  const isOwner = actor ? actor.id === alert.pet.ownerId : false;
  const isAdmin = actor?.role === UserRole.ADMIN;

  return {
    id: alert.id,
    pet: {
      id: alert.pet.id,
      name: alert.pet.name,
      primaryPhotoUrl: alert.pet.primaryPhotoUrl,
      species: alert.pet.species,
      breed: alert.pet.breed,
      microchipNumber: alert.pet.microchipNumber
    },
    owner: {
      id: alert.pet.owner.id,
      fullName: ownerFullName,
      phone: alert.pet.owner.phone,
      city: alert.pet.owner.city
    },
    status: alert.status,
    lastSeenAt: alert.lastSeenAt.toISOString(),
    lastSeenLat: decimalToNumber(alert.lastSeenLat),
    lastSeenLng: decimalToNumber(alert.lastSeenLng),
    lastSeenAddress: alert.lastSeenAddress,
    description: alert.description,
    emergencyNotes: alert.emergencyNotes,
    medicalPriority: alert.medicalPriority,
    searchRadiusKm: alert.searchRadiusKm,
    broadcastEnabled: alert.broadcastEnabled,
    shareToken: alert.shareToken,
    foundAt: alert.foundAt?.toISOString() ?? null,
    closedAt: alert.closedAt?.toISOString() ?? null,
    sightings: alert.sightings.map((sighting) => ({
      id: sighting.id,
      reporter: sighting.reporterUser
        ? {
            id: sighting.reporterUser.id,
            fullName:
              fullName(sighting.reporterUser.firstName, sighting.reporterUser.lastName) ||
              "Usuario Kumpa"
          }
        : null,
      sightingAt: sighting.sightingAt.toISOString(),
      lat: decimalToNumber(sighting.lat),
      lng: decimalToNumber(sighting.lng),
      address: sighting.address,
      comment: sighting.comment,
      photoUrl: sighting.photoUrl,
      createdAt: sighting.createdAt.toISOString(),
      updatedAt: sighting.updatedAt.toISOString()
    })),
    stats: {
      sightingsCount: alert._count.sightings
    },
    permissions: {
      canEditAlert: Boolean(isOwner || isAdmin),
      canCloseAlert: Boolean(isOwner || isAdmin),
      canReportSighting: alert.status === LostPetAlertStatus.ACTIVE
    },
    createdAt: alert.createdAt.toISOString(),
    updatedAt: alert.updatedAt.toISOString()
  };
}

async function assertOwnedPet(userId: string, petId: string) {
  const pet = await prisma.pet.findFirst({
    where: {
      id: petId,
      ownerId: userId,
      deletedAt: null
    },
    select: {
      id: true,
      name: true
    }
  });

  if (!pet) {
    throw new HttpError(404, "Pet not found");
  }

  return pet;
}

async function getAlertWithDetailsOrThrow(alertId: string) {
  const alert = await prisma.lostPetAlert.findUnique({
    where: {
      id: alertId
    },
    include: lostPetAlertDetailInclude
  });

  if (!alert) {
    throw new HttpError(404, "Lost pet alert not found");
  }

  return alert;
}

function assertCanManageAlert(actor: LostPetActor, ownerId: string) {
  if (actor.role === UserRole.ADMIN || actor.id === ownerId) {
    return;
  }

  throw new HttpError(403, "Only owner or admin can manage this alert");
}

export async function createLostPetAlert(actor: LostPetActor, input: CreateLostPetAlertInput) {
  await assertOwnedPet(actor.id, input.petId);

  const existingActive = await prisma.lostPetAlert.findFirst({
    where: {
      petId: input.petId,
      status: LostPetAlertStatus.ACTIVE
    },
    select: {
      id: true
    }
  });

  if (existingActive) {
    throw new HttpError(409, "This pet already has an active lost alert");
  }

  const created = await prisma.lostPetAlert.create({
    data: {
      petId: input.petId,
      status: LostPetAlertStatus.ACTIVE,
      lastSeenAt: input.lastSeenAt,
      lastSeenLat: input.lastSeenLat,
      lastSeenLng: input.lastSeenLng,
      lastSeenAddress: input.lastSeenAddress,
      description: input.description,
      emergencyNotes: input.emergencyNotes,
      medicalPriority: input.medicalPriority,
      searchRadiusKm: input.searchRadiusKm,
      broadcastEnabled: input.broadcastEnabled
    },
    include: lostPetAlertInclude
  });

  await sendLostPetAlertActivatedEmail({
    to: created.pet.owner.email,
    firstName: created.pet.owner.firstName,
    petName: created.pet.name,
    lastSeenAt: created.lastSeenAt,
    lastSeenAddress: created.lastSeenAddress,
    shareUrl: `${env.APP_BASE_URL}/lost-pets/public/${created.shareToken}`,
    detailUrl: `${env.APP_BASE_URL}/lost-pets/${created.id}`
  });

  return serializeLostPetAlert(created);
}

export async function listLostPetAlerts(actor: LostPetActor, query: ListLostPetAlertsQueryInput) {
  const where: Prisma.LostPetAlertWhereInput = {};

  if (query.mine) {
    where.pet = {
      ownerId: actor.id
    };
  }

  if (query.petId) {
    where.petId = query.petId;
  }

  if (query.status) {
    where.status = query.status;
  } else if (query.activeOnly) {
    where.status = LostPetAlertStatus.ACTIVE;
  }

  if (query.medicalPriority !== undefined) {
    where.medicalPriority = query.medicalPriority;
  }

  if (query.q) {
    const q = query.q;
    where.OR = [
      {
        pet: {
          name: {
            contains: q,
            mode: "insensitive"
          }
        }
      },
      {
        description: {
          contains: q,
          mode: "insensitive"
        }
      },
      {
        lastSeenAddress: {
          contains: q,
          mode: "insensitive"
        }
      }
    ];
  }

  const alerts = await prisma.lostPetAlert.findMany({
    where,
    include: lostPetAlertInclude,
    orderBy: [{ medicalPriority: "desc" }, { updatedAt: "desc" }],
    take: query.limit
  });

  const hasReference = query.lat !== undefined && query.lng !== undefined;
  const withDistance = alerts
    .map((alert) => {
      if (!hasReference) {
        return {
          alert,
          distanceKm: null as number | null
        };
      }

      const lat = decimalToNumber(alert.lastSeenLat);
      const lng = decimalToNumber(alert.lastSeenLng);
      if (lat === null || lng === null) {
        return {
          alert,
          distanceKm: null as number | null
        };
      }

      return {
        alert,
        distanceKm: haversineDistanceKm(query.lat!, query.lng!, lat, lng)
      };
    })
    .filter((item) => item.distanceKm === null || item.distanceKm <= query.radiusKm);

  if (hasReference) {
    withDistance.sort((left, right) => {
      const leftDistance = left.distanceKm ?? Number.POSITIVE_INFINITY;
      const rightDistance = right.distanceKm ?? Number.POSITIVE_INFINITY;
      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      if (left.alert.medicalPriority !== right.alert.medicalPriority) {
        return Number(right.alert.medicalPriority) - Number(left.alert.medicalPriority);
      }

      return right.alert.updatedAt.getTime() - left.alert.updatedAt.getTime();
    });
  }

  return withDistance.map((item) => serializeLostPetAlert(item.alert, item.distanceKm));
}

export async function getLostPetAlertById(actor: LostPetActor, alertId: string) {
  const alert = await getAlertWithDetailsOrThrow(alertId);
  return serializeLostPetAlertDetail(alert, actor);
}

export async function getPublicLostPetAlertByShareToken(shareToken: string) {
  const alert = await prisma.lostPetAlert.findUnique({
    where: {
      shareToken
    },
    include: lostPetAlertDetailInclude
  });

  if (!alert) {
    throw new HttpError(404, "Lost pet public profile not found");
  }

  return serializeLostPetAlertDetail(alert);
}

export async function updateLostPetAlert(
  actor: LostPetActor,
  alertId: string,
  input: UpdateLostPetAlertInput
) {
  const alert = await getAlertWithDetailsOrThrow(alertId);
  assertCanManageAlert(actor, alert.pet.ownerId);

  const statusChanged = input.status && input.status !== alert.status;
  let foundAt = alert.foundAt;
  let closedAt = alert.closedAt;

  if (statusChanged && input.status === LostPetAlertStatus.FOUND) {
    foundAt = foundAt ?? new Date();
    closedAt = null;
  }

  if (statusChanged && input.status === LostPetAlertStatus.CLOSED) {
    closedAt = new Date();
    foundAt = foundAt ?? closedAt;
  }

  if (statusChanged && input.status === LostPetAlertStatus.ACTIVE) {
    foundAt = null;
    closedAt = null;
  }

  const updated = await prisma.lostPetAlert.update({
    where: {
      id: alertId
    },
    data: {
      status: input.status,
      lastSeenAt: input.lastSeenAt,
      lastSeenLat: input.lastSeenLat,
      lastSeenLng: input.lastSeenLng,
      lastSeenAddress: input.lastSeenAddress,
      description: input.description,
      emergencyNotes: input.emergencyNotes,
      medicalPriority: input.medicalPriority,
      searchRadiusKm: input.searchRadiusKm,
      broadcastEnabled: input.broadcastEnabled,
      foundAt,
      closedAt
    },
    include: lostPetAlertDetailInclude
  });

  return serializeLostPetAlertDetail(updated, actor);
}

export async function listLostPetSightings(alertId: string) {
  const alert = await getAlertWithDetailsOrThrow(alertId);

  return alert.sightings.map((sighting) => ({
    id: sighting.id,
    reporter: sighting.reporterUser
      ? {
          id: sighting.reporterUser.id,
          fullName:
            fullName(sighting.reporterUser.firstName, sighting.reporterUser.lastName) ||
            "Usuario Kumpa"
        }
      : null,
    sightingAt: sighting.sightingAt.toISOString(),
    lat: decimalToNumber(sighting.lat),
    lng: decimalToNumber(sighting.lng),
    address: sighting.address,
    comment: sighting.comment,
    photoUrl: sighting.photoUrl,
    createdAt: sighting.createdAt.toISOString()
  }));
}

export async function createLostPetSighting(
  actor: LostPetActor,
  alertId: string,
  input: CreateLostPetSightingInput
) {
  const alert = await prisma.lostPetAlert.findUnique({
    where: {
      id: alertId
    },
    include: {
      pet: {
        select: {
          name: true,
          ownerId: true,
          owner: {
            select: {
              firstName: true,
              email: true
            }
          }
        }
      }
    }
  });

  if (!alert) {
    throw new HttpError(404, "Lost pet alert not found");
  }

  if (alert.status !== LostPetAlertStatus.ACTIVE) {
    throw new HttpError(409, "Cannot report sightings for a closed alert");
  }

  const created = await prisma.lostPetSighting.create({
    data: {
      alertId,
      reporterUserId: actor.id,
      sightingAt: input.sightingAt ?? new Date(),
      lat: input.lat,
      lng: input.lng,
      address: input.address,
      comment: input.comment,
      photoUrl: input.photoUrl
    },
    include: {
      reporterUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });

  if (alert.pet.ownerId !== actor.id) {
    const reporterName =
      created.reporterUser
        ? fullName(created.reporterUser.firstName, created.reporterUser.lastName) || "Usuario Kumpa"
        : "Usuario Kumpa";

    await sendLostPetSightingReportedEmail({
      to: alert.pet.owner.email,
      firstName: alert.pet.owner.firstName,
      petName: alert.pet.name,
      sightingAt: created.sightingAt,
      address: created.address,
      comment: created.comment,
      reporterName,
      detailUrl: `${env.APP_BASE_URL}/lost-pets/${alertId}`
    });
  }

  return {
    id: created.id,
    reporter: created.reporterUser
      ? {
          id: created.reporterUser.id,
          fullName:
            fullName(created.reporterUser.firstName, created.reporterUser.lastName) ||
            "Usuario Kumpa"
        }
      : null,
    sightingAt: created.sightingAt.toISOString(),
    lat: decimalToNumber(created.lat),
    lng: decimalToNumber(created.lng),
    address: created.address,
    comment: created.comment,
    photoUrl: created.photoUrl,
    createdAt: created.createdAt.toISOString()
  };
}

export async function listNearbyLostPetAlerts(input: {
  lat: number;
  lng: number;
  radiusKm: number;
  limit: number;
}) {
  const alerts = await prisma.lostPetAlert.findMany({
    where: {
      status: LostPetAlertStatus.ACTIVE,
      broadcastEnabled: true
    },
    include: lostPetAlertInclude,
    orderBy: {
      updatedAt: "desc"
    },
    take: Math.max(input.limit * 2, input.limit)
  });

  return alerts
    .map((alert) => {
      const lat = decimalToNumber(alert.lastSeenLat);
      const lng = decimalToNumber(alert.lastSeenLng);
      if (lat === null || lng === null) {
        return null;
      }

      const distanceKm = haversineDistanceKm(input.lat, input.lng, lat, lng);
      if (distanceKm > input.radiusKm) {
        return null;
      }

      return serializeLostPetAlert(alert, distanceKm);
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => {
      const leftDistance = left.distanceKm ?? Number.POSITIVE_INFINITY;
      const rightDistance = right.distanceKm ?? Number.POSITIVE_INFINITY;

      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      if (left.medicalPriority !== right.medicalPriority) {
        return Number(right.medicalPriority) - Number(left.medicalPriority);
      }

      return (
        Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
      );
    })
    .slice(0, input.limit);
}

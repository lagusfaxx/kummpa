import type { Prisma } from "@prisma/client";
import { env } from "../../config/env";
import { HttpError } from "../../lib/http-error";
import { prisma } from "../../lib/prisma";
import {
  disableVaccineReminder,
  syncVaccineReminder
} from "../reminders/reminders.service";
import type {
  CreateVaccineInput,
  UpdateVaccineInput,
  VaccineListQueryInput,
  VaccineStatus
} from "./vaccines.schemas";

const vaccineInclude = {} satisfies Prisma.VaccineRecordInclude;

type VaccineRecordEntity = Prisma.VaccineRecordGetPayload<{
  include: typeof vaccineInclude;
}>;

function getVaccineStatus(nextDoseAt: Date | null): VaccineStatus {
  if (!nextDoseAt) {
    return "NO_NEXT_DOSE";
  }

  const now = new Date();
  const dueSoonThreshold = new Date(now.getTime() + env.VACCINE_DUE_SOON_DAYS * 24 * 60 * 60 * 1000);

  if (nextDoseAt.getTime() < now.getTime()) {
    return "OVERDUE";
  }

  if (nextDoseAt.getTime() <= dueSoonThreshold.getTime()) {
    return "DUE_SOON";
  }

  return "UP_TO_DATE";
}

function getDaysUntil(date: Date | null): number | null {
  if (!date) {
    return null;
  }

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

function serializeVaccine(record: VaccineRecordEntity) {
  const status = getVaccineStatus(record.nextDoseAt);

  return {
    id: record.id,
    petId: record.petId,
    vaccineName: record.vaccineName,
    appliedAt: record.appliedAt.toISOString(),
    nextDoseAt: record.nextDoseAt?.toISOString() ?? null,
    lotNumber: record.lotNumber,
    providerName: record.providerName,
    notes: record.notes,
    certificateUrl: record.certificateUrl,
    status,
    daysUntilDue: getDaysUntil(record.nextDoseAt),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

async function assertOwnedPet(userId: string, petId: string) {
  const pet = await prisma.pet.findFirst({
    where: {
      id: petId,
      ownerId: userId,
      deletedAt: null
    },
    include: {
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });

  if (!pet) {
    throw new HttpError(404, "Pet not found");
  }

  return pet;
}

function applyVaccineFilters(
  vaccines: ReturnType<typeof serializeVaccine>[],
  query: VaccineListQueryInput
) {
  return vaccines.filter((item) => {
    if (query.type && !item.vaccineName.toLowerCase().includes(query.type.toLowerCase())) {
      return false;
    }

    if (query.status && item.status !== query.status) {
      return false;
    }

    if (query.from && new Date(item.appliedAt) < query.from) {
      return false;
    }

    if (query.to && new Date(item.appliedAt) > query.to) {
      return false;
    }

    return true;
  });
}

function buildCardSummary(vaccines: ReturnType<typeof serializeVaccine>[]) {
  let overdueCount = 0;
  let dueSoonCount = 0;
  let upToDateCount = 0;
  let noNextDoseCount = 0;

  for (const vaccine of vaccines) {
    if (vaccine.status === "OVERDUE") overdueCount += 1;
    if (vaccine.status === "DUE_SOON") dueSoonCount += 1;
    if (vaccine.status === "UP_TO_DATE") upToDateCount += 1;
    if (vaccine.status === "NO_NEXT_DOSE") noNextDoseCount += 1;
  }

  const overallStatus =
    overdueCount > 0 ? "OVERDUE" : dueSoonCount > 0 ? "DUE_SOON" : "UP_TO_DATE";

  return {
    totalVaccines: vaccines.length,
    overdueCount,
    dueSoonCount,
    upToDateCount,
    noNextDoseCount,
    overallStatus
  };
}

export async function listPetVaccines(userId: string, petId: string, query: VaccineListQueryInput) {
  await assertOwnedPet(userId, petId);

  const records = await prisma.vaccineRecord.findMany({
    where: {
      petId
    },
    orderBy: {
      appliedAt: "desc"
    },
    include: vaccineInclude
  });

  const serialized = records.map(serializeVaccine);
  return applyVaccineFilters(serialized, query);
}

export async function createPetVaccine(userId: string, petId: string, input: CreateVaccineInput) {
  const pet = await assertOwnedPet(userId, petId);

  const record = await prisma.vaccineRecord.create({
    data: {
      petId,
      vaccineName: input.vaccineName,
      appliedAt: input.appliedAt,
      nextDoseAt: input.nextDoseAt,
      lotNumber: input.lotNumber,
      providerName: input.providerName,
      notes: input.notes,
      certificateUrl: input.certificateUrl
    },
    include: vaccineInclude
  });

  await syncVaccineReminder({
    userId: pet.ownerId,
    petId: pet.id,
    vaccineRecordId: record.id,
    vaccineName: record.vaccineName,
    nextDoseAt: record.nextDoseAt
  });

  return serializeVaccine(record);
}

export async function updatePetVaccine(
  userId: string,
  petId: string,
  vaccineId: string,
  input: UpdateVaccineInput
) {
  const pet = await assertOwnedPet(userId, petId);

  const existing = await prisma.vaccineRecord.findFirst({
    where: {
      id: vaccineId,
      petId
    }
  });

  if (!existing) {
    throw new HttpError(404, "Vaccine record not found");
  }

  const record = await prisma.vaccineRecord.update({
    where: {
      id: vaccineId
    },
    data: {
      vaccineName: input.vaccineName,
      appliedAt: input.appliedAt,
      nextDoseAt: input.nextDoseAt,
      lotNumber: input.lotNumber,
      providerName: input.providerName,
      notes: input.notes,
      certificateUrl: input.certificateUrl
    },
    include: vaccineInclude
  });

  await syncVaccineReminder({
    userId: pet.ownerId,
    petId: pet.id,
    vaccineRecordId: record.id,
    vaccineName: record.vaccineName,
    nextDoseAt: record.nextDoseAt
  });

  return serializeVaccine(record);
}

export async function deletePetVaccine(userId: string, petId: string, vaccineId: string) {
  await assertOwnedPet(userId, petId);

  const existing = await prisma.vaccineRecord.findFirst({
    where: {
      id: vaccineId,
      petId
    }
  });

  if (!existing) {
    throw new HttpError(404, "Vaccine record not found");
  }

  await prisma.vaccineRecord.delete({
    where: {
      id: vaccineId
    }
  });

  await disableVaccineReminder(vaccineId);
}

export async function getPetVaccineCard(userId: string, petId: string) {
  const pet = await assertOwnedPet(userId, petId);

  const records = await prisma.vaccineRecord.findMany({
    where: {
      petId
    },
    orderBy: {
      appliedAt: "desc"
    },
    include: vaccineInclude
  });

  const history = records.map(serializeVaccine);
  const upcoming = [...history]
    .filter((record) => record.nextDoseAt !== null)
    .sort((a, b) => {
      const aDate = new Date(a.nextDoseAt ?? "").getTime();
      const bDate = new Date(b.nextDoseAt ?? "").getTime();
      return aDate - bDate;
    });
  const summary = buildCardSummary(history);

  return {
    pet: {
      id: pet.id,
      name: pet.name,
      primaryPhotoUrl: pet.primaryPhotoUrl,
      species: pet.species,
      breed: pet.breed,
      birthDate: pet.birthDate?.toISOString() ?? null,
      microchipNumber: pet.microchipNumber,
      healthStatus: pet.healthStatus,
      ownerName: `${pet.owner.firstName ?? ""} ${pet.owner.lastName ?? ""}`.trim() || "Tutor Kumpa"
    },
    summary,
    history,
    upcoming,
    share: {
      privateUrl: `${env.APP_BASE_URL}/pets/${pet.id}/vaccines`,
      publicUrl: pet.isPublic ? `${env.APP_BASE_URL}/pets/public/${pet.shareToken}/vaccine-card` : null,
      printableSheetUrl: `${env.APP_BASE_URL}/pets/${pet.id}/vaccines/print?format=sheet`,
      printableCardUrl: `${env.APP_BASE_URL}/pets/${pet.id}/vaccines/print?format=card`
    }
  };
}

export async function getPublicVaccineCardByShareToken(shareToken: string) {
  const pet = await prisma.pet.findFirst({
    where: {
      shareToken,
      isPublic: true,
      deletedAt: null
    },
    include: {
      owner: {
        select: {
          firstName: true,
          lastName: true
        }
      },
      vaccines: {
        orderBy: {
          appliedAt: "desc"
        }
      }
    }
  });

  if (!pet) {
    throw new HttpError(404, "Public vaccine card not found");
  }

  const history = pet.vaccines.map(serializeVaccine);
  const summary = buildCardSummary(history);

  return {
    pet: {
      id: pet.id,
      name: pet.name,
      primaryPhotoUrl: pet.primaryPhotoUrl,
      species: pet.species,
      breed: pet.breed,
      birthDate: pet.birthDate?.toISOString() ?? null,
      ownerName: `${pet.owner.firstName ?? ""} ${pet.owner.lastName ?? ""}`.trim() || "Tutor Kumpa"
    },
    summary,
    history
  };
}

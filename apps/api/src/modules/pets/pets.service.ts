import { PetEmergencyStatus, type Prisma } from "@prisma/client";
import { env } from "../../config/env";
import { HttpError } from "../../lib/http-error";
import { prisma } from "../../lib/prisma";
import type {
  CreatePetInput,
  UpdatePetIdentityInput,
  UpdatePetInput,
  UpdatePetPublicProfileInput
} from "./pets.schemas";

const emergencyIdentityDefaults = {
  emergencyStatus: PetEmergencyStatus.NORMAL,
  showOwnerName: true,
  showOwnerPhone: true,
  showSecondaryContact: true,
  showCityZone: true,
  showAllergies: true,
  showDiseases: true,
  showMedications: true,
  showUsualVet: true,
  showEmergencyInstructions: true,
  showGeneralNotes: false
} as const;

const publicProfileDefaults = {
  showOwnerName: true,
  showOwnerPhone: true,
  showHealthDetails: true,
  showEmergencyContacts: true
} as const;

const petInclude = {
  media: {
    orderBy: {
      sortOrder: "asc"
    }
  }
} satisfies Prisma.PetInclude;

type PetWithMedia = Prisma.PetGetPayload<{
  include: typeof petInclude;
}>;

function calculateAgeYears(birthDate: Date | null): number | null {
  if (!birthDate) {
    return null;
  }

  const now = new Date();
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birthDate.getUTCMonth();
  const dateDiff = now.getUTCDate() - birthDate.getUTCDate();

  if (monthDiff < 0 || (monthDiff === 0 && dateDiff < 0)) {
    age -= 1;
  }

  return age >= 0 ? age : 0;
}

function sanitizeTextValue(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function fullName(firstName?: string | null, lastName?: string | null): string {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ").trim();
}

function buildEmergencyPublicUrl(publicToken: string): string {
  return `${env.APP_BASE_URL}/pets/emergency/${publicToken}`;
}

function buildEmergencyQrUrl(publicUrl: string): string {
  const encoded = encodeURIComponent(publicUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=640x640&data=${encoded}`;
}

function serializePet(pet: PetWithMedia) {
  return {
    id: pet.id,
    ownerId: pet.ownerId,
    name: pet.name,
    primaryPhotoUrl: pet.primaryPhotoUrl,
    galleryUrls: pet.media.map((media) => media.url),
    species: pet.species,
    breed: pet.breed,
    sex: pet.sex,
    birthDate: pet.birthDate?.toISOString() ?? null,
    ageYears: calculateAgeYears(pet.birthDate),
    weightKg: pet.weightKg ? Number(pet.weightKg) : null,
    color: pet.color,
    size: pet.size,
    isSterilized: pet.isSterilized,
    microchipNumber: pet.microchipNumber,
    allergies: pet.allergies,
    diseases: pet.diseases,
    medications: pet.medications,
    feeding: pet.feeding,
    usualVetName: pet.usualVetName,
    usualVetContact: pet.usualVetContact,
    emergencyContactName: pet.emergencyContactName,
    emergencyContactPhone: pet.emergencyContactPhone,
    generalNotes: pet.generalNotes,
    healthStatus: pet.healthStatus,
    isPublic: pet.isPublic,
    shareToken: pet.shareToken,
    shareUrl: `${env.APP_BASE_URL}/pets/public/${pet.shareToken}`,
    createdAt: pet.createdAt.toISOString(),
    updatedAt: pet.updatedAt.toISOString()
  };
}

function buildPetCreateData(input: CreatePetInput): Omit<Prisma.PetUncheckedCreateInput, "ownerId"> {
  return {
    name: input.name,
    primaryPhotoUrl: input.primaryPhotoUrl,
    species: input.species,
    breed: input.breed,
    sex: input.sex,
    birthDate: input.birthDate,
    weightKg: input.weightKg,
    color: input.color,
    size: input.size,
    isSterilized: input.isSterilized,
    microchipNumber: input.microchipNumber,
    allergies: input.allergies,
    diseases: input.diseases,
    medications: input.medications,
    feeding: input.feeding,
    usualVetName: input.usualVetName,
    usualVetContact: input.usualVetContact,
    emergencyContactName: input.emergencyContactName,
    emergencyContactPhone: input.emergencyContactPhone,
    generalNotes: input.generalNotes,
    healthStatus: input.healthStatus,
    isPublic: input.isPublic
  };
}

function buildPetUpdateData(input: UpdatePetInput): Prisma.PetUpdateInput {
  return {
    name: input.name,
    primaryPhotoUrl: input.primaryPhotoUrl,
    species: input.species,
    breed: input.breed,
    sex: input.sex,
    birthDate: input.birthDate,
    weightKg: input.weightKg,
    color: input.color,
    size: input.size,
    isSterilized: input.isSterilized,
    microchipNumber: input.microchipNumber,
    allergies: input.allergies,
    diseases: input.diseases,
    medications: input.medications,
    feeding: input.feeding,
    usualVetName: input.usualVetName,
    usualVetContact: input.usualVetContact,
    emergencyContactName: input.emergencyContactName,
    emergencyContactPhone: input.emergencyContactPhone,
    generalNotes: input.generalNotes,
    healthStatus: input.healthStatus,
    isPublic: input.isPublic
  };
}

async function assertPetOwnership(userId: string, petId: string) {
  const pet = await prisma.pet.findFirst({
    where: {
      id: petId,
      ownerId: userId,
      deletedAt: null
    }
  });

  if (!pet) {
    throw new HttpError(404, "Pet not found");
  }
}

const petIdentityOwnerInclude = {
  owner: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      city: true,
      ownerProfile: {
        select: {
          district: true
        }
      }
    }
  },
  publicIdentity: true,
  publicProfile: true
} satisfies Prisma.PetInclude;

type PetWithOwnerIdentity = Prisma.PetGetPayload<{
  include: typeof petIdentityOwnerInclude;
}>;

async function getOwnedPetWithIdentity(userId: string, petId: string) {
  const pet = await prisma.pet.findFirst({
    where: {
      id: petId,
      ownerId: userId,
      deletedAt: null
    },
    include: petIdentityOwnerInclude
  });

  if (!pet) {
    throw new HttpError(404, "Pet not found");
  }

  return pet;
}

async function ensurePetPublicIdentity(petId: string) {
  return prisma.petPublicIdentity.upsert({
    where: {
      petId
    },
    create: {
      petId,
      ...emergencyIdentityDefaults
    },
    update: {}
  });
}

async function ensurePetPublicProfile(petId: string) {
  return prisma.publicPetProfile.upsert({
    where: {
      petId
    },
    create: {
      petId,
      ...publicProfileDefaults
    },
    update: {}
  });
}

function serializeManagedIdentity(pet: PetWithOwnerIdentity, identity: NonNullable<PetWithOwnerIdentity["publicIdentity"]>) {
  const ownerFullName = fullName(pet.owner.firstName, pet.owner.lastName) || "Tutor Kumpa";
  const cityZone =
    sanitizeTextValue(identity.cityZone) ??
    sanitizeTextValue(
      `${pet.owner.city ?? ""}${pet.owner.ownerProfile?.district ? `, ${pet.owner.ownerProfile.district}` : ""}`
    );
  const publicUrl = buildEmergencyPublicUrl(identity.publicToken);

  return {
    pet: {
      id: pet.id,
      name: pet.name,
      primaryPhotoUrl: pet.primaryPhotoUrl,
      species: pet.species,
      breed: pet.breed,
      ageYears: calculateAgeYears(pet.birthDate),
      microchipNumber: pet.microchipNumber
    },
    owner: {
      fullName: ownerFullName,
      phone: pet.owner.phone ?? null,
      city: pet.owner.city ?? null,
      district: pet.owner.ownerProfile?.district ?? null
    },
    identity: {
      id: identity.id,
      publicToken: identity.publicToken,
      emergencyStatus: identity.emergencyStatus,
      secondaryContactName: identity.secondaryContactName,
      secondaryContactPhone: identity.secondaryContactPhone,
      cityZone,
      emergencyInstructions: identity.emergencyInstructions,
      nfcCode: identity.nfcCode,
      visibility: {
        showOwnerName: identity.showOwnerName,
        showOwnerPhone: identity.showOwnerPhone,
        showSecondaryContact: identity.showSecondaryContact,
        showCityZone: identity.showCityZone,
        showAllergies: identity.showAllergies,
        showDiseases: identity.showDiseases,
        showMedications: identity.showMedications,
        showUsualVet: identity.showUsualVet,
        showEmergencyInstructions: identity.showEmergencyInstructions,
        showGeneralNotes: identity.showGeneralNotes
      },
      urls: {
        publicUrl,
        qrImageUrl: buildEmergencyQrUrl(publicUrl),
        publicApiUrl: `${env.APP_BASE_URL}/api/v1/pets/public-identity/${identity.publicToken}`
      },
      createdAt: identity.createdAt.toISOString(),
      updatedAt: identity.updatedAt.toISOString()
    },
    preview: {
      ownerName: identity.showOwnerName ? ownerFullName : null,
      ownerPhone: identity.showOwnerPhone ? pet.owner.phone ?? null : null,
      secondaryContact:
        identity.showSecondaryContact && (identity.secondaryContactName || identity.secondaryContactPhone)
          ? {
              name: identity.secondaryContactName ?? pet.emergencyContactName ?? null,
              phone: identity.secondaryContactPhone ?? pet.emergencyContactPhone ?? null
            }
          : null,
      cityZone: identity.showCityZone ? cityZone : null,
      allergies: identity.showAllergies ? pet.allergies : null,
      diseases: identity.showDiseases ? pet.diseases : null,
      medications: identity.showMedications ? pet.medications : null,
      usualVet: identity.showUsualVet
        ? {
            name: pet.usualVetName,
            contact: pet.usualVetContact
          }
        : null,
      emergencyInstructions: identity.showEmergencyInstructions
        ? identity.emergencyInstructions ?? null
        : null,
      generalNotes: identity.showGeneralNotes ? pet.generalNotes : null
    }
  };
}

function serializeManagedPublicProfile(
  pet: PetWithOwnerIdentity,
  publicProfile: NonNullable<PetWithOwnerIdentity["publicProfile"]>
) {
  const ownerFullName = fullName(pet.owner.firstName, pet.owner.lastName) || "Tutor Kumpa";
  const shareUrl = `${env.APP_BASE_URL}/pets/public/${pet.shareToken}`;

  return {
    pet: {
      id: pet.id,
      name: pet.name,
      primaryPhotoUrl: pet.primaryPhotoUrl,
      species: pet.species,
      breed: pet.breed,
      ageYears: calculateAgeYears(pet.birthDate),
      shareToken: pet.shareToken,
      shareUrl
    },
    publicProfile: {
      id: publicProfile.id,
      headline: publicProfile.headline,
      biography: publicProfile.biography,
      cityLabel: publicProfile.cityLabel,
      traits: publicProfile.traits,
      visibility: {
        showOwnerName: publicProfile.showOwnerName,
        showOwnerPhone: publicProfile.showOwnerPhone,
        showHealthDetails: publicProfile.showHealthDetails,
        showEmergencyContacts: publicProfile.showEmergencyContacts
      },
      createdAt: publicProfile.createdAt.toISOString(),
      updatedAt: publicProfile.updatedAt.toISOString()
    },
    preview: {
      ownerName: publicProfile.showOwnerName ? ownerFullName : null,
      ownerPhone: publicProfile.showOwnerPhone ? pet.owner.phone ?? null : null,
      healthSummary: publicProfile.showHealthDetails
        ? {
            allergies: pet.allergies,
            diseases: pet.diseases,
            medications: pet.medications,
            feeding: pet.feeding,
            usualVetName: pet.usualVetName,
            usualVetContact: pet.usualVetContact,
            generalNotes: pet.generalNotes
          }
        : null,
      emergencyContacts: publicProfile.showEmergencyContacts
        ? {
            emergencyContactName: pet.emergencyContactName,
            emergencyContactPhone: pet.emergencyContactPhone
          }
        : null
    }
  };
}

export async function listUserPets(userId: string) {
  const pets = await prisma.pet.findMany({
    where: {
      ownerId: userId,
      deletedAt: null
    },
    include: petInclude,
    orderBy: {
      createdAt: "desc"
    }
  });

  return pets.map(serializePet);
}

export async function getUserPetById(userId: string, petId: string) {
  const pet = await prisma.pet.findFirst({
    where: {
      id: petId,
      ownerId: userId,
      deletedAt: null
    },
    include: petInclude
  });

  if (!pet) {
    throw new HttpError(404, "Pet not found");
  }

  return serializePet(pet);
}

export async function createPet(userId: string, input: CreatePetInput) {
  const createdPet = await prisma.$transaction(async (tx) => {
    const pet = await tx.pet.create({
      data: {
        ownerId: userId,
        ...buildPetCreateData(input)
      },
      include: petInclude
    });

    await tx.publicPetProfile.create({
      data: {
        petId: pet.id,
        ...publicProfileDefaults
      }
    });

    if (input.galleryUrls) {
      await tx.petMedia.createMany({
        data: input.galleryUrls.map((url, index) => ({
          petId: pet.id,
          url,
          sortOrder: index
        }))
      });
    }

    return tx.pet.findUniqueOrThrow({
      where: {
        id: pet.id
      },
      include: petInclude
    });
  });

  return serializePet(createdPet);
}

export async function updatePet(userId: string, petId: string, input: UpdatePetInput) {
  await assertPetOwnership(userId, petId);

  const updatedPet = await prisma.$transaction(async (tx) => {
    await tx.pet.update({
      where: {
        id: petId
      },
      data: buildPetUpdateData(input)
    });

    if (input.galleryUrls !== undefined) {
      await tx.petMedia.deleteMany({
        where: {
          petId
        }
      });

      if (input.galleryUrls.length > 0) {
        await tx.petMedia.createMany({
          data: input.galleryUrls.map((url, index) => ({
            petId,
            url,
            sortOrder: index
          }))
        });
      }
    }

    return tx.pet.findUniqueOrThrow({
      where: {
        id: petId
      },
      include: petInclude
    });
  });

  return serializePet(updatedPet);
}

export async function updatePetVisibility(userId: string, petId: string, isPublic: boolean) {
  await assertPetOwnership(userId, petId);

  const pet = await prisma.pet.update({
    where: {
      id: petId
    },
    data: {
      isPublic
    },
    include: petInclude
  });

  return serializePet(pet);
}

export async function softDeletePet(userId: string, petId: string) {
  await assertPetOwnership(userId, petId);

  await prisma.pet.update({
    where: {
      id: petId
    },
    data: {
      deletedAt: new Date(),
      isPublic: false
    }
  });
}

export async function getPublicPetByShareToken(shareToken: string) {
  const pet = await prisma.pet.findFirst({
    where: {
      shareToken,
      isPublic: true,
      deletedAt: null
    },
    include: {
      media: {
        orderBy: {
          sortOrder: "asc"
        }
      },
      publicProfile: true,
      owner: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          city: true,
          ownerProfile: {
            select: {
              district: true
            }
          }
        }
      }
    }
  });

  if (!pet) {
    throw new HttpError(404, "Public pet profile not found");
  }

  const publicProfile = pet.publicProfile;
  const ownerFullName =
    publicProfile?.showOwnerName === false
      ? "Tutor Kumpa"
      : `${pet.owner.firstName ?? ""} ${pet.owner.lastName ?? ""}`.trim() || "Tutor Kumpa";
  const fallbackCityLabel =
    [pet.owner.city, pet.owner.ownerProfile?.district].filter(Boolean).join(", ") || null;

  return {
    id: pet.id,
    name: pet.name,
    primaryPhotoUrl: pet.primaryPhotoUrl,
    galleryUrls: pet.media.map((media) => media.url),
    species: pet.species,
    breed: pet.breed,
    sex: pet.sex,
    ageYears: calculateAgeYears(pet.birthDate),
    weightKg: pet.weightKg ? Number(pet.weightKg) : null,
    color: pet.color,
    size: pet.size,
    isSterilized: pet.isSterilized,
    headline: publicProfile?.headline ?? null,
    biography: publicProfile?.biography ?? null,
    cityLabel: publicProfile?.cityLabel ?? fallbackCityLabel,
    traits: publicProfile?.traits ?? [],
    allergies: publicProfile?.showHealthDetails === false ? null : pet.allergies,
    diseases: publicProfile?.showHealthDetails === false ? null : pet.diseases,
    medications: publicProfile?.showHealthDetails === false ? null : pet.medications,
    feeding: publicProfile?.showHealthDetails === false ? null : pet.feeding,
    usualVetName: publicProfile?.showHealthDetails === false ? null : pet.usualVetName,
    usualVetContact: publicProfile?.showHealthDetails === false ? null : pet.usualVetContact,
    emergencyContactName:
      publicProfile?.showEmergencyContacts === false ? null : pet.emergencyContactName,
    emergencyContactPhone:
      publicProfile?.showEmergencyContacts === false ? null : pet.emergencyContactPhone,
    generalNotes: publicProfile?.showHealthDetails === false ? null : pet.generalNotes,
    owner: {
      fullName: ownerFullName,
      phone: publicProfile?.showOwnerPhone === false ? null : pet.owner.phone,
      city: pet.owner.city,
      district: pet.owner.ownerProfile?.district
    }
  };
}

export async function getPetPublicProfileByPetId(userId: string, petId: string) {
  const pet = await getOwnedPetWithIdentity(userId, petId);
  const publicProfile = pet.publicProfile ?? (await ensurePetPublicProfile(pet.id));
  return serializeManagedPublicProfile(pet, publicProfile);
}

export async function getPetPublicIdentityByPetId(userId: string, petId: string) {
  const pet = await getOwnedPetWithIdentity(userId, petId);
  const identity = pet.publicIdentity ?? (await ensurePetPublicIdentity(pet.id));
  return serializeManagedIdentity(pet, identity);
}

export async function updatePetPublicIdentity(
  userId: string,
  petId: string,
  input: UpdatePetIdentityInput
) {
  const pet = await getOwnedPetWithIdentity(userId, petId);

  const identity = await prisma.petPublicIdentity.upsert({
    where: {
      petId: pet.id
    },
    create: {
      petId: pet.id,
      emergencyStatus: input.emergencyStatus,
      secondaryContactName: input.secondaryContactName,
      secondaryContactPhone: input.secondaryContactPhone,
      cityZone: input.cityZone,
      emergencyInstructions: input.emergencyInstructions,
      nfcCode: input.nfcCode,
      showOwnerName: input.showOwnerName,
      showOwnerPhone: input.showOwnerPhone,
      showSecondaryContact: input.showSecondaryContact,
      showCityZone: input.showCityZone,
      showAllergies: input.showAllergies,
      showDiseases: input.showDiseases,
      showMedications: input.showMedications,
      showUsualVet: input.showUsualVet,
      showEmergencyInstructions: input.showEmergencyInstructions,
      showGeneralNotes: input.showGeneralNotes
    },
    update: {
      emergencyStatus: input.emergencyStatus,
      secondaryContactName: input.secondaryContactName,
      secondaryContactPhone: input.secondaryContactPhone,
      cityZone: input.cityZone,
      emergencyInstructions: input.emergencyInstructions,
      nfcCode: input.nfcCode,
      showOwnerName: input.showOwnerName,
      showOwnerPhone: input.showOwnerPhone,
      showSecondaryContact: input.showSecondaryContact,
      showCityZone: input.showCityZone,
      showAllergies: input.showAllergies,
      showDiseases: input.showDiseases,
      showMedications: input.showMedications,
      showUsualVet: input.showUsualVet,
      showEmergencyInstructions: input.showEmergencyInstructions,
      showGeneralNotes: input.showGeneralNotes
    }
  });

  const refreshedPet = await getOwnedPetWithIdentity(userId, petId);
  return serializeManagedIdentity(refreshedPet, identity);
}

export async function updatePetPublicProfile(
  userId: string,
  petId: string,
  input: UpdatePetPublicProfileInput
) {
  const pet = await getOwnedPetWithIdentity(userId, petId);

  const publicProfile = await prisma.publicPetProfile.upsert({
    where: {
      petId: pet.id
    },
    create: {
      petId: pet.id,
      headline: input.headline,
      biography: input.biography,
      cityLabel: input.cityLabel,
      traits: input.traits ?? [],
      showOwnerName: input.showOwnerName,
      showOwnerPhone: input.showOwnerPhone,
      showHealthDetails: input.showHealthDetails,
      showEmergencyContacts: input.showEmergencyContacts
    },
    update: {
      headline: input.headline,
      biography: input.biography,
      cityLabel: input.cityLabel,
      traits: input.traits ?? [],
      showOwnerName: input.showOwnerName,
      showOwnerPhone: input.showOwnerPhone,
      showHealthDetails: input.showHealthDetails,
      showEmergencyContacts: input.showEmergencyContacts
    }
  });

  const refreshedPet = await getOwnedPetWithIdentity(userId, petId);
  return serializeManagedPublicProfile(refreshedPet, publicProfile);
}

export async function getEmergencyPublicIdentityByToken(publicToken: string) {
  const identity = await prisma.petPublicIdentity.findUnique({
    where: {
      publicToken
    },
    include: {
      pet: {
        include: {
          owner: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              city: true,
              ownerProfile: {
                select: {
                  district: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!identity || identity.pet.deletedAt) {
    throw new HttpError(404, "Emergency public profile not found");
  }

  const ownerName = fullName(identity.pet.owner.firstName, identity.pet.owner.lastName) || "Tutor Kumpa";
  const cityZone =
    sanitizeTextValue(identity.cityZone) ??
    sanitizeTextValue(
      `${identity.pet.owner.city ?? ""}${
        identity.pet.owner.ownerProfile?.district ? `, ${identity.pet.owner.ownerProfile.district}` : ""
      }`
    );
  const secondaryContactName =
    sanitizeTextValue(identity.secondaryContactName) ??
    sanitizeTextValue(identity.pet.emergencyContactName);
  const secondaryContactPhone =
    sanitizeTextValue(identity.secondaryContactPhone) ??
    sanitizeTextValue(identity.pet.emergencyContactPhone);
  const publicUrl = buildEmergencyPublicUrl(identity.publicToken);

  return {
    pet: {
      id: identity.pet.id,
      name: identity.pet.name,
      primaryPhotoUrl: identity.pet.primaryPhotoUrl,
      species: identity.pet.species,
      breed: identity.pet.breed,
      ageYears: calculateAgeYears(identity.pet.birthDate),
      emergencyStatus: identity.emergencyStatus
    },
    contacts: {
      ownerName: identity.showOwnerName ? ownerName : null,
      ownerPhone: identity.showOwnerPhone ? identity.pet.owner.phone ?? null : null,
      secondaryContact:
        identity.showSecondaryContact && (secondaryContactName || secondaryContactPhone)
          ? {
              name: secondaryContactName,
              phone: secondaryContactPhone
            }
          : null,
      cityZone: identity.showCityZone ? cityZone : null
    },
    health: {
      allergies: identity.showAllergies ? identity.pet.allergies : null,
      diseases: identity.showDiseases ? identity.pet.diseases : null,
      medications: identity.showMedications ? identity.pet.medications : null,
      usualVet: identity.showUsualVet
        ? {
            name: identity.pet.usualVetName,
            contact: identity.pet.usualVetContact
          }
        : null,
      emergencyInstructions: identity.showEmergencyInstructions
        ? identity.emergencyInstructions ?? null
        : null,
      generalNotes: identity.showGeneralNotes ? identity.pet.generalNotes : null
    },
    identity: {
      publicToken: identity.publicToken,
      publicUrl,
      qrImageUrl: buildEmergencyQrUrl(publicUrl),
      nfcCode: identity.nfcCode ?? null,
      updatedAt: identity.updatedAt.toISOString()
    }
  };
}

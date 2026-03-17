import { AuthApiError } from "@/features/auth/auth-api";
import type {
  Pet,
  PetPublicProfileManaged,
  PetPublicProfileWritePayload,
  PetPublicIdentityManaged,
  PetPublicIdentityWritePayload,
  PetWritePayload,
  PublicEmergencyPetProfile,
  PublicPetProfile
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const PETS_BASE_URL = `${API_URL}/api/v1/pets`;

interface ApiSuccess<T> {
  ok: true;
  data: T;
}

interface ApiFailure {
  ok: false;
  error: {
    message: string;
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | ApiSuccess<T>
    | ApiFailure
    | null;

  if (!response.ok || !payload || !payload.ok) {
    const message = payload && !payload.ok ? payload.error.message : "No se pudo procesar la solicitud";
    throw new AuthApiError(message);
  }

  return payload.data;
}

async function requestWithAuth<T>(
  path: string,
  accessToken: string,
  options?: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
  }
) {
  const response = await fetch(`${PETS_BASE_URL}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: options?.body ? JSON.stringify(options.body) : undefined
  });

  return parseResponse<T>(response);
}

function sanitizePetPayload(payload: PetWritePayload): Record<string, unknown> {
  return {
    ...payload,
    primaryPhotoUrl: payload.primaryPhotoUrl || undefined,
    galleryUrls: payload.galleryUrls ?? [],
    birthDate: payload.birthDate || undefined,
    weightKg: payload.weightKg,
    color: payload.color || undefined,
    microchipNumber: payload.microchipNumber || undefined,
    allergies: payload.allergies || undefined,
    diseases: payload.diseases || undefined,
    medications: payload.medications || undefined,
    feeding: payload.feeding || undefined,
    usualVetName: payload.usualVetName || undefined,
    usualVetContact: payload.usualVetContact || undefined,
    emergencyContactName: payload.emergencyContactName || undefined,
    emergencyContactPhone: payload.emergencyContactPhone || undefined,
    generalNotes: payload.generalNotes || undefined,
    healthStatus: payload.healthStatus || undefined
  };
}

function sanitizePartialPetPayload(payload: Partial<PetWritePayload>): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (payload.name !== undefined) data.name = payload.name;
  if (payload.primaryPhotoUrl !== undefined) data.primaryPhotoUrl = payload.primaryPhotoUrl || undefined;
  if (payload.galleryUrls !== undefined) data.galleryUrls = payload.galleryUrls;
  if (payload.species !== undefined) data.species = payload.species;
  if (payload.breed !== undefined) data.breed = payload.breed;
  if (payload.sex !== undefined) data.sex = payload.sex;
  if (payload.birthDate !== undefined) data.birthDate = payload.birthDate || undefined;
  if (payload.weightKg !== undefined) data.weightKg = payload.weightKg;
  if (payload.color !== undefined) data.color = payload.color || undefined;
  if (payload.size !== undefined) data.size = payload.size;
  if (payload.isSterilized !== undefined) data.isSterilized = payload.isSterilized;
  if (payload.microchipNumber !== undefined) data.microchipNumber = payload.microchipNumber || undefined;
  if (payload.allergies !== undefined) data.allergies = payload.allergies || undefined;
  if (payload.diseases !== undefined) data.diseases = payload.diseases || undefined;
  if (payload.medications !== undefined) data.medications = payload.medications || undefined;
  if (payload.feeding !== undefined) data.feeding = payload.feeding || undefined;
  if (payload.usualVetName !== undefined) data.usualVetName = payload.usualVetName || undefined;
  if (payload.usualVetContact !== undefined) data.usualVetContact = payload.usualVetContact || undefined;
  if (payload.emergencyContactName !== undefined) {
    data.emergencyContactName = payload.emergencyContactName || undefined;
  }
  if (payload.emergencyContactPhone !== undefined) {
    data.emergencyContactPhone = payload.emergencyContactPhone || undefined;
  }
  if (payload.generalNotes !== undefined) data.generalNotes = payload.generalNotes || undefined;
  if (payload.healthStatus !== undefined) data.healthStatus = payload.healthStatus || undefined;
  if (payload.isPublic !== undefined) data.isPublic = payload.isPublic;

  return data;
}

export async function listPets(accessToken: string): Promise<Pet[]> {
  return requestWithAuth<Pet[]>("/", accessToken);
}

export async function getPet(accessToken: string, petId: string): Promise<Pet> {
  return requestWithAuth<Pet>(`/${petId}`, accessToken);
}

export async function createPet(accessToken: string, payload: PetWritePayload): Promise<Pet> {
  return requestWithAuth<Pet>("/", accessToken, {
    method: "POST",
    body: sanitizePetPayload(payload)
  });
}

export async function updatePet(
  accessToken: string,
  petId: string,
  payload: Partial<PetWritePayload>
): Promise<Pet> {
  return requestWithAuth<Pet>(`/${petId}`, accessToken, {
    method: "PATCH",
    body: sanitizePartialPetPayload(payload)
  });
}

export async function updatePetVisibility(
  accessToken: string,
  petId: string,
  isPublic: boolean
): Promise<Pet> {
  return requestWithAuth<Pet>(`/${petId}/visibility`, accessToken, {
    method: "PATCH",
    body: {
      isPublic
    }
  });
}

export async function deletePet(accessToken: string, petId: string): Promise<void> {
  await requestWithAuth<{ message: string }>(`/${petId}`, accessToken, {
    method: "DELETE"
  });
}

export async function getPublicPet(shareToken: string): Promise<PublicPetProfile> {
  const response = await fetch(`${PETS_BASE_URL}/public/${shareToken}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });

  return parseResponse<PublicPetProfile>(response);
}

function sanitizeIdentityPayload(payload: PetPublicIdentityWritePayload): Record<string, unknown> {
  return {
    emergencyStatus: payload.emergencyStatus,
    secondaryContactName: payload.secondaryContactName?.trim() || undefined,
    secondaryContactPhone: payload.secondaryContactPhone?.trim() || undefined,
    cityZone: payload.cityZone?.trim() || undefined,
    emergencyInstructions: payload.emergencyInstructions?.trim() || undefined,
    nfcCode: payload.nfcCode?.trim() || undefined,
    showOwnerName: payload.showOwnerName,
    showOwnerPhone: payload.showOwnerPhone,
    showSecondaryContact: payload.showSecondaryContact,
    showCityZone: payload.showCityZone,
    showAllergies: payload.showAllergies,
    showDiseases: payload.showDiseases,
    showMedications: payload.showMedications,
    showUsualVet: payload.showUsualVet,
    showEmergencyInstructions: payload.showEmergencyInstructions,
    showGeneralNotes: payload.showGeneralNotes
  };
}

export async function getPetPublicIdentity(
  accessToken: string,
  petId: string
): Promise<PetPublicIdentityManaged> {
  return requestWithAuth<PetPublicIdentityManaged>(`/${petId}/identity`, accessToken);
}

function sanitizePublicProfilePayload(payload: PetPublicProfileWritePayload): Record<string, unknown> {
  return {
    headline: payload.headline?.trim() || undefined,
    biography: payload.biography?.trim() || undefined,
    cityLabel: payload.cityLabel?.trim() || undefined,
    traits: payload.traits?.map((item) => item.trim()).filter(Boolean) ?? [],
    showOwnerName: payload.showOwnerName,
    showOwnerPhone: payload.showOwnerPhone,
    showHealthDetails: payload.showHealthDetails,
    showEmergencyContacts: payload.showEmergencyContacts
  };
}

export async function getPetPublicProfile(
  accessToken: string,
  petId: string
): Promise<PetPublicProfileManaged> {
  return requestWithAuth<PetPublicProfileManaged>(`/${petId}/public-profile`, accessToken);
}

export async function updatePetPublicProfile(
  accessToken: string,
  petId: string,
  payload: PetPublicProfileWritePayload
): Promise<PetPublicProfileManaged> {
  return requestWithAuth<PetPublicProfileManaged>(`/${petId}/public-profile`, accessToken, {
    method: "PUT",
    body: sanitizePublicProfilePayload(payload)
  });
}

export async function updatePetPublicIdentity(
  accessToken: string,
  petId: string,
  payload: PetPublicIdentityWritePayload
): Promise<PetPublicIdentityManaged> {
  return requestWithAuth<PetPublicIdentityManaged>(`/${petId}/identity`, accessToken, {
    method: "PUT",
    body: sanitizeIdentityPayload(payload)
  });
}

export async function getPublicEmergencyPetProfile(
  publicToken: string
): Promise<PublicEmergencyPetProfile> {
  const response = await fetch(`${PETS_BASE_URL}/public-identity/${publicToken}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });

  return parseResponse<PublicEmergencyPetProfile>(response);
}

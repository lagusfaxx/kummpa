import { PetEmergencyStatus, PetSex, PetSize } from "@prisma/client";
import { z } from "zod";

const optionalTrimmedString = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalShortString = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalPhoneString = z
  .string()
  .trim()
  .min(7)
  .max(30)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalUrlString = z
  .string()
  .trim()
  .url()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalGalleryUrls = z.array(z.string().trim().url()).max(20).optional();
const optionalStringList = z.array(z.string().trim().min(1).max(80)).max(20).optional();

export const petIdParamsSchema = z.object({
  id: z.string().cuid()
});

export const publicPetParamsSchema = z.object({
  shareToken: z.string().cuid()
});

export const publicIdentityParamsSchema = z.object({
  publicToken: z.string().cuid()
});

export const createPetSchema = z.object({
  name: z.string().trim().min(1).max(120),
  primaryPhotoUrl: optionalUrlString,
  galleryUrls: optionalGalleryUrls,
  species: z.string().trim().min(1).max(80),
  breed: z.string().trim().min(1).max(80),
  sex: z.nativeEnum(PetSex).default(PetSex.UNKNOWN),
  birthDate: z.coerce.date().optional(),
  weightKg: z.number().positive().max(250).optional(),
  color: optionalShortString,
  size: z.nativeEnum(PetSize).default(PetSize.UNKNOWN),
  isSterilized: z.boolean().optional(),
  microchipNumber: optionalShortString,
  allergies: optionalTrimmedString,
  diseases: optionalTrimmedString,
  medications: optionalTrimmedString,
  feeding: optionalTrimmedString,
  usualVetName: optionalShortString,
  usualVetContact: optionalTrimmedString,
  emergencyContactName: optionalShortString,
  emergencyContactPhone: optionalPhoneString,
  generalNotes: optionalTrimmedString,
  healthStatus: optionalShortString,
  isPublic: z.boolean().default(false)
});

export const updatePetSchema = createPetSchema
  .partial()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "At least one field is required"
  });

export const updatePetVisibilitySchema = z.object({
  isPublic: z.boolean()
});

export const petIdentityParamsSchema = z.object({
  id: z.string().cuid()
});

export const updatePetIdentitySchema = z.object({
  emergencyStatus: z.nativeEnum(PetEmergencyStatus),
  secondaryContactName: optionalShortString,
  secondaryContactPhone: optionalPhoneString,
  cityZone: optionalShortString,
  emergencyInstructions: optionalTrimmedString,
  nfcCode: optionalShortString,
  showOwnerName: z.boolean(),
  showOwnerPhone: z.boolean(),
  showSecondaryContact: z.boolean(),
  showCityZone: z.boolean(),
  showAllergies: z.boolean(),
  showDiseases: z.boolean(),
  showMedications: z.boolean(),
  showUsualVet: z.boolean(),
  showEmergencyInstructions: z.boolean(),
  showGeneralNotes: z.boolean()
});

export const updatePetPublicProfileSchema = z.object({
  headline: optionalShortString,
  biography: optionalTrimmedString,
  cityLabel: optionalShortString,
  traits: optionalStringList,
  showOwnerName: z.boolean(),
  showOwnerPhone: z.boolean(),
  showHealthDetails: z.boolean(),
  showEmergencyContacts: z.boolean()
});

export type CreatePetInput = z.infer<typeof createPetSchema>;
export type UpdatePetInput = z.infer<typeof updatePetSchema>;
export type UpdatePetVisibilityInput = z.infer<typeof updatePetVisibilitySchema>;
export type UpdatePetIdentityInput = z.infer<typeof updatePetIdentitySchema>;
export type UpdatePetPublicProfileInput = z.infer<typeof updatePetPublicProfileSchema>;

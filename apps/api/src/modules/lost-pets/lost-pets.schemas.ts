import { LostPetAlertStatus } from "@prisma/client";
import { z } from "zod";

const optionalTrimmedString = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalBooleanFromQuery = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "si"].includes(normalized)) return true;
  if (["0", "false", "no"].includes(normalized)) return false;
  return undefined;
}, z.boolean().optional());

const optionalNumberFromQuery = (minimum: number, maximum: number) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, z.number().min(minimum).max(maximum).optional());

export const lostPetAlertParamsSchema = z.object({
  alertId: z.string().cuid()
});

export const lostPetPublicParamsSchema = z.object({
  shareToken: z.string().cuid()
});

export const createLostPetAlertSchema = z.object({
  petId: z.string().cuid(),
  lastSeenAt: z.coerce.date(),
  lastSeenLat: z.coerce.number().min(-90).max(90),
  lastSeenLng: z.coerce.number().min(-180).max(180),
  lastSeenAddress: optionalTrimmedString(180),
  description: optionalTrimmedString(2000),
  emergencyNotes: optionalTrimmedString(2000),
  medicalPriority: z.boolean().default(false),
  searchRadiusKm: z.coerce.number().int().min(1).max(100).default(10),
  broadcastEnabled: z.boolean().default(true)
});

export const updateLostPetAlertSchema = z
  .object({
    status: z.nativeEnum(LostPetAlertStatus).optional(),
    lastSeenAt: z.coerce.date().optional(),
    lastSeenLat: z.coerce.number().min(-90).max(90).optional(),
    lastSeenLng: z.coerce.number().min(-180).max(180).optional(),
    lastSeenAddress: optionalTrimmedString(180),
    description: optionalTrimmedString(2000),
    emergencyNotes: optionalTrimmedString(2000),
    medicalPriority: z.boolean().optional(),
    searchRadiusKm: z.coerce.number().int().min(1).max(100).optional(),
    broadcastEnabled: z.boolean().optional()
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "At least one field is required"
  });

export const listLostPetAlertsQuerySchema = z
  .object({
    status: z.nativeEnum(LostPetAlertStatus).optional(),
    activeOnly: optionalBooleanFromQuery.default(true),
    mine: optionalBooleanFromQuery.default(false),
    medicalPriority: optionalBooleanFromQuery,
    petId: z.string().cuid().optional(),
    q: optionalTrimmedString(120),
    lat: optionalNumberFromQuery(-90, 90),
    lng: optionalNumberFromQuery(-180, 180),
    radiusKm: optionalNumberFromQuery(1, 200).default(30),
    limit: optionalNumberFromQuery(1, 200).default(100)
  })
  .refine((value) => (value.lat === undefined) === (value.lng === undefined), {
    message: "lat and lng must be provided together",
    path: ["lat"]
  });

export const nearbyLostPetAlertsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().int().min(1).max(200).default(20),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const createLostPetSightingSchema = z.object({
  sightingAt: z.coerce.date().optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  address: optionalTrimmedString(180),
  comment: optionalTrimmedString(1200),
  photoUrl: z
    .string()
    .trim()
    .url()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined))
});

export type CreateLostPetAlertInput = z.infer<typeof createLostPetAlertSchema>;
export type UpdateLostPetAlertInput = z.infer<typeof updateLostPetAlertSchema>;
export type ListLostPetAlertsQueryInput = z.infer<typeof listLostPetAlertsQuerySchema>;
export type NearbyLostPetAlertsQueryInput = z.infer<typeof nearbyLostPetAlertsQuerySchema>;
export type CreateLostPetSightingInput = z.infer<typeof createLostPetSightingSchema>;

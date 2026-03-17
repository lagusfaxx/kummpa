import {
  PetEnergyLevel,
  PetSize,
  SocialEventType,
  SocialWalkInvitationStatus
} from "@prisma/client";
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

const optionalNumberFromQuery = (min: number, max: number) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    return value;
  }, z.coerce.number().min(min).max(max).optional());

const optionalDateFromBody = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return undefined;
  return value;
}, z.coerce.date().optional());

export const discoverWalksQuerySchema = z
  .object({
    city: optionalTrimmedString(120),
    district: optionalTrimmedString(120),
    species: optionalTrimmedString(80),
    size: z.nativeEnum(PetSize).optional(),
    energyLevel: z.nativeEnum(PetEnergyLevel).optional(),
    minAgeMonths: optionalNumberFromQuery(0, 480),
    maxAgeMonths: optionalNumberFromQuery(0, 480),
    limit: z.coerce.number().int().min(1).max(80).default(30)
  })
  .refine(
    (value) =>
      value.minAgeMonths === undefined ||
      value.maxAgeMonths === undefined ||
      value.minAgeMonths <= value.maxAgeMonths,
    {
      message: "minAgeMonths cannot be greater than maxAgeMonths",
      path: ["minAgeMonths"]
    }
  );

export const upsertWalkProfileSchema = z
  .object({
    displayName: optionalTrimmedString(100),
    bio: optionalTrimmedString(1200),
    city: optionalTrimmedString(120),
    district: optionalTrimmedString(120),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    preferredSpecies: optionalTrimmedString(80),
    preferredSizes: z.array(z.nativeEnum(PetSize)).max(6).optional(),
    preferredEnergyLevels: z.array(z.nativeEnum(PetEnergyLevel)).max(3).optional(),
    preferredMinAgeMonths: z.coerce.number().int().min(0).max(480).optional(),
    preferredMaxAgeMonths: z.coerce.number().int().min(0).max(480).optional(),
    isDiscoverable: z.boolean().optional()
  })
  .refine(
    (value) =>
      (value.latitude === undefined && value.longitude === undefined) ||
      (value.latitude !== undefined && value.longitude !== undefined),
    {
      message: "latitude and longitude must be provided together",
      path: ["latitude"]
    }
  )
  .refine(
    (value) =>
      value.preferredMinAgeMonths === undefined ||
      value.preferredMaxAgeMonths === undefined ||
      value.preferredMinAgeMonths <= value.preferredMaxAgeMonths,
    {
      message: "preferredMinAgeMonths cannot be greater than preferredMaxAgeMonths",
      path: ["preferredMinAgeMonths"]
    }
  )
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "At least one field is required"
  });

export const createWalkInvitationSchema = z.object({
  toUserId: z.string().cuid(),
  petId: z.string().cuid().optional(),
  message: optionalTrimmedString(700),
  proposedAt: optionalDateFromBody,
  city: optionalTrimmedString(120),
  district: optionalTrimmedString(120),
  placeLabel: optionalTrimmedString(160)
});

export const listWalkInvitationsQuerySchema = z.object({
  role: z.enum(["inbox", "sent", "all"]).default("all"),
  status: z.nativeEnum(SocialWalkInvitationStatus).optional(),
  limit: z.coerce.number().int().min(1).max(150).default(80)
});

export const invitationParamsSchema = z.object({
  invitationId: z.string().cuid()
});

export const respondWalkInvitationSchema = z.object({
  status: z.enum([
    SocialWalkInvitationStatus.ACCEPTED,
    SocialWalkInvitationStatus.REJECTED,
    SocialWalkInvitationStatus.CANCELLED
  ])
});

export const createWalkChatMessageSchema = z.object({
  body: z.string().trim().min(1).max(1500)
});

export const groupEventsQuerySchema = z
  .object({
    city: optionalTrimmedString(120),
    district: optionalTrimmedString(120),
    species: optionalTrimmedString(80),
    size: z.nativeEnum(PetSize).optional(),
    energyLevel: z.nativeEnum(PetEnergyLevel).optional(),
    minAgeMonths: optionalNumberFromQuery(0, 480),
    maxAgeMonths: optionalNumberFromQuery(0, 480),
    includePast: optionalBooleanFromQuery.default(false),
    onlyMine: optionalBooleanFromQuery.default(false),
    limit: z.coerce.number().int().min(1).max(120).default(60)
  })
  .refine(
    (value) =>
      value.minAgeMonths === undefined ||
      value.maxAgeMonths === undefined ||
      value.minAgeMonths <= value.maxAgeMonths,
    {
      message: "minAgeMonths cannot be greater than maxAgeMonths",
      path: ["minAgeMonths"]
    }
  );

export const createGroupEventSchema = z
  .object({
    title: z.string().trim().min(4).max(120),
    description: optionalTrimmedString(2200),
    type: z.nativeEnum(SocialEventType).default(SocialEventType.WALK),
    city: z.string().trim().min(1).max(120),
    district: optionalTrimmedString(120),
    placeLabel: optionalTrimmedString(160),
    startsAt: z.coerce.date(),
    endsAt: optionalDateFromBody,
    maxAttendees: z.coerce.number().int().min(2).max(400).optional(),
    speciesFilter: optionalTrimmedString(80),
    sizeFilter: z.nativeEnum(PetSize).optional(),
    energyFilter: z.nativeEnum(PetEnergyLevel).optional(),
    minPetAgeMonths: z.coerce.number().int().min(0).max(480).optional(),
    maxPetAgeMonths: z.coerce.number().int().min(0).max(480).optional()
  })
  .refine((value) => value.endsAt === undefined || value.endsAt > value.startsAt, {
    message: "endsAt must be greater than startsAt",
    path: ["endsAt"]
  })
  .refine(
    (value) =>
      value.minPetAgeMonths === undefined ||
      value.maxPetAgeMonths === undefined ||
      value.minPetAgeMonths <= value.maxPetAgeMonths,
    {
      message: "minPetAgeMonths cannot be greater than maxPetAgeMonths",
      path: ["minPetAgeMonths"]
    }
  );

export const eventParamsSchema = z.object({
  eventId: z.string().cuid()
});

export const joinGroupEventSchema = z.object({
  petId: z.string().cuid().optional(),
  note: optionalTrimmedString(300)
});

export type DiscoverWalksQueryInput = z.infer<typeof discoverWalksQuerySchema>;
export type UpsertWalkProfileInput = z.infer<typeof upsertWalkProfileSchema>;
export type CreateWalkInvitationInput = z.infer<typeof createWalkInvitationSchema>;
export type ListWalkInvitationsQueryInput = z.infer<typeof listWalkInvitationsQuerySchema>;
export type RespondWalkInvitationInput = z.infer<typeof respondWalkInvitationSchema>;
export type CreateWalkChatMessageInput = z.infer<typeof createWalkChatMessageSchema>;
export type GroupEventsQueryInput = z.infer<typeof groupEventsQuerySchema>;
export type CreateGroupEventInput = z.infer<typeof createGroupEventSchema>;
export type JoinGroupEventInput = z.infer<typeof joinGroupEventSchema>;

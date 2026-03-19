import {
  ListingCondition,
  MarketplaceCategory,
  MarketplaceReportStatus
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

const optionalCoordinate = z.union([z.coerce.number(), z.null()]).optional();

export const listingParamsSchema = z.object({
  listingId: z.string().cuid()
});

export const conversationParamsSchema = z.object({
  conversationId: z.string().cuid()
});

export const reportParamsSchema = z.object({
  reportId: z.string().cuid()
});

export const listListingsQuerySchema = z
  .object({
    q: optionalTrimmedString(140),
    category: z.nativeEnum(MarketplaceCategory).optional(),
    condition: z.nativeEnum(ListingCondition).optional(),
    city: optionalTrimmedString(120),
    district: optionalTrimmedString(120),
    priceMin: optionalNumberFromQuery(0, 500_000_000),
    priceMax: optionalNumberFromQuery(0, 500_000_000),
    lat: optionalNumberFromQuery(-90, 90),
    lng: optionalNumberFromQuery(-180, 180),
    radiusKm: z.coerce.number().min(0.5).max(500).default(25),
    mine: optionalBooleanFromQuery.default(false),
    favoritesOnly: optionalBooleanFromQuery.default(false),
    includeInactive: optionalBooleanFromQuery.default(false),
    sellerId: z.string().cuid().optional(),
    sortBy: z.enum(["recent", "distance", "price_asc", "price_desc"]).default("recent"),
    limit: z.coerce.number().int().min(1).max(120).default(50)
  })
  .refine(
    (value) =>
      value.priceMin === undefined ||
      value.priceMax === undefined ||
      value.priceMin <= value.priceMax,
    {
      message: "priceMin cannot be greater than priceMax",
      path: ["priceMin"]
    }
  )
  .refine(
    (value) =>
      (value.lat === undefined && value.lng === undefined) ||
      (value.lat !== undefined && value.lng !== undefined),
    {
      message: "lat and lng must be provided together",
      path: ["lat"]
    }
  );

export const createListingSchema = z
  .object({
    title: z.string().trim().min(4).max(140),
    description: z.string().trim().min(3).max(5000),
    priceCents: z.coerce.number().int().min(100).max(500_000_000),
    condition: z.nativeEnum(ListingCondition),
    category: z.nativeEnum(MarketplaceCategory).default(MarketplaceCategory.ACCESSORY),
    photoUrls: z.array(z.string().trim().url().max(2000)).max(8).default([]),
    city: optionalTrimmedString(120),
    district: optionalTrimmedString(120),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    stockQuantity: z.coerce.number().int().min(0).max(999999).optional().nullable()
  })
  .refine(
    (value) =>
      (value.latitude === undefined && value.longitude === undefined) ||
      (value.latitude !== undefined && value.longitude !== undefined),
    {
      message: "latitude and longitude must be provided together",
      path: ["latitude"]
    }
  );

export const updateListingSchema = z
  .object({
    title: z.string().trim().min(4).max(140).optional(),
    description: z.string().trim().min(3).max(5000).optional(),
    priceCents: z.coerce.number().int().min(100).max(500_000_000).optional(),
    condition: z.nativeEnum(ListingCondition).optional(),
    category: z.nativeEnum(MarketplaceCategory).optional(),
    photoUrls: z.array(z.string().trim().url().max(2000)).min(1).max(8).optional(),
    city: optionalTrimmedString(120),
    district: optionalTrimmedString(120),
    latitude: optionalCoordinate,
    longitude: optionalCoordinate,
    isActive: z.boolean().optional(),
    stockQuantity: z.coerce.number().int().min(0).max(999999).optional().nullable()
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "At least one field is required"
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
      value.latitude === undefined ||
      value.longitude === undefined ||
      (value.latitude === null && value.longitude === null) ||
      (typeof value.latitude === "number" && typeof value.longitude === "number"),
    {
      message: "latitude and longitude must both be numbers or null",
      path: ["latitude"]
    }
  )
  .refine(
    (value) =>
      value.latitude === undefined ||
      value.latitude === null ||
      (value.latitude >= -90 && value.latitude <= 90),
    {
      message: "latitude must be between -90 and 90",
      path: ["latitude"]
    }
  )
  .refine(
    (value) =>
      value.longitude === undefined ||
      value.longitude === null ||
      (value.longitude >= -180 && value.longitude <= 180),
    {
      message: "longitude must be between -180 and 180",
      path: ["longitude"]
    }
  );

export const featureListingSchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(7)
});

export const createConversationSchema = z.object({
  initialMessage: optionalTrimmedString(1500)
});

export const listConversationsQuerySchema = z.object({
  role: z.enum(["all", "buying", "selling"]).default("all"),
  listingId: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(120).default(80)
});

export const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(120)
});

export const createMessageSchema = z.object({
  body: z.string().trim().min(1).max(1500)
});

export const createReportSchema = z.object({
  listingId: z.string().cuid(),
  reason: z.string().trim().min(10).max(500)
});

export const listReportsQuerySchema = z.object({
  status: z.nativeEnum(MarketplaceReportStatus).optional(),
  openOnly: optionalBooleanFromQuery.default(true),
  limit: z.coerce.number().int().min(1).max(200).default(80)
});

export const reviewReportSchema = z.object({
  status: z.enum([MarketplaceReportStatus.REVIEWED, MarketplaceReportStatus.DISMISSED]),
  reviewNotes: optionalTrimmedString(600)
});

export type ListListingsQueryInput = z.infer<typeof listListingsQuerySchema>;
export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type FeatureListingInput = z.infer<typeof featureListingSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type ListConversationsQueryInput = z.infer<typeof listConversationsQuerySchema>;
export type ListMessagesQueryInput = z.infer<typeof listMessagesQuerySchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ListReportsQueryInput = z.infer<typeof listReportsQuerySchema>;
export type ReviewReportInput = z.infer<typeof reviewReportSchema>;

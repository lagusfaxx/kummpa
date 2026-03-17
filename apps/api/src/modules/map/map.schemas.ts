import { z } from "zod";

const MAP_SERVICE_TYPES = [
  "VET",
  "CAREGIVER",
  "SHOP",
  "GROOMING",
  "HOTEL",
  "PARK",
  "LOST_PET"
] as const;
const MAP_SERVICE_SORT_OPTIONS = ["relevance", "distance", "recent", "rating"] as const;

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().max(120).optional());

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

export const mapServiceTypeSchema = z.enum(MAP_SERVICE_TYPES);

const typesFromQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return undefined;

  const tokens = Array.isArray(value) ? value : [value];
  const normalized = tokens
    .flatMap((token) => String(token).split(","))
    .map((token) => token.trim().toUpperCase())
    .filter(Boolean);

  return normalized.length > 0 ? normalized : undefined;
}, z.array(mapServiceTypeSchema).max(MAP_SERVICE_TYPES.length).optional());

export const mapServicesQuerySchema = z
  .object({
    q: optionalTrimmedString,
    service: optionalTrimmedString,
    city: optionalTrimmedString,
    district: optionalTrimmedString,
    types: typesFromQuerySchema,
    openNow: optionalBooleanFromQuery.default(false),
    emergencyOnly: optionalBooleanFromQuery.default(false),
    withDiscount: optionalBooleanFromQuery.default(false),
    atHomeOnly: optionalBooleanFromQuery.default(false),
    featuredOnly: optionalBooleanFromQuery.default(false),
    includeLostPets: optionalBooleanFromQuery.default(true),
    minRating: optionalNumberFromQuery(0, 5),
    priceMin: optionalNumberFromQuery(0, 5000000),
    priceMax: optionalNumberFromQuery(0, 5000000),
    lat: optionalNumberFromQuery(-90, 90),
    lng: optionalNumberFromQuery(-180, 180),
    radiusKm: optionalNumberFromQuery(1, 100).default(20),
    sortBy: z.enum(MAP_SERVICE_SORT_OPTIONS).default("relevance"),
    limit: optionalNumberFromQuery(1, 300).default(180)
  })
  .refine((input) => (input.lat === undefined) === (input.lng === undefined), {
    message: "lat and lng must be provided together",
    path: ["lat"]
  })
  .refine(
    (input) =>
      input.priceMin === undefined ||
      input.priceMax === undefined ||
      Number(input.priceMin) <= Number(input.priceMax),
    {
      message: "priceMin cannot be greater than priceMax",
      path: ["priceMin"]
    }
  );

export const mapSuggestionsQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1)
    .max(120),
  limit: optionalNumberFromQuery(1, 25).default(10)
});

export type MapSuggestionsQueryInput = z.infer<typeof mapSuggestionsQuerySchema>;

export const MAP_SERVICE_TYPES_ALL = MAP_SERVICE_TYPES;
export const MAP_SERVICE_SORT_OPTIONS_ALL = MAP_SERVICE_SORT_OPTIONS;

export const mapServicePointSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  type: mapServiceTypeSchema,
  name: z.string(),
  subtitle: z.string().nullable(),
  description: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  district: z.string().nullable(),
  phone: z.string().nullable(),
  imageUrl: z.string().nullable(),
  services: z.array(z.string()),
  openingHours: z.array(z.string()),
  priceInfo: z.array(z.string()),
  priceFrom: z.number().nullable(),
  hasDiscount: z.boolean(),
  discountLabel: z.string().nullable(),
  isEmergency24x7: z.boolean(),
  isOpenNow: z.boolean().nullable(),
  medicalPriority: z.boolean(),
  supportsAtHome: z.boolean(),
  isFeatured: z.boolean(),
  rating: z.number().nullable(),
  reviewsCount: z.number(),
  distanceKm: z.number().nullable(),
  bookingUrl: z.string().nullable(),
  profileUrl: z.string().nullable(),
  createdAt: z.string()
});

const countsByTypeSchema = z.object({
  VET: z.number(),
  CAREGIVER: z.number(),
  SHOP: z.number(),
  GROOMING: z.number(),
  HOTEL: z.number(),
  PARK: z.number(),
  LOST_PET: z.number()
});

export const mapServicesResponseSchema = z.object({
  items: z.array(mapServicePointSchema),
  meta: z.object({
    total: z.number(),
    returned: z.number(),
    limit: z.number(),
    countsByType: countsByTypeSchema,
    referenceLocation: z
      .object({
        lat: z.number(),
        lng: z.number(),
        radiusKm: z.number()
      })
      .nullable()
  })
});

export const mapSuggestionSchema = z.object({
  value: z.string(),
  kind: z.enum(["name", "address", "city", "district", "service"]),
  type: mapServiceTypeSchema.optional()
});

export const mapSuggestionsResponseSchema = z.object({
  items: z.array(mapSuggestionSchema)
});

export type MapServiceType = (typeof MAP_SERVICE_TYPES)[number];
export type MapServiceSortOption = (typeof MAP_SERVICE_SORT_OPTIONS)[number];
export type MapServicesQueryInput = z.infer<typeof mapServicesQuerySchema>;
export type MapServicePoint = z.infer<typeof mapServicePointSchema>;
export type MapServicesResponse = z.infer<typeof mapServicesResponseSchema>;
export type MapSuggestion = z.infer<typeof mapSuggestionSchema>;
export type MapSuggestionsResponse = z.infer<typeof mapSuggestionsResponseSchema>;

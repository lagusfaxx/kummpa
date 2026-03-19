import { z } from "zod";

const optionalTrimmedString = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalShortString = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalUrlString = z
  .string()
  .trim()
  .url()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalPhoneString = z
  .string()
  .trim()
  .min(7)
  .max(30)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalStringList = z
  .array(z.string().trim().min(1).max(200))
  .max(50)
  .optional();

const optionalUrlList = z
  .array(z.string().trim().url().max(500))
  .max(20)
  .optional();

const groomerServiceItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  duration: z.number().int().min(1).max(480).optional(),
  price: z.number().min(0).optional(),
  type: z.string().trim().max(60).optional()
});

export const groomerParamsSchema = z.object({
  groomerId: z.string().cuid()
});

export const listGroomersQuerySchema = z.object({
  city: optionalShortString,
  district: optionalShortString,
  q: optionalTrimmedString,
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

const groomerProfileBodySchema = z.object({
  businessName: optionalShortString,
  logoUrl: optionalUrlString,
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  address: optionalTrimmedString,
  district: optionalShortString,
  city: optionalShortString,
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  openingHours: optionalStringList,
  services: z.array(groomerServiceItemSchema).max(30).optional(),
  referencePrices: optionalStringList,
  photos: optionalUrlList,
  paymentMethods: optionalStringList,
  contactPhone: optionalPhoneString,
  contactEmail: z.string().trim().email().optional(),
  websiteUrl: optionalUrlString
});

export const updateGroomerProfileSchema = groomerProfileBodySchema;

export const createGroomerSchema = groomerProfileBodySchema.extend({
  userId: z.string().cuid()
});

export const patchGroomerSchema = groomerProfileBodySchema.partial();

export type GroomerParamsInput = z.infer<typeof groomerParamsSchema>;
export type ListGroomersQueryInput = z.infer<typeof listGroomersQuerySchema>;
export type UpdateGroomerProfileInput = z.infer<typeof updateGroomerProfileSchema>;
export type CreateGroomerInput = z.infer<typeof createGroomerSchema>;
export type PatchGroomerInput = z.infer<typeof patchGroomerSchema>;

import { BenefitRedemptionStatus, ProviderType } from "@prisma/client";
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

export const benefitParamsSchema = z.object({
  benefitId: z.string().cuid()
});

export const listBenefitsQuerySchema = z.object({
  q: optionalTrimmedString(140),
  city: optionalTrimmedString(120),
  district: optionalTrimmedString(120),
  providerType: z.nativeEnum(ProviderType).optional(),
  featuredOnly: optionalBooleanFromQuery.default(false),
  savedOnly: optionalBooleanFromQuery.default(false),
  activeOnly: optionalBooleanFromQuery.default(true),
  validOnly: optionalBooleanFromQuery.default(true),
  sortBy: z.enum(["featured", "recent", "expiring"]).default("featured"),
  limit: z.coerce.number().int().min(1).max(120).default(60)
});

export const listMyRedemptionsQuerySchema = z.object({
  status: z.nativeEnum(BenefitRedemptionStatus).optional(),
  limit: z.coerce.number().int().min(1).max(120).default(80)
});

export const createBenefitSchema = z
  .object({
    title: z.string().trim().min(4).max(140),
    summary: z.string().trim().min(10).max(500),
    description: optionalTrimmedString(5000),
    providerType: z.nativeEnum(ProviderType).default(ProviderType.OTHER),
    providerName: optionalTrimmedString(140),
    discountLabel: optionalTrimmedString(120),
    couponCode: optionalTrimmedString(50).transform((value) => value?.toUpperCase()),
    terms: optionalTrimmedString(5000),
    city: optionalTrimmedString(120),
    district: optionalTrimmedString(120),
    landingUrl: z.string().trim().url().max(2048).optional(),
    validFrom: z.coerce.date(),
    validTo: z.coerce.date(),
    maxRedemptions: z.coerce.number().int().min(1).max(500_000).optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional()
  })
  .refine((value) => value.validTo > value.validFrom, {
    message: "validTo must be greater than validFrom",
    path: ["validTo"]
  });

export const updateBenefitSchema = z
  .object({
    title: z.string().trim().min(4).max(140).optional(),
    summary: z.string().trim().min(10).max(500).optional(),
    description: optionalTrimmedString(5000),
    providerType: z.nativeEnum(ProviderType).optional(),
    providerName: optionalTrimmedString(140),
    discountLabel: optionalTrimmedString(120),
    couponCode: optionalTrimmedString(50).transform((value) => value?.toUpperCase()),
    terms: optionalTrimmedString(5000),
    city: optionalTrimmedString(120),
    district: optionalTrimmedString(120),
    landingUrl: z.string().trim().url().max(2048).optional(),
    validFrom: z.coerce.date().optional(),
    validTo: z.coerce.date().optional(),
    maxRedemptions: z.coerce.number().int().min(1).max(500_000).nullable().optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional()
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "At least one field is required"
  })
  .refine(
    (value) =>
      value.validFrom === undefined ||
      value.validTo === undefined ||
      value.validTo > value.validFrom,
    {
      message: "validTo must be greater than validFrom",
      path: ["validTo"]
    }
  );

export type ListBenefitsQueryInput = z.infer<typeof listBenefitsQuerySchema>;
export type ListMyRedemptionsQueryInput = z.infer<typeof listMyRedemptionsQuerySchema>;
export type CreateBenefitInput = z.infer<typeof createBenefitSchema>;
export type UpdateBenefitInput = z.infer<typeof updateBenefitSchema>;

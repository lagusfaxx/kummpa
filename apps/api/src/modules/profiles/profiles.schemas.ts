import { z } from "zod";

const optionalTrimmedString = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalUrlString = z
  .string()
  .trim()
  .url()
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

const optionalStringList = z
  .array(z.string().trim().min(1).max(200))
  .max(50)
  .optional();

export const updateBaseProfileSchema = z
  .object({
    firstName: optionalShortString,
    lastName: optionalShortString,
    phone: optionalPhoneString,
    city: optionalShortString
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "At least one field is required"
  });

export const updateOwnerProfileSchema = z.object({
  avatarUrl: optionalUrlString,
  district: optionalShortString,
  approximateAddress: optionalTrimmedString,
  biography: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  notificationPreferences: z
    .object({
      email: z.boolean().optional(),
      inApp: z.boolean().optional(),
      push: z.boolean().optional()
    })
    .optional()
});

export const updateVetProfileSchema = z.object({
  clinicName: optionalShortString,
  logoUrl: optionalUrlString,
  address: optionalTrimmedString,
  district: optionalShortString,
  city: optionalShortString,
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  openingHours: optionalStringList,
  services: optionalStringList,
  referencePrices: optionalStringList,
  isEmergency24x7: z.boolean().optional(),
  contactPhone: optionalPhoneString,
  contactEmail: z.string().trim().email().optional(),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  websiteUrl: optionalUrlString,
  socialLinks: optionalStringList
});

export const updateCaregiverProfileSchema = z.object({
  avatarUrl: optionalUrlString,
  introduction: z
    .string()
    .trim()
    .max(1200)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  experience: z
    .string()
    .trim()
    .max(1200)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  services: optionalStringList,
  coverageAreas: optionalStringList,
  rates: optionalStringList,
  schedule: optionalStringList
});

export const updateShopProfileSchema = z.object({
  businessName: optionalShortString,
  logoUrl: optionalUrlString,
  address: optionalTrimmedString,
  district: optionalShortString,
  city: optionalShortString,
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  basicCatalog: optionalStringList,
  openingHours: optionalStringList,
  contactPhone: optionalPhoneString,
  contactEmail: z.string().trim().email().optional(),
  websiteUrl: optionalUrlString,
  discounts: optionalStringList
});

export type UpdateBaseProfileInput = z.infer<typeof updateBaseProfileSchema>;
export type UpdateOwnerProfileInput = z.infer<typeof updateOwnerProfileSchema>;
export type UpdateVetProfileInput = z.infer<typeof updateVetProfileSchema>;
export type UpdateCaregiverProfileInput = z.infer<typeof updateCaregiverProfileSchema>;
export type UpdateShopProfileInput = z.infer<typeof updateShopProfileSchema>;

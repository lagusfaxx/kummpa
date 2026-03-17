import { UserRole } from "@prisma/client";
import { z } from "zod";

const optionalTrimmedString = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const adminUserParamsSchema = z.object({
  userId: z.string().cuid()
});

export const adminPetParamsSchema = z.object({
  petId: z.string().cuid()
});

export const listAdminUsersQuerySchema = z.object({
  q: optionalTrimmedString(120),
  role: z.nativeEnum(UserRole).optional(),
  status: z.enum(["active", "deleted", "unverified", "all"]).default("active"),
  limit: z.coerce.number().int().min(1).max(200).default(80)
});

export const updateAdminUserSchema = z
  .object({
    deleted: z.boolean().optional(),
    markEmailVerified: z.boolean().optional()
  })
  .refine((value) => value.deleted !== undefined || value.markEmailVerified !== undefined, {
    message: "At least one field is required"
  });

export const listAdminPetsQuerySchema = z.object({
  q: optionalTrimmedString(120),
  ownerId: z.string().cuid().optional(),
  species: optionalTrimmedString(80),
  visibility: z.enum(["public", "private", "all"]).default("all"),
  status: z.enum(["active", "deleted", "all"]).default("active"),
  limit: z.coerce.number().int().min(1).max(200).default(80)
});

export const updateAdminPetSchema = z
  .object({
    isPublic: z.boolean().optional(),
    deleted: z.boolean().optional()
  })
  .refine((value) => value.isPublic !== undefined || value.deleted !== undefined, {
    message: "At least one field is required"
  });

export type ListAdminUsersQueryInput = z.infer<typeof listAdminUsersQuerySchema>;
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;
export type ListAdminPetsQueryInput = z.infer<typeof listAdminPetsQuerySchema>;
export type UpdateAdminPetInput = z.infer<typeof updateAdminPetSchema>;

import { z } from "zod";

export const vaccineStatusSchema = z.enum([
  "UP_TO_DATE",
  "DUE_SOON",
  "OVERDUE",
  "NO_NEXT_DOSE"
]);

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

const optionalUrlString = z
  .string()
  .trim()
  .url()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const petVaccineParamsSchema = z.object({
  id: z.string().cuid()
});

export const vaccineParamsSchema = z.object({
  id: z.string().cuid(),
  vaccineId: z.string().cuid()
});

export const vaccineListQuerySchema = z.object({
  type: z.string().trim().min(1).max(120).optional(),
  status: vaccineStatusSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional()
});

export const createVaccineSchema = z.object({
  vaccineName: z.string().trim().min(1).max(120),
  appliedAt: z.coerce.date(),
  nextDoseAt: z.coerce.date().optional(),
  lotNumber: optionalShortString,
  providerName: optionalShortString,
  notes: optionalTrimmedString,
  certificateUrl: optionalUrlString
});

export const updateVaccineSchema = createVaccineSchema
  .partial()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "At least one field is required"
  });

export type VaccineStatus = z.infer<typeof vaccineStatusSchema>;
export type VaccineListQueryInput = z.infer<typeof vaccineListQuerySchema>;
export type CreateVaccineInput = z.infer<typeof createVaccineSchema>;
export type UpdateVaccineInput = z.infer<typeof updateVaccineSchema>;

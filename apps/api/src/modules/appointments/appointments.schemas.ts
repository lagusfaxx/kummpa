import { AppointmentStatus, ProviderType, ServiceType } from "@prisma/client";
import { z } from "zod";

const optionalTrimmedString = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalDateFromQuery = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return undefined;
  return value;
}, z.coerce.date().optional());

const optionalBooleanFromQuery = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "si"].includes(normalized)) return true;
  if (["0", "false", "no"].includes(normalized)) return false;
  return undefined;
}, z.boolean().optional());

const statusListFromQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return undefined;

  const tokens = Array.isArray(value) ? value : [value];
  const parsed = tokens
    .flatMap((token) => String(token).split(","))
    .map((token) => token.trim().toUpperCase())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : undefined;
}, z.array(z.nativeEnum(AppointmentStatus)).min(1).max(6).optional());

const providerSourceIdSchema = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const providerNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const appointmentParamsSchema = z.object({
  appointmentId: z.string().cuid()
});

export const listAppointmentsQuerySchema = z
  .object({
    view: z.enum(["owner", "provider", "all"]).default("owner"),
    status: statusListFromQuerySchema,
    petId: z.string().cuid().optional(),
    providerType: z.nativeEnum(ProviderType).optional(),
    providerSourceId: providerSourceIdSchema,
    from: optionalDateFromQuery,
    to: optionalDateFromQuery,
    limit: z.coerce.number().int().min(1).max(300).default(120)
  })
  .refine(
    (value) => value.from === undefined || value.to === undefined || value.from <= value.to,
    {
      message: "from cannot be greater than to",
      path: ["from"]
    }
  );

export const createAppointmentSchema = z
  .object({
    petId: z.string().cuid(),
    appointmentServiceId: z.string().cuid().optional(),
    providerUserId: z.string().cuid().optional(),
    providerType: z.nativeEnum(ProviderType).optional(),
    providerSourceId: providerSourceIdSchema,
    providerName: providerNameSchema,
    serviceType: z.nativeEnum(ServiceType).optional(),
    scheduledAt: z.coerce.date(),
    durationMinutes: z.coerce.number().int().min(15).max(240).optional(),
    reason: optionalTrimmedString(500),
    notes: optionalTrimmedString(2000)
  })
  .refine((value) => {
    if (value.appointmentServiceId) {
      return true;
    }

    return Boolean(
      value.providerType &&
        value.serviceType &&
        (value.providerUserId || value.providerSourceId || value.providerName)
    );
  }, {
    message: "Provide appointmentServiceId or provider/service references",
    path: ["appointmentServiceId"]
  });

export const rejectAppointmentSchema = z.object({
  reason: optionalTrimmedString(500)
});

export const cancelAppointmentSchema = z.object({
  reason: optionalTrimmedString(500)
});

export const rescheduleAppointmentSchema = z.object({
  scheduledAt: z.coerce.date(),
  durationMinutes: z.coerce.number().int().min(15).max(240).optional(),
  reason: optionalTrimmedString(500),
  notes: optionalTrimmedString(2000)
});

const hhmmTimeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/);

export const providerAvailabilityQuerySchema = z.object({
  includeInactive: optionalBooleanFromQuery.default(false)
});

export const scheduleAvailabilityItemSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: hhmmTimeSchema,
    endTime: hhmmTimeSchema,
    serviceType: z.nativeEnum(ServiceType).optional(),
    timezone: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .default("America/Santiago"),
    isActive: z.boolean().default(true)
  })
  .refine((value) => value.startTime < value.endTime, {
    message: "startTime must be before endTime",
    path: ["startTime"]
  });

export const upsertProviderAvailabilitySchema = z.object({
  items: z.array(scheduleAvailabilityItemSchema).max(200)
});

export const providerAppointmentServicesQuerySchema = z.object({
  includeInactive: optionalBooleanFromQuery.default(false)
});

export const appointmentServiceItemSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: optionalTrimmedString(1200),
  serviceType: z.nativeEnum(ServiceType),
  durationMinutes: z.coerce.number().int().min(15).max(240).default(30),
  priceCents: z.coerce.number().int().min(0).max(100_000_000).optional(),
  currencyCode: z
    .string()
    .trim()
    .length(3)
    .default("CLP")
    .transform((value) => value.toUpperCase()),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0)
});

export const upsertProviderAppointmentServicesSchema = z.object({
  items: z.array(appointmentServiceItemSchema).max(100)
});

export type ListAppointmentsQueryInput = z.infer<typeof listAppointmentsQuerySchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type RejectAppointmentInput = z.infer<typeof rejectAppointmentSchema>;
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;
export type ProviderAvailabilityQueryInput = z.infer<typeof providerAvailabilityQuerySchema>;
export type ScheduleAvailabilityItemInput = z.infer<typeof scheduleAvailabilityItemSchema>;
export type UpsertProviderAvailabilityInput = z.infer<typeof upsertProviderAvailabilitySchema>;
export type ProviderAppointmentServicesQueryInput = z.infer<typeof providerAppointmentServicesQuerySchema>;
export type AppointmentServiceItemInput = z.infer<typeof appointmentServiceItemSchema>;
export type UpsertProviderAppointmentServicesInput = z.infer<
  typeof upsertProviderAppointmentServicesSchema
>;

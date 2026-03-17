import { ReminderType } from "@prisma/client";
import { z } from "zod";

const optionalTrimmedString = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const reminderParamsSchema = z.object({
  id: z.string().cuid(),
  reminderId: z.string().cuid()
});

export const petReminderParamsSchema = z.object({
  id: z.string().cuid()
});

export const createReminderSchema = z.object({
  type: z.nativeEnum(ReminderType),
  title: z.string().trim().min(1).max(160),
  message: optionalTrimmedString,
  dueAt: z.coerce.date(),
  sendEmail: z.boolean().default(true),
  sendInApp: z.boolean().default(true),
  sendPush: z.boolean().default(false)
});

export const updateReminderSchema = createReminderSchema
  .partial()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "At least one field is required"
  });

export const dispatchDueRemindersSchema = z.object({
  limit: z.coerce.number().int().positive().max(500).optional()
});

export const notificationQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().optional()
});

export const notificationParamsSchema = z.object({
  notificationId: z.string().cuid()
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;
export type DispatchDueRemindersInput = z.infer<typeof dispatchDueRemindersSchema>;

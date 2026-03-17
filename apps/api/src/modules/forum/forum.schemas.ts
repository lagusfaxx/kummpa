import { ForumReportStatus, ForumReportTargetType } from "@prisma/client";
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

export const topicParamsSchema = z.object({
  topicId: z.string().cuid()
});

export const replyParamsSchema = z.object({
  replyId: z.string().cuid()
});

export const reportParamsSchema = z.object({
  reportId: z.string().cuid()
});

export const listTopicsQuerySchema = z.object({
  category: optionalTrimmedString(80),
  q: optionalTrimmedString(140),
  tag: optionalTrimmedString(40),
  mine: optionalBooleanFromQuery.default(false),
  limit: z.coerce.number().int().min(1).max(120).default(40)
});

export const createTopicSchema = z.object({
  categorySlug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/i, "category slug must use letters, numbers or hyphen")
    .transform((value) => value.toLowerCase()),
  title: z.string().trim().min(6).max(180),
  body: z.string().trim().min(12).max(9000),
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(2)
        .max(30)
        .regex(/^[a-z0-9-]+$/i, "tags can only contain letters, numbers and hyphen")
        .transform((value) => value.toLowerCase())
    )
    .max(10)
    .default([])
});

export const createReplySchema = z.object({
  body: z.string().trim().min(2).max(6000),
  quotedReplyId: z.string().cuid().optional()
});

export const moderateTopicSchema = z
  .object({
    isPinned: z.boolean().optional(),
    isLocked: z.boolean().optional(),
    deleted: z.boolean().optional()
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "At least one field is required"
  });

export const moderateReplySchema = z.object({
  deleted: z.boolean()
});

export const createReportSchema = z.object({
  targetType: z.nativeEnum(ForumReportTargetType),
  targetId: z.string().cuid(),
  reason: z.string().trim().min(10).max(500)
});

export const listReportsQuerySchema = z.object({
  status: z.nativeEnum(ForumReportStatus).optional(),
  targetType: z.nativeEnum(ForumReportTargetType).optional(),
  openOnly: optionalBooleanFromQuery.default(true),
  limit: z.coerce.number().int().min(1).max(200).default(80)
});

export const reviewReportSchema = z.object({
  status: z.enum([ForumReportStatus.REVIEWED, ForumReportStatus.DISMISSED]),
  reviewNotes: optionalTrimmedString(600)
});

export type ListTopicsQueryInput = z.infer<typeof listTopicsQuerySchema>;
export type CreateTopicInput = z.infer<typeof createTopicSchema>;
export type CreateReplyInput = z.infer<typeof createReplySchema>;
export type ModerateTopicInput = z.infer<typeof moderateTopicSchema>;
export type ModerateReplyInput = z.infer<typeof moderateReplySchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ListReportsQueryInput = z.infer<typeof listReportsQuerySchema>;
export type ReviewReportInput = z.infer<typeof reviewReportSchema>;

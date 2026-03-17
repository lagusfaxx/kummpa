import {
  SocialPostVisibility,
  SocialReportStatus,
  SocialReportTargetType
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

export const communityFeedQuerySchema = z.object({
  mode: z.enum(["discover", "following", "mine", "saved"]).default("discover"),
  authorId: z.string().cuid().optional(),
  petId: z.string().cuid().optional(),
  q: optionalTrimmedString(120),
  limit: z.coerce.number().int().min(1).max(100).default(35)
});

export const userParamsSchema = z.object({
  userId: z.string().cuid()
});

export const postParamsSchema = z.object({
  postId: z.string().cuid()
});

export const postCommentParamsSchema = z.object({
  postId: z.string().cuid(),
  commentId: z.string().cuid()
});

export const petParamsSchema = z.object({
  petId: z.string().cuid()
});

export const reportParamsSchema = z.object({
  reportId: z.string().cuid()
});

export const userPostsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30)
});

export const followListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(150).default(60)
});

export const createPostSchema = z.object({
  body: z.string().trim().min(1).max(2800),
  imageUrl: z
    .string()
    .trim()
    .url()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  petId: z.string().cuid().optional(),
  visibility: z.nativeEnum(SocialPostVisibility).default(SocialPostVisibility.PUBLIC),
  allowComments: z.boolean().default(true)
});

const handleSchema = z
  .string()
  .trim()
  .min(3)
  .max(28)
  .regex(/^[a-z0-9_]+$/i, "handle can only contain letters, numbers and underscore")
  .optional()
  .transform((value) => {
    if (!value || value.length === 0) return undefined;
    return value.toLowerCase();
  });

export const updateMySocialProfileSchema = z
  .object({
    handle: handleSchema,
    displayName: optionalTrimmedString(80),
    avatarUrl: z
      .string()
      .trim()
      .url()
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    coverUrl: z
      .string()
      .trim()
      .url()
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    bio: optionalTrimmedString(600),
    city: optionalTrimmedString(120),
    isPublic: z.boolean().optional()
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "At least one field is required"
  });

export const updatePetSocialProfileSchema = z
  .object({
    handle: handleSchema,
    avatarUrl: z
      .string()
      .trim()
      .url()
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    coverUrl: z
      .string()
      .trim()
      .url()
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    bio: optionalTrimmedString(600),
    isPublic: z.boolean().optional()
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "At least one field is required"
  });

export const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(1200)
});

export const sharePostSchema = z.object({
  channel: optionalTrimmedString(40).default("internal")
});

export const createReportSchema = z.object({
  targetType: z.nativeEnum(SocialReportTargetType),
  targetId: z.string().cuid(),
  reason: z.string().trim().min(10).max(500)
});

export const listReportsQuerySchema = z.object({
  status: z.nativeEnum(SocialReportStatus).optional(),
  targetType: z.nativeEnum(SocialReportTargetType).optional(),
  openOnly: optionalBooleanFromQuery.default(true),
  limit: z.coerce.number().int().min(1).max(200).default(80)
});

export const reviewReportSchema = z.object({
  status: z.enum([SocialReportStatus.REVIEWED, SocialReportStatus.DISMISSED]),
  reviewNotes: optionalTrimmedString(500)
});

export type CommunityFeedQueryInput = z.infer<typeof communityFeedQuerySchema>;
export type UserPostsQueryInput = z.infer<typeof userPostsQuerySchema>;
export type FollowListQueryInput = z.infer<typeof followListQuerySchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdateMySocialProfileInput = z.infer<typeof updateMySocialProfileSchema>;
export type UpdatePetSocialProfileInput = z.infer<typeof updatePetSocialProfileSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type SharePostInput = z.infer<typeof sharePostSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ListReportsQueryInput = z.infer<typeof listReportsQuerySchema>;
export type ReviewReportInput = z.infer<typeof reviewReportSchema>;

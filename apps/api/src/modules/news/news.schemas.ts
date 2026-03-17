import { NewsCategory } from "@prisma/client";
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

export const articleParamsSchema = z.object({
  articleId: z.string().cuid()
});

export const listArticlesQuerySchema = z.object({
  q: optionalTrimmedString(140),
  category: z.nativeEnum(NewsCategory).optional(),
  featuredOnly: optionalBooleanFromQuery.default(false),
  savedOnly: optionalBooleanFromQuery.default(false),
  publishedOnly: optionalBooleanFromQuery.default(true),
  sortBy: z.enum(["featured", "recent"]).default("featured"),
  limit: z.coerce.number().int().min(1).max(120).default(60)
});

export const createArticleSchema = z.object({
  title: z.string().trim().min(6).max(180),
  slug: z
    .string()
    .trim()
    .min(4)
    .max(180)
    .regex(/^[a-z0-9-]+$/i, "slug must use letters, numbers or hyphen")
    .transform((value) => value.toLowerCase()),
  excerpt: z.string().trim().min(10).max(600),
  body: z.string().trim().min(30).max(20_000),
  category: z.nativeEnum(NewsCategory),
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(2)
        .max(40)
        .regex(/^[a-z0-9-]+$/i, "tag must use letters, numbers or hyphen")
        .transform((value) => value.toLowerCase())
    )
    .max(12)
    .default([]),
  coverImageUrl: z.string().trim().url().max(2048).optional(),
  sourceUrl: z.string().trim().url().max(2048).optional(),
  isFeatured: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  publishedAt: z.coerce.date().optional()
});

export const updateArticleSchema = z
  .object({
    title: z.string().trim().min(6).max(180).optional(),
    slug: z
      .string()
      .trim()
      .min(4)
      .max(180)
      .regex(/^[a-z0-9-]+$/i, "slug must use letters, numbers or hyphen")
      .transform((value) => value.toLowerCase())
      .optional(),
    excerpt: z.string().trim().min(10).max(600).optional(),
    body: z.string().trim().min(30).max(20_000).optional(),
    category: z.nativeEnum(NewsCategory).optional(),
    tags: z
      .array(
        z
          .string()
          .trim()
          .min(2)
          .max(40)
          .regex(/^[a-z0-9-]+$/i, "tag must use letters, numbers or hyphen")
          .transform((value) => value.toLowerCase())
      )
      .max(12)
      .optional(),
    coverImageUrl: z.string().trim().url().max(2048).nullable().optional(),
    sourceUrl: z.string().trim().url().max(2048).nullable().optional(),
    isFeatured: z.boolean().optional(),
    isPublished: z.boolean().optional(),
    publishedAt: z.coerce.date().nullable().optional()
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "At least one field is required"
  });

export const shareArticleSchema = z.object({
  channel: optionalTrimmedString(40).default("internal")
});

export type ListArticlesQueryInput = z.infer<typeof listArticlesQuerySchema>;
export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
export type ShareArticleInput = z.infer<typeof shareArticleSchema>;

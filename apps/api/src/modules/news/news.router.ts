import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validate-request";
import {
  articleParamsSchema,
  createArticleSchema,
  listArticlesQuerySchema,
  shareArticleSchema,
  updateArticleSchema,
  type CreateArticleInput,
  type ListArticlesQueryInput,
  type ShareArticleInput,
  type UpdateArticleInput
} from "./news.schemas";
import {
  createNewsArticle,
  getNewsArticleById,
  listNewsArticles,
  listNewsCategories,
  listSavedNewsArticles,
  saveNewsArticle,
  shareNewsArticle,
  unsaveNewsArticle,
  updateNewsArticle
} from "./news.service";

export const newsRouter = Router();

newsRouter.get(
  "/categories",
  asyncHandler(requireAuth),
  asyncHandler(async (_req, res) => {
    const data = await listNewsCategories();
    res.status(200).json({
      ok: true,
      data
    });
  })
);

newsRouter.get(
  "/articles",
  asyncHandler(requireAuth),
  validateRequest(listArticlesQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListArticlesQueryInput;
    const data = await listNewsArticles(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      query
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

newsRouter.get(
  "/articles/saved",
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    const data = await listSavedNewsArticles(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      80
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

newsRouter.get(
  "/articles/:articleId",
  asyncHandler(requireAuth),
  validateRequest(articleParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { articleId: string };
    const data = await getNewsArticleById(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.articleId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

newsRouter.post(
  "/articles/:articleId/save",
  asyncHandler(requireAuth),
  validateRequest(articleParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { articleId: string };
    const data = await saveNewsArticle(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.articleId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

newsRouter.delete(
  "/articles/:articleId/save",
  asyncHandler(requireAuth),
  validateRequest(articleParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { articleId: string };
    const data = await unsaveNewsArticle(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.articleId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

newsRouter.post(
  "/articles/:articleId/share",
  asyncHandler(requireAuth),
  validateRequest(articleParamsSchema, "params"),
  validateRequest(shareArticleSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { articleId: string };
    const payload = req.body as ShareArticleInput;
    const data = await shareNewsArticle(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.articleId,
      payload
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

newsRouter.post(
  "/articles",
  asyncHandler(requireAuth),
  requireRoles("ADMIN"),
  validateRequest(createArticleSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as CreateArticleInput;
    const data = await createNewsArticle(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      payload
    );

    res.status(201).json({
      ok: true,
      data
    });
  })
);

newsRouter.patch(
  "/articles/:articleId",
  asyncHandler(requireAuth),
  requireRoles("ADMIN"),
  validateRequest(articleParamsSchema, "params"),
  validateRequest(updateArticleSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { articleId: string };
    const payload = req.body as UpdateArticleInput;
    const data = await updateNewsArticle(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.articleId,
      payload
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

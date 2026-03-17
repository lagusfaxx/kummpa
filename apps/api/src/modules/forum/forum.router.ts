import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validate-request";
import {
  createReplySchema,
  createReportSchema,
  createTopicSchema,
  listReportsQuerySchema,
  listTopicsQuerySchema,
  moderateReplySchema,
  moderateTopicSchema,
  replyParamsSchema,
  reportParamsSchema,
  reviewReportSchema,
  topicParamsSchema,
  type CreateReplyInput,
  type CreateReportInput,
  type CreateTopicInput,
  type ListReportsQueryInput,
  type ListTopicsQueryInput,
  type ModerateReplyInput,
  type ModerateTopicInput,
  type ReviewReportInput
} from "./forum.schemas";
import {
  createForumReply,
  createForumReport,
  createForumTopic,
  getForumTopicById,
  listForumCategories,
  listForumReports,
  listForumTopics,
  moderateForumReply,
  moderateForumTopic,
  reviewForumReport,
  unvoteForumReplyUseful,
  voteForumReplyUseful
} from "./forum.service";

export const forumRouter = Router();

forumRouter.get(
  "/categories",
  asyncHandler(requireAuth),
  asyncHandler(async (_req, res) => {
    const data = await listForumCategories();
    res.status(200).json({
      ok: true,
      data
    });
  })
);

forumRouter.get(
  "/topics",
  asyncHandler(requireAuth),
  validateRequest(listTopicsQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListTopicsQueryInput;
    const data = await listForumTopics(
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

forumRouter.post(
  "/topics",
  asyncHandler(requireAuth),
  validateRequest(createTopicSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as CreateTopicInput;
    const data = await createForumTopic(
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

forumRouter.get(
  "/topics/:topicId",
  asyncHandler(requireAuth),
  validateRequest(topicParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { topicId: string };
    const data = await getForumTopicById(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.topicId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

forumRouter.post(
  "/topics/:topicId/replies",
  asyncHandler(requireAuth),
  validateRequest(topicParamsSchema, "params"),
  validateRequest(createReplySchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { topicId: string };
    const payload = req.body as CreateReplyInput;
    const data = await createForumReply(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.topicId,
      payload
    );

    res.status(201).json({
      ok: true,
      data
    });
  })
);

forumRouter.patch(
  "/topics/:topicId/moderation",
  asyncHandler(requireAuth),
  requireRoles("ADMIN"),
  validateRequest(topicParamsSchema, "params"),
  validateRequest(moderateTopicSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { topicId: string };
    const payload = req.body as ModerateTopicInput;
    const data = await moderateForumTopic(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.topicId,
      payload
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

forumRouter.post(
  "/replies/:replyId/useful",
  asyncHandler(requireAuth),
  validateRequest(replyParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { replyId: string };
    const data = await voteForumReplyUseful(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.replyId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

forumRouter.delete(
  "/replies/:replyId/useful",
  asyncHandler(requireAuth),
  validateRequest(replyParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { replyId: string };
    const data = await unvoteForumReplyUseful(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.replyId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

forumRouter.patch(
  "/replies/:replyId/moderation",
  asyncHandler(requireAuth),
  requireRoles("ADMIN"),
  validateRequest(replyParamsSchema, "params"),
  validateRequest(moderateReplySchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { replyId: string };
    const payload = req.body as ModerateReplyInput;
    const data = await moderateForumReply(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.replyId,
      payload
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

forumRouter.post(
  "/reports",
  asyncHandler(requireAuth),
  validateRequest(createReportSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as CreateReportInput;
    const data = await createForumReport(
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

forumRouter.get(
  "/reports",
  asyncHandler(requireAuth),
  requireRoles("ADMIN"),
  validateRequest(listReportsQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListReportsQueryInput;
    const data = await listForumReports(
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

forumRouter.patch(
  "/reports/:reportId",
  asyncHandler(requireAuth),
  requireRoles("ADMIN"),
  validateRequest(reportParamsSchema, "params"),
  validateRequest(reviewReportSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { reportId: string };
    const payload = req.body as ReviewReportInput;
    const data = await reviewForumReport(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.reportId,
      payload
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

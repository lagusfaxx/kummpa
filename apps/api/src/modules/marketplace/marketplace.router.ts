import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validate-request";
import {
  conversationParamsSchema,
  createConversationSchema,
  createListingSchema,
  createMessageSchema,
  createReportSchema,
  featureListingSchema,
  listConversationsQuerySchema,
  listListingsQuerySchema,
  listMessagesQuerySchema,
  listReportsQuerySchema,
  listingParamsSchema,
  reportParamsSchema,
  reviewReportSchema,
  updateListingSchema,
  type CreateConversationInput,
  type CreateListingInput,
  type CreateMessageInput,
  type CreateReportInput,
  type FeatureListingInput,
  type ListConversationsQueryInput,
  type ListListingsQueryInput,
  type ListMessagesQueryInput,
  type ListReportsQueryInput,
  type ReviewReportInput,
  type UpdateListingInput
} from "./marketplace.schemas";
import {
  createMarketplaceConversationMessage,
  createMarketplaceListing,
  createMarketplaceReport,
  deleteMarketplaceListing,
  favoriteMarketplaceListing,
  featureMarketplaceListing,
  getMarketplaceListingById,
  listMarketplaceConversationMessages,
  listMarketplaceConversations,
  listMarketplaceListings,
  listMarketplaceReports,
  reviewMarketplaceReport,
  startMarketplaceConversation,
  unfavoriteMarketplaceListing,
  updateMarketplaceListing
} from "./marketplace.service";

export const marketplaceRouter = Router();

marketplaceRouter.get(
  "/listings",
  asyncHandler(requireAuth),
  validateRequest(listListingsQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListListingsQueryInput;
    const data = await listMarketplaceListings(
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

marketplaceRouter.post(
  "/listings",
  asyncHandler(requireAuth),
  validateRequest(createListingSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as CreateListingInput;
    const data = await createMarketplaceListing(
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

marketplaceRouter.get(
  "/listings/:listingId",
  asyncHandler(requireAuth),
  validateRequest(listingParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { listingId: string };
    const data = await getMarketplaceListingById(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.listingId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

marketplaceRouter.patch(
  "/listings/:listingId",
  asyncHandler(requireAuth),
  validateRequest(listingParamsSchema, "params"),
  validateRequest(updateListingSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { listingId: string };
    const payload = req.body as UpdateListingInput;
    const data = await updateMarketplaceListing(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.listingId,
      payload
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

marketplaceRouter.delete(
  "/listings/:listingId",
  asyncHandler(requireAuth),
  validateRequest(listingParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { listingId: string };
    const data = await deleteMarketplaceListing(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.listingId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

marketplaceRouter.post(
  "/listings/:listingId/favorite",
  asyncHandler(requireAuth),
  validateRequest(listingParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { listingId: string };
    const data = await favoriteMarketplaceListing(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.listingId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

marketplaceRouter.delete(
  "/listings/:listingId/favorite",
  asyncHandler(requireAuth),
  validateRequest(listingParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { listingId: string };
    const data = await unfavoriteMarketplaceListing(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.listingId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

marketplaceRouter.post(
  "/listings/:listingId/feature",
  asyncHandler(requireAuth),
  validateRequest(listingParamsSchema, "params"),
  validateRequest(featureListingSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { listingId: string };
    const payload = req.body as FeatureListingInput;
    const data = await featureMarketplaceListing(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.listingId,
      payload
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

marketplaceRouter.post(
  "/listings/:listingId/conversations",
  asyncHandler(requireAuth),
  validateRequest(listingParamsSchema, "params"),
  validateRequest(createConversationSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { listingId: string };
    const payload = req.body as CreateConversationInput;
    const data = await startMarketplaceConversation(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.listingId,
      payload
    );

    res.status(201).json({
      ok: true,
      data
    });
  })
);

marketplaceRouter.get(
  "/conversations",
  asyncHandler(requireAuth),
  validateRequest(listConversationsQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListConversationsQueryInput;
    const data = await listMarketplaceConversations(
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

marketplaceRouter.get(
  "/conversations/:conversationId/messages",
  asyncHandler(requireAuth),
  validateRequest(conversationParamsSchema, "params"),
  validateRequest(listMessagesQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const params = req.params as { conversationId: string };
    const query = req.query as unknown as ListMessagesQueryInput;
    const data = await listMarketplaceConversationMessages(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.conversationId,
      query
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

marketplaceRouter.post(
  "/conversations/:conversationId/messages",
  asyncHandler(requireAuth),
  validateRequest(conversationParamsSchema, "params"),
  validateRequest(createMessageSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { conversationId: string };
    const payload = req.body as CreateMessageInput;
    const data = await createMarketplaceConversationMessage(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.conversationId,
      payload
    );

    res.status(201).json({
      ok: true,
      data
    });
  })
);

marketplaceRouter.post(
  "/reports",
  asyncHandler(requireAuth),
  validateRequest(createReportSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as CreateReportInput;
    const data = await createMarketplaceReport(
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

marketplaceRouter.get(
  "/reports",
  asyncHandler(requireAuth),
  requireRoles("ADMIN"),
  validateRequest(listReportsQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListReportsQueryInput;
    const data = await listMarketplaceReports(
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

marketplaceRouter.patch(
  "/reports/:reportId",
  asyncHandler(requireAuth),
  requireRoles("ADMIN"),
  validateRequest(reportParamsSchema, "params"),
  validateRequest(reviewReportSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { reportId: string };
    const payload = req.body as ReviewReportInput;
    const data = await reviewMarketplaceReport(
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

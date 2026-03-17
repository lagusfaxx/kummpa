import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validate-request";
import {
  communityFeedQuerySchema,
  createCommentSchema,
  createPostSchema,
  createReportSchema,
  followListQuerySchema,
  listReportsQuerySchema,
  petParamsSchema,
  postCommentParamsSchema,
  postParamsSchema,
  reportParamsSchema,
  reviewReportSchema,
  sharePostSchema,
  updateMySocialProfileSchema,
  updatePetSocialProfileSchema,
  userParamsSchema,
  userPostsQuerySchema,
  type CommunityFeedQueryInput,
  type CreateCommentInput,
  type CreatePostInput,
  type CreateReportInput,
  type FollowListQueryInput,
  type ListReportsQueryInput,
  type ReviewReportInput,
  type SharePostInput,
  type UpdateMySocialProfileInput,
  type UpdatePetSocialProfileInput,
  type UserPostsQueryInput
} from "./community.schemas";
import {
  createGroupEventSchema,
  createWalkChatMessageSchema,
  createWalkInvitationSchema,
  discoverWalksQuerySchema,
  eventParamsSchema,
  groupEventsQuerySchema,
  invitationParamsSchema,
  joinGroupEventSchema,
  listWalkInvitationsQuerySchema,
  respondWalkInvitationSchema,
  upsertWalkProfileSchema,
  type CreateGroupEventInput,
  type CreateWalkChatMessageInput,
  type CreateWalkInvitationInput,
  type DiscoverWalksQueryInput,
  type GroupEventsQueryInput,
  type JoinGroupEventInput,
  type ListWalkInvitationsQueryInput,
  type RespondWalkInvitationInput,
  type UpsertWalkProfileInput
} from "./community-meet.schemas";
import {
  createGroupEvent,
  createWalkChatMessage,
  createWalkInvitation,
  discoverWalkCandidates,
  getMyWalkProfile,
  joinGroupEvent,
  leaveGroupEvent,
  listGroupEvents,
  listWalkChatMessages,
  listWalkInvitations,
  respondWalkInvitation,
  upsertMyWalkProfile
} from "./community-meet.service";
import {
  addCommunityComment,
  createCommunityPost,
  createCommunityReport,
  deleteCommunityComment,
  deleteCommunityPost,
  followCommunityProfile,
  getCommunityPostById,
  getCommunityProfileByUserId,
  getMyCommunityProfile,
  getPetSocialProfile,
  likeCommunityPost,
  listCommunityFeed,
  listCommunityReports,
  listCommunityUserPosts,
  listMyFollowerProfiles,
  listMyFollowingProfiles,
  listMyPetSocialProfiles,
  reviewCommunityReport,
  saveCommunityPost,
  shareCommunityPost,
  unfollowCommunityProfile,
  unlikeCommunityPost,
  unsaveCommunityPost,
  updateMyCommunityProfile,
  upsertPetSocialProfile
} from "./community.service";

export const communityRouter = Router();

communityRouter.get(
  "/feed",
  asyncHandler(requireAuth),
  validateRequest(communityFeedQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as CommunityFeedQueryInput;
    const data = await listCommunityFeed(
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

communityRouter.post(
  "/posts",
  asyncHandler(requireAuth),
  validateRequest(createPostSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as CreatePostInput;
    const data = await createCommunityPost(
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

communityRouter.get(
  "/posts/:postId",
  asyncHandler(requireAuth),
  validateRequest(postParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { postId: string };
    const data = await getCommunityPostById(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.postId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

communityRouter.delete(
  "/posts/:postId",
  asyncHandler(requireAuth),
  validateRequest(postParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { postId: string };
    await deleteCommunityPost(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.postId
    );

    res.status(200).json({
      ok: true,
      data: {
        message: "Post deleted"
      }
    });
  })
);

communityRouter.post(
  "/posts/:postId/like",
  asyncHandler(requireAuth),
  validateRequest(postParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { postId: string };
    const data = await likeCommunityPost(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.postId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

communityRouter.delete(
  "/posts/:postId/like",
  asyncHandler(requireAuth),
  validateRequest(postParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { postId: string };
    const data = await unlikeCommunityPost(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.postId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

communityRouter.post(
  "/posts/:postId/save",
  asyncHandler(requireAuth),
  validateRequest(postParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { postId: string };
    const data = await saveCommunityPost(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.postId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

communityRouter.delete(
  "/posts/:postId/save",
  asyncHandler(requireAuth),
  validateRequest(postParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { postId: string };
    const data = await unsaveCommunityPost(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.postId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

communityRouter.post(
  "/posts/:postId/share",
  asyncHandler(requireAuth),
  validateRequest(postParamsSchema, "params"),
  validateRequest(sharePostSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { postId: string };
    const payload = req.body as SharePostInput;
    const data = await shareCommunityPost(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.postId,
      payload
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

communityRouter.post(
  "/posts/:postId/comments",
  asyncHandler(requireAuth),
  validateRequest(postParamsSchema, "params"),
  validateRequest(createCommentSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { postId: string };
    const payload = req.body as CreateCommentInput;
    const data = await addCommunityComment(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.postId,
      payload
    );

    res.status(201).json({
      ok: true,
      data
    });
  })
);

communityRouter.delete(
  "/posts/:postId/comments/:commentId",
  asyncHandler(requireAuth),
  validateRequest(postCommentParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { postId: string; commentId: string };
    await deleteCommunityComment(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.postId,
      params.commentId
    );

    res.status(200).json({
      ok: true,
      data: {
        message: "Comment deleted"
      }
    });
  })
);

communityRouter.get(
  "/profiles/me",
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    const data = await getMyCommunityProfile({
      id: req.authUser!.id,
      role: req.authUser!.role
    });

    res.status(200).json({
      ok: true,
      data
    });
  })
);

communityRouter.patch(
  "/profiles/me",
  asyncHandler(requireAuth),
  validateRequest(updateMySocialProfileSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as UpdateMySocialProfileInput;
    const data = await updateMyCommunityProfile(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      payload
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

communityRouter.get(
  "/profiles/me/following",
  asyncHandler(requireAuth),
  validateRequest(followListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as FollowListQueryInput;
    const data = await listMyFollowingProfiles(
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

communityRouter.get(
  "/profiles/me/followers",
  asyncHandler(requireAuth),
  validateRequest(followListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as FollowListQueryInput;
    const data = await listMyFollowerProfiles(
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

communityRouter.get(
  "/profiles/:userId",
  asyncHandler(requireAuth),
  validateRequest(userParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { userId: string };
    const data = await getCommunityProfileByUserId(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.userId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

communityRouter.get(
  "/profiles/:userId/posts",
  asyncHandler(requireAuth),
  validateRequest(userParamsSchema, "params"),
  validateRequest(userPostsQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const params = req.params as { userId: string };
    const query = req.query as unknown as UserPostsQueryInput;
    const data = await listCommunityUserPosts(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.userId,
      query
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

communityRouter.post(
  "/profiles/:userId/follow",
  asyncHandler(requireAuth),
  validateRequest(userParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { userId: string };
    const data = await followCommunityProfile(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.userId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

communityRouter.delete(
  "/profiles/:userId/follow",
  asyncHandler(requireAuth),
  validateRequest(userParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { userId: string };
    const data = await unfollowCommunityProfile(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.userId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

communityRouter.get(
  "/pets/my",
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    const data = await listMyPetSocialProfiles({
      id: req.authUser!.id,
      role: req.authUser!.role
    });

    res.status(200).json({
      ok: true,
      data
    });
  })
);

communityRouter.get(
  "/pets/:petId/profile",
  asyncHandler(requireAuth),
  validateRequest(petParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { petId: string };
    const data = await getPetSocialProfile(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.petId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

communityRouter.put(
  "/pets/:petId/profile",
  asyncHandler(requireAuth),
  validateRequest(petParamsSchema, "params"),
  validateRequest(updatePetSocialProfileSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { petId: string };
    const payload = req.body as UpdatePetSocialProfileInput;
    const data = await upsertPetSocialProfile(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.petId,
      payload
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

communityRouter.get(
  "/walks/profile/me",
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    const data = await getMyWalkProfile({
      id: req.authUser!.id,
      role: req.authUser!.role
    });

    res.status(200).json({
      ok: true,
      data
    });
  })
);

communityRouter.patch(
  "/walks/profile/me",
  asyncHandler(requireAuth),
  validateRequest(upsertWalkProfileSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as UpsertWalkProfileInput;
    const data = await upsertMyWalkProfile(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      payload
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

communityRouter.get(
  "/walks/discover",
  asyncHandler(requireAuth),
  validateRequest(discoverWalksQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as DiscoverWalksQueryInput;
    const data = await discoverWalkCandidates(
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

communityRouter.get(
  "/walks/invitations",
  asyncHandler(requireAuth),
  validateRequest(listWalkInvitationsQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListWalkInvitationsQueryInput;
    const data = await listWalkInvitations(
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

communityRouter.post(
  "/walks/invitations",
  asyncHandler(requireAuth),
  validateRequest(createWalkInvitationSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as CreateWalkInvitationInput;
    const data = await createWalkInvitation(
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

communityRouter.patch(
  "/walks/invitations/:invitationId",
  asyncHandler(requireAuth),
  validateRequest(invitationParamsSchema, "params"),
  validateRequest(respondWalkInvitationSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { invitationId: string };
    const payload = req.body as RespondWalkInvitationInput;
    const data = await respondWalkInvitation(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.invitationId,
      payload
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

communityRouter.get(
  "/walks/invitations/:invitationId/chat",
  asyncHandler(requireAuth),
  validateRequest(invitationParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { invitationId: string };
    const data = await listWalkChatMessages(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.invitationId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

communityRouter.post(
  "/walks/invitations/:invitationId/chat",
  asyncHandler(requireAuth),
  validateRequest(invitationParamsSchema, "params"),
  validateRequest(createWalkChatMessageSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { invitationId: string };
    const payload = req.body as CreateWalkChatMessageInput;
    const data = await createWalkChatMessage(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.invitationId,
      payload
    );

    res.status(201).json({
      ok: true,
      data
    });
  })
);

communityRouter.get(
  "/walks/events",
  asyncHandler(requireAuth),
  validateRequest(groupEventsQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as GroupEventsQueryInput;
    const data = await listGroupEvents(
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

communityRouter.post(
  "/walks/events",
  asyncHandler(requireAuth),
  validateRequest(createGroupEventSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as CreateGroupEventInput;
    const data = await createGroupEvent(
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

communityRouter.post(
  "/walks/events/:eventId/join",
  asyncHandler(requireAuth),
  validateRequest(eventParamsSchema, "params"),
  validateRequest(joinGroupEventSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { eventId: string };
    const payload = req.body as JoinGroupEventInput;
    const data = await joinGroupEvent(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.eventId,
      payload
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

communityRouter.delete(
  "/walks/events/:eventId/join",
  asyncHandler(requireAuth),
  validateRequest(eventParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { eventId: string };
    const data = await leaveGroupEvent(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.eventId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

communityRouter.post(
  "/reports",
  asyncHandler(requireAuth),
  validateRequest(createReportSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as CreateReportInput;
    const data = await createCommunityReport(
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

communityRouter.get(
  "/reports",
  asyncHandler(requireAuth),
  requireRoles("ADMIN"),
  validateRequest(listReportsQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListReportsQueryInput;
    const data = await listCommunityReports(
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

communityRouter.patch(
  "/reports/:reportId",
  asyncHandler(requireAuth),
  requireRoles("ADMIN"),
  validateRequest(reportParamsSchema, "params"),
  validateRequest(reviewReportSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { reportId: string };
    const payload = req.body as ReviewReportInput;
    const data = await reviewCommunityReport(
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

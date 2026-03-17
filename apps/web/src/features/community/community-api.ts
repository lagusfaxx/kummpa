import { AuthApiError } from "@/features/auth/auth-api";
import type {
  CommunityComment,
  CommunityCommentCreatePayload,
  CommunityFeedQuery,
  CommunityPost,
  CommunityPostCreatePayload,
  CommunityProfile,
  CommunityProfileUpdatePayload,
  CommunityReport,
  CommunityReportCreatePayload,
  FollowListItem,
  GroupEvent,
  GroupEventCreatePayload,
  GroupEventJoinPayload,
  GroupEventQuery,
  PetSocialProfileDetail,
  PetSocialProfileItem,
  PetSocialProfileUpdatePayload,
  PostInteractionSnapshot,
  WalkChatMessage,
  WalkChatMessageCreatePayload,
  WalkDiscoverCandidate,
  WalkDiscoverQuery,
  WalkInvitation,
  WalkInvitationCreatePayload,
  WalkProfile,
  WalkProfileUpdatePayload
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const COMMUNITY_BASE_URL = `${API_URL}/api/v1/community`;

interface ApiSuccess<T> {
  ok: true;
  data: T;
}

interface ApiFailure {
  ok: false;
  error: {
    message: string;
  };
}

function appendIfPresent(
  params: URLSearchParams,
  key: string,
  value: string | number | boolean | undefined
) {
  if (value === undefined || value === null) return;
  params.set(key, String(value));
}

function sanitizeText(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiSuccess<T> | ApiFailure | null;

  if (!response.ok || !payload || !payload.ok) {
    const message = payload && !payload.ok ? payload.error.message : "No se pudo procesar la solicitud";
    throw new AuthApiError(message);
  }

  return payload.data;
}

async function requestWithAuth<T>(
  path: string,
  accessToken: string,
  options?: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
  }
) {
  const response = await fetch(`${COMMUNITY_BASE_URL}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: options?.body ? JSON.stringify(options.body) : undefined
  });

  return parseResponse<T>(response);
}

export async function listCommunityFeed(
  accessToken: string,
  query: CommunityFeedQuery = {}
): Promise<CommunityPost[]> {
  const params = new URLSearchParams();
  appendIfPresent(params, "mode", query.mode);
  appendIfPresent(params, "authorId", query.authorId);
  appendIfPresent(params, "petId", query.petId);
  appendIfPresent(params, "q", query.q);
  appendIfPresent(params, "limit", query.limit);
  const queryString = params.toString();

  return requestWithAuth<CommunityPost[]>(queryString ? `/feed?${queryString}` : "/feed", accessToken);
}

export async function createCommunityPost(
  accessToken: string,
  payload: CommunityPostCreatePayload
): Promise<CommunityPost> {
  return requestWithAuth<CommunityPost>("/posts", accessToken, {
    method: "POST",
    body: {
      body: payload.body,
      imageUrl: sanitizeText(payload.imageUrl),
      petId: payload.petId,
      visibility: payload.visibility,
      allowComments: payload.allowComments
    }
  });
}

export async function getCommunityPost(accessToken: string, postId: string): Promise<CommunityPost> {
  return requestWithAuth<CommunityPost>(`/posts/${postId}`, accessToken);
}

export async function deleteCommunityPost(accessToken: string, postId: string): Promise<void> {
  await requestWithAuth<{ message: string }>(`/posts/${postId}`, accessToken, {
    method: "DELETE"
  });
}

export async function likeCommunityPost(
  accessToken: string,
  postId: string
): Promise<PostInteractionSnapshot> {
  return requestWithAuth<PostInteractionSnapshot>(`/posts/${postId}/like`, accessToken, {
    method: "POST"
  });
}

export async function unlikeCommunityPost(
  accessToken: string,
  postId: string
): Promise<PostInteractionSnapshot> {
  return requestWithAuth<PostInteractionSnapshot>(`/posts/${postId}/like`, accessToken, {
    method: "DELETE"
  });
}

export async function saveCommunityPost(
  accessToken: string,
  postId: string
): Promise<PostInteractionSnapshot> {
  return requestWithAuth<PostInteractionSnapshot>(`/posts/${postId}/save`, accessToken, {
    method: "POST"
  });
}

export async function unsaveCommunityPost(
  accessToken: string,
  postId: string
): Promise<PostInteractionSnapshot> {
  return requestWithAuth<PostInteractionSnapshot>(`/posts/${postId}/save`, accessToken, {
    method: "DELETE"
  });
}

export async function shareCommunityPost(
  accessToken: string,
  postId: string,
  channel = "internal"
): Promise<PostInteractionSnapshot> {
  return requestWithAuth<PostInteractionSnapshot>(`/posts/${postId}/share`, accessToken, {
    method: "POST",
    body: {
      channel
    }
  });
}

export async function addCommunityComment(
  accessToken: string,
  postId: string,
  payload: CommunityCommentCreatePayload
): Promise<CommunityComment> {
  return requestWithAuth<CommunityComment>(`/posts/${postId}/comments`, accessToken, {
    method: "POST",
    body: {
      body: payload.body
    }
  });
}

export async function deleteCommunityComment(
  accessToken: string,
  postId: string,
  commentId: string
): Promise<void> {
  await requestWithAuth<{ message: string }>(`/posts/${postId}/comments/${commentId}`, accessToken, {
    method: "DELETE"
  });
}

export async function getMyCommunityProfile(accessToken: string): Promise<CommunityProfile> {
  return requestWithAuth<CommunityProfile>("/profiles/me", accessToken);
}

export async function updateMyCommunityProfile(
  accessToken: string,
  payload: CommunityProfileUpdatePayload
): Promise<CommunityProfile> {
  return requestWithAuth<CommunityProfile>("/profiles/me", accessToken, {
    method: "PATCH",
    body: {
      handle: sanitizeText(payload.handle),
      displayName: sanitizeText(payload.displayName),
      avatarUrl: sanitizeText(payload.avatarUrl),
      coverUrl: sanitizeText(payload.coverUrl),
      bio: sanitizeText(payload.bio),
      city: sanitizeText(payload.city),
      isPublic: payload.isPublic
    }
  });
}

export async function getCommunityProfile(
  accessToken: string,
  userId: string
): Promise<CommunityProfile> {
  return requestWithAuth<CommunityProfile>(`/profiles/${userId}`, accessToken);
}

export async function listCommunityProfilePosts(
  accessToken: string,
  userId: string,
  limit = 30
): Promise<CommunityPost[]> {
  return requestWithAuth<CommunityPost[]>(`/profiles/${userId}/posts?limit=${limit}`, accessToken);
}

export async function followCommunityProfile(
  accessToken: string,
  userId: string
): Promise<CommunityProfile> {
  return requestWithAuth<CommunityProfile>(`/profiles/${userId}/follow`, accessToken, {
    method: "POST"
  });
}

export async function unfollowCommunityProfile(
  accessToken: string,
  userId: string
): Promise<CommunityProfile> {
  return requestWithAuth<CommunityProfile>(`/profiles/${userId}/follow`, accessToken, {
    method: "DELETE"
  });
}

export async function listMyFollowing(accessToken: string, limit = 60): Promise<FollowListItem[]> {
  return requestWithAuth<FollowListItem[]>(`/profiles/me/following?limit=${limit}`, accessToken);
}

export async function listMyFollowers(accessToken: string, limit = 60): Promise<FollowListItem[]> {
  return requestWithAuth<FollowListItem[]>(`/profiles/me/followers?limit=${limit}`, accessToken);
}

export async function listMyPetSocialProfiles(accessToken: string): Promise<PetSocialProfileItem[]> {
  return requestWithAuth<PetSocialProfileItem[]>("/pets/my", accessToken);
}

export async function getPetSocialProfile(
  accessToken: string,
  petId: string
): Promise<PetSocialProfileDetail> {
  return requestWithAuth<PetSocialProfileDetail>(`/pets/${petId}/profile`, accessToken);
}

export async function upsertPetSocialProfile(
  accessToken: string,
  petId: string,
  payload: PetSocialProfileUpdatePayload
): Promise<PetSocialProfileDetail> {
  return requestWithAuth<PetSocialProfileDetail>(`/pets/${petId}/profile`, accessToken, {
    method: "PUT",
    body: {
      handle: sanitizeText(payload.handle),
      avatarUrl: sanitizeText(payload.avatarUrl),
      coverUrl: sanitizeText(payload.coverUrl),
      bio: sanitizeText(payload.bio),
      isPublic: payload.isPublic
    }
  });
}

export async function createCommunityReport(
  accessToken: string,
  payload: CommunityReportCreatePayload
): Promise<{
  id: string;
  targetType: "POST" | "COMMENT" | "PROFILE";
  status: "OPEN" | "REVIEWED" | "DISMISSED";
  createdAt: string;
}> {
  return requestWithAuth("/reports", accessToken, {
    method: "POST",
    body: payload
  });
}

export async function listCommunityReports(
  accessToken: string,
  query: {
    status?: "OPEN" | "REVIEWED" | "DISMISSED";
    targetType?: "POST" | "COMMENT" | "PROFILE";
    openOnly?: boolean;
    limit?: number;
  } = {}
): Promise<CommunityReport[]> {
  const params = new URLSearchParams();
  appendIfPresent(params, "status", query.status);
  appendIfPresent(params, "targetType", query.targetType);
  appendIfPresent(params, "openOnly", query.openOnly);
  appendIfPresent(params, "limit", query.limit);
  const queryString = params.toString();

  return requestWithAuth<CommunityReport[]>(queryString ? `/reports?${queryString}` : "/reports", accessToken);
}

export async function reviewCommunityReport(
  accessToken: string,
  reportId: string,
  payload: {
    status: "REVIEWED" | "DISMISSED";
    reviewNotes?: string;
  }
) {
  return requestWithAuth<{
    id: string;
    status: "OPEN" | "REVIEWED" | "DISMISSED";
    reviewedAt?: string | null;
    reviewNotes?: string | null;
    updatedAt: string;
  }>(`/reports/${reportId}`, accessToken, {
    method: "PATCH",
    body: {
      status: payload.status,
      reviewNotes: sanitizeText(payload.reviewNotes)
    }
  });
}

export async function getMyWalkProfile(accessToken: string): Promise<WalkProfile> {
  return requestWithAuth<WalkProfile>("/walks/profile/me", accessToken);
}

export async function updateMyWalkProfile(
  accessToken: string,
  payload: WalkProfileUpdatePayload
): Promise<WalkProfile> {
  return requestWithAuth<WalkProfile>("/walks/profile/me", accessToken, {
    method: "PATCH",
    body: {
      displayName: sanitizeText(payload.displayName),
      bio: sanitizeText(payload.bio),
      city: sanitizeText(payload.city),
      district: sanitizeText(payload.district),
      latitude: payload.latitude,
      longitude: payload.longitude,
      preferredSpecies: sanitizeText(payload.preferredSpecies),
      preferredSizes: payload.preferredSizes,
      preferredEnergyLevels: payload.preferredEnergyLevels,
      preferredMinAgeMonths: payload.preferredMinAgeMonths,
      preferredMaxAgeMonths: payload.preferredMaxAgeMonths,
      isDiscoverable: payload.isDiscoverable
    }
  });
}

export async function discoverWalkCandidates(
  accessToken: string,
  query: WalkDiscoverQuery = {}
): Promise<WalkDiscoverCandidate[]> {
  const params = new URLSearchParams();
  appendIfPresent(params, "city", query.city);
  appendIfPresent(params, "district", query.district);
  appendIfPresent(params, "species", query.species);
  appendIfPresent(params, "size", query.size);
  appendIfPresent(params, "energyLevel", query.energyLevel);
  appendIfPresent(params, "minAgeMonths", query.minAgeMonths);
  appendIfPresent(params, "maxAgeMonths", query.maxAgeMonths);
  appendIfPresent(params, "limit", query.limit);
  const queryString = params.toString();

  return requestWithAuth<WalkDiscoverCandidate[]>(
    queryString ? `/walks/discover?${queryString}` : "/walks/discover",
    accessToken
  );
}

export async function listWalkInvitations(
  accessToken: string,
  query: {
    role?: "inbox" | "sent" | "all";
    status?: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";
    limit?: number;
  } = {}
): Promise<WalkInvitation[]> {
  const params = new URLSearchParams();
  appendIfPresent(params, "role", query.role);
  appendIfPresent(params, "status", query.status);
  appendIfPresent(params, "limit", query.limit);
  const queryString = params.toString();

  return requestWithAuth<WalkInvitation[]>(
    queryString ? `/walks/invitations?${queryString}` : "/walks/invitations",
    accessToken
  );
}

export async function createWalkInvitation(
  accessToken: string,
  payload: WalkInvitationCreatePayload
): Promise<WalkInvitation> {
  return requestWithAuth<WalkInvitation>("/walks/invitations", accessToken, {
    method: "POST",
    body: {
      toUserId: payload.toUserId,
      petId: payload.petId,
      message: sanitizeText(payload.message),
      proposedAt: payload.proposedAt,
      city: sanitizeText(payload.city),
      district: sanitizeText(payload.district),
      placeLabel: sanitizeText(payload.placeLabel)
    }
  });
}

export async function respondWalkInvitation(
  accessToken: string,
  invitationId: string,
  status: "ACCEPTED" | "REJECTED" | "CANCELLED"
): Promise<WalkInvitation> {
  return requestWithAuth<WalkInvitation>(`/walks/invitations/${invitationId}`, accessToken, {
    method: "PATCH",
    body: {
      status
    }
  });
}

export async function listWalkChatMessages(
  accessToken: string,
  invitationId: string
): Promise<WalkChatMessage[]> {
  return requestWithAuth<WalkChatMessage[]>(`/walks/invitations/${invitationId}/chat`, accessToken);
}

export async function createWalkChatMessage(
  accessToken: string,
  invitationId: string,
  payload: WalkChatMessageCreatePayload
): Promise<WalkChatMessage> {
  return requestWithAuth<WalkChatMessage>(`/walks/invitations/${invitationId}/chat`, accessToken, {
    method: "POST",
    body: {
      body: payload.body
    }
  });
}

export async function listGroupEvents(
  accessToken: string,
  query: GroupEventQuery = {}
): Promise<GroupEvent[]> {
  const params = new URLSearchParams();
  appendIfPresent(params, "city", query.city);
  appendIfPresent(params, "district", query.district);
  appendIfPresent(params, "species", query.species);
  appendIfPresent(params, "size", query.size);
  appendIfPresent(params, "energyLevel", query.energyLevel);
  appendIfPresent(params, "minAgeMonths", query.minAgeMonths);
  appendIfPresent(params, "maxAgeMonths", query.maxAgeMonths);
  appendIfPresent(params, "includePast", query.includePast);
  appendIfPresent(params, "onlyMine", query.onlyMine);
  appendIfPresent(params, "limit", query.limit);
  const queryString = params.toString();

  return requestWithAuth<GroupEvent[]>(
    queryString ? `/walks/events?${queryString}` : "/walks/events",
    accessToken
  );
}

export async function createGroupEvent(
  accessToken: string,
  payload: GroupEventCreatePayload
): Promise<GroupEvent> {
  return requestWithAuth<GroupEvent>("/walks/events", accessToken, {
    method: "POST",
    body: {
      title: payload.title,
      description: sanitizeText(payload.description),
      type: payload.type ?? "WALK",
      city: payload.city,
      district: sanitizeText(payload.district),
      placeLabel: sanitizeText(payload.placeLabel),
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      maxAttendees: payload.maxAttendees,
      speciesFilter: sanitizeText(payload.speciesFilter),
      sizeFilter: payload.sizeFilter,
      energyFilter: payload.energyFilter,
      minPetAgeMonths: payload.minPetAgeMonths,
      maxPetAgeMonths: payload.maxPetAgeMonths
    }
  });
}

export async function joinGroupEvent(
  accessToken: string,
  eventId: string,
  payload: GroupEventJoinPayload
): Promise<GroupEvent> {
  return requestWithAuth<GroupEvent>(`/walks/events/${eventId}/join`, accessToken, {
    method: "POST",
    body: {
      petId: payload.petId,
      note: sanitizeText(payload.note)
    }
  });
}

export async function leaveGroupEvent(accessToken: string, eventId: string): Promise<GroupEvent> {
  return requestWithAuth<GroupEvent>(`/walks/events/${eventId}/join`, accessToken, {
    method: "DELETE"
  });
}

import { AuthApiError } from "@/features/auth/auth-api";
import type {
  ForumCategory,
  ForumCreateReplyPayload,
  ForumCreateReportPayload,
  ForumCreateTopicPayload,
  ForumListTopicsQuery,
  ForumReport,
  ForumReply,
  ForumTopicDetail,
  ForumTopicListItem,
  ForumUsefulVoteSnapshot
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const FORUM_BASE_URL = `${API_URL}/api/v1/forum`;

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
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
  }
) {
  const response = await fetch(`${FORUM_BASE_URL}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: options?.body ? JSON.stringify(options.body) : undefined
  });

  return parseResponse<T>(response);
}

export async function listForumCategories(accessToken: string): Promise<ForumCategory[]> {
  return requestWithAuth<ForumCategory[]>("/categories", accessToken);
}

export async function listForumTopics(
  accessToken: string,
  query: ForumListTopicsQuery = {}
): Promise<ForumTopicListItem[]> {
  const params = new URLSearchParams();
  appendIfPresent(params, "category", query.category);
  appendIfPresent(params, "q", query.q);
  appendIfPresent(params, "tag", query.tag);
  appendIfPresent(params, "mine", query.mine);
  appendIfPresent(params, "limit", query.limit);
  const queryString = params.toString();

  return requestWithAuth<ForumTopicListItem[]>(
    queryString ? `/topics?${queryString}` : "/topics",
    accessToken
  );
}

export async function createForumTopic(
  accessToken: string,
  payload: ForumCreateTopicPayload
): Promise<ForumTopicDetail> {
  return requestWithAuth<ForumTopicDetail>("/topics", accessToken, {
    method: "POST",
    body: {
      categorySlug: payload.categorySlug,
      title: payload.title,
      body: payload.body,
      tags: payload.tags?.map((item) => sanitizeText(item)).filter(Boolean)
    }
  });
}

export async function getForumTopic(accessToken: string, topicId: string): Promise<ForumTopicDetail> {
  return requestWithAuth<ForumTopicDetail>(`/topics/${topicId}`, accessToken);
}

export async function createForumReply(
  accessToken: string,
  topicId: string,
  payload: ForumCreateReplyPayload
): Promise<ForumReply> {
  return requestWithAuth<ForumReply>(`/topics/${topicId}/replies`, accessToken, {
    method: "POST",
    body: {
      body: payload.body,
      quotedReplyId: payload.quotedReplyId
    }
  });
}

export async function voteReplyUseful(
  accessToken: string,
  replyId: string
): Promise<ForumUsefulVoteSnapshot> {
  return requestWithAuth<ForumUsefulVoteSnapshot>(`/replies/${replyId}/useful`, accessToken, {
    method: "POST"
  });
}

export async function unvoteReplyUseful(
  accessToken: string,
  replyId: string
): Promise<ForumUsefulVoteSnapshot> {
  return requestWithAuth<ForumUsefulVoteSnapshot>(`/replies/${replyId}/useful`, accessToken, {
    method: "DELETE"
  });
}

export async function createForumReport(
  accessToken: string,
  payload: ForumCreateReportPayload
): Promise<{
  id: string;
  targetType: "TOPIC" | "REPLY";
  status: "OPEN" | "REVIEWED" | "DISMISSED";
  createdAt: string;
}> {
  return requestWithAuth("/reports", accessToken, {
    method: "POST",
    body: {
      targetType: payload.targetType,
      targetId: payload.targetId,
      reason: payload.reason
    }
  });
}

export async function listForumReports(
  accessToken: string,
  query: {
    status?: "OPEN" | "REVIEWED" | "DISMISSED";
    targetType?: "TOPIC" | "REPLY";
    openOnly?: boolean;
    limit?: number;
  } = {}
): Promise<ForumReport[]> {
  const params = new URLSearchParams();
  appendIfPresent(params, "status", query.status);
  appendIfPresent(params, "targetType", query.targetType);
  appendIfPresent(params, "openOnly", query.openOnly);
  appendIfPresent(params, "limit", query.limit);
  const queryString = params.toString();

  return requestWithAuth<ForumReport[]>(
    queryString ? `/reports?${queryString}` : "/reports",
    accessToken
  );
}

export async function reviewForumReport(
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

export async function moderateForumTopic(
  accessToken: string,
  topicId: string,
  payload: {
    isPinned?: boolean;
    isLocked?: boolean;
    deleted?: boolean;
  }
): Promise<ForumTopicDetail> {
  return requestWithAuth<ForumTopicDetail>(`/topics/${topicId}/moderation`, accessToken, {
    method: "PATCH",
    body: payload
  });
}

export async function moderateForumReply(
  accessToken: string,
  replyId: string,
  payload: {
    deleted: boolean;
  }
): Promise<{
  id: string;
  topicId: string;
  deleted: boolean;
  updatedAt: string;
}> {
  return requestWithAuth(`/replies/${replyId}/moderation`, accessToken, {
    method: "PATCH",
    body: payload
  });
}

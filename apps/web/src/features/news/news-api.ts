import { AuthApiError } from "@/features/auth/auth-api";
import type {
  NewsArticleDetail,
  NewsArticleListItem,
  NewsArticlesQuery,
  NewsCategoryStat
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const NEWS_BASE_URL = `${API_URL}/api/v1/news`;

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
  const response = await fetch(`${NEWS_BASE_URL}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: options?.body ? JSON.stringify(options.body) : undefined
  });

  return parseResponse<T>(response);
}

export async function listNewsCategories(accessToken: string): Promise<NewsCategoryStat[]> {
  return requestWithAuth<NewsCategoryStat[]>("/categories", accessToken);
}

export async function listNewsArticles(
  accessToken: string,
  query: NewsArticlesQuery = {}
): Promise<NewsArticleListItem[]> {
  const params = new URLSearchParams();
  appendIfPresent(params, "q", query.q);
  appendIfPresent(params, "category", query.category);
  appendIfPresent(params, "featuredOnly", query.featuredOnly);
  appendIfPresent(params, "savedOnly", query.savedOnly);
  appendIfPresent(params, "publishedOnly", query.publishedOnly);
  appendIfPresent(params, "sortBy", query.sortBy);
  appendIfPresent(params, "limit", query.limit);
  const queryString = params.toString();

  return requestWithAuth<NewsArticleListItem[]>(
    queryString ? `/articles?${queryString}` : "/articles",
    accessToken
  );
}

export async function listSavedNewsArticles(accessToken: string): Promise<NewsArticleListItem[]> {
  return requestWithAuth<NewsArticleListItem[]>("/articles/saved", accessToken);
}

export async function getNewsArticle(accessToken: string, articleId: string): Promise<NewsArticleDetail> {
  return requestWithAuth<NewsArticleDetail>(`/articles/${articleId}`, accessToken);
}

export async function saveNewsArticle(
  accessToken: string,
  articleId: string
): Promise<{
  articleId: string;
  savesCount: number;
  isSaved: boolean;
}> {
  return requestWithAuth(`/articles/${articleId}/save`, accessToken, {
    method: "POST"
  });
}

export async function unsaveNewsArticle(
  accessToken: string,
  articleId: string
): Promise<{
  articleId: string;
  savesCount: number;
  isSaved: boolean;
}> {
  return requestWithAuth(`/articles/${articleId}/save`, accessToken, {
    method: "DELETE"
  });
}

export async function shareNewsArticle(
  accessToken: string,
  articleId: string,
  channel = "internal"
): Promise<{
  articleId: string;
  sharesCount: number;
  channel: string;
}> {
  return requestWithAuth(`/articles/${articleId}/share`, accessToken, {
    method: "POST",
    body: {
      channel
    }
  });
}

export async function createNewsArticle(
  accessToken: string,
  payload: {
    title: string;
    slug: string;
    excerpt: string;
    body: string;
    category: string;
    tags?: string[];
    coverImageUrl?: string;
    sourceUrl?: string;
    isFeatured?: boolean;
    isPublished?: boolean;
    publishedAt?: string;
  }
): Promise<NewsArticleDetail> {
  return requestWithAuth("/articles", accessToken, {
    method: "POST",
    body: {
      title: payload.title,
      slug: payload.slug,
      excerpt: payload.excerpt,
      body: payload.body,
      category: payload.category,
      tags: payload.tags?.map((item) => sanitizeText(item)).filter(Boolean),
      coverImageUrl: sanitizeText(payload.coverImageUrl),
      sourceUrl: sanitizeText(payload.sourceUrl),
      isFeatured: payload.isFeatured,
      isPublished: payload.isPublished,
      publishedAt: payload.publishedAt
    }
  });
}

export async function updateNewsArticle(
  accessToken: string,
  articleId: string,
  payload: {
    title?: string;
    slug?: string;
    excerpt?: string;
    body?: string;
    category?: string;
    tags?: string[];
    coverImageUrl?: string | null;
    sourceUrl?: string | null;
    isFeatured?: boolean;
    isPublished?: boolean;
    publishedAt?: string | null;
  }
): Promise<NewsArticleDetail> {
  return requestWithAuth(`/articles/${articleId}`, accessToken, {
    method: "PATCH",
    body: {
      title: sanitizeText(payload.title),
      slug: sanitizeText(payload.slug),
      excerpt: sanitizeText(payload.excerpt),
      body: sanitizeText(payload.body),
      category: payload.category,
      tags: payload.tags?.map((item) => sanitizeText(item)).filter(Boolean),
      coverImageUrl:
        payload.coverImageUrl === null ? null : sanitizeText(payload.coverImageUrl ?? undefined),
      sourceUrl: payload.sourceUrl === null ? null : sanitizeText(payload.sourceUrl ?? undefined),
      isFeatured: payload.isFeatured,
      isPublished: payload.isPublished,
      publishedAt: payload.publishedAt
    }
  });
}

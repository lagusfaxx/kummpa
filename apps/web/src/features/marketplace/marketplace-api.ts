import { AuthApiError } from "@/features/auth/auth-api";
import type {
  MarketplaceConversation,
  MarketplaceConversationMessages,
  MarketplaceCreateListingPayload,
  MarketplaceFavoriteSnapshot,
  MarketplaceListing,
  MarketplaceListingQuery,
  MarketplaceMessage,
  MarketplaceReport
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const MARKETPLACE_BASE_URL = `${API_URL}/api/v1/marketplace`;

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
  const response = await fetch(`${MARKETPLACE_BASE_URL}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: options?.body ? JSON.stringify(options.body) : undefined
  });

  return parseResponse<T>(response);
}

export async function listMarketplaceListings(
  accessToken: string,
  query: MarketplaceListingQuery = {}
): Promise<MarketplaceListing[]> {
  const params = new URLSearchParams();
  appendIfPresent(params, "q", query.q);
  appendIfPresent(params, "category", query.category);
  appendIfPresent(params, "condition", query.condition);
  appendIfPresent(params, "city", query.city);
  appendIfPresent(params, "district", query.district);
  appendIfPresent(params, "priceMin", query.priceMin);
  appendIfPresent(params, "priceMax", query.priceMax);
  appendIfPresent(params, "lat", query.lat);
  appendIfPresent(params, "lng", query.lng);
  appendIfPresent(params, "radiusKm", query.radiusKm);
  appendIfPresent(params, "mine", query.mine);
  appendIfPresent(params, "favoritesOnly", query.favoritesOnly);
  appendIfPresent(params, "includeInactive", query.includeInactive);
  appendIfPresent(params, "sortBy", query.sortBy);
  appendIfPresent(params, "limit", query.limit);
  appendIfPresent(params, "sellerId", query.sellerId);
  const queryString = params.toString();

  return requestWithAuth<MarketplaceListing[]>(
    queryString ? `/listings?${queryString}` : "/listings",
    accessToken
  );
}

export async function getMarketplaceListing(
  accessToken: string,
  listingId: string
): Promise<MarketplaceListing> {
  return requestWithAuth<MarketplaceListing>(`/listings/${listingId}`, accessToken);
}

export async function createMarketplaceListing(
  accessToken: string,
  payload: MarketplaceCreateListingPayload
): Promise<MarketplaceListing> {
  return requestWithAuth<MarketplaceListing>("/listings", accessToken, {
    method: "POST",
    body: {
      title: payload.title,
      description: payload.description,
      priceCents: payload.priceCents,
      condition: payload.condition,
      category: payload.category,
      photoUrls: payload.photoUrls.map((item) => sanitizeText(item)).filter(Boolean),
      city: sanitizeText(payload.city),
      district: sanitizeText(payload.district),
      latitude: payload.latitude,
      longitude: payload.longitude
    }
  });
}

export async function updateMarketplaceListing(
  accessToken: string,
  listingId: string,
  payload: {
    title?: string;
    description?: string;
    priceCents?: number;
    condition?: "NEW" | "USED";
    category?: string;
    photoUrls?: string[];
    city?: string;
    district?: string;
    latitude?: number | null;
    longitude?: number | null;
    isActive?: boolean;
  }
): Promise<MarketplaceListing> {
  return requestWithAuth<MarketplaceListing>(`/listings/${listingId}`, accessToken, {
    method: "PATCH",
    body: {
      title: sanitizeText(payload.title),
      description: sanitizeText(payload.description),
      priceCents: payload.priceCents,
      condition: payload.condition,
      category: payload.category,
      photoUrls: payload.photoUrls?.map((item) => sanitizeText(item)).filter(Boolean),
      city: sanitizeText(payload.city),
      district: sanitizeText(payload.district),
      latitude: payload.latitude,
      longitude: payload.longitude,
      isActive: payload.isActive
    }
  });
}

export async function removeMarketplaceListing(
  accessToken: string,
  listingId: string
): Promise<{
  id: string;
  deletedAt?: string | null;
  updatedAt: string;
}> {
  return requestWithAuth(`/listings/${listingId}`, accessToken, {
    method: "DELETE"
  });
}

export async function favoriteMarketplaceListing(
  accessToken: string,
  listingId: string
): Promise<MarketplaceFavoriteSnapshot> {
  return requestWithAuth<MarketplaceFavoriteSnapshot>(`/listings/${listingId}/favorite`, accessToken, {
    method: "POST"
  });
}

export async function unfavoriteMarketplaceListing(
  accessToken: string,
  listingId: string
): Promise<MarketplaceFavoriteSnapshot> {
  return requestWithAuth<MarketplaceFavoriteSnapshot>(`/listings/${listingId}/favorite`, accessToken, {
    method: "DELETE"
  });
}

export async function featureMarketplaceListing(
  accessToken: string,
  listingId: string,
  days = 7
): Promise<MarketplaceListing> {
  return requestWithAuth<MarketplaceListing>(`/listings/${listingId}/feature`, accessToken, {
    method: "POST",
    body: {
      days
    }
  });
}

export async function startMarketplaceConversation(
  accessToken: string,
  listingId: string,
  initialMessage?: string
): Promise<MarketplaceConversation> {
  return requestWithAuth<MarketplaceConversation>(`/listings/${listingId}/conversations`, accessToken, {
    method: "POST",
    body: {
      initialMessage: sanitizeText(initialMessage)
    }
  });
}

export async function listMarketplaceConversations(
  accessToken: string,
  query: {
    role?: "all" | "buying" | "selling";
    listingId?: string;
    limit?: number;
  } = {}
): Promise<MarketplaceConversation[]> {
  const params = new URLSearchParams();
  appendIfPresent(params, "role", query.role);
  appendIfPresent(params, "listingId", query.listingId);
  appendIfPresent(params, "limit", query.limit);
  const queryString = params.toString();

  return requestWithAuth<MarketplaceConversation[]>(
    queryString ? `/conversations?${queryString}` : "/conversations",
    accessToken
  );
}

export async function listMarketplaceConversationMessages(
  accessToken: string,
  conversationId: string,
  limit = 120
): Promise<MarketplaceConversationMessages> {
  return requestWithAuth<MarketplaceConversationMessages>(
    `/conversations/${conversationId}/messages?limit=${limit}`,
    accessToken
  );
}

export async function createMarketplaceMessage(
  accessToken: string,
  conversationId: string,
  body: string
): Promise<MarketplaceMessage> {
  return requestWithAuth<MarketplaceMessage>(`/conversations/${conversationId}/messages`, accessToken, {
    method: "POST",
    body: {
      body
    }
  });
}

export async function createMarketplaceReport(
  accessToken: string,
  payload: {
    listingId: string;
    reason: string;
  }
): Promise<{
  id: string;
  listingId: string;
  status: "OPEN" | "REVIEWED" | "DISMISSED";
  createdAt: string;
}> {
  return requestWithAuth("/reports", accessToken, {
    method: "POST",
    body: {
      listingId: payload.listingId,
      reason: payload.reason
    }
  });
}

export async function listMarketplaceReports(
  accessToken: string,
  query: {
    status?: "OPEN" | "REVIEWED" | "DISMISSED";
    openOnly?: boolean;
    limit?: number;
  } = {}
): Promise<MarketplaceReport[]> {
  const params = new URLSearchParams();
  appendIfPresent(params, "status", query.status);
  appendIfPresent(params, "openOnly", query.openOnly);
  appendIfPresent(params, "limit", query.limit);
  const queryString = params.toString();

  return requestWithAuth<MarketplaceReport[]>(
    queryString ? `/reports?${queryString}` : "/reports",
    accessToken
  );
}

export async function reviewMarketplaceReport(
  accessToken: string,
  reportId: string,
  payload: {
    status: "REVIEWED" | "DISMISSED";
    reviewNotes?: string;
  }
): Promise<{
  id: string;
  status: "OPEN" | "REVIEWED" | "DISMISSED";
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  updatedAt: string;
}> {
  return requestWithAuth(`/reports/${reportId}`, accessToken, {
    method: "PATCH",
    body: {
      status: payload.status,
      reviewNotes: sanitizeText(payload.reviewNotes)
    }
  });
}

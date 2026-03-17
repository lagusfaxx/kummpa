import { AuthApiError } from "@/features/auth/auth-api";
import type {
  BenefitItem,
  BenefitListQuery,
  BenefitProviderType,
  BenefitRedemptionItem
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const BENEFITS_BASE_URL = `${API_URL}/api/v1/benefits`;

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
  const response = await fetch(`${BENEFITS_BASE_URL}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: options?.body ? JSON.stringify(options.body) : undefined
  });

  return parseResponse<T>(response);
}

export async function listBenefits(
  accessToken: string,
  query: BenefitListQuery = {}
): Promise<BenefitItem[]> {
  const params = new URLSearchParams();
  appendIfPresent(params, "q", query.q);
  appendIfPresent(params, "city", query.city);
  appendIfPresent(params, "district", query.district);
  appendIfPresent(params, "providerType", query.providerType);
  appendIfPresent(params, "featuredOnly", query.featuredOnly);
  appendIfPresent(params, "savedOnly", query.savedOnly);
  appendIfPresent(params, "activeOnly", query.activeOnly);
  appendIfPresent(params, "validOnly", query.validOnly);
  appendIfPresent(params, "sortBy", query.sortBy);
  appendIfPresent(params, "limit", query.limit);
  const queryString = params.toString();

  return requestWithAuth<BenefitItem[]>(queryString ? `/?${queryString}` : "/", accessToken);
}

export async function listSavedBenefits(accessToken: string): Promise<BenefitItem[]> {
  return requestWithAuth<BenefitItem[]>("/saved", accessToken);
}

export async function getBenefit(accessToken: string, benefitId: string): Promise<BenefitItem> {
  return requestWithAuth<BenefitItem>(`/${benefitId}`, accessToken);
}

export async function saveBenefit(
  accessToken: string,
  benefitId: string
): Promise<{
  benefitId: string;
  savesCount: number;
  isSaved: boolean;
}> {
  return requestWithAuth(`/${benefitId}/save`, accessToken, {
    method: "POST"
  });
}

export async function unsaveBenefit(
  accessToken: string,
  benefitId: string
): Promise<{
  benefitId: string;
  savesCount: number;
  isSaved: boolean;
}> {
  return requestWithAuth(`/${benefitId}/save`, accessToken, {
    method: "DELETE"
  });
}

export async function redeemBenefit(
  accessToken: string,
  benefitId: string
): Promise<{
  id: string;
  benefitId: string;
  benefitTitle: string;
  activationCode: string;
  status: "ACTIVE" | "USED" | "CANCELLED" | "EXPIRED";
  expiresAt: string;
  usedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
}> {
  return requestWithAuth(`/${benefitId}/redeem`, accessToken, {
    method: "POST"
  });
}

export async function listMyRedemptions(
  accessToken: string,
  query: {
    status?: "ACTIVE" | "USED" | "CANCELLED" | "EXPIRED";
    limit?: number;
  } = {}
): Promise<BenefitRedemptionItem[]> {
  const params = new URLSearchParams();
  appendIfPresent(params, "status", query.status);
  appendIfPresent(params, "limit", query.limit);
  const queryString = params.toString();

  return requestWithAuth<BenefitRedemptionItem[]>(
    queryString ? `/redemptions/me?${queryString}` : "/redemptions/me",
    accessToken
  );
}

export async function createBenefit(
  accessToken: string,
  payload: {
    title: string;
    summary: string;
    description?: string;
    providerType: BenefitProviderType;
    providerName?: string;
    discountLabel?: string;
    couponCode?: string;
    terms?: string;
    city?: string;
    district?: string;
    landingUrl?: string;
    validFrom: string;
    validTo: string;
    maxRedemptions?: number;
    isFeatured?: boolean;
    isActive?: boolean;
  }
): Promise<BenefitItem> {
  return requestWithAuth<BenefitItem>("/", accessToken, {
    method: "POST",
    body: {
      title: payload.title,
      summary: payload.summary,
      description: sanitizeText(payload.description),
      providerType: payload.providerType,
      providerName: sanitizeText(payload.providerName),
      discountLabel: sanitizeText(payload.discountLabel),
      couponCode: sanitizeText(payload.couponCode),
      terms: sanitizeText(payload.terms),
      city: sanitizeText(payload.city),
      district: sanitizeText(payload.district),
      landingUrl: sanitizeText(payload.landingUrl),
      validFrom: payload.validFrom,
      validTo: payload.validTo,
      maxRedemptions: payload.maxRedemptions,
      isFeatured: payload.isFeatured,
      isActive: payload.isActive
    }
  });
}

export async function updateBenefit(
  accessToken: string,
  benefitId: string,
  payload: {
    title?: string;
    summary?: string;
    description?: string;
    providerType?: BenefitProviderType;
    providerName?: string;
    discountLabel?: string;
    couponCode?: string;
    terms?: string;
    city?: string;
    district?: string;
    landingUrl?: string;
    validFrom?: string;
    validTo?: string;
    maxRedemptions?: number | null;
    isFeatured?: boolean;
    isActive?: boolean;
  }
): Promise<BenefitItem> {
  return requestWithAuth<BenefitItem>(`/${benefitId}`, accessToken, {
    method: "PATCH",
    body: {
      title: sanitizeText(payload.title),
      summary: sanitizeText(payload.summary),
      description: sanitizeText(payload.description),
      providerType: payload.providerType,
      providerName: sanitizeText(payload.providerName),
      discountLabel: sanitizeText(payload.discountLabel),
      couponCode: sanitizeText(payload.couponCode),
      terms: sanitizeText(payload.terms),
      city: sanitizeText(payload.city),
      district: sanitizeText(payload.district),
      landingUrl: sanitizeText(payload.landingUrl),
      validFrom: payload.validFrom,
      validTo: payload.validTo,
      maxRedemptions: payload.maxRedemptions,
      isFeatured: payload.isFeatured,
      isActive: payload.isActive
    }
  });
}

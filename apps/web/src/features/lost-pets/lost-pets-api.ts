import { AuthApiError } from "@/features/auth/auth-api";
import type {
  CreateLostPetAlertPayload,
  CreateLostPetSightingPayload,
  LostPetAlert,
  LostPetAlertDetail,
  LostPetAlertsQuery,
  LostPetSighting,
  UpdateLostPetAlertPayload
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const LOST_PETS_BASE_URL = `${API_URL}/api/v1/lost-pets`;

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

function sanitizeText(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function appendIfPresent(
  params: URLSearchParams,
  key: string,
  value: string | number | boolean | undefined
) {
  if (value === undefined || value === null) return;
  params.set(key, String(value));
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiSuccess<T> | ApiFailure | null;

  if (!response.ok || !payload || !payload.ok) {
    const message = payload && !payload.ok ? payload.error.message : "No se pudo procesar la solicitud";
    throw new AuthApiError(message);
  }

  return payload.data;
}

async function requestPublic<T>(path: string) {
  const response = await fetch(`${LOST_PETS_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
    cache: "no-store"
  });

  return parseResponse<T>(response);
}

async function requestWithAuth<T>(
  path: string,
  accessToken: string,
  options?: {
    method?: "GET" | "POST" | "PATCH";
    body?: unknown;
  }
) {
  const response = await fetch(`${LOST_PETS_BASE_URL}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: options?.body ? JSON.stringify(options.body) : undefined
  });

  return parseResponse<T>(response);
}

export async function uploadSightingPhoto(
  accessToken: string,
  alertId: string,
  file: File
): Promise<string> {
  const form = new FormData();
  form.append("photo", file);
  const response = await fetch(`${LOST_PETS_BASE_URL}/${alertId}/sightings/upload-photo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form
  });
  const payload = (await response.json().catch(() => null)) as
    | { ok: true; data: { url: string } }
    | { ok: false; error: { message: string } }
    | null;
  if (!response.ok || !payload || !payload.ok) {
    const message = payload && !payload.ok ? payload.error.message : "No se pudo subir la foto";
    throw new AuthApiError(message);
  }
  return payload.data.url;
}

export async function listLostPetAlerts(
  accessToken: string,
  query: LostPetAlertsQuery = {}
): Promise<LostPetAlert[]> {
  const params = new URLSearchParams();
  appendIfPresent(params, "status", query.status);
  appendIfPresent(params, "activeOnly", query.activeOnly);
  appendIfPresent(params, "mine", query.mine);
  appendIfPresent(params, "medicalPriority", query.medicalPriority);
  appendIfPresent(params, "petId", query.petId);
  appendIfPresent(params, "q", query.q);
  appendIfPresent(params, "lat", query.lat);
  appendIfPresent(params, "lng", query.lng);
  appendIfPresent(params, "radiusKm", query.radiusKm);
  appendIfPresent(params, "limit", query.limit);

  const queryString = params.toString();
  return requestWithAuth<LostPetAlert[]>(queryString ? `/?${queryString}` : "/", accessToken);
}

export async function listNearbyLostPetAlerts(
  accessToken: string,
  query: {
    lat: number;
    lng: number;
    radiusKm?: number;
    limit?: number;
  }
): Promise<LostPetAlert[]> {
  const params = new URLSearchParams();
  params.set("lat", String(query.lat));
  params.set("lng", String(query.lng));
  appendIfPresent(params, "radiusKm", query.radiusKm);
  appendIfPresent(params, "limit", query.limit);

  return requestWithAuth<LostPetAlert[]>(`/nearby?${params.toString()}`, accessToken);
}

export async function createLostPetAlert(
  accessToken: string,
  payload: CreateLostPetAlertPayload
): Promise<LostPetAlert> {
  return requestWithAuth<LostPetAlert>("/report", accessToken, {
    method: "POST",
    body: {
      petId: payload.petId,
      lastSeenAt: payload.lastSeenAt,
      lastSeenLat: payload.lastSeenLat,
      lastSeenLng: payload.lastSeenLng,
      lastSeenAddress: sanitizeText(payload.lastSeenAddress),
      description: sanitizeText(payload.description),
      emergencyNotes: sanitizeText(payload.emergencyNotes),
      medicalPriority: payload.medicalPriority,
      searchRadiusKm: payload.searchRadiusKm,
      broadcastEnabled: payload.broadcastEnabled
    }
  });
}

export async function getLostPetAlert(accessToken: string, alertId: string): Promise<LostPetAlertDetail> {
  return requestWithAuth<LostPetAlertDetail>(`/${alertId}`, accessToken);
}

export async function updateLostPetAlert(
  accessToken: string,
  alertId: string,
  payload: UpdateLostPetAlertPayload
): Promise<LostPetAlertDetail> {
  return requestWithAuth<LostPetAlertDetail>(`/${alertId}`, accessToken, {
    method: "PATCH",
    body: {
      status: payload.status,
      lastSeenAt: payload.lastSeenAt,
      lastSeenLat: payload.lastSeenLat,
      lastSeenLng: payload.lastSeenLng,
      lastSeenAddress: sanitizeText(payload.lastSeenAddress),
      description: sanitizeText(payload.description),
      emergencyNotes: sanitizeText(payload.emergencyNotes),
      medicalPriority: payload.medicalPriority,
      searchRadiusKm: payload.searchRadiusKm,
      broadcastEnabled: payload.broadcastEnabled
    }
  });
}

export async function listLostPetSightings(
  accessToken: string,
  alertId: string
): Promise<LostPetSighting[]> {
  return requestWithAuth<LostPetSighting[]>(`/${alertId}/sightings`, accessToken);
}

export async function createLostPetSighting(
  accessToken: string,
  alertId: string,
  payload: CreateLostPetSightingPayload
): Promise<LostPetSighting> {
  return requestWithAuth<LostPetSighting>(`/${alertId}/sightings`, accessToken, {
    method: "POST",
    body: {
      sightingAt: payload.sightingAt,
      lat: payload.lat,
      lng: payload.lng,
      address: sanitizeText(payload.address),
      comment: sanitizeText(payload.comment),
      photoUrl: sanitizeText(payload.photoUrl)
    }
  });
}

export async function getPublicLostPetAlert(shareToken: string): Promise<LostPetAlertDetail> {
  return requestPublic<LostPetAlertDetail>(`/public/${shareToken}`);
}

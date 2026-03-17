import { AuthApiError } from "@/features/auth/auth-api";
import type { MyProfile } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const PROFILES_BASE_URL = `${API_URL}/api/v1/profiles`;

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

async function requestWithAuth<T>(
  path: string,
  accessToken: string,
  options?: {
    method?: "GET" | "PATCH" | "PUT";
    body?: unknown;
  }
): Promise<T> {
  const response = await fetch(`${PROFILES_BASE_URL}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: options?.body ? JSON.stringify(options.body) : undefined
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiSuccess<T>
    | ApiFailure
    | null;

  if (!response.ok || !payload || !payload.ok) {
    const message = payload && !payload.ok ? payload.error.message : "No se pudo procesar la solicitud";
    throw new AuthApiError(message);
  }

  return payload.data;
}

export async function getMyProfile(accessToken: string): Promise<MyProfile> {
  return requestWithAuth<MyProfile>("/me", accessToken);
}

export async function updateBaseProfile(
  accessToken: string,
  payload: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    city?: string;
  }
): Promise<MyProfile> {
  return requestWithAuth<MyProfile>("/me", accessToken, {
    method: "PATCH",
    body: payload
  });
}

export async function updateOwnerProfile(accessToken: string, payload: Record<string, unknown>) {
  return requestWithAuth<MyProfile>("/me/owner", accessToken, {
    method: "PUT",
    body: payload
  });
}

export async function updateVetProfile(accessToken: string, payload: Record<string, unknown>) {
  return requestWithAuth<MyProfile>("/me/vet", accessToken, {
    method: "PUT",
    body: payload
  });
}

export async function updateCaregiverProfile(accessToken: string, payload: Record<string, unknown>) {
  return requestWithAuth<MyProfile>("/me/caregiver", accessToken, {
    method: "PUT",
    body: payload
  });
}

export async function updateShopProfile(accessToken: string, payload: Record<string, unknown>) {
  return requestWithAuth<MyProfile>("/me/shop", accessToken, {
    method: "PUT",
    body: payload
  });
}

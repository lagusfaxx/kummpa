import { AuthApiError } from "@/features/auth/auth-api";
import type {
  AdminPetItem,
  AdminPetsQuery,
  AdminSummary,
  AdminUserItem,
  AdminUsersQuery
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const ADMIN_BASE_URL = `${API_URL}/api/v1/admin`;

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
  if (value === undefined || value === null || value === "") return;
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

async function requestWithAuth<T>(
  path: string,
  accessToken: string,
  options?: {
    method?: "GET" | "PATCH";
    body?: unknown;
  }
) {
  const response = await fetch(`${ADMIN_BASE_URL}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: options?.body ? JSON.stringify(options.body) : undefined
  });

  return parseResponse<T>(response);
}

export async function getAdminSummary(accessToken: string): Promise<AdminSummary> {
  return requestWithAuth<AdminSummary>("/summary", accessToken);
}

export async function listAdminUsers(
  accessToken: string,
  query: AdminUsersQuery = {}
): Promise<AdminUserItem[]> {
  const params = new URLSearchParams();
  appendIfPresent(params, "q", query.q);
  appendIfPresent(params, "role", query.role);
  appendIfPresent(params, "status", query.status);
  appendIfPresent(params, "limit", query.limit);
  const queryString = params.toString();

  return requestWithAuth<AdminUserItem[]>(queryString ? `/users?${queryString}` : "/users", accessToken);
}

export async function updateAdminUser(
  accessToken: string,
  userId: string,
  payload: {
    deleted?: boolean;
    markEmailVerified?: boolean;
  }
): Promise<AdminUserItem> {
  return requestWithAuth<AdminUserItem>(`/users/${userId}`, accessToken, {
    method: "PATCH",
    body: payload
  });
}

export async function listAdminPets(
  accessToken: string,
  query: AdminPetsQuery = {}
): Promise<AdminPetItem[]> {
  const params = new URLSearchParams();
  appendIfPresent(params, "q", query.q);
  appendIfPresent(params, "ownerId", query.ownerId);
  appendIfPresent(params, "species", query.species);
  appendIfPresent(params, "visibility", query.visibility);
  appendIfPresent(params, "status", query.status);
  appendIfPresent(params, "limit", query.limit);
  const queryString = params.toString();

  return requestWithAuth<AdminPetItem[]>(queryString ? `/pets?${queryString}` : "/pets", accessToken);
}

export async function updateAdminPet(
  accessToken: string,
  petId: string,
  payload: {
    isPublic?: boolean;
    deleted?: boolean;
  }
): Promise<AdminPetItem> {
  return requestWithAuth<AdminPetItem>(`/pets/${petId}`, accessToken, {
    method: "PATCH",
    body: payload
  });
}

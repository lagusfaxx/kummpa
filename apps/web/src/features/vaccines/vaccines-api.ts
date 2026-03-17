import { AuthApiError } from "@/features/auth/auth-api";
import type {
  PetVaccineCard,
  PublicVaccineCard,
  Reminder,
  ReminderWritePayload,
  VaccineRecord,
  VaccineStatus,
  VaccineWritePayload
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const PETS_BASE_URL = `${API_URL}/api/v1/pets`;
const REMINDERS_BASE_URL = `${API_URL}/api/v1/reminders`;

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

async function parseResponse<T>(response: Response): Promise<T> {
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

async function requestWithAuth<T>(
  url: string,
  accessToken: string,
  options?: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
  }
) {
  const response = await fetch(url, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: options?.body ? JSON.stringify(options.body) : undefined
  });

  return parseResponse<T>(response);
}

function sanitizeVaccinePayload(payload: VaccineWritePayload): Record<string, unknown> {
  return {
    vaccineName: payload.vaccineName.trim(),
    appliedAt: payload.appliedAt,
    nextDoseAt: payload.nextDoseAt || undefined,
    lotNumber: payload.lotNumber?.trim() || undefined,
    providerName: payload.providerName?.trim() || undefined,
    notes: payload.notes?.trim() || undefined,
    certificateUrl: payload.certificateUrl?.trim() || undefined
  };
}

function sanitizeReminderPayload(payload: ReminderWritePayload): Record<string, unknown> {
  return {
    type: payload.type,
    title: payload.title.trim(),
    message: payload.message?.trim() || undefined,
    dueAt: payload.dueAt,
    sendEmail: payload.sendEmail,
    sendInApp: payload.sendInApp,
    sendPush: payload.sendPush
  };
}

function sanitizePartialVaccinePayload(payload: Partial<VaccineWritePayload>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (payload.vaccineName !== undefined) data.vaccineName = payload.vaccineName.trim();
  if (payload.appliedAt !== undefined) data.appliedAt = payload.appliedAt;
  if (payload.nextDoseAt !== undefined) data.nextDoseAt = payload.nextDoseAt || undefined;
  if (payload.lotNumber !== undefined) data.lotNumber = payload.lotNumber.trim() || undefined;
  if (payload.providerName !== undefined) data.providerName = payload.providerName.trim() || undefined;
  if (payload.notes !== undefined) data.notes = payload.notes.trim() || undefined;
  if (payload.certificateUrl !== undefined) data.certificateUrl = payload.certificateUrl.trim() || undefined;
  return data;
}

function sanitizePartialReminderPayload(payload: Partial<ReminderWritePayload>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (payload.type !== undefined) data.type = payload.type;
  if (payload.title !== undefined) data.title = payload.title.trim();
  if (payload.message !== undefined) data.message = payload.message.trim() || undefined;
  if (payload.dueAt !== undefined) data.dueAt = payload.dueAt;
  if (payload.sendEmail !== undefined) data.sendEmail = payload.sendEmail;
  if (payload.sendInApp !== undefined) data.sendInApp = payload.sendInApp;
  if (payload.sendPush !== undefined) data.sendPush = payload.sendPush;
  return data;
}

export async function getVaccineCard(accessToken: string, petId: string): Promise<PetVaccineCard> {
  return requestWithAuth<PetVaccineCard>(`${PETS_BASE_URL}/${petId}/vaccine-card`, accessToken);
}

export async function listVaccines(
  accessToken: string,
  petId: string,
  query?: {
    type?: string;
    status?: VaccineStatus;
    from?: string;
    to?: string;
  }
): Promise<VaccineRecord[]> {
  const searchParams = new URLSearchParams();
  if (query?.type) searchParams.set("type", query.type);
  if (query?.status) searchParams.set("status", query.status);
  if (query?.from) searchParams.set("from", query.from);
  if (query?.to) searchParams.set("to", query.to);

  const queryString = searchParams.toString();
  const url = `${PETS_BASE_URL}/${petId}/vaccines${queryString ? `?${queryString}` : ""}`;
  return requestWithAuth<VaccineRecord[]>(url, accessToken);
}

export async function createVaccine(
  accessToken: string,
  petId: string,
  payload: VaccineWritePayload
): Promise<VaccineRecord> {
  return requestWithAuth<VaccineRecord>(`${PETS_BASE_URL}/${petId}/vaccines`, accessToken, {
    method: "POST",
    body: sanitizeVaccinePayload(payload)
  });
}

export async function updateVaccine(
  accessToken: string,
  petId: string,
  vaccineId: string,
  payload: Partial<VaccineWritePayload>
): Promise<VaccineRecord> {
  return requestWithAuth<VaccineRecord>(
    `${PETS_BASE_URL}/${petId}/vaccines/${vaccineId}`,
    accessToken,
    {
      method: "PATCH",
      body: sanitizePartialVaccinePayload(payload)
    }
  );
}

export async function deleteVaccine(accessToken: string, petId: string, vaccineId: string): Promise<void> {
  await requestWithAuth<{ message: string }>(
    `${PETS_BASE_URL}/${petId}/vaccines/${vaccineId}`,
    accessToken,
    {
      method: "DELETE"
    }
  );
}

export async function listReminders(accessToken: string, petId: string): Promise<Reminder[]> {
  return requestWithAuth<Reminder[]>(`${PETS_BASE_URL}/${petId}/reminders`, accessToken);
}

export async function createReminder(
  accessToken: string,
  petId: string,
  payload: ReminderWritePayload
): Promise<Reminder> {
  return requestWithAuth<Reminder>(`${PETS_BASE_URL}/${petId}/reminders`, accessToken, {
    method: "POST",
    body: sanitizeReminderPayload(payload)
  });
}

export async function updateReminder(
  accessToken: string,
  petId: string,
  reminderId: string,
  payload: Partial<ReminderWritePayload>
): Promise<Reminder> {
  return requestWithAuth<Reminder>(
    `${PETS_BASE_URL}/${petId}/reminders/${reminderId}`,
    accessToken,
    {
      method: "PATCH",
      body: sanitizePartialReminderPayload(payload)
    }
  );
}

export async function deleteReminder(
  accessToken: string,
  petId: string,
  reminderId: string
): Promise<void> {
  await requestWithAuth<{ message: string }>(
    `${PETS_BASE_URL}/${petId}/reminders/${reminderId}`,
    accessToken,
    {
      method: "DELETE"
    }
  );
}

export async function getPublicVaccineCard(shareToken: string): Promise<PublicVaccineCard> {
  const response = await fetch(`${PETS_BASE_URL}/public/${shareToken}/vaccine-card`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });

  return parseResponse<PublicVaccineCard>(response);
}

export async function listMyNotifications(
  accessToken: string,
  unreadOnly = false
): Promise<
  Array<{
    id: string;
    title: string;
    body: string;
    metadata?: unknown;
    readAt?: string | null;
    createdAt: string;
  }>
> {
  return requestWithAuth(
    `${REMINDERS_BASE_URL}/notifications/me?unreadOnly=${unreadOnly ? "true" : "false"}`,
    accessToken
  );
}

export async function markNotificationRead(accessToken: string, notificationId: string) {
  await requestWithAuth<{ message: string }>(
    `${REMINDERS_BASE_URL}/notifications/${notificationId}/read`,
    accessToken,
    {
      method: "PATCH"
    }
  );
}

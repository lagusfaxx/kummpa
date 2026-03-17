import { AuthApiError } from "@/features/auth/auth-api";
import type {
  AppointmentListQuery,
  AppointmentRecord,
  CreateAppointmentPayload,
  ProviderAppointmentService,
  ProviderAppointmentServiceWriteItem,
  RescheduleAppointmentPayload,
  ScheduleAvailability,
  ScheduleAvailabilityWriteItem
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const APPOINTMENTS_BASE_URL = `${API_URL}/api/v1/appointments`;

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

function sanitizeText(value?: string): string | undefined {
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
    method?: "GET" | "POST" | "PUT";
    body?: unknown;
  }
) {
  const response = await fetch(`${APPOINTMENTS_BASE_URL}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: options?.body ? JSON.stringify(options.body) : undefined
  });

  return parseResponse<T>(response);
}

export async function listAppointments(
  accessToken: string,
  query: AppointmentListQuery = {}
): Promise<AppointmentRecord[]> {
  const params = new URLSearchParams();
  if (query.view) params.set("view", query.view);
  if (query.status && query.status.length > 0) params.set("status", query.status.join(","));
  if (query.petId) params.set("petId", query.petId);
  if (query.providerType) params.set("providerType", query.providerType);
  if (query.providerSourceId) params.set("providerSourceId", query.providerSourceId);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.limit) params.set("limit", String(query.limit));

  const queryString = params.toString();
  return requestWithAuth<AppointmentRecord[]>(queryString ? `/?${queryString}` : "/", accessToken);
}

export async function getAppointment(accessToken: string, appointmentId: string): Promise<AppointmentRecord> {
  return requestWithAuth<AppointmentRecord>(`/${appointmentId}`, accessToken);
}

export async function createAppointment(
  accessToken: string,
  payload: CreateAppointmentPayload
): Promise<AppointmentRecord> {
  return requestWithAuth<AppointmentRecord>("/", accessToken, {
    method: "POST",
    body: {
      petId: payload.petId,
      appointmentServiceId: sanitizeText(payload.appointmentServiceId),
      providerType: payload.providerType,
      providerUserId: sanitizeText(payload.providerUserId),
      providerSourceId: sanitizeText(payload.providerSourceId),
      providerName: sanitizeText(payload.providerName),
      serviceType: payload.serviceType,
      scheduledAt: payload.scheduledAt,
      durationMinutes: payload.durationMinutes,
      reason: sanitizeText(payload.reason),
      notes: sanitizeText(payload.notes)
    }
  });
}

export async function confirmAppointment(
  accessToken: string,
  appointmentId: string
): Promise<AppointmentRecord> {
  return requestWithAuth<AppointmentRecord>(`/${appointmentId}/confirm`, accessToken, {
    method: "POST"
  });
}

export async function rejectAppointment(
  accessToken: string,
  appointmentId: string,
  reason?: string
): Promise<AppointmentRecord> {
  return requestWithAuth<AppointmentRecord>(`/${appointmentId}/reject`, accessToken, {
    method: "POST",
    body: {
      reason: sanitizeText(reason)
    }
  });
}

export async function cancelAppointment(
  accessToken: string,
  appointmentId: string,
  reason?: string
): Promise<AppointmentRecord> {
  return requestWithAuth<AppointmentRecord>(`/${appointmentId}/cancel`, accessToken, {
    method: "POST",
    body: {
      reason: sanitizeText(reason)
    }
  });
}

export async function completeAppointment(
  accessToken: string,
  appointmentId: string
): Promise<AppointmentRecord> {
  return requestWithAuth<AppointmentRecord>(`/${appointmentId}/complete`, accessToken, {
    method: "POST"
  });
}

export async function rescheduleAppointment(
  accessToken: string,
  appointmentId: string,
  payload: RescheduleAppointmentPayload
): Promise<AppointmentRecord> {
  return requestWithAuth<AppointmentRecord>(`/${appointmentId}/reschedule`, accessToken, {
    method: "POST",
    body: {
      scheduledAt: payload.scheduledAt,
      durationMinutes: payload.durationMinutes,
      reason: sanitizeText(payload.reason),
      notes: sanitizeText(payload.notes)
    }
  });
}

export async function listProviderAvailability(
  accessToken: string,
  includeInactive = false
): Promise<ScheduleAvailability[]> {
  return requestWithAuth<ScheduleAvailability[]>(
    `/provider/availability?includeInactive=${includeInactive ? "true" : "false"}`,
    accessToken
  );
}

export async function replaceProviderAvailability(
  accessToken: string,
  items: ScheduleAvailabilityWriteItem[]
): Promise<ScheduleAvailability[]> {
  return requestWithAuth<ScheduleAvailability[]>(`/provider/availability`, accessToken, {
    method: "PUT",
    body: {
      items: items.map((item) => ({
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime,
        endTime: item.endTime,
        serviceType: item.serviceType ?? undefined,
        timezone: sanitizeText(item.timezone) ?? "America/Santiago",
        isActive: item.isActive
      }))
    }
  });
}

export async function listProviderAppointmentServices(
  accessToken: string,
  includeInactive = false
): Promise<ProviderAppointmentService[]> {
  return requestWithAuth<ProviderAppointmentService[]>(
    `/provider/services?includeInactive=${includeInactive ? "true" : "false"}`,
    accessToken
  );
}

export async function replaceProviderAppointmentServices(
  accessToken: string,
  items: ProviderAppointmentServiceWriteItem[]
): Promise<ProviderAppointmentService[]> {
  return requestWithAuth<ProviderAppointmentService[]>(`/provider/services`, accessToken, {
    method: "PUT",
    body: {
      items: items.map((item) => ({
        title: item.title.trim(),
        description: sanitizeText(item.description),
        serviceType: item.serviceType,
        durationMinutes: item.durationMinutes,
        priceCents: item.priceCents,
        currencyCode: sanitizeText(item.currencyCode)?.toUpperCase() ?? "CLP",
        isActive: item.isActive,
        sortOrder: item.sortOrder
      }))
    }
  });
}

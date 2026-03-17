const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface BusinessServiceItem {
  id: string;
  providerUserId: string;
  title: string;
  serviceType: string;
  durationMinutes: number;
  priceCents: number | null;
  isActive: boolean;
}

export interface PromotionItem {
  id: string;
  title: string;
  discountLabel: string | null;
  isActive: boolean;
}

export interface ScheduleSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

async function businessFetch<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${API_URL}/api/v1/business${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });
  const payload = await response.json();
  if (!response.ok || !payload?.ok) throw new Error(payload?.error?.message ?? "No se pudo cargar panel");
  return payload.data as T;
}

export async function getBusinessDashboard(accessToken: string) {
  return businessFetch("/dashboard", accessToken);
}

export async function getBusinessServices(accessToken: string) {
  return businessFetch<BusinessServiceItem[]>("/services", accessToken);
}

export async function getBusinessPromotions(accessToken: string) {
  return businessFetch<PromotionItem[]>("/promotions", accessToken);
}

export async function getBusinessSchedule(accessToken: string) {
  return businessFetch<ScheduleSlot[]>("/schedule", accessToken);
}

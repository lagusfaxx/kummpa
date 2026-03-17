const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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
  return businessFetch<any[]>("/services", accessToken);
}

export async function getBusinessPromotions(accessToken: string) {
  return businessFetch<any[]>("/promotions", accessToken);
}

export async function getBusinessSchedule(accessToken: string) {
  return businessFetch<any[]>("/schedule", accessToken);
}

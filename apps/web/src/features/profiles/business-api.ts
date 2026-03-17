const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function getBusinessDashboard(accessToken: string) {
  const response = await fetch(`${API_URL}/api/v1/business/dashboard`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });
  const payload = await response.json();
  if (!response.ok || !payload?.ok) throw new Error(payload?.error?.message ?? "No se pudo cargar panel");
  return payload.data;
}

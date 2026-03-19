const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface PublicShop {
  id: string;
  userId: string;
  businessName: string | null;
  logoUrl: string | null;
  description: string | null;
  address: string | null;
  district: string | null;
  city: string | null;
  latitude: string | null;
  longitude: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  openingHours: Record<string, string> | null;
  basicCatalog: unknown | null;
  discounts: unknown | null;
  user: { id: string; firstName: string | null; lastName: string | null };
}

interface ApiSuccess<T> { ok: true; data: T; }
interface ApiFailure { ok: false; error: { message: string }; }

async function req<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json()) as ApiSuccess<T> | ApiFailure;
  if (!json.ok) throw new Error(json.error.message);
  return json.data;
}

export async function listPublicShops(opts?: {
  city?: string;
  district?: string;
  limit?: number;
}): Promise<PublicShop[]> {
  const p = new URLSearchParams();
  if (opts?.city) p.set("city", opts.city);
  if (opts?.district) p.set("district", opts.district);
  if (opts?.limit) p.set("limit", String(opts.limit));
  return req<PublicShop[]>(`${API_URL}/api/v1/profiles/shops?${p}`);
}

export async function getPublicShop(userId: string): Promise<PublicShop> {
  return req<PublicShop>(`${API_URL}/api/v1/profiles/shops/${userId}`);
}

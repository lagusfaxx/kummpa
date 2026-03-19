import type { CreateOrderPayload, Order, OrderStatus } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const BASE = `${API_URL}/api/v1/orders`;

async function request<T>(
  path: string,
  accessToken: string,
  options?: { method?: string; body?: unknown }
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  const json = (await res.json().catch(() => null)) as
    | { ok: true; data: T }
    | { ok: false; error: { message: string } }
    | null;
  if (!res.ok || !json?.ok) {
    const msg =
      json && !json.ok ? json.error.message : "No se pudo procesar la solicitud";
    throw new Error(msg);
  }
  return json.data;
}

export async function createOrder(
  accessToken: string,
  payload: CreateOrderPayload
): Promise<Order> {
  return request<Order>("", accessToken, { method: "POST", body: payload });
}

export async function listOrders(
  accessToken: string,
  params: { role?: "buyer" | "seller"; status?: OrderStatus; limit?: number } = {}
): Promise<Order[]> {
  const qs = new URLSearchParams();
  if (params.role) qs.set("role", params.role);
  if (params.status) qs.set("status", params.status);
  if (params.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return request<Order[]>(query ? `?${query}` : "", accessToken);
}

export async function getOrder(
  accessToken: string,
  orderId: string
): Promise<Order> {
  return request<Order>(`/${orderId}`, accessToken);
}

export async function updateOrderStatus(
  accessToken: string,
  orderId: string,
  status: OrderStatus
): Promise<Order> {
  return request<Order>(`/${orderId}/status`, accessToken, {
    method: "PATCH",
    body: { status },
  });
}

export type OrderStatus = "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export type DeliveryType = "PICKUP" | "DELIVERY";

export interface OrderItem {
  id: string;
  listingId: string | null;
  title: string;
  priceCents: number;
  quantity: number;
  photoUrl: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  buyerId: string;
  sellerId: string;
  status: OrderStatus;
  deliveryType: DeliveryType;
  deliveryAddress: string | null;
  notes: string | null;
  totalCents: number;
  createdAt: string;
  updatedAt: string;
  buyer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
  };
  seller: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  items: OrderItem[];
}

export interface CreateOrderPayload {
  items: { listingId: string; quantity: number }[];
  deliveryType: DeliveryType;
  deliveryAddress?: string;
  notes?: string;
}

import type { MarketplaceListing, Order, OrderItem, OrderStatus, Prisma, User } from "@prisma/client";
import { HttpError } from "../../lib/http-error";
import { prisma } from "../../lib/prisma";
import type { CreateOrderInput } from "./orders.schemas";

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-5);
  const rnd = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `KP-${ts}${rnd}`;
}

type OrderWithRelations = Order & {
  buyer: Pick<User, "id" | "firstName" | "lastName" | "email" | "phone">;
  seller: Pick<User, "id" | "firstName" | "lastName" | "email">;
  items: OrderItem[];
};

function serializeOrder(order: OrderWithRelations) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    status: order.status,
    deliveryType: order.deliveryType,
    deliveryAddress: order.deliveryAddress,
    notes: order.notes,
    totalCents: order.totalCents,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    buyer: {
      id: order.buyer.id,
      firstName: order.buyer.firstName,
      lastName: order.buyer.lastName,
      email: order.buyer.email,
      phone: order.buyer.phone,
    },
    seller: {
      id: order.seller.id,
      firstName: order.seller.firstName,
      lastName: order.seller.lastName,
      email: order.seller.email,
    },
    items: order.items.map((item) => ({
      id: item.id,
      listingId: item.listingId,
      title: item.title,
      priceCents: item.priceCents,
      quantity: item.quantity,
      photoUrl: item.photoUrl,
    })),
  };
}

const ORDER_INCLUDE = {
  buyer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
  seller: { select: { id: true, firstName: true, lastName: true, email: true } },
  items: true,
} satisfies Prisma.OrderInclude;

export async function createOrder(buyerId: string, input: CreateOrderInput) {
  const { items, deliveryType, deliveryAddress, notes } = input;

  const listingIds = items.map((i) => i.listingId);
  const listings = await prisma.marketplaceListing.findMany({
    where: { id: { in: listingIds }, deletedAt: null, isActive: true },
  });

  if (listings.length !== listingIds.length) {
    throw new HttpError(
      400,
      "Uno o más productos no están disponibles. Actualiza tu carrito."
    );
  }

  const sellerIds = new Set(listings.map((l) => l.sellerId));
  if (sellerIds.size > 1) {
    throw new HttpError(
      400,
      "No puedes mezclar productos de distintas tiendas en un mismo pedido."
    );
  }

  const sellerId = listings[0]!.sellerId;

  if (sellerId === buyerId) {
    throw new HttpError(400, "No puedes comprar tus propios productos.");
  }

  const listingMap = new Map<string, MarketplaceListing>(
    listings.map((l) => [l.id, l])
  );

  for (const item of items) {
    const listing = listingMap.get(item.listingId)!;
    if (listing.stockQuantity !== null && listing.stockQuantity < item.quantity) {
      throw new HttpError(
        400,
        `Stock insuficiente para "${listing.title}". Disponible: ${listing.stockQuantity}.`
      );
    }
  }

  let totalCents = 0;
  for (const item of items) {
    totalCents += listingMap.get(item.listingId)!.priceCents * item.quantity;
  }

  let orderNumber = generateOrderNumber();
  let attempts = 0;
  while (attempts < 5) {
    const exists = await prisma.order.findUnique({ where: { orderNumber } });
    if (!exists) break;
    orderNumber = generateOrderNumber();
    attempts++;
  }

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        buyerId,
        sellerId,
        deliveryType,
        deliveryAddress: deliveryAddress ?? null,
        notes: notes ?? null,
        totalCents,
        status: "PENDING",
        items: {
          create: items.map((item) => {
            const listing = listingMap.get(item.listingId)!;
            return {
              listingId: item.listingId,
              title: listing.title,
              priceCents: listing.priceCents,
              quantity: item.quantity,
              photoUrl: listing.photoUrls[0] ?? null,
            };
          }),
        },
      },
      include: ORDER_INCLUDE,
    });

    for (const item of items) {
      const listing = listingMap.get(item.listingId)!;
      if (listing.stockQuantity !== null) {
        const result = await tx.marketplaceListing.updateMany({
          where: {
            id: item.listingId,
            stockQuantity: { gte: item.quantity },
          },
          data: { stockQuantity: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          throw new HttpError(
            400,
            `Stock insuficiente para "${listing.title}". Por favor actualiza tu carrito.`
          );
        }
      }
    }

    return created;
  });

  return serializeOrder(order as OrderWithRelations);
}

export async function listOrders(
  userId: string,
  role: "buyer" | "seller",
  status?: OrderStatus,
  limit = 50
) {
  const where: Prisma.OrderWhereInput =
    role === "buyer"
      ? { buyerId: userId, ...(status ? { status } : {}) }
      : { sellerId: userId, ...(status ? { status } : {}) };

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: ORDER_INCLUDE,
  });

  return orders.map((o) => serializeOrder(o as OrderWithRelations));
}

export async function getOrder(orderId: string, requestUserId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: ORDER_INCLUDE,
  });
  if (!order) throw new HttpError(404, "Pedido no encontrado.");
  if (order.buyerId !== requestUserId && order.sellerId !== requestUserId) {
    throw new HttpError(403, "No tienes acceso a este pedido.");
  }
  return serializeOrder(order as OrderWithRelations);
}

export async function updateOrderStatus(
  orderId: string,
  requestUserId: string,
  newStatus: OrderStatus
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: ORDER_INCLUDE,
  });
  if (!order) throw new HttpError(404, "Pedido no encontrado.");

  if (newStatus === "CANCELLED") {
    if (order.buyerId !== requestUserId && order.sellerId !== requestUserId) {
      throw new HttpError(403, "No tienes acceso a este pedido.");
    }
    if (order.status === "DELIVERED" || order.status === "SHIPPED") {
      throw new HttpError(400, "No se puede cancelar un pedido ya enviado o entregado.");
    }
  } else {
    if (order.sellerId !== requestUserId) {
      throw new HttpError(403, "Solo la tienda puede actualizar este estado.");
    }
    const validTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      PENDING: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["SHIPPED", "CANCELLED"],
      SHIPPED: ["DELIVERED"],
    };
    const allowed = validTransitions[order.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new HttpError(
        400,
        `No se puede cambiar de ${order.status} a ${newStatus}.`
      );
    }
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus },
    include: ORDER_INCLUDE,
  });

  return serializeOrder(updated as OrderWithRelations);
}

import { DeliveryType, OrderStatus } from "@prisma/client";
import { z } from "zod";

export const createOrderSchema = z
  .object({
    items: z
      .array(
        z.object({
          listingId: z.string().cuid(),
          quantity: z.number().int().min(1).max(100),
        })
      )
      .min(1)
      .max(50),
    deliveryType: z.nativeEnum(DeliveryType),
    deliveryAddress: z.string().trim().max(500).optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine(
    (data) =>
      !(data.deliveryType === "DELIVERY" && !data.deliveryAddress?.trim()),
    { message: "Se requiere dirección de despacho para delivery" }
  );

export const orderParamsSchema = z.object({
  orderId: z.string().cuid(),
});

export const patchOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus).refine(
    (s) => ["CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"].includes(s),
    { message: "Estado inválido" }
  ),
});

export const listOrdersQuerySchema = z.object({
  role: z.enum(["buyer", "seller"]).default("buyer"),
  status: z.nativeEnum(OrderStatus).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderParamsInput = z.infer<typeof orderParamsSchema>;
export type PatchOrderStatusInput = z.infer<typeof patchOrderStatusSchema>;
export type ListOrdersQueryInput = z.infer<typeof listOrdersQuerySchema>;

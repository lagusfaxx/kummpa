import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validate-request";
import {
  createOrderSchema,
  listOrdersQuerySchema,
  orderParamsSchema,
  patchOrderStatusSchema,
  type CreateOrderInput,
  type ListOrdersQueryInput,
  type OrderParamsInput,
  type PatchOrderStatusInput,
} from "./orders.schemas";
import {
  createOrder,
  getOrder,
  listOrders,
  updateOrderStatus,
} from "./orders.service";

export const ordersRouter = Router();

ordersRouter.post(
  "/",
  asyncHandler(requireAuth),
  validateRequest(createOrderSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as CreateOrderInput;
    const data = await createOrder(req.authUser!.id, input);
    res.status(201).json({ ok: true, data });
  })
);

ordersRouter.get(
  "/",
  asyncHandler(requireAuth),
  validateRequest(listOrdersQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListOrdersQueryInput;
    const data = await listOrders(
      req.authUser!.id,
      query.role,
      query.status,
      query.limit
    );
    res.status(200).json({ ok: true, data });
  })
);

ordersRouter.get(
  "/:orderId",
  asyncHandler(requireAuth),
  validateRequest(orderParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const { orderId } = req.params as unknown as OrderParamsInput;
    const data = await getOrder(orderId, req.authUser!.id);
    res.status(200).json({ ok: true, data });
  })
);

ordersRouter.patch(
  "/:orderId/status",
  asyncHandler(requireAuth),
  validateRequest(orderParamsSchema, "params"),
  validateRequest(patchOrderStatusSchema),
  asyncHandler(async (req, res) => {
    const { orderId } = req.params as unknown as OrderParamsInput;
    const { status } = req.body as PatchOrderStatusInput;
    const data = await updateOrderStatus(orderId, req.authUser!.id, status);
    res.status(200).json({ ok: true, data });
  })
);

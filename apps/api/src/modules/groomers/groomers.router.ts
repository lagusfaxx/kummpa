import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validate-request";
import {
  groomerParamsSchema,
  listGroomersQuerySchema,
  updateGroomerProfileSchema,
  type GroomerParamsInput,
  type ListGroomersQueryInput,
  type UpdateGroomerProfileInput
} from "./groomers.schemas";
import {
  getGroomerById,
  getMyGroomerProfile,
  listGroomers,
  updateMyGroomerProfile
} from "./groomers.service";

export const groomersRouter = Router();

groomersRouter.get(
  "/",
  validateRequest(listGroomersQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListGroomersQueryInput;
    const data = await listGroomers(query);

    res.status(200).json({ ok: true, data });
  })
);

groomersRouter.get(
  "/me",
  asyncHandler(requireAuth),
  requireRoles("GROOMING", "ADMIN"),
  asyncHandler(async (req, res) => {
    const data = await getMyGroomerProfile(req.authUser!.id);

    res.status(200).json({ ok: true, data });
  })
);

groomersRouter.put(
  "/me",
  asyncHandler(requireAuth),
  requireRoles("GROOMING", "ADMIN"),
  validateRequest(updateGroomerProfileSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as UpdateGroomerProfileInput;
    const data = await updateMyGroomerProfile(req.authUser!.id, payload);

    res.status(200).json({ ok: true, data });
  })
);

groomersRouter.get(
  "/:groomerId",
  validateRequest(groomerParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const { groomerId } = req.params as unknown as GroomerParamsInput;
    const data = await getGroomerById(groomerId);

    res.status(200).json({ ok: true, data });
  })
);

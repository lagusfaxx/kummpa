import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validate-request";
import {
  createGroomerSchema,
  groomerParamsSchema,
  listGroomersQuerySchema,
  patchGroomerSchema,
  updateGroomerProfileSchema,
  type CreateGroomerInput,
  type GroomerParamsInput,
  type ListGroomersQueryInput,
  type PatchGroomerInput,
  type UpdateGroomerProfileInput
} from "./groomers.schemas";
import {
  createGroomerProfile,
  getGroomerById,
  getGroomerPublicAvailability,
  getGroomerPublicServices,
  getMyGroomerProfile,
  listGroomers,
  patchGroomerById,
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

groomersRouter.post(
  "/",
  asyncHandler(requireAuth),
  requireRoles("GROOMING", "ADMIN"),
  validateRequest(createGroomerSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as CreateGroomerInput;
    const data = await createGroomerProfile(payload, req.authUser!.id, req.authUser!.role);

    res.status(201).json({ ok: true, data });
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
  "/:groomerId/services",
  validateRequest(groomerParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const { groomerId } = req.params as unknown as GroomerParamsInput;
    const data = await getGroomerPublicServices(groomerId);
    res.status(200).json({ ok: true, data });
  })
);

groomersRouter.get(
  "/:groomerId/availability",
  validateRequest(groomerParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const { groomerId } = req.params as unknown as GroomerParamsInput;
    const data = await getGroomerPublicAvailability(groomerId);
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

groomersRouter.patch(
  "/:groomerId",
  asyncHandler(requireAuth),
  requireRoles("GROOMING", "ADMIN"),
  validateRequest(groomerParamsSchema, "params"),
  validateRequest(patchGroomerSchema),
  asyncHandler(async (req, res) => {
    const { groomerId } = req.params as unknown as GroomerParamsInput;
    const payload = req.body as PatchGroomerInput;
    const data = await patchGroomerById(groomerId, payload, req.authUser!.id, req.authUser!.role);

    res.status(200).json({ ok: true, data });
  })
);

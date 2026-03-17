import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validate-request";
import {
  adminPetParamsSchema,
  adminUserParamsSchema,
  listAdminPetsQuerySchema,
  listAdminUsersQuerySchema,
  updateAdminPetSchema,
  updateAdminUserSchema,
  type ListAdminPetsQueryInput,
  type ListAdminUsersQueryInput,
  type UpdateAdminPetInput,
  type UpdateAdminUserInput
} from "./admin.schemas";
import {
  getAdminSummary,
  listAdminPets,
  listAdminUsers,
  updateAdminPet,
  updateAdminUser
} from "./admin.service";

export const adminRouter = Router();

adminRouter.use(asyncHandler(requireAuth), requireRoles("ADMIN"));

adminRouter.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const data = await getAdminSummary();
    res.status(200).json({
      ok: true,
      data
    });
  })
);

adminRouter.get(
  "/users",
  validateRequest(listAdminUsersQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListAdminUsersQueryInput;
    const data = await listAdminUsers(query);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

adminRouter.patch(
  "/users/:userId",
  validateRequest(adminUserParamsSchema, "params"),
  validateRequest(updateAdminUserSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { userId: string };
    const payload = req.body as UpdateAdminUserInput;
    const data = await updateAdminUser(req.authUser!.id, params.userId, payload);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

adminRouter.get(
  "/pets",
  validateRequest(listAdminPetsQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListAdminPetsQueryInput;
    const data = await listAdminPets(query);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

adminRouter.patch(
  "/pets/:petId",
  validateRequest(adminPetParamsSchema, "params"),
  validateRequest(updateAdminPetSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { petId: string };
    const payload = req.body as UpdateAdminPetInput;
    const data = await updateAdminPet(params.petId, payload);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validate-request";
import {
  updateBaseProfileSchema,
  updateCaregiverProfileSchema,
  updateOwnerProfileSchema,
  updateShopProfileSchema,
  updateVetProfileSchema,
  type UpdateBaseProfileInput,
  type UpdateCaregiverProfileInput,
  type UpdateOwnerProfileInput,
  type UpdateShopProfileInput,
  type UpdateVetProfileInput
} from "./profiles.schemas";
import {
  getMyProfile,
  getPublicShopByUserId,
  listPublicShops,
  updateBaseProfile,
  updateCaregiverProfile,
  updateOwnerProfile,
  updateShopProfile,
  updateVetProfile
} from "./profiles.service";

export const profilesRouter = Router();

profilesRouter.get(
  "/me",
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    const data = await getMyProfile(req.authUser!.id);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

profilesRouter.patch(
  "/me",
  asyncHandler(requireAuth),
  validateRequest(updateBaseProfileSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as UpdateBaseProfileInput;
    const data = await updateBaseProfile(req.authUser!.id, payload);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

profilesRouter.put(
  "/me/owner",
  asyncHandler(requireAuth),
  requireRoles("OWNER", "ADMIN"),
  validateRequest(updateOwnerProfileSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as UpdateOwnerProfileInput;
    const data = await updateOwnerProfile(req.authUser!.id, payload);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

profilesRouter.put(
  "/me/vet",
  asyncHandler(requireAuth),
  requireRoles("VET", "ADMIN"),
  validateRequest(updateVetProfileSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as UpdateVetProfileInput;
    const data = await updateVetProfile(req.authUser!.id, payload);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

profilesRouter.put(
  "/me/caregiver",
  asyncHandler(requireAuth),
  requireRoles("CAREGIVER", "ADMIN"),
  validateRequest(updateCaregiverProfileSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as UpdateCaregiverProfileInput;
    const data = await updateCaregiverProfile(req.authUser!.id, payload);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

profilesRouter.put(
  "/me/shop",
  asyncHandler(requireAuth),
  requireRoles("SHOP", "ADMIN"),
  validateRequest(updateShopProfileSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as UpdateShopProfileInput;
    const data = await updateShopProfile(req.authUser!.id, payload);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

/* ─── Public shop directory (no auth required) ─────────────────── */
profilesRouter.get(
  "/shops",
  asyncHandler(async (req, res) => {
    const { city, district, limit, offset } = req.query as Record<string, string | undefined>;
    const data = await listPublicShops({
      city: city || undefined,
      district: district || undefined,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 50,
      offset: offset ? parseInt(offset, 10) : 0
    });
    res.json({ ok: true, data });
  })
);

profilesRouter.get(
  "/shops/:userId",
  asyncHandler(async (req, res) => {
    const data = await getPublicShopByUserId(req.params.userId!);
    res.json({ ok: true, data });
  })
);

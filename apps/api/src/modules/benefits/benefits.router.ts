import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validate-request";
import {
  benefitParamsSchema,
  createBenefitSchema,
  listBenefitsQuerySchema,
  listMyRedemptionsQuerySchema,
  updateBenefitSchema,
  type CreateBenefitInput,
  type ListBenefitsQueryInput,
  type ListMyRedemptionsQueryInput,
  type UpdateBenefitInput
} from "./benefits.schemas";
import {
  createBenefit,
  getBenefitById,
  listBenefits,
  listMyRedemptions,
  listSavedBenefits,
  redeemBenefit,
  saveBenefit,
  unsaveBenefit,
  updateBenefit
} from "./benefits.service";

export const benefitsRouter = Router();

benefitsRouter.get(
  "/",
  asyncHandler(requireAuth),
  validateRequest(listBenefitsQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListBenefitsQueryInput;
    const data = await listBenefits(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      query
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

benefitsRouter.get(
  "/saved",
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    const data = await listSavedBenefits(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      80
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

benefitsRouter.get(
  "/redemptions/me",
  asyncHandler(requireAuth),
  validateRequest(listMyRedemptionsQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListMyRedemptionsQueryInput;
    const data = await listMyRedemptions(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      query
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

benefitsRouter.get(
  "/:benefitId",
  asyncHandler(requireAuth),
  validateRequest(benefitParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { benefitId: string };
    const data = await getBenefitById(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.benefitId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

benefitsRouter.post(
  "/:benefitId/save",
  asyncHandler(requireAuth),
  validateRequest(benefitParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { benefitId: string };
    const data = await saveBenefit(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.benefitId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

benefitsRouter.delete(
  "/:benefitId/save",
  asyncHandler(requireAuth),
  validateRequest(benefitParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { benefitId: string };
    const data = await unsaveBenefit(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.benefitId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

benefitsRouter.post(
  "/:benefitId/redeem",
  asyncHandler(requireAuth),
  validateRequest(benefitParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { benefitId: string };
    const data = await redeemBenefit(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.benefitId
    );

    res.status(201).json({
      ok: true,
      data
    });
  })
);

benefitsRouter.post(
  "/",
  asyncHandler(requireAuth),
  requireRoles("ADMIN"),
  validateRequest(createBenefitSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as CreateBenefitInput;
    const data = await createBenefit(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      payload
    );

    res.status(201).json({
      ok: true,
      data
    });
  })
);

benefitsRouter.patch(
  "/:benefitId",
  asyncHandler(requireAuth),
  requireRoles("ADMIN"),
  validateRequest(benefitParamsSchema, "params"),
  validateRequest(updateBenefitSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { benefitId: string };
    const payload = req.body as UpdateBenefitInput;
    const data = await updateBenefit(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.benefitId,
      payload
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

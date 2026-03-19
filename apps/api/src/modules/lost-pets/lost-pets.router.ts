import { Router } from "express";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import multer from "multer";
import path from "node:path";
import { UPLOADS_DIR } from "../../config/uploads";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validate-request";
import {
  createLostPetAlertSchema,
  createLostPetSightingSchema,
  listLostPetAlertsQuerySchema,
  nearbyLostPetAlertsQuerySchema,
  lostPetAlertParamsSchema,
  lostPetPublicParamsSchema,
  type CreateLostPetAlertInput,
  type CreateLostPetSightingInput,
  type ListLostPetAlertsQueryInput,
  type NearbyLostPetAlertsQueryInput,
  updateLostPetAlertSchema,
  type UpdateLostPetAlertInput
} from "./lost-pets.schemas";
import {
  createLostPetAlert,
  createLostPetSighting,
  getLostPetAlertById,
  getPublicLostPetAlertByShareToken,
  listLostPetAlerts,
  listNearbyLostPetAlerts,
  listLostPetSightings,
  updateLostPetAlert
} from "./lost-pets.service";

const sightingsUploadDir = path.join(UPLOADS_DIR, "sightings");
if (!fs.existsSync(sightingsUploadDir)) {
  fs.mkdirSync(sightingsUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, sightingsUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${randomUUID()}${ext}`);
  }
});

const photoUpload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten imagenes"));
    }
  }
});

export const lostPetsRouter = Router();

lostPetsRouter.get(
  "/public/:shareToken",
  validateRequest(lostPetPublicParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { shareToken: string };
    const data = await getPublicLostPetAlertByShareToken(params.shareToken);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

lostPetsRouter.get(
  "/",
  asyncHandler(requireAuth),
  validateRequest(listLostPetAlertsQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListLostPetAlertsQueryInput;
    const data = await listLostPetAlerts(
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

lostPetsRouter.post(
  "/report",
  asyncHandler(requireAuth),
  validateRequest(createLostPetAlertSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as CreateLostPetAlertInput;
    const data = await createLostPetAlert(
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

lostPetsRouter.get(
  "/nearby",
  asyncHandler(requireAuth),
  validateRequest(nearbyLostPetAlertsQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as NearbyLostPetAlertsQueryInput;
    const data = await listNearbyLostPetAlerts({
      lat: query.lat,
      lng: query.lng,
      radiusKm: query.radiusKm,
      limit: query.limit
    });

    res.status(200).json({
      ok: true,
      data
    });
  })
);

lostPetsRouter.get(
  "/:alertId",
  asyncHandler(requireAuth),
  validateRequest(lostPetAlertParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { alertId: string };
    const data = await getLostPetAlertById(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.alertId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

lostPetsRouter.patch(
  "/:alertId",
  asyncHandler(requireAuth),
  validateRequest(lostPetAlertParamsSchema, "params"),
  validateRequest(updateLostPetAlertSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { alertId: string };
    const payload = req.body as UpdateLostPetAlertInput;
    const data = await updateLostPetAlert(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.alertId,
      payload
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

lostPetsRouter.get(
  "/:alertId/sightings",
  asyncHandler(requireAuth),
  validateRequest(lostPetAlertParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { alertId: string };
    const data = await listLostPetSightings(params.alertId);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

lostPetsRouter.post(
  "/:alertId/sightings",
  asyncHandler(requireAuth),
  validateRequest(lostPetAlertParamsSchema, "params"),
  validateRequest(createLostPetSightingSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { alertId: string };
    const payload = req.body as CreateLostPetSightingInput;
    const data = await createLostPetSighting(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.alertId,
      payload
    );

    res.status(201).json({
      ok: true,
      data
    });
  })
);

lostPetsRouter.post(
  "/:alertId/sightings/upload-photo",
  asyncHandler(requireAuth),
  validateRequest(lostPetAlertParamsSchema, "params"),
  photoUpload.single("photo"),
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ ok: false, error: { message: "No se recibio ningun archivo." } });
      return;
    }
    const url = `/api/v1/files/sightings/${file.filename}`;
    res.status(201).json({ ok: true, data: { url } });
  })
);

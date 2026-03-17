import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validate-request";
import {
  createReminderSchema,
  petReminderParamsSchema,
  reminderParamsSchema,
  updateReminderSchema,
  type CreateReminderInput,
  type UpdateReminderInput
} from "../reminders/reminders.schemas";
import {
  createPetReminder,
  deletePetReminder,
  listPetReminders,
  updatePetReminder
} from "../reminders/reminders.service";
import {
  createPetSchema,
  petIdentityParamsSchema,
  petIdParamsSchema,
  publicPetParamsSchema,
  publicIdentityParamsSchema,
  updatePetPublicProfileSchema,
  updatePetIdentitySchema,
  updatePetSchema,
  updatePetVisibilitySchema,
  type CreatePetInput,
  type UpdatePetPublicProfileInput,
  type UpdatePetIdentityInput,
  type UpdatePetInput,
  type UpdatePetVisibilityInput
} from "./pets.schemas";
import {
  createVaccineSchema,
  vaccineListQuerySchema,
  vaccineParamsSchema,
  updateVaccineSchema,
  type CreateVaccineInput,
  type UpdateVaccineInput,
  type VaccineListQueryInput
} from "./vaccines.schemas";
import {
  createPetVaccine,
  deletePetVaccine,
  getPetVaccineCard,
  getPublicVaccineCardByShareToken,
  listPetVaccines,
  updatePetVaccine
} from "./vaccines.service";
import {
  createPet,
  getEmergencyPublicIdentityByToken,
  getPetPublicIdentityByPetId,
  getPetPublicProfileByPetId,
  getPublicPetByShareToken,
  getUserPetById,
  listUserPets,
  softDeletePet,
  updatePetPublicProfile,
  updatePetPublicIdentity,
  updatePet,
  updatePetVisibility
} from "./pets.service";

export const petsRouter = Router();

petsRouter.get(
  "/public-identity/:publicToken",
  validateRequest(publicIdentityParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { publicToken: string };
    const data = await getEmergencyPublicIdentityByToken(params.publicToken);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

petsRouter.get(
  "/public/:shareToken/vaccine-card",
  validateRequest(publicPetParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { shareToken: string };
    const data = await getPublicVaccineCardByShareToken(params.shareToken);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

petsRouter.get(
  "/public/:shareToken",
  validateRequest(publicPetParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { shareToken: string };
    const data = await getPublicPetByShareToken(params.shareToken);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

petsRouter.get(
  "/",
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    const data = await listUserPets(req.authUser!.id);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

petsRouter.post(
  "/",
  asyncHandler(requireAuth),
  validateRequest(createPetSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as CreatePetInput;
    const data = await createPet(req.authUser!.id, payload);

    res.status(201).json({
      ok: true,
      data
    });
  })
);

petsRouter.get(
  "/:id/identity",
  asyncHandler(requireAuth),
  validateRequest(petIdentityParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { id: string };
    const data = await getPetPublicIdentityByPetId(req.authUser!.id, params.id);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

petsRouter.put(
  "/:id/public-profile",
  asyncHandler(requireAuth),
  validateRequest(petIdentityParamsSchema, "params"),
  validateRequest(updatePetPublicProfileSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { id: string };
    const payload = req.body as UpdatePetPublicProfileInput;
    const data = await updatePetPublicProfile(req.authUser!.id, params.id, payload);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

petsRouter.get(
  "/:id/public-profile",
  asyncHandler(requireAuth),
  validateRequest(petIdentityParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { id: string };
    const data = await getPetPublicProfileByPetId(req.authUser!.id, params.id);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

petsRouter.put(
  "/:id/identity",
  asyncHandler(requireAuth),
  validateRequest(petIdentityParamsSchema, "params"),
  validateRequest(updatePetIdentitySchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { id: string };
    const payload = req.body as UpdatePetIdentityInput;
    const data = await updatePetPublicIdentity(req.authUser!.id, params.id, payload);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

petsRouter.get(
  "/:id/vaccine-card",
  asyncHandler(requireAuth),
  validateRequest(petIdParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { id: string };
    const data = await getPetVaccineCard(req.authUser!.id, params.id);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

petsRouter.get(
  "/:id/vaccines",
  asyncHandler(requireAuth),
  validateRequest(petIdParamsSchema, "params"),
  validateRequest(vaccineListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const params = req.params as { id: string };
    const query = req.query as VaccineListQueryInput;
    const data = await listPetVaccines(req.authUser!.id, params.id, query);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

petsRouter.post(
  "/:id/vaccines",
  asyncHandler(requireAuth),
  validateRequest(petIdParamsSchema, "params"),
  validateRequest(createVaccineSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { id: string };
    const payload = req.body as CreateVaccineInput;
    const data = await createPetVaccine(req.authUser!.id, params.id, payload);

    res.status(201).json({
      ok: true,
      data
    });
  })
);

petsRouter.patch(
  "/:id/vaccines/:vaccineId",
  asyncHandler(requireAuth),
  validateRequest(vaccineParamsSchema, "params"),
  validateRequest(updateVaccineSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { id: string; vaccineId: string };
    const payload = req.body as UpdateVaccineInput;
    const data = await updatePetVaccine(req.authUser!.id, params.id, params.vaccineId, payload);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

petsRouter.delete(
  "/:id/vaccines/:vaccineId",
  asyncHandler(requireAuth),
  validateRequest(vaccineParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { id: string; vaccineId: string };
    await deletePetVaccine(req.authUser!.id, params.id, params.vaccineId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Vaccine deleted successfully"
      }
    });
  })
);

petsRouter.get(
  "/:id/reminders",
  asyncHandler(requireAuth),
  validateRequest(petReminderParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { id: string };
    const data = await listPetReminders(req.authUser!.id, params.id);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

petsRouter.post(
  "/:id/reminders",
  asyncHandler(requireAuth),
  validateRequest(petReminderParamsSchema, "params"),
  validateRequest(createReminderSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { id: string };
    const payload = req.body as CreateReminderInput;
    const data = await createPetReminder(req.authUser!.id, params.id, payload);

    res.status(201).json({
      ok: true,
      data
    });
  })
);

petsRouter.patch(
  "/:id/reminders/:reminderId",
  asyncHandler(requireAuth),
  validateRequest(reminderParamsSchema, "params"),
  validateRequest(updateReminderSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { id: string; reminderId: string };
    const payload = req.body as UpdateReminderInput;
    const data = await updatePetReminder(req.authUser!.id, params.id, params.reminderId, payload);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

petsRouter.delete(
  "/:id/reminders/:reminderId",
  asyncHandler(requireAuth),
  validateRequest(reminderParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { id: string; reminderId: string };
    await deletePetReminder(req.authUser!.id, params.id, params.reminderId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Reminder deleted successfully"
      }
    });
  })
);

petsRouter.get(
  "/:id",
  asyncHandler(requireAuth),
  validateRequest(petIdParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { id: string };
    const data = await getUserPetById(req.authUser!.id, params.id);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

petsRouter.patch(
  "/:id",
  asyncHandler(requireAuth),
  validateRequest(petIdParamsSchema, "params"),
  validateRequest(updatePetSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { id: string };
    const payload = req.body as UpdatePetInput;
    const data = await updatePet(req.authUser!.id, params.id, payload);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

petsRouter.patch(
  "/:id/visibility",
  asyncHandler(requireAuth),
  validateRequest(petIdParamsSchema, "params"),
  validateRequest(updatePetVisibilitySchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { id: string };
    const payload = req.body as UpdatePetVisibilityInput;
    const data = await updatePetVisibility(req.authUser!.id, params.id, payload.isPublic);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

petsRouter.delete(
  "/:id",
  asyncHandler(requireAuth),
  validateRequest(petIdParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { id: string };
    await softDeletePet(req.authUser!.id, params.id);

    res.status(200).json({
      ok: true,
      data: {
        message: "Pet deleted successfully"
      }
    });
  })
);

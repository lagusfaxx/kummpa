import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validate-request";
import {
  appointmentParamsSchema,
  cancelAppointmentSchema,
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  providerAppointmentServicesQuerySchema,
  providerAvailabilityQuerySchema,
  rejectAppointmentSchema,
  rescheduleAppointmentSchema,
  upsertProviderAppointmentServicesSchema,
  upsertProviderAvailabilitySchema,
  type CancelAppointmentInput,
  type CreateAppointmentInput,
  type ListAppointmentsQueryInput,
  type ProviderAppointmentServicesQueryInput,
  type ProviderAvailabilityQueryInput,
  type RejectAppointmentInput,
  type RescheduleAppointmentInput,
  type UpsertProviderAppointmentServicesInput,
  type UpsertProviderAvailabilityInput
} from "./appointments.schemas";
import {
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  createAppointmentForOwner,
  getAppointmentForUser,
  listAppointmentsForUser,
  listProviderAppointmentServices,
  listProviderAvailability,
  rejectAppointment,
  replaceProviderAppointmentServices,
  replaceProviderAvailability,
  rescheduleAppointment
} from "./appointments.service";

export const appointmentsRouter = Router();

appointmentsRouter.get(
  "/",
  asyncHandler(requireAuth),
  validateRequest(listAppointmentsQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListAppointmentsQueryInput;
    const data = await listAppointmentsForUser(
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

appointmentsRouter.post(
  "/",
  asyncHandler(requireAuth),
  validateRequest(createAppointmentSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as CreateAppointmentInput;
    const data = await createAppointmentForOwner(
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

appointmentsRouter.get(
  "/provider/services",
  asyncHandler(requireAuth),
  requireRoles("VET", "CAREGIVER", "SHOP", "GROOMING"),
  validateRequest(providerAppointmentServicesQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ProviderAppointmentServicesQueryInput;
    const data = await listProviderAppointmentServices(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      query.includeInactive
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

appointmentsRouter.put(
  "/provider/services",
  asyncHandler(requireAuth),
  requireRoles("VET", "CAREGIVER", "SHOP", "GROOMING"),
  validateRequest(upsertProviderAppointmentServicesSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as UpsertProviderAppointmentServicesInput;

    // Groomers may only save services with serviceType GROOMING
    if (req.authUser!.role === "GROOMING") {
      const invalid = payload.items.filter(it => it.serviceType !== "GROOMING");
      if (invalid.length > 0) {
        res.status(400).json({
          ok: false,
          error: "Groomers can only save services with serviceType GROOMING.",
        });
        return;
      }
    }

    const data = await replaceProviderAppointmentServices(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      payload.items
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

appointmentsRouter.get(
  "/provider/availability",
  asyncHandler(requireAuth),
  requireRoles("VET", "CAREGIVER", "SHOP", "GROOMING", "ADMIN"),
  validateRequest(providerAvailabilityQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ProviderAvailabilityQueryInput;
    const data = await listProviderAvailability(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      query.includeInactive
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

appointmentsRouter.put(
  "/provider/availability",
  asyncHandler(requireAuth),
  requireRoles("VET", "CAREGIVER", "SHOP", "GROOMING", "ADMIN"),
  validateRequest(upsertProviderAvailabilitySchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as UpsertProviderAvailabilityInput;
    const data = await replaceProviderAvailability(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      payload.items
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

appointmentsRouter.get(
  "/:appointmentId",
  asyncHandler(requireAuth),
  validateRequest(appointmentParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { appointmentId: string };
    const data = await getAppointmentForUser(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.appointmentId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

appointmentsRouter.post(
  "/:appointmentId/confirm",
  asyncHandler(requireAuth),
  validateRequest(appointmentParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { appointmentId: string };
    const data = await confirmAppointment(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.appointmentId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

appointmentsRouter.post(
  "/:appointmentId/reject",
  asyncHandler(requireAuth),
  validateRequest(appointmentParamsSchema, "params"),
  validateRequest(rejectAppointmentSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { appointmentId: string };
    const payload = req.body as RejectAppointmentInput;
    const data = await rejectAppointment(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.appointmentId,
      payload
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

appointmentsRouter.post(
  "/:appointmentId/cancel",
  asyncHandler(requireAuth),
  validateRequest(appointmentParamsSchema, "params"),
  validateRequest(cancelAppointmentSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { appointmentId: string };
    const payload = req.body as CancelAppointmentInput;
    const data = await cancelAppointment(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.appointmentId,
      payload
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

appointmentsRouter.post(
  "/:appointmentId/complete",
  asyncHandler(requireAuth),
  validateRequest(appointmentParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { appointmentId: string };
    const data = await completeAppointment(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.appointmentId
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

appointmentsRouter.post(
  "/:appointmentId/reschedule",
  asyncHandler(requireAuth),
  validateRequest(appointmentParamsSchema, "params"),
  validateRequest(rescheduleAppointmentSchema),
  asyncHandler(async (req, res) => {
    const params = req.params as { appointmentId: string };
    const payload = req.body as RescheduleAppointmentInput;
    const data = await rescheduleAppointment(
      {
        id: req.authUser!.id,
        role: req.authUser!.role
      },
      params.appointmentId,
      payload
    );

    res.status(200).json({
      ok: true,
      data
    });
  })
);

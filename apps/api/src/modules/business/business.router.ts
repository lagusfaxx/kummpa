import { UserRole } from "@prisma/client";
import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRoles } from "../../middleware/auth";

export const businessRouter = Router();

businessRouter.get(
  "/dashboard",
  asyncHandler(requireAuth),
  requireRoles(UserRole.VET, UserRole.CAREGIVER, UserRole.SHOP),
  asyncHandler(async (req, res) => {
    const userId = req.authUser!.id;

    const [vetProfile, caregiverProfile, shopProfile, promotions, appointments] = await Promise.all([
      prisma.vetProfile.findUnique({ where: { userId } }),
      prisma.caregiverProfile.findUnique({ where: { userId } }),
      prisma.shopProfile.findUnique({ where: { userId } }),
      prisma.benefit.findMany({ where: { isActive: true }, orderBy: { updatedAt: "desc" }, take: 5 }),
      prisma.appointment.count({ where: { providerUserId: userId } })
    ]);

    const profile = vetProfile ?? caregiverProfile ?? shopProfile;

    res.status(200).json({
      ok: true,
      data: {
        role: req.authUser!.role,
        profile,
        appointments,
        promotions
      }
    });
  })
);

businessRouter.get(
  "/services",
  asyncHandler(requireAuth),
  requireRoles(UserRole.VET, UserRole.CAREGIVER, UserRole.SHOP),
  asyncHandler(async (req, res) => {
    const userId = req.authUser!.id;

    const services = await prisma.appointmentService.findMany({
      where: { providerUserId: userId },
      orderBy: { createdAt: "desc" }
    });

    res.status(200).json({ ok: true, data: services });
  })
);

businessRouter.get(
  "/promotions",
  asyncHandler(requireAuth),
  requireRoles(UserRole.VET, UserRole.CAREGIVER, UserRole.SHOP),
  asyncHandler(async (req, res) => {
    const promotions = await prisma.benefit.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      take: 20
    });

    res.status(200).json({ ok: true, data: promotions });
  })
);

businessRouter.get(
  "/schedule",
  asyncHandler(requireAuth),
  requireRoles(UserRole.VET, UserRole.CAREGIVER, UserRole.SHOP),
  asyncHandler(async (req, res) => {
    const userId = req.authUser!.id;

    const schedule = await prisma.scheduleAvailability.findMany({
      where: { providerUserId: userId },
      orderBy: { dayOfWeek: "asc" }
    });

    res.status(200).json({ ok: true, data: schedule });
  })
);

import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validate-request";
import {
  dispatchDueRemindersSchema,
  notificationParamsSchema,
  notificationQuerySchema,
  type DispatchDueRemindersInput
} from "./reminders.schemas";
import {
  dispatchDueReminders,
  listUserNotifications,
  markNotificationAsRead
} from "./reminders.service";

export const remindersRouter = Router();

remindersRouter.post(
  "/dispatch/due",
  asyncHandler(requireAuth),
  requireRoles("ADMIN"),
  validateRequest(dispatchDueRemindersSchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as DispatchDueRemindersInput;
    const data = await dispatchDueReminders(query.limit);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

remindersRouter.get(
  "/notifications/me",
  asyncHandler(requireAuth),
  validateRequest(notificationQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as { unreadOnly?: boolean };
    const data = await listUserNotifications(req.authUser!.id, query.unreadOnly);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

remindersRouter.patch(
  "/notifications/:notificationId/read",
  asyncHandler(requireAuth),
  validateRequest(notificationParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const params = req.params as { notificationId: string };
    await markNotificationAsRead(req.authUser!.id, params.notificationId);

    res.status(200).json({
      ok: true,
      data: {
        message: "Notification marked as read"
      }
    });
  })
);

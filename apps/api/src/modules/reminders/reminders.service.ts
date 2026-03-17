import {
  ReminderChannel,
  ReminderDispatchStatus,
  ReminderType,
  type Prisma
} from "@prisma/client";
import { env } from "../../config/env";
import { HttpError } from "../../lib/http-error";
import { prisma } from "../../lib/prisma";
import { sendReminderEmail } from "../notifications/email.service";
import type { CreateReminderInput, UpdateReminderInput } from "./reminders.schemas";

const reminderInclude = {
  dispatchLogs: {
    orderBy: {
      createdAt: "desc"
    },
    take: 1
  }
} satisfies Prisma.ReminderInclude;

type ReminderWithLastLog = Prisma.ReminderGetPayload<{
  include: typeof reminderInclude;
}>;

function serializeReminder(reminder: ReminderWithLastLog) {
  const lastLog = reminder.dispatchLogs[0];

  return {
    id: reminder.id,
    petId: reminder.petId,
    userId: reminder.userId,
    sourceVaccineRecordId: reminder.sourceVaccineRecordId,
    type: reminder.type,
    title: reminder.title,
    message: reminder.message,
    dueAt: reminder.dueAt.toISOString(),
    sendEmail: reminder.sendEmail,
    sendInApp: reminder.sendInApp,
    sendPush: reminder.sendPush,
    isActive: reminder.isActive,
    sentAt: reminder.sentAt?.toISOString() ?? null,
    lastDispatch: lastLog
      ? {
          channel: lastLog.channel,
          status: lastLog.status,
          sentAt: lastLog.sentAt?.toISOString() ?? null,
          errorMessage: lastLog.errorMessage ?? null
        }
      : null
  };
}

async function assertOwnedPet(userId: string, petId: string) {
  const pet = await prisma.pet.findFirst({
    where: {
      id: petId,
      ownerId: userId,
      deletedAt: null
    }
  });

  if (!pet) {
    throw new HttpError(404, "Pet not found");
  }
}

async function assertOwnedReminder(userId: string, petId: string, reminderId: string) {
  const reminder = await prisma.reminder.findFirst({
    where: {
      id: reminderId,
      userId,
      petId
    }
  });

  if (!reminder) {
    throw new HttpError(404, "Reminder not found");
  }

  return reminder;
}

export async function listPetReminders(userId: string, petId: string) {
  await assertOwnedPet(userId, petId);

  const reminders = await prisma.reminder.findMany({
    where: {
      userId,
      petId
    },
    include: reminderInclude,
    orderBy: {
      dueAt: "asc"
    }
  });

  return reminders.map(serializeReminder);
}

export async function createPetReminder(userId: string, petId: string, input: CreateReminderInput) {
  await assertOwnedPet(userId, petId);

  const reminder = await prisma.reminder.create({
    data: {
      userId,
      petId,
      type: input.type,
      title: input.title,
      message: input.message,
      dueAt: input.dueAt,
      sendEmail: input.sendEmail,
      sendInApp: input.sendInApp,
      sendPush: input.sendPush
    },
    include: reminderInclude
  });

  return serializeReminder(reminder);
}

export async function updatePetReminder(
  userId: string,
  petId: string,
  reminderId: string,
  input: UpdateReminderInput
) {
  await assertOwnedReminder(userId, petId, reminderId);

  const reminder = await prisma.reminder.update({
    where: {
      id: reminderId
    },
    data: {
      type: input.type,
      title: input.title,
      message: input.message,
      dueAt: input.dueAt,
      sendEmail: input.sendEmail,
      sendInApp: input.sendInApp,
      sendPush: input.sendPush,
      isActive: input.dueAt ? true : undefined,
      sentAt: input.dueAt ? null : undefined
    },
    include: reminderInclude
  });

  return serializeReminder(reminder);
}

export async function deletePetReminder(userId: string, petId: string, reminderId: string) {
  await assertOwnedReminder(userId, petId, reminderId);

  await prisma.reminder.update({
    where: {
      id: reminderId
    },
    data: {
      isActive: false
    }
  });
}

export async function syncVaccineReminder(input: {
  userId: string;
  petId: string;
  vaccineRecordId: string;
  vaccineName: string;
  nextDoseAt: Date | null;
}) {
  if (!input.nextDoseAt) {
    await prisma.reminder.updateMany({
      where: {
        sourceVaccineRecordId: input.vaccineRecordId,
        type: ReminderType.VACCINE
      },
      data: {
        isActive: false
      }
    });
    return;
  }

  await prisma.reminder.upsert({
    where: {
      sourceVaccineRecordId_type: {
        sourceVaccineRecordId: input.vaccineRecordId,
        type: ReminderType.VACCINE
      }
    },
    create: {
      userId: input.userId,
      petId: input.petId,
      sourceVaccineRecordId: input.vaccineRecordId,
      type: ReminderType.VACCINE,
      title: `Proxima vacuna: ${input.vaccineName}`,
      message: `Recuerda aplicar la proxima dosis de ${input.vaccineName}.`,
      dueAt: input.nextDoseAt,
      sendEmail: true,
      sendInApp: true,
      sendPush: false,
      isActive: true,
      sentAt: null
    },
    update: {
      userId: input.userId,
      petId: input.petId,
      title: `Proxima vacuna: ${input.vaccineName}`,
      message: `Recuerda aplicar la proxima dosis de ${input.vaccineName}.`,
      dueAt: input.nextDoseAt,
      isActive: true,
      sentAt: null
    }
  });
}

export async function disableVaccineReminder(vaccineRecordId: string) {
  await prisma.reminder.updateMany({
    where: {
      sourceVaccineRecordId: vaccineRecordId,
      type: ReminderType.VACCINE
    },
    data: {
      isActive: false
    }
  });
}

export async function dispatchDueReminders(limit?: number) {
  const now = new Date();
  const batchLimit = limit ?? env.REMINDER_DISPATCH_BATCH_LIMIT;

  const reminders = await prisma.reminder.findMany({
    where: {
      isActive: true,
      sentAt: null,
      dueAt: {
        lte: now
      }
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true
        }
      },
      pet: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      dueAt: "asc"
    },
    take: batchLimit
  });

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const reminder of reminders) {
    const channels: ReminderChannel[] = [];
    if (reminder.sendEmail) channels.push(ReminderChannel.EMAIL);
    if (reminder.sendInApp) channels.push(ReminderChannel.IN_APP);
    if (reminder.sendPush) channels.push(ReminderChannel.PUSH);

    if (channels.length === 0) {
      await prisma.reminder.update({
        where: {
          id: reminder.id
        },
        data: {
          isActive: false,
          sentAt: now
        }
      });
      skippedCount += 1;
      continue;
    }

    let deliveredToAnyChannel = false;

    for (const channel of channels) {
      const existingLog = await prisma.reminderDispatchLog.findFirst({
        where: {
          reminderId: reminder.id,
          channel,
          scheduledFor: reminder.dueAt
        }
      });

      if (existingLog) {
        skippedCount += 1;
        continue;
      }

      if (channel === ReminderChannel.EMAIL) {
        const emailSent = await sendReminderEmail({
          to: reminder.user.email,
          firstName: reminder.user.firstName,
          petId: reminder.pet.id,
          petName: reminder.pet.name,
          title: reminder.title,
          dueAt: reminder.dueAt,
          reminderType: reminder.type,
          message: reminder.message
        });

        await prisma.reminderDispatchLog.create({
          data: {
            reminderId: reminder.id,
            channel,
            scheduledFor: reminder.dueAt,
            status: emailSent ? ReminderDispatchStatus.SENT : ReminderDispatchStatus.FAILED,
            sentAt: emailSent ? now : null,
            errorMessage: emailSent ? null : "Email provider rejected delivery"
          }
        });

        if (emailSent) {
          deliveredToAnyChannel = true;
          sentCount += 1;
        } else {
          failedCount += 1;
        }
      }

      if (channel === ReminderChannel.IN_APP) {
        await prisma.$transaction([
          prisma.notification.create({
            data: {
              userId: reminder.userId,
              title: reminder.title,
              body: reminder.message ?? `Recordatorio para ${reminder.pet.name}`,
              metadata: {
                reminderId: reminder.id,
                petId: reminder.petId,
                type: reminder.type
              }
            }
          }),
          prisma.reminderDispatchLog.create({
            data: {
              reminderId: reminder.id,
              channel,
              scheduledFor: reminder.dueAt,
              status: ReminderDispatchStatus.SENT,
              sentAt: now
            }
          })
        ]);

        deliveredToAnyChannel = true;
        sentCount += 1;
      }

      if (channel === ReminderChannel.PUSH) {
        await prisma.reminderDispatchLog.create({
          data: {
            reminderId: reminder.id,
            channel,
            scheduledFor: reminder.dueAt,
            status: ReminderDispatchStatus.PENDING_PUSH
          }
        });

        deliveredToAnyChannel = true;
        skippedCount += 1;
      }
    }

    if (deliveredToAnyChannel) {
      await prisma.reminder.update({
        where: {
          id: reminder.id
        },
        data: {
          sentAt: now,
          isActive: false
        }
      });
    }
  }

  return {
    processed: reminders.length,
    sentCount,
    failedCount,
    skippedCount
  };
}

export async function listUserNotifications(userId: string, unreadOnly = false) {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly
        ? {
            readAt: null
          }
        : {})
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 100
  });

  return notifications.map((notification) => ({
    id: notification.id,
    title: notification.title,
    body: notification.body,
    metadata: notification.metadata,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString()
  }));
}

export async function markNotificationAsRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId
    }
  });

  if (!notification) {
    throw new HttpError(404, "Notification not found");
  }

  await prisma.notification.update({
    where: {
      id: notification.id
    },
    data: {
      readAt: new Date()
    }
  });
}

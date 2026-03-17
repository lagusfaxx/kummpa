import {
  AppointmentStatus,
  ProviderType,
  ServiceType,
  UserRole,
  type Prisma
} from "@prisma/client";
import { env } from "../../config/env";
import { HttpError } from "../../lib/http-error";
import { prisma } from "../../lib/prisma";
import {
  sendAppointmentCancelledEmail,
  sendAppointmentConfirmedEmail,
  sendAppointmentCreatedEmail,
  sendAppointmentRescheduledEmail
} from "../notifications/email.service";
import type {
  AppointmentServiceItemInput,
  CancelAppointmentInput,
  CreateAppointmentInput,
  ListAppointmentsQueryInput,
  RejectAppointmentInput,
  RescheduleAppointmentInput,
  ScheduleAvailabilityItemInput
} from "./appointments.schemas";

const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED
];
const CANCELLABLE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED
];
const TERMINAL_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.REJECTED,
  AppointmentStatus.RESCHEDULED
];

const providerRoles = new Set<UserRole>([UserRole.VET, UserRole.CAREGIVER, UserRole.SHOP, UserRole.ADMIN]);

const serviceTypeLabels: Record<ServiceType, string> = {
  GENERAL_CONSULT: "Consulta general",
  VACCINATION: "Vacunacion",
  EMERGENCY: "Urgencia",
  DEWORMING: "Desparasitacion",
  GROOMING: "Peluqueria",
  HOTEL_DAYCARE: "Hotel/Guarderia",
  WALKING: "Paseo",
  TRAINING: "Entrenamiento",
  OTHER: "Otro"
};

const appointmentInclude = {
  pet: {
    select: {
      id: true,
      name: true,
      species: true,
      breed: true,
      ownerId: true,
      owner: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true
        }
      }
    }
  },
  providerUser: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true
    }
  },
  appointmentService: {
    select: {
      id: true,
      title: true,
      description: true,
      serviceType: true,
      durationMinutes: true,
      priceCents: true,
      currencyCode: true,
      isActive: true,
      sortOrder: true
    }
  },
  rescheduledFrom: {
    select: {
      id: true,
      scheduledAt: true,
      status: true
    }
  },
  rescheduledTo: {
    orderBy: {
      createdAt: "desc"
    },
    take: 1,
    select: {
      id: true,
      scheduledAt: true,
      status: true
    }
  }
} satisfies Prisma.AppointmentInclude;

type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: typeof appointmentInclude;
}>;

interface AppointmentActor {
  id: string;
  role: UserRole;
}

interface ProviderSnapshot {
  providerUserId: string | null;
  providerSourceId: string | null;
  providerName: string;
  providerEmail: string | null;
  providerFirstName: string | null;
}

function serializeAppointmentService(
  service: {
    id: string;
    title: string;
    description: string | null;
    serviceType: ServiceType;
    durationMinutes: number;
    priceCents: number | null;
    currencyCode: string;
    isActive: boolean;
    sortOrder: number;
  } | null
) {
  if (!service) {
    return null;
  }

  return {
    id: service.id,
    title: service.title,
    description: service.description,
    serviceType: service.serviceType,
    serviceTypeLabel: serviceTypeLabels[service.serviceType],
    durationMinutes: service.durationMinutes,
    priceCents: service.priceCents,
    currencyCode: service.currencyCode,
    isActive: service.isActive,
    sortOrder: service.sortOrder
  };
}

const weekdayTokenToIndex: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6
};

function toIsoOrNull(value?: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function fullName(firstName?: string | null, lastName?: string | null): string {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ").trim();
}

function isProviderRole(role: UserRole): boolean {
  return providerRoles.has(role);
}

function getDefaultProviderName(providerType: ProviderType, providerSourceId?: string | null): string {
  if (providerType === ProviderType.VET) return "Veterinaria";
  if (providerType === ProviderType.CAREGIVER) return "Cuidador";
  if (providerType === ProviderType.SHOP) return "Pet shop";
  if (providerType === ProviderType.GROOMING) return "Servicio de grooming";
  if (providerType === ProviderType.HOTEL) return "Hotel pet";
  return providerSourceId ? `Proveedor ${providerSourceId}` : "Proveedor pet";
}

function getProviderTypeForActorRole(role: UserRole): ProviderType {
  if (role === UserRole.VET) return ProviderType.VET;
  if (role === UserRole.CAREGIVER) return ProviderType.CAREGIVER;
  if (role === UserRole.SHOP) return ProviderType.SHOP;
  throw new HttpError(403, "Only provider roles can manage appointment services");
}

async function resolveProviderSourceIdForUser(
  providerUserId: string,
  providerType: ProviderType
): Promise<string | null> {
  if (providerType === ProviderType.VET) {
    const profile = await prisma.vetProfile.findUnique({
      where: {
        userId: providerUserId
      },
      select: {
        id: true
      }
    });

    return profile?.id ?? null;
  }

  if (providerType === ProviderType.CAREGIVER) {
    const profile = await prisma.caregiverProfile.findUnique({
      where: {
        userId: providerUserId
      },
      select: {
        id: true
      }
    });

    return profile?.id ?? null;
  }

  if (providerType === ProviderType.SHOP) {
    const profile = await prisma.shopProfile.findUnique({
      where: {
        userId: providerUserId
      },
      select: {
        id: true
      }
    });

    return profile?.id ?? null;
  }

  return null;
}

function addMinutesToDate(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function toMinutesOfDay(hhmm: string): number {
  const [hoursRaw, minutesRaw] = hhmm.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    throw new HttpError(400, "Invalid time format");
  }

  return hours * 60 + minutes;
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && startB < endA;
}

function getZonedDateParts(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(date);

  let year = 0;
  let month = 0;
  let day = 0;
  let hour = 0;
  let minute = 0;
  let weekdayToken = "sun";

  for (const part of parts) {
    if (part.type === "year") year = Number(part.value);
    if (part.type === "month") month = Number(part.value);
    if (part.type === "day") day = Number(part.value);
    if (part.type === "hour") hour = Number(part.value);
    if (part.type === "minute") minute = Number(part.value);
    if (part.type === "weekday") weekdayToken = part.value.slice(0, 3).toLowerCase();
  }

  if (hour === 24) {
    hour = 0;
  }

  return {
    year,
    month,
    day,
    dayOfWeek: weekdayTokenToIndex[weekdayToken] ?? 0,
    minutesOfDay: hour * 60 + minute
  };
}

function ensureValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    throw new HttpError(400, `Invalid timezone: ${timezone}`);
  }
}

function appointmentFitsAvailabilitySlot(
  scheduledAt: Date,
  durationMinutes: number,
  slot: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    timezone: string;
  }
): boolean {
  const slotStart = toMinutesOfDay(slot.startTime);
  const slotEnd = toMinutesOfDay(slot.endTime);
  const appointmentEnd = addMinutesToDate(scheduledAt, durationMinutes);

  const localStart = getZonedDateParts(scheduledAt, slot.timezone);
  const localEnd = getZonedDateParts(appointmentEnd, slot.timezone);

  const sameLocalDate =
    localStart.year === localEnd.year &&
    localStart.month === localEnd.month &&
    localStart.day === localEnd.day;

  if (!sameLocalDate) {
    return false;
  }

  if (localStart.dayOfWeek !== slot.dayOfWeek) {
    return false;
  }

  return localStart.minutesOfDay >= slotStart && localEnd.minutesOfDay <= slotEnd;
}

function serializeAppointment(appointment: AppointmentWithRelations, actor?: AppointmentActor) {
  const ownerName = fullName(appointment.pet.owner.firstName, appointment.pet.owner.lastName);
  const providerName =
    fullName(appointment.providerUser?.firstName, appointment.providerUser?.lastName) || null;
  const endsAt = addMinutesToDate(appointment.scheduledAt, appointment.durationMinutes);

  const isOwner = actor ? appointment.pet.ownerId === actor.id : false;
  const isProvider = actor ? appointment.providerUserId === actor.id : false;
  const isAdmin = actor?.role === UserRole.ADMIN;
  const isTerminal = TERMINAL_APPOINTMENT_STATUSES.includes(appointment.status);

  return {
    id: appointment.id,
    pet: {
      id: appointment.pet.id,
      name: appointment.pet.name,
      species: appointment.pet.species,
      breed: appointment.pet.breed
    },
    owner: {
      id: appointment.pet.owner.id,
      fullName: ownerName || "Owner",
      email: appointment.pet.owner.email,
      phone: appointment.pet.owner.phone ?? null
    },
    provider: {
      providerUserId: appointment.providerUserId,
      providerSourceId: appointment.providerSourceId,
      providerType: appointment.providerType,
      providerName: appointment.providerName,
      userName: providerName,
      userPhone: appointment.providerUser?.phone ?? null
    },
    appointmentService: serializeAppointmentService(appointment.appointmentService),
    serviceType: appointment.serviceType,
    serviceTypeLabel: serviceTypeLabels[appointment.serviceType],
    scheduledAt: appointment.scheduledAt.toISOString(),
    endsAt: endsAt.toISOString(),
    durationMinutes: appointment.durationMinutes,
    status: appointment.status,
    reason: appointment.reason ?? null,
    notes: appointment.notes ?? null,
    cancelReason: appointment.cancelReason ?? null,
    confirmedAt: toIsoOrNull(appointment.confirmedAt),
    completedAt: toIsoOrNull(appointment.completedAt),
    cancelledAt: toIsoOrNull(appointment.cancelledAt),
    rejectedAt: toIsoOrNull(appointment.rejectedAt),
    rescheduledFrom: appointment.rescheduledFrom
      ? {
          id: appointment.rescheduledFrom.id,
          status: appointment.rescheduledFrom.status,
          scheduledAt: appointment.rescheduledFrom.scheduledAt.toISOString()
        }
      : null,
    rescheduledTo: appointment.rescheduledTo[0]
      ? {
          id: appointment.rescheduledTo[0].id,
          status: appointment.rescheduledTo[0].status,
          scheduledAt: appointment.rescheduledTo[0].scheduledAt.toISOString()
        }
      : null,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
    permissions: {
      canConfirm: !isTerminal && appointment.status === AppointmentStatus.PENDING && (isProvider || isAdmin),
      canReject: !isTerminal && appointment.status === AppointmentStatus.PENDING && (isProvider || isAdmin),
      canComplete:
        !isTerminal && appointment.status === AppointmentStatus.CONFIRMED && (isProvider || isAdmin),
      canCancel:
        !isTerminal &&
        CANCELLABLE_APPOINTMENT_STATUSES.includes(appointment.status) &&
        (isOwner || isProvider || isAdmin),
      canReschedule:
        !isTerminal &&
        CANCELLABLE_APPOINTMENT_STATUSES.includes(appointment.status) &&
        (isOwner || isProvider || isAdmin)
    }
  };
}

async function assertOwnedPet(userId: string, petId: string) {
  const pet = await prisma.pet.findFirst({
    where: {
      id: petId,
      ownerId: userId,
      deletedAt: null
    },
    select: {
      id: true,
      name: true,
      owner: {
        select: {
          id: true,
          email: true,
          firstName: true,
          role: true
        }
      }
    }
  });

  if (!pet) {
    throw new HttpError(404, "Pet not found");
  }

  return pet;
}

async function getAppointmentById(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: {
      id: appointmentId
    },
    include: appointmentInclude
  });

  if (!appointment) {
    throw new HttpError(404, "Appointment not found");
  }

  return appointment;
}

function assertActorCanAccessAppointment(appointment: AppointmentWithRelations, actor: AppointmentActor) {
  if (actor.role === UserRole.ADMIN) {
    return;
  }

  if (appointment.pet.ownerId === actor.id) {
    return;
  }

  if (appointment.providerUserId === actor.id) {
    return;
  }

  throw new HttpError(403, "You do not have access to this appointment");
}

function assertActorCanActAsProvider(appointment: AppointmentWithRelations, actor: AppointmentActor) {
  if (actor.role === UserRole.ADMIN) {
    return;
  }

  if (appointment.providerUserId === actor.id) {
    return;
  }

  throw new HttpError(403, "Only the assigned provider can perform this action");
}

function assertActorCanActAsOwnerOrProvider(appointment: AppointmentWithRelations, actor: AppointmentActor) {
  if (actor.role === UserRole.ADMIN) {
    return;
  }

  if (appointment.pet.ownerId === actor.id || appointment.providerUserId === actor.id) {
    return;
  }

  throw new HttpError(403, "Only owner or provider can perform this action");
}

function assertCanScheduleAtDate(scheduledAt: Date) {
  const now = new Date();
  if (scheduledAt <= now) {
    throw new HttpError(400, "Appointment must be in the future");
  }

  const minAllowed = new Date(now.getTime() + env.APPOINTMENT_MIN_NOTICE_MINUTES * 60_000);
  if (scheduledAt < minAllowed) {
    throw new HttpError(
      400,
      `Appointment requires at least ${env.APPOINTMENT_MIN_NOTICE_MINUTES} minutes of notice`
    );
  }
}

async function resolveProviderFromTypeAndSource(
  providerType: ProviderType,
  providerSourceId: string
): Promise<ProviderSnapshot | null> {
  if (providerType === ProviderType.VET) {
    const profile = await prisma.vetProfile.findUnique({
      where: { id: providerSourceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!profile) return null;

    return {
      providerUserId: profile.user.id,
      providerSourceId: profile.id,
      providerName:
        profile.clinicName?.trim() || fullName(profile.user.firstName, profile.user.lastName) || "Veterinaria",
      providerEmail: profile.user.email,
      providerFirstName: profile.user.firstName ?? null
    };
  }

  if (providerType === ProviderType.CAREGIVER) {
    const profile = await prisma.caregiverProfile.findUnique({
      where: { id: providerSourceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!profile) return null;

    return {
      providerUserId: profile.user.id,
      providerSourceId: profile.id,
      providerName: fullName(profile.user.firstName, profile.user.lastName) || "Cuidador",
      providerEmail: profile.user.email,
      providerFirstName: profile.user.firstName ?? null
    };
  }

  if (providerType === ProviderType.SHOP) {
    const profile = await prisma.shopProfile.findUnique({
      where: { id: providerSourceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!profile) return null;

    return {
      providerUserId: profile.user.id,
      providerSourceId: profile.id,
      providerName:
        profile.businessName?.trim() || fullName(profile.user.firstName, profile.user.lastName) || "Pet shop",
      providerEmail: profile.user.email,
      providerFirstName: profile.user.firstName ?? null
    };
  }

  return null;
}

async function resolveProviderFromUser(
  providerType: ProviderType,
  providerUserId: string
): Promise<ProviderSnapshot> {
  const user = await prisma.user.findFirst({
    where: {
      id: providerUserId,
      deletedAt: null
    },
    include: {
      vetProfile: true,
      caregiverProfile: true,
      shopProfile: true
    }
  });

  if (!user) {
    throw new HttpError(404, "Provider user not found");
  }

  if (providerType === ProviderType.VET && user.role !== UserRole.VET && user.role !== UserRole.ADMIN) {
    throw new HttpError(400, "Provider user role does not match providerType VET");
  }

  if (
    providerType === ProviderType.CAREGIVER &&
    user.role !== UserRole.CAREGIVER &&
    user.role !== UserRole.ADMIN
  ) {
    throw new HttpError(400, "Provider user role does not match providerType CAREGIVER");
  }

  if (providerType === ProviderType.SHOP && user.role !== UserRole.SHOP && user.role !== UserRole.ADMIN) {
    throw new HttpError(400, "Provider user role does not match providerType SHOP");
  }

  let providerSourceId: string | null = null;
  let providerName = fullName(user.firstName, user.lastName) || getDefaultProviderName(providerType);

  if (providerType === ProviderType.VET && user.vetProfile) {
    providerSourceId = user.vetProfile.id;
    providerName =
      user.vetProfile.clinicName?.trim() ||
      fullName(user.firstName, user.lastName) ||
      getDefaultProviderName(providerType);
  }

  if (providerType === ProviderType.CAREGIVER && user.caregiverProfile) {
    providerSourceId = user.caregiverProfile.id;
    providerName =
      fullName(user.firstName, user.lastName) || user.caregiverProfile.introduction || "Cuidador";
  }

  if (providerType === ProviderType.SHOP && user.shopProfile) {
    providerSourceId = user.shopProfile.id;
    providerName =
      user.shopProfile.businessName?.trim() ||
      fullName(user.firstName, user.lastName) ||
      getDefaultProviderName(providerType);
  }

  return {
    providerUserId: user.id,
    providerSourceId,
    providerName,
    providerEmail: user.email,
    providerFirstName: user.firstName ?? null
  };
}

async function resolveProviderSnapshot(input: {
  providerType: ProviderType;
  providerUserId?: string;
  providerSourceId?: string;
  providerName?: string;
}): Promise<ProviderSnapshot> {
  if (input.providerUserId) {
    const byUser = await resolveProviderFromUser(input.providerType, input.providerUserId);
    return {
      ...byUser,
      providerSourceId: input.providerSourceId ?? byUser.providerSourceId,
      providerName: input.providerName ?? byUser.providerName
    };
  }

  if (input.providerSourceId) {
    const bySource = await resolveProviderFromTypeAndSource(input.providerType, input.providerSourceId);
    if (bySource) {
      return {
        ...bySource,
        providerName: input.providerName ?? bySource.providerName
      };
    }
  }

  return {
    providerUserId: null,
    providerSourceId: input.providerSourceId ?? null,
    providerName: input.providerName ?? getDefaultProviderName(input.providerType, input.providerSourceId),
    providerEmail: null,
    providerFirstName: null
  };
}

async function resolveAppointmentServiceForBooking(appointmentServiceId: string) {
  const service = await prisma.appointmentService.findFirst({
    where: {
      id: appointmentServiceId,
      isActive: true
    }
  });

  if (!service) {
    throw new HttpError(404, "Appointment service not found");
  }

  return service;
}

async function assertProviderAvailability(input: {
  providerUserId: string | null;
  serviceType: ServiceType;
  scheduledAt: Date;
  durationMinutes: number;
}) {
  if (!input.providerUserId) {
    return;
  }

  const slots = await prisma.scheduleAvailability.findMany({
    where: {
      providerUserId: input.providerUserId,
      isActive: true
    }
  });

  if (slots.length === 0) {
    return;
  }

  const matchingService = slots.filter(
    (slot) => slot.serviceType === null || slot.serviceType === input.serviceType
  );

  if (matchingService.length === 0) {
    throw new HttpError(409, "Provider has no schedule configured for this service");
  }

  const hasCompatibleSlot = matchingService.some((slot) =>
    appointmentFitsAvailabilitySlot(input.scheduledAt, input.durationMinutes, {
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      timezone: slot.timezone
    })
  );

  if (!hasCompatibleSlot) {
    throw new HttpError(409, "Selected time is outside provider availability");
  }
}

async function assertNoTimeCollisions(input: {
  appointmentIdToExclude?: string;
  petId: string;
  providerType: ProviderType;
  providerUserId: string | null;
  providerSourceId: string | null;
  providerName: string;
  scheduledAt: Date;
  durationMinutes: number;
}) {
  const windowStart = new Date(input.scheduledAt.getTime() - 24 * 60 * 60 * 1000);
  const windowEnd = addMinutesToDate(input.scheduledAt, input.durationMinutes + 24 * 60);
  const targetEnd = addMinutesToDate(input.scheduledAt, input.durationMinutes);

  const idFilter =
    input.appointmentIdToExclude !== undefined
      ? {
          id: {
            not: input.appointmentIdToExclude
          }
        }
      : {};

  const providerWhere: Prisma.AppointmentWhereInput = input.providerUserId
    ? {
        providerUserId: input.providerUserId
      }
    : input.providerSourceId
      ? {
          providerType: input.providerType,
          providerSourceId: input.providerSourceId
        }
      : {
          providerType: input.providerType,
          providerName: input.providerName
        };

  const [petAppointments, providerAppointments] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        ...idFilter,
        petId: input.petId,
        status: {
          in: ACTIVE_APPOINTMENT_STATUSES
        },
        scheduledAt: {
          gte: windowStart,
          lte: windowEnd
        }
      },
      select: {
        id: true,
        scheduledAt: true,
        durationMinutes: true
      }
    }),
    prisma.appointment.findMany({
      where: {
        ...idFilter,
        ...providerWhere,
        status: {
          in: ACTIVE_APPOINTMENT_STATUSES
        },
        scheduledAt: {
          gte: windowStart,
          lte: windowEnd
        }
      },
      select: {
        id: true,
        scheduledAt: true,
        durationMinutes: true
      }
    })
  ]);

  for (const appointment of petAppointments) {
    const existingEnd = addMinutesToDate(appointment.scheduledAt, appointment.durationMinutes);
    if (overlaps(input.scheduledAt, targetEnd, appointment.scheduledAt, existingEnd)) {
      throw new HttpError(409, "Pet already has another appointment in this timeslot");
    }
  }

  for (const appointment of providerAppointments) {
    const existingEnd = addMinutesToDate(appointment.scheduledAt, appointment.durationMinutes);
    if (overlaps(input.scheduledAt, targetEnd, appointment.scheduledAt, existingEnd)) {
      throw new HttpError(409, "Provider already has another appointment in this timeslot");
    }
  }
}

function assertStatusCanChange(currentStatus: AppointmentStatus, allowedCurrentStatuses: AppointmentStatus[]) {
  if (!allowedCurrentStatuses.includes(currentStatus)) {
    throw new HttpError(409, `Cannot update appointment while status is ${currentStatus}`);
  }
}

async function notifyCreated(appointment: AppointmentWithRelations, providerSnapshot: ProviderSnapshot) {
  await sendAppointmentCreatedEmail({
    to: appointment.pet.owner.email,
    firstName: appointment.pet.owner.firstName,
    petName: appointment.pet.name,
    providerName: appointment.providerName,
    serviceType: serviceTypeLabels[appointment.serviceType],
    scheduledAt: appointment.scheduledAt,
    reason: appointment.reason
  });

  if (providerSnapshot.providerEmail) {
    await sendAppointmentCreatedEmail({
      to: providerSnapshot.providerEmail,
      firstName: providerSnapshot.providerFirstName,
      petName: appointment.pet.name,
      providerName: appointment.providerName,
      serviceType: serviceTypeLabels[appointment.serviceType],
      scheduledAt: appointment.scheduledAt,
      reason: appointment.reason
    });
  }
}

async function notifyConfirmed(appointment: AppointmentWithRelations) {
  await sendAppointmentConfirmedEmail({
    to: appointment.pet.owner.email,
    firstName: appointment.pet.owner.firstName,
    petName: appointment.pet.name,
    providerName: appointment.providerName,
    serviceType: serviceTypeLabels[appointment.serviceType],
    scheduledAt: appointment.scheduledAt,
    reason: appointment.reason
  });
}

async function notifyCancelled(appointment: AppointmentWithRelations, reason?: string | null) {
  await sendAppointmentCancelledEmail({
    to: appointment.pet.owner.email,
    firstName: appointment.pet.owner.firstName,
    petName: appointment.pet.name,
    providerName: appointment.providerName,
    serviceType: serviceTypeLabels[appointment.serviceType],
    scheduledAt: appointment.scheduledAt,
    reason: reason ?? appointment.cancelReason
  });

  if (appointment.providerUser?.email) {
    await sendAppointmentCancelledEmail({
      to: appointment.providerUser.email,
      firstName: appointment.providerUser.firstName,
      petName: appointment.pet.name,
      providerName: appointment.providerName,
      serviceType: serviceTypeLabels[appointment.serviceType],
      scheduledAt: appointment.scheduledAt,
      reason: reason ?? appointment.cancelReason
    });
  }
}

async function notifyRescheduled(
  previous: AppointmentWithRelations,
  next: AppointmentWithRelations,
  reason?: string | null
) {
  await sendAppointmentRescheduledEmail({
    to: next.pet.owner.email,
    firstName: next.pet.owner.firstName,
    petName: next.pet.name,
    providerName: next.providerName,
    serviceType: serviceTypeLabels[next.serviceType],
    scheduledAt: next.scheduledAt,
    previousScheduledAt: previous.scheduledAt,
    reason
  });

  if (next.providerUser?.email) {
    await sendAppointmentRescheduledEmail({
      to: next.providerUser.email,
      firstName: next.providerUser.firstName,
      petName: next.pet.name,
      providerName: next.providerName,
      serviceType: serviceTypeLabels[next.serviceType],
      scheduledAt: next.scheduledAt,
      previousScheduledAt: previous.scheduledAt,
      reason
    });
  }
}

export async function listAppointmentsForUser(
  actor: AppointmentActor,
  query: ListAppointmentsQueryInput
) {
  if (query.view === "provider" && !isProviderRole(actor.role)) {
    throw new HttpError(403, "Only provider roles can use provider view");
  }

  const where: Prisma.AppointmentWhereInput =
    query.view === "provider"
      ? {
          providerUserId: actor.id
        }
      : query.view === "all" && actor.role === UserRole.ADMIN
        ? {}
      : query.view === "all"
        ? {
            OR: [{ pet: { ownerId: actor.id } }, { providerUserId: actor.id }]
          }
        : {
            pet: {
              ownerId: actor.id
            }
          };

  if (query.petId) {
    where.petId = query.petId;
  }

  if (query.status && query.status.length > 0) {
    where.status = {
      in: query.status
    };
  }

  if (query.providerType) {
    where.providerType = query.providerType;
  }

  if (query.providerSourceId) {
    where.providerSourceId = query.providerSourceId;
  }

  if (query.from || query.to) {
    where.scheduledAt = {
      ...(query.from
        ? {
            gte: query.from
          }
        : {}),
      ...(query.to
        ? {
            lte: query.to
          }
        : {})
    };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: appointmentInclude,
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    take: query.limit
  });

  return appointments.map((appointment) => serializeAppointment(appointment, actor));
}

export async function createAppointmentForOwner(actor: AppointmentActor, input: CreateAppointmentInput) {
  await assertOwnedPet(actor.id, input.petId);

  assertCanScheduleAtDate(input.scheduledAt);

  let providerType: ProviderType;
  let serviceType: ServiceType;
  let durationMinutes: number;
  let appointmentServiceId: string | undefined;
  let provider: ProviderSnapshot;

  if (input.appointmentServiceId) {
    const catalogService = await resolveAppointmentServiceForBooking(input.appointmentServiceId);
    appointmentServiceId = catalogService.id;
    providerType = catalogService.providerType;
    serviceType = catalogService.serviceType;
    durationMinutes = input.durationMinutes ?? catalogService.durationMinutes;
    provider = await resolveProviderSnapshot({
      providerType: catalogService.providerType,
      providerUserId: catalogService.providerUserId,
      providerSourceId: catalogService.providerSourceId ?? undefined
    });
  } else {
    if (!input.providerType || !input.serviceType) {
      throw new HttpError(400, "Provider type and service type are required");
    }

    providerType = input.providerType;
    serviceType = input.serviceType;
    durationMinutes = input.durationMinutes ?? env.APPOINTMENT_DEFAULT_DURATION_MINUTES;
    provider = await resolveProviderSnapshot({
      providerType,
      providerUserId: input.providerUserId,
      providerSourceId: input.providerSourceId,
      providerName: input.providerName
    });
  }

  await assertProviderAvailability({
    providerUserId: provider.providerUserId,
    serviceType,
    scheduledAt: input.scheduledAt,
    durationMinutes
  });

  await assertNoTimeCollisions({
    petId: input.petId,
    providerType,
    providerUserId: provider.providerUserId,
    providerSourceId: provider.providerSourceId,
    providerName: provider.providerName,
    scheduledAt: input.scheduledAt,
    durationMinutes
  });

  const appointment = await prisma.appointment.create({
    data: {
      petId: input.petId,
      providerUserId: provider.providerUserId,
      appointmentServiceId,
      providerType,
      providerSourceId: provider.providerSourceId,
      providerName: provider.providerName,
      serviceType,
      scheduledAt: input.scheduledAt,
      durationMinutes,
      status: AppointmentStatus.PENDING,
      reason: input.reason,
      notes: input.notes
    },
    include: appointmentInclude
  });

  await notifyCreated(appointment, provider);
  return serializeAppointment(appointment, actor);
}

export async function getAppointmentForUser(actor: AppointmentActor, appointmentId: string) {
  const appointment = await getAppointmentById(appointmentId);
  assertActorCanAccessAppointment(appointment, actor);
  return serializeAppointment(appointment, actor);
}

export async function confirmAppointment(actor: AppointmentActor, appointmentId: string) {
  const appointment = await getAppointmentById(appointmentId);
  assertActorCanActAsProvider(appointment, actor);
  assertStatusCanChange(appointment.status, [AppointmentStatus.PENDING]);

  const updated = await prisma.appointment.update({
    where: {
      id: appointment.id
    },
    data: {
      status: AppointmentStatus.CONFIRMED,
      confirmedAt: new Date(),
      cancelReason: null,
      rejectedAt: null
    },
    include: appointmentInclude
  });

  await notifyConfirmed(updated);
  return serializeAppointment(updated, actor);
}

export async function rejectAppointment(
  actor: AppointmentActor,
  appointmentId: string,
  input: RejectAppointmentInput
) {
  const appointment = await getAppointmentById(appointmentId);
  assertActorCanActAsProvider(appointment, actor);
  assertStatusCanChange(appointment.status, [AppointmentStatus.PENDING]);

  const updated = await prisma.appointment.update({
    where: {
      id: appointment.id
    },
    data: {
      status: AppointmentStatus.REJECTED,
      rejectedAt: new Date(),
      cancelReason: input.reason,
      confirmedAt: null
    },
    include: appointmentInclude
  });

  await notifyCancelled(updated, input.reason);
  return serializeAppointment(updated, actor);
}

export async function cancelAppointment(
  actor: AppointmentActor,
  appointmentId: string,
  input: CancelAppointmentInput
) {
  const appointment = await getAppointmentById(appointmentId);
  assertActorCanActAsOwnerOrProvider(appointment, actor);
  assertStatusCanChange(appointment.status, [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]);

  const updated = await prisma.appointment.update({
    where: {
      id: appointment.id
    },
    data: {
      status: AppointmentStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: input.reason
    },
    include: appointmentInclude
  });

  await notifyCancelled(updated, input.reason);
  return serializeAppointment(updated, actor);
}

export async function completeAppointment(actor: AppointmentActor, appointmentId: string) {
  const appointment = await getAppointmentById(appointmentId);
  assertActorCanActAsProvider(appointment, actor);
  assertStatusCanChange(appointment.status, [AppointmentStatus.CONFIRMED]);

  const updated = await prisma.appointment.update({
    where: {
      id: appointment.id
    },
    data: {
      status: AppointmentStatus.COMPLETED,
      completedAt: new Date()
    },
    include: appointmentInclude
  });

  return serializeAppointment(updated, actor);
}

export async function rescheduleAppointment(
  actor: AppointmentActor,
  appointmentId: string,
  input: RescheduleAppointmentInput
) {
  const current = await getAppointmentById(appointmentId);
  assertActorCanActAsOwnerOrProvider(current, actor);
  assertStatusCanChange(current.status, [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]);
  assertCanScheduleAtDate(input.scheduledAt);

  const durationMinutes = input.durationMinutes ?? current.durationMinutes;

  await assertProviderAvailability({
    providerUserId: current.providerUserId,
    serviceType: current.serviceType,
    scheduledAt: input.scheduledAt,
    durationMinutes
  });

  await assertNoTimeCollisions({
    appointmentIdToExclude: current.id,
    petId: current.petId,
    providerType: current.providerType,
    providerUserId: current.providerUserId,
    providerSourceId: current.providerSourceId,
    providerName: current.providerName,
    scheduledAt: input.scheduledAt,
    durationMinutes
  });

  const next = await prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: {
        id: current.id
      },
      data: {
        status: AppointmentStatus.RESCHEDULED
      }
    });

    return tx.appointment.create({
      data: {
        petId: current.petId,
        providerUserId: current.providerUserId,
        appointmentServiceId: current.appointmentServiceId,
        providerType: current.providerType,
        providerSourceId: current.providerSourceId,
        providerName: current.providerName,
        serviceType: current.serviceType,
        scheduledAt: input.scheduledAt,
        durationMinutes,
        status: AppointmentStatus.PENDING,
        reason: input.reason ?? current.reason,
        notes: input.notes ?? current.notes,
        rescheduledFromId: current.id
      },
      include: appointmentInclude
    });
  });

  await notifyRescheduled(current, next, input.reason);
  return serializeAppointment(next, actor);
}

export async function listProviderAppointmentServices(
  actor: AppointmentActor,
  includeInactive: boolean
) {
  const providerType = getProviderTypeForActorRole(actor.role);

  const items = await prisma.appointmentService.findMany({
    where: {
      providerUserId: actor.id,
      providerType,
      ...(includeInactive
        ? {}
        : {
            isActive: true
          })
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }, { createdAt: "asc" }]
  });

  return items.map((item) => serializeAppointmentService(item));
}

export async function listProviderAvailability(actor: AppointmentActor, includeInactive: boolean) {
  if (!isProviderRole(actor.role)) {
    throw new HttpError(403, "Only provider roles can access availability");
  }

  const items = await prisma.scheduleAvailability.findMany({
    where: {
      providerUserId: actor.id,
      ...(includeInactive
        ? {}
        : {
            isActive: true
          })
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }, { endTime: "asc" }]
  });

  return items.map((item) => ({
    id: item.id,
    providerUserId: item.providerUserId,
    dayOfWeek: item.dayOfWeek,
    startTime: item.startTime,
    endTime: item.endTime,
    serviceType: item.serviceType,
    timezone: item.timezone,
    isActive: item.isActive,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  }));
}

function validateAppointmentServiceItems(items: AppointmentServiceItemInput[]) {
  const seenSortOrders = new Set<number>();

  for (const item of items) {
    if (seenSortOrders.has(item.sortOrder)) {
      throw new HttpError(400, `Duplicate appointment service sortOrder: ${item.sortOrder}`);
    }

    seenSortOrders.add(item.sortOrder);
  }
}

function validateAvailabilityItems(items: ScheduleAvailabilityItemInput[]) {
  for (const item of items) {
    ensureValidTimezone(item.timezone);
  }

  const grouped = new Map<string, Array<{ start: number; end: number }>>();

  for (const item of items) {
    if (!item.isActive) {
      continue;
    }

    const key = `${item.dayOfWeek}:${item.timezone}:${item.serviceType ?? "ALL"}`;
    const current = grouped.get(key) ?? [];
    current.push({
      start: toMinutesOfDay(item.startTime),
      end: toMinutesOfDay(item.endTime)
    });
    grouped.set(key, current);
  }

  for (const [key, ranges] of grouped.entries()) {
    ranges.sort((left, right) => left.start - right.start);

    for (let index = 1; index < ranges.length; index += 1) {
      const previous = ranges[index - 1];
      const current = ranges[index];
      if (!previous || !current) continue;

      if (current.start < previous.end) {
        throw new HttpError(400, `Availability blocks overlap for schedule ${key}`);
      }
    }
  }
}

export async function replaceProviderAvailability(
  actor: AppointmentActor,
  items: ScheduleAvailabilityItemInput[]
) {
  if (!isProviderRole(actor.role)) {
    throw new HttpError(403, "Only provider roles can update availability");
  }

  validateAvailabilityItems(items);

  await prisma.$transaction(async (tx) => {
    await tx.scheduleAvailability.deleteMany({
      where: {
        providerUserId: actor.id
      }
    });

    if (items.length > 0) {
      await tx.scheduleAvailability.createMany({
        data: items.map((item) => ({
          providerUserId: actor.id,
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          serviceType: item.serviceType ?? null,
          timezone: item.timezone,
          isActive: item.isActive
        }))
      });
    }
  });

  return listProviderAvailability(actor, true);
}

export async function replaceProviderAppointmentServices(
  actor: AppointmentActor,
  items: AppointmentServiceItemInput[]
) {
  const providerType = getProviderTypeForActorRole(actor.role);
  const providerSourceId = await resolveProviderSourceIdForUser(actor.id, providerType);
  validateAppointmentServiceItems(items);

  await prisma.$transaction(async (tx) => {
    await tx.appointmentService.deleteMany({
      where: {
        providerUserId: actor.id,
        providerType
      }
    });

    if (items.length > 0) {
      await tx.appointmentService.createMany({
        data: items.map((item) => ({
          providerUserId: actor.id,
          providerType,
          providerSourceId,
          title: item.title,
          description: item.description,
          serviceType: item.serviceType,
          durationMinutes: item.durationMinutes,
          priceCents: item.priceCents ?? null,
          currencyCode: item.currencyCode,
          isActive: item.isActive,
          sortOrder: item.sortOrder
        }))
      });
    }
  });

  return listProviderAppointmentServices(actor, true);
}

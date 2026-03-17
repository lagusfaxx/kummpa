export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED"
  | "RESCHEDULED";

export type ProviderType = "VET" | "CAREGIVER" | "SHOP" | "GROOMING" | "HOTEL" | "OTHER";

export type ServiceType =
  | "GENERAL_CONSULT"
  | "VACCINATION"
  | "EMERGENCY"
  | "DEWORMING"
  | "GROOMING"
  | "HOTEL_DAYCARE"
  | "WALKING"
  | "TRAINING"
  | "OTHER";

export interface AppointmentPermissions {
  canConfirm: boolean;
  canReject: boolean;
  canComplete: boolean;
  canCancel: boolean;
  canReschedule: boolean;
}

export interface AppointmentRecord {
  id: string;
  pet: {
    id: string;
    name: string;
    species: string;
    breed: string;
  };
  owner: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
  };
  provider: {
    providerUserId?: string | null;
    providerSourceId?: string | null;
    providerType: ProviderType;
    providerName: string;
    userName?: string | null;
    userPhone?: string | null;
  };
  appointmentService?: ProviderAppointmentService | null;
  serviceType: ServiceType;
  serviceTypeLabel: string;
  scheduledAt: string;
  endsAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  reason?: string | null;
  notes?: string | null;
  cancelReason?: string | null;
  confirmedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  rejectedAt?: string | null;
  rescheduledFrom?: {
    id: string;
    status: AppointmentStatus;
    scheduledAt: string;
  } | null;
  rescheduledTo?: {
    id: string;
    status: AppointmentStatus;
    scheduledAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  permissions: AppointmentPermissions;
}

export interface ProviderAppointmentService {
  id: string;
  title: string;
  description?: string | null;
  serviceType: ServiceType;
  serviceTypeLabel: string;
  durationMinutes: number;
  priceCents?: number | null;
  currencyCode: string;
  isActive: boolean;
  sortOrder: number;
}

export interface AppointmentListQuery {
  view?: "owner" | "provider" | "all";
  status?: AppointmentStatus[];
  petId?: string;
  providerType?: ProviderType;
  providerSourceId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface CreateAppointmentPayload {
  petId: string;
  appointmentServiceId?: string;
  providerType?: ProviderType;
  providerUserId?: string;
  providerSourceId?: string;
  providerName?: string;
  serviceType?: ServiceType;
  scheduledAt: string;
  durationMinutes?: number;
  reason?: string;
  notes?: string;
}

export interface RescheduleAppointmentPayload {
  scheduledAt: string;
  durationMinutes?: number;
  reason?: string;
  notes?: string;
}

export interface ScheduleAvailability {
  id: string;
  providerUserId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  serviceType?: ServiceType | null;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleAvailabilityWriteItem {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  serviceType?: ServiceType;
  timezone: string;
  isActive: boolean;
}

export interface ProviderAppointmentServiceWriteItem {
  title: string;
  description?: string;
  serviceType: ServiceType;
  durationMinutes: number;
  priceCents?: number;
  currencyCode: string;
  isActive: boolean;
  sortOrder: number;
}

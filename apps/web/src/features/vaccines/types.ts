export type VaccineStatus = "UP_TO_DATE" | "DUE_SOON" | "OVERDUE" | "NO_NEXT_DOSE";

export interface VaccineRecord {
  id: string;
  petId: string;
  vaccineName: string;
  appliedAt: string;
  nextDoseAt?: string | null;
  lotNumber?: string | null;
  providerName?: string | null;
  notes?: string | null;
  certificateUrl?: string | null;
  status: VaccineStatus;
  daysUntilDue?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface VaccineCardSummary {
  totalVaccines: number;
  overdueCount: number;
  dueSoonCount: number;
  upToDateCount: number;
  noNextDoseCount: number;
  overallStatus: "OVERDUE" | "DUE_SOON" | "UP_TO_DATE";
}

export interface PetVaccineCard {
  pet: {
    id: string;
    name: string;
    primaryPhotoUrl?: string | null;
    species: string;
    breed: string;
    birthDate?: string | null;
    microchipNumber?: string | null;
    healthStatus?: string | null;
    ownerName: string;
  };
  summary: VaccineCardSummary;
  history: VaccineRecord[];
  upcoming: VaccineRecord[];
  share: {
    privateUrl: string;
    publicUrl?: string | null;
    printableSheetUrl: string;
    printableCardUrl: string;
  };
}

export interface PublicVaccineCard {
  pet: {
    id: string;
    name: string;
    primaryPhotoUrl?: string | null;
    species: string;
    breed: string;
    birthDate?: string | null;
    ownerName: string;
  };
  summary: VaccineCardSummary;
  history: VaccineRecord[];
}

export type ReminderType =
  | "VACCINE"
  | "VACCINE_OVERDUE"
  | "DEWORMING"
  | "MEDICAL_CHECK"
  | "MEDICATION"
  | "GROOMING";

export interface Reminder {
  id: string;
  petId: string;
  userId: string;
  sourceVaccineRecordId?: string | null;
  type: ReminderType;
  title: string;
  message?: string | null;
  dueAt: string;
  sendEmail: boolean;
  sendInApp: boolean;
  sendPush: boolean;
  isActive: boolean;
  sentAt?: string | null;
  lastDispatch?: {
    channel: "EMAIL" | "IN_APP" | "PUSH";
    status: "SENT" | "SKIPPED" | "FAILED" | "PENDING_PUSH";
    sentAt?: string | null;
    errorMessage?: string | null;
  } | null;
}

export interface VaccineWritePayload {
  vaccineName: string;
  appliedAt: string;
  nextDoseAt?: string;
  lotNumber?: string;
  providerName?: string;
  notes?: string;
  certificateUrl?: string;
}

export interface ReminderWritePayload {
  type: ReminderType;
  title: string;
  message?: string;
  dueAt: string;
  sendEmail: boolean;
  sendInApp: boolean;
  sendPush: boolean;
}

export type LostPetAlertStatus = "ACTIVE" | "FOUND" | "CLOSED";

export interface LostPetAlert {
  id: string;
  pet: {
    id: string;
    name: string;
    primaryPhotoUrl?: string | null;
    species: string;
    breed: string;
    microchipNumber?: string | null;
  };
  owner: {
    id: string;
    fullName: string;
    phone?: string | null;
    city?: string | null;
  };
  status: LostPetAlertStatus;
  lastSeenAt: string;
  lastSeenLat: number;
  lastSeenLng: number;
  lastSeenAddress?: string | null;
  description?: string | null;
  emergencyNotes?: string | null;
  medicalPriority: boolean;
  searchRadiusKm: number;
  broadcastEnabled: boolean;
  shareToken: string;
  foundAt?: string | null;
  closedAt?: string | null;
  stats: {
    sightingsCount: number;
    lastSightingAt?: string | null;
  };
  distanceKm?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LostPetSighting {
  id: string;
  reporter?: {
    id: string;
    fullName: string;
  } | null;
  sightingAt: string;
  lat: number;
  lng: number;
  address?: string | null;
  comment?: string | null;
  photoUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface LostPetAlertDetail extends LostPetAlert {
  sightings: LostPetSighting[];
  permissions: {
    canEditAlert: boolean;
    canCloseAlert: boolean;
    canReportSighting: boolean;
  };
}

export interface LostPetAlertsQuery {
  status?: LostPetAlertStatus;
  activeOnly?: boolean;
  mine?: boolean;
  medicalPriority?: boolean;
  petId?: string;
  q?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  limit?: number;
}

export interface CreateLostPetAlertPayload {
  petId: string;
  lastSeenAt: string;
  lastSeenLat: number;
  lastSeenLng: number;
  lastSeenAddress?: string;
  description?: string;
  emergencyNotes?: string;
  medicalPriority: boolean;
  searchRadiusKm: number;
  broadcastEnabled: boolean;
}

export interface UpdateLostPetAlertPayload {
  status?: LostPetAlertStatus;
  lastSeenAt?: string;
  lastSeenLat?: number;
  lastSeenLng?: number;
  lastSeenAddress?: string;
  description?: string;
  emergencyNotes?: string;
  medicalPriority?: boolean;
  searchRadiusKm?: number;
  broadcastEnabled?: boolean;
}

export interface CreateLostPetSightingPayload {
  sightingAt?: string;
  lat: number;
  lng: number;
  address?: string;
  comment?: string;
  photoUrl?: string;
}

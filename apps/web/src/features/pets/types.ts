export type PetSex = "MALE" | "FEMALE" | "UNKNOWN";
export type PetSize = "XS" | "S" | "M" | "L" | "XL" | "UNKNOWN";

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  primaryPhotoUrl?: string | null;
  galleryUrls: string[];
  species: string;
  breed: string;
  sex: PetSex;
  birthDate?: string | null;
  ageYears?: number | null;
  weightKg?: number | null;
  color?: string | null;
  size: PetSize;
  isSterilized?: boolean | null;
  microchipNumber?: string | null;
  allergies?: string | null;
  diseases?: string | null;
  medications?: string | null;
  feeding?: string | null;
  usualVetName?: string | null;
  usualVetContact?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  generalNotes?: string | null;
  healthStatus?: string | null;
  isPublic: boolean;
  shareToken: string;
  shareUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface PetWritePayload {
  name: string;
  primaryPhotoUrl?: string;
  galleryUrls?: string[];
  species: string;
  breed: string;
  sex: PetSex;
  birthDate?: string;
  weightKg?: number;
  color?: string;
  size: PetSize;
  isSterilized?: boolean;
  microchipNumber?: string;
  allergies?: string;
  diseases?: string;
  medications?: string;
  feeding?: string;
  usualVetName?: string;
  usualVetContact?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  generalNotes?: string;
  healthStatus?: string;
  isPublic: boolean;
}

export interface PublicPetProfile {
  id: string;
  name: string;
  primaryPhotoUrl?: string | null;
  galleryUrls: string[];
  headline?: string | null;
  biography?: string | null;
  cityLabel?: string | null;
  traits: string[];
  species: string;
  breed: string;
  sex: PetSex;
  ageYears?: number | null;
  weightKg?: number | null;
  color?: string | null;
  size: PetSize;
  isSterilized?: boolean | null;
  allergies?: string | null;
  diseases?: string | null;
  medications?: string | null;
  feeding?: string | null;
  usualVetName?: string | null;
  usualVetContact?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  generalNotes?: string | null;
  owner: {
    fullName: string;
    phone?: string | null;
    city?: string | null;
    district?: string | null;
  };
}

export interface PetPublicProfileManaged {
  pet: {
    id: string;
    name: string;
    primaryPhotoUrl?: string | null;
    species: string;
    breed: string;
    ageYears?: number | null;
    shareToken: string;
    shareUrl: string;
  };
  publicProfile: {
    id: string;
    headline?: string | null;
    biography?: string | null;
    cityLabel?: string | null;
    traits: string[];
    visibility: {
      showOwnerName: boolean;
      showOwnerPhone: boolean;
      showHealthDetails: boolean;
      showEmergencyContacts: boolean;
    };
    createdAt: string;
    updatedAt: string;
  };
  preview: {
    ownerName?: string | null;
    ownerPhone?: string | null;
    healthSummary?: {
      allergies?: string | null;
      diseases?: string | null;
      medications?: string | null;
      feeding?: string | null;
      usualVetName?: string | null;
      usualVetContact?: string | null;
      generalNotes?: string | null;
    } | null;
    emergencyContacts?: {
      emergencyContactName?: string | null;
      emergencyContactPhone?: string | null;
    } | null;
  };
}

export type PetEmergencyStatus = "NORMAL" | "LOST" | "FOUND" | "IN_TREATMENT";

export interface PetPublicIdentityManaged {
  pet: {
    id: string;
    name: string;
    primaryPhotoUrl?: string | null;
    species: string;
    breed: string;
    ageYears?: number | null;
    microchipNumber?: string | null;
  };
  owner: {
    fullName: string;
    phone?: string | null;
    city?: string | null;
    district?: string | null;
  };
  identity: {
    id: string;
    publicToken: string;
    emergencyStatus: PetEmergencyStatus;
    secondaryContactName?: string | null;
    secondaryContactPhone?: string | null;
    cityZone?: string | null;
    emergencyInstructions?: string | null;
    nfcCode?: string | null;
    visibility: {
      showOwnerName: boolean;
      showOwnerPhone: boolean;
      showSecondaryContact: boolean;
      showCityZone: boolean;
      showAllergies: boolean;
      showDiseases: boolean;
      showMedications: boolean;
      showUsualVet: boolean;
      showEmergencyInstructions: boolean;
      showGeneralNotes: boolean;
    };
    urls: {
      publicUrl: string;
      qrImageUrl: string;
      publicApiUrl: string;
    };
    createdAt: string;
    updatedAt: string;
  };
  preview: {
    ownerName?: string | null;
    ownerPhone?: string | null;
    secondaryContact?: {
      name?: string | null;
      phone?: string | null;
    } | null;
    cityZone?: string | null;
    allergies?: string | null;
    diseases?: string | null;
    medications?: string | null;
    usualVet?: {
      name?: string | null;
      contact?: string | null;
    } | null;
    emergencyInstructions?: string | null;
    generalNotes?: string | null;
  };
}

export interface PetPublicIdentityWritePayload {
  emergencyStatus: PetEmergencyStatus;
  secondaryContactName?: string;
  secondaryContactPhone?: string;
  cityZone?: string;
  emergencyInstructions?: string;
  nfcCode?: string;
  showOwnerName: boolean;
  showOwnerPhone: boolean;
  showSecondaryContact: boolean;
  showCityZone: boolean;
  showAllergies: boolean;
  showDiseases: boolean;
  showMedications: boolean;
  showUsualVet: boolean;
  showEmergencyInstructions: boolean;
  showGeneralNotes: boolean;
}

export interface PetPublicProfileWritePayload {
  headline?: string;
  biography?: string;
  cityLabel?: string;
  traits?: string[];
  showOwnerName: boolean;
  showOwnerPhone: boolean;
  showHealthDetails: boolean;
  showEmergencyContacts: boolean;
}

export interface PublicEmergencyPetProfile {
  pet: {
    id: string;
    name: string;
    primaryPhotoUrl?: string | null;
    species: string;
    breed: string;
    ageYears?: number | null;
    emergencyStatus: PetEmergencyStatus;
  };
  contacts: {
    ownerName?: string | null;
    ownerPhone?: string | null;
    secondaryContact?: {
      name?: string | null;
      phone?: string | null;
    } | null;
    cityZone?: string | null;
  };
  health: {
    allergies?: string | null;
    diseases?: string | null;
    medications?: string | null;
    usualVet?: {
      name?: string | null;
      contact?: string | null;
    } | null;
    emergencyInstructions?: string | null;
    generalNotes?: string | null;
  };
  identity: {
    publicToken: string;
    publicUrl: string;
    qrImageUrl: string;
    nfcCode?: string | null;
    updatedAt: string;
  };
}

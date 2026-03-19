import type { UserRole } from "@/features/auth/types";

export interface BaseUserProfile {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  city?: string | null;
  emailVerifiedAt?: string | null;
}

export interface OwnerProfile {
  avatarUrl?: string | null;
  district?: string | null;
  approximateAddress?: string | null;
  biography?: string | null;
  notificationPreferences?: {
    email?: boolean;
    inApp?: boolean;
    push?: boolean;
  } | null;
}

export interface VetProfile {
  clinicName?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  district?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  openingHours?: string[] | null;
  services?: string[] | null;
  referencePrices?: string[] | null;
  isEmergency24x7?: boolean | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  description?: string | null;
  websiteUrl?: string | null;
  socialLinks?: string[] | null;
}

export interface CaregiverProfile {
  avatarUrl?: string | null;
  introduction?: string | null;
  experience?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  services?: string[] | null;
  coverageAreas?: string[] | null;
  rates?: string[] | null;
  schedule?: string[] | null;
}

export interface ShopProfile {
  businessName?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  district?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  basicCatalog?: string[] | null;
  openingHours?: string[] | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  websiteUrl?: string | null;
  discounts?: string[] | null;
}

export interface GroomerProfile {
  id?: string;
  businessName?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  address?: string | null;
  district?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  openingHours?: string[] | null;
  services?: string[] | null;
  referencePrices?: string[] | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  websiteUrl?: string | null;
  ratingAverage?: number | null;
  reviewsCount?: number;
}

export interface MyProfile {
  user: BaseUserProfile;
  ownerProfile?: OwnerProfile | null;
  vetProfile?: VetProfile | null;
  caregiverProfile?: CaregiverProfile | null;
  shopProfile?: ShopProfile | null;
  groomerProfile?: GroomerProfile | null;
}

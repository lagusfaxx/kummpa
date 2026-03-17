export type UserRole = "OWNER" | "VET" | "CAREGIVER" | "SHOP" | "ADMIN";

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
}

export interface PetSummary {
  id: string;
  ownerId: string;
  name: string;
  species: string;
  breed?: string;
  photoUrl?: string;
  isPublic: boolean;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface ServiceCard {
  id: string;
  name: string;
  category:
    | "vet"
    | "clinic24"
    | "shop"
    | "caregiver"
    | "grooming"
    | "hotel"
    | "park";
  location: GeoPoint;
  city?: string;
}

export type AppModule =
  | "auth"
  | "pets"
  | "vaccines"
  | "appointments"
  | "map"
  | "lostPets"
  | "community"
  | "forum"
  | "benefits"
  | "marketplace"
  | "news";

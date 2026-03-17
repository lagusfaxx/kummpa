export type MapServiceType =
  | "VET"
  | "CAREGIVER"
  | "SHOP"
  | "GROOMING"
  | "HOTEL"
  | "PARK"
  | "LOST_PET";

export type MapSortBy = "relevance" | "distance" | "recent" | "rating";
export type MapSuggestionKind = "name" | "address" | "city" | "district" | "service";

export interface MapServicesQuery {
  q?: string;
  service?: string;
  city?: string;
  district?: string;
  types?: MapServiceType[];
  openNow?: boolean;
  emergencyOnly?: boolean;
  withDiscount?: boolean;
  atHomeOnly?: boolean;
  featuredOnly?: boolean;
  includeLostPets?: boolean;
  minRating?: number;
  priceMin?: number;
  priceMax?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sortBy?: MapSortBy;
  limit?: number;
}

export interface MapServicePoint {
  id: string;
  sourceId: string;
  type: MapServiceType;
  name: string;
  subtitle: string | null;
  description: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string | null;
  district: string | null;
  phone: string | null;
  imageUrl: string | null;
  services: string[];
  openingHours: string[];
  priceInfo: string[];
  priceFrom: number | null;
  hasDiscount: boolean;
  discountLabel: string | null;
  isEmergency24x7: boolean;
  isOpenNow: boolean | null;
  medicalPriority: boolean;
  supportsAtHome: boolean;
  isFeatured: boolean;
  rating: number | null;
  reviewsCount: number;
  distanceKm: number | null;
  bookingUrl: string | null;
  profileUrl: string | null;
  createdAt: string;
}

export interface MapServicesResponse {
  items: MapServicePoint[];
  meta: {
    total: number;
    returned: number;
    limit: number;
    countsByType: Record<MapServiceType, number>;
    referenceLocation: {
      lat: number;
      lng: number;
      radiusKm: number;
    } | null;
  };
}

export interface MapSuggestion {
  value: string;
  kind: MapSuggestionKind;
  type?: MapServiceType;
}

export interface MapSuggestionsQuery {
  q: string;
  limit?: number;
}

export interface MapSuggestionsResponse {
  items: MapSuggestion[];
}

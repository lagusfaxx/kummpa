export type MarketplaceListingCondition = "NEW" | "USED";
export type MarketplaceCategory =
  | "BED"
  | "CARRIER"
  | "TOY"
  | "LEASH"
  | "CAGE"
  | "CLOTHES"
  | "FEEDER"
  | "ACCESSORY"
  | "OTHER";

export type MarketplaceReportStatus = "OPEN" | "REVIEWED" | "DISMISSED";

export interface MarketplaceUserSummary {
  id: string;
  fullName: string;
  role: string;
  handle?: string | null;
  avatarUrl?: string | null;
}

export interface MarketplaceListing {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  condition: MarketplaceListingCondition;
  category: MarketplaceCategory;
  photoUrls: string[];
  city?: string | null;
  district?: string | null;
  location: {
    latitude: number | null;
    longitude: number | null;
  };
  isActive: boolean;
  isFeatured: boolean;
  featuredUntil?: string | null;
  seller: MarketplaceUserSummary;
  stats: {
    favoritesCount: number;
    conversationsCount: number;
  };
  viewer: {
    isSeller: boolean;
    isFavorite: boolean;
    canEdit: boolean;
    canChat: boolean;
    canFeature: boolean;
    conversationId?: string | null;
  };
  stockQuantity?: number | null;
  distanceKm?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceListingQuery {
  q?: string;
  category?: MarketplaceCategory;
  condition?: MarketplaceListingCondition;
  city?: string;
  district?: string;
  priceMin?: number;
  priceMax?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  mine?: boolean;
  favoritesOnly?: boolean;
  includeInactive?: boolean;
  sortBy?: "recent" | "distance" | "price_asc" | "price_desc";
  limit?: number;
  sellerId?: string;
}

export interface MarketplaceCreateListingPayload {
  title: string;
  description: string;
  priceCents: number;
  condition: MarketplaceListingCondition;
  category: MarketplaceCategory;
  photoUrls: string[];
  city?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  stockQuantity?: number | null;
}

export interface MarketplaceFavoriteSnapshot {
  listingId: string;
  favoritesCount: number;
  isFavorite: boolean;
}

export interface MarketplaceConversation {
  id: string;
  listing: {
    id: string;
    title: string;
    priceCents: number;
    primaryPhotoUrl?: string | null;
    isActive: boolean;
  };
  participants: {
    buyer: MarketplaceUserSummary;
    seller: MarketplaceUserSummary;
  };
  metrics: {
    messagesCount: number;
  };
  lastMessage?: {
    id: string;
    body: string;
    sender: {
      id: string;
      fullName: string;
    };
    createdAt: string;
  } | null;
  viewer: {
    isBuyer: boolean;
    isSeller: boolean;
    canSend: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceMessage {
  id: string;
  body: string;
  sender: {
    id: string;
    fullName: string;
    role: string;
  };
  isMine: boolean;
  createdAt: string;
}

export interface MarketplaceConversationMessages {
  conversation: MarketplaceConversation;
  messages: MarketplaceMessage[];
}

export interface MarketplaceReport {
  id: string;
  listing: {
    id: string;
    title: string;
    sellerId: string;
    isActive: boolean;
  };
  reason: string;
  status: MarketplaceReportStatus;
  reporter: {
    id: string;
    fullName: string;
  };
  review: {
    reviewedAt?: string | null;
    reviewNotes?: string | null;
    reviewedBy?: {
      id: string;
      fullName: string;
    } | null;
  };
  createdAt: string;
  updatedAt: string;
}

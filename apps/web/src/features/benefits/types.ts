export type BenefitValidityStatus = "ACTIVE" | "UPCOMING" | "EXPIRED" | "INACTIVE";
export type BenefitRedemptionStatus = "ACTIVE" | "USED" | "CANCELLED" | "EXPIRED";
export type BenefitProviderType =
  | "VET"
  | "CAREGIVER"
  | "SHOP"
  | "GROOMING"
  | "HOTEL"
  | "OTHER";

export interface BenefitRedemptionSnapshot {
  id: string;
  activationCode: string;
  status: BenefitRedemptionStatus;
  expiresAt: string;
  usedAt?: string | null;
  cancelledAt?: string | null;
}

export interface BenefitItem {
  id: string;
  title: string;
  summary: string;
  description?: string | null;
  provider: {
    type: BenefitProviderType;
    name?: string | null;
  };
  discountLabel?: string | null;
  couponCode?: string | null;
  terms?: string | null;
  landingUrl?: string | null;
  location: {
    city?: string | null;
    district?: string | null;
  };
  validity: {
    status: BenefitValidityStatus;
    validFrom: string;
    validTo: string;
    daysRemaining: number;
  };
  flags: {
    isFeatured: boolean;
    isActive: boolean;
  };
  stats: {
    savesCount: number;
    redemptionsCount: number;
    maxRedemptions?: number | null;
  };
  viewer: {
    isSaved: boolean;
    canRedeem: boolean;
    redemption?: BenefitRedemptionSnapshot | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BenefitListQuery {
  q?: string;
  city?: string;
  district?: string;
  providerType?: BenefitProviderType;
  featuredOnly?: boolean;
  savedOnly?: boolean;
  activeOnly?: boolean;
  validOnly?: boolean;
  sortBy?: "featured" | "recent" | "expiring";
  limit?: number;
}

export interface BenefitRedemptionItem {
  id: string;
  activationCode: string;
  status: BenefitRedemptionStatus;
  expiresAt: string;
  usedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  benefit: {
    id: string;
    title: string;
    summary: string;
    discountLabel?: string | null;
    couponCode?: string | null;
    provider: {
      type: BenefitProviderType;
      name?: string | null;
    };
    validTo: string;
  };
}

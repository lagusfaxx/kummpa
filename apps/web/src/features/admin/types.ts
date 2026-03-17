import type { UserRole } from "@/features/auth/types";

export interface AdminSummary {
  users: {
    active: number;
    deleted: number;
    unverified: number;
    newLast7d: number;
  };
  pets: {
    active: number;
    deleted: number;
    public: number;
    newLast7d: number;
  };
  appointments: {
    total: number;
    pending: number;
    confirmed: number;
    upcoming: number;
  };
  moderation: {
    communityReportsOpen: number;
    forumReportsOpen: number;
    lostPetAlertsActive: number;
  };
  content: {
    activeBenefits: number;
    publishedNews: number;
    activeSocialPosts: number;
  };
}

export interface AdminUserItem {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string | null;
  lastName?: string | null;
  fullName: string;
  phone?: string | null;
  city?: string | null;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  flags: {
    isDeleted: boolean;
    isVerified: boolean;
  };
  stats: {
    petsCount: number;
    postsCount: number;
    providedAppointmentsCount: number;
  };
}

export interface AdminPetItem {
  id: string;
  name: string;
  species: string;
  breed: string;
  isPublic: boolean;
  shareToken: string;
  shareUrl: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  owner: {
    id: string;
    email: string;
    fullName: string;
  };
  flags: {
    isDeleted: boolean;
  };
  stats: {
    vaccinesCount: number;
    appointmentsCount: number;
    lostAlertsCount: number;
  };
}

export interface AdminUsersQuery {
  q?: string;
  role?: UserRole;
  status?: "active" | "deleted" | "unverified" | "all";
  limit?: number;
}

export interface AdminPetsQuery {
  q?: string;
  ownerId?: string;
  species?: string;
  visibility?: "public" | "private" | "all";
  status?: "active" | "deleted" | "all";
  limit?: number;
}

export type UserRole = "OWNER" | "VET" | "CAREGIVER" | "SHOP" | "GROOMING" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string | null;
  lastName?: string | null;
  emailVerifiedAt?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSession {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface RegisterPayload {
  email: string;
  password: string;
  role: Exclude<UserRole, "ADMIN">;
  /* Personal account (OWNER / CAREGIVER) */
  firstName?: string;
  lastName?: string;
  city?: string;
  /* All accounts */
  phone?: string;
  /* Business accounts (SHOP / VET / GROOMING) */
  businessName?: string;
  address?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: {
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

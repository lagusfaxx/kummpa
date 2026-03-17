import type { UserRole } from "@prisma/client";

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  sessionId: string;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  type: "refresh";
}

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  sessionId: string;
}

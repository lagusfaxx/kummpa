import { randomBytes, createHash } from "crypto";
import type { UserRole } from "@prisma/client";
import { sign, verify } from "jsonwebtoken";
import ms from "ms";
import { env } from "../../config/env";
import type { AccessTokenPayload, RefreshTokenPayload } from "./auth.types";

const JWT_ISSUER = "kumpa-api";

function parseDuration(value: string): number {
  const parsed = ms(value);
  if (typeof parsed !== "number") {
    throw new Error(`Invalid duration format: ${value}`);
  }
  return parsed;
}

function signToken<TPayload extends object>(
  payload: TPayload,
  secret: string,
  expiresIn: string
): string {
  return sign(payload, secret, { expiresIn, issuer: JWT_ISSUER });
}

export function generateSessionTokens(input: {
  userId: string;
  role: UserRole;
  sessionId: string;
}) {
  const accessToken = signToken<AccessTokenPayload>(
    {
      sub: input.userId,
      role: input.role,
      sessionId: input.sessionId,
      type: "access"
    },
    env.JWT_ACCESS_SECRET,
    env.JWT_ACCESS_EXPIRES_IN
  );

  const refreshToken = signToken<RefreshTokenPayload>(
    {
      sub: input.userId,
      sessionId: input.sessionId,
      type: "refresh"
    },
    env.JWT_REFRESH_SECRET,
    env.JWT_REFRESH_EXPIRES_IN
  );

  return {
    accessToken,
    refreshToken
  };
}

export function getRefreshTokenExpiryDate(): Date {
  return new Date(Date.now() + parseDuration(env.JWT_REFRESH_EXPIRES_IN));
}

export function getEmailVerificationExpiryDate(): Date {
  return new Date(Date.now() + parseDuration(env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN));
}

export function getPasswordResetExpiryDate(): Date {
  return new Date(Date.now() + parseDuration(env.PASSWORD_RESET_TOKEN_EXPIRES_IN));
}

export function generateOneTimeToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function verifyAccessToken(rawToken: string): AccessTokenPayload {
  const decoded = verify(rawToken, env.JWT_ACCESS_SECRET, { issuer: JWT_ISSUER });
  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }

  if (
    typeof decoded.sub !== "string" ||
    typeof decoded.role !== "string" ||
    typeof decoded.sessionId !== "string" ||
    decoded.type !== "access"
  ) {
    throw new Error("Invalid access token");
  }

  return decoded as AccessTokenPayload;
}

export function verifyRefreshToken(rawToken: string): RefreshTokenPayload {
  const decoded = verify(rawToken, env.JWT_REFRESH_SECRET, { issuer: JWT_ISSUER });
  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }

  if (
    typeof decoded.sub !== "string" ||
    typeof decoded.sessionId !== "string" ||
    decoded.type !== "refresh"
  ) {
    throw new Error("Invalid refresh token");
  }

  return decoded as RefreshTokenPayload;
}

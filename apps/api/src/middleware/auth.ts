import type { UserRole } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http-error";
import { prisma } from "../lib/prisma";
import { verifyAccessToken } from "../modules/auth/auth.utils";

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.authorization;
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const rawToken = getBearerToken(req);

  if (!rawToken) {
    return next(new HttpError(401, "Missing bearer token"));
  }

  try {
    const payload = verifyAccessToken(rawToken);
    const session = await prisma.authSession.findFirst({
      where: {
        id: payload.sessionId,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!session) {
      return next(new HttpError(401, "Session is no longer valid"));
    }

    req.authUser = {
      id: payload.sub,
      role: payload.role,
      sessionId: payload.sessionId
    };

    return next();
  } catch {
    return next(new HttpError(401, "Invalid or expired access token"));
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return next(new HttpError(401, "Authentication required"));
    }

    if (!roles.includes(req.authUser.role)) {
      return next(new HttpError(403, "Forbidden: role does not have access"));
    }

    return next();
  };
}

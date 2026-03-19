import { randomUUID } from "crypto";
import type { User, UserRole } from "@prisma/client";
import { env } from "../../config/env";
import { HttpError } from "../../lib/http-error";
import { prisma } from "../../lib/prisma";
import {
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail
} from "../notifications/email.service";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput
} from "./auth.schemas";
import {
  generateOneTimeToken,
  generateSessionTokens,
  getEmailVerificationExpiryDate,
  getPasswordResetExpiryDate,
  getRefreshTokenExpiryDate,
  hashToken,
  verifyRefreshToken
} from "./auth.utils";
import { hashPassword, verifyPassword } from "./password.service";
import type { AuthenticatedUser } from "./auth.types";

interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

interface PublicAuthUser {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string | null;
  lastName?: string | null;
  emailVerifiedAt?: string | null;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function serializeUser(user: User): PublicAuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null
  };
}

async function createSessionForUser(user: User, metadata: RequestMetadata): Promise<TokenPair> {
  const sessionId = randomUUID();
  const tokens = generateSessionTokens({
    userId: user.id,
    role: user.role,
    sessionId
  });

  await prisma.authSession.create({
    data: {
      id: sessionId,
      userId: user.id,
      refreshTokenHash: hashToken(tokens.refreshToken),
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
      expiresAt: getRefreshTokenExpiryDate()
    }
  });

  return tokens;
}

async function issueVerificationEmail(user: User) {
  const rawToken = generateOneTimeToken();

  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: getEmailVerificationExpiryDate()
    }
  });

  const verificationUrl = `${env.APP_BASE_URL}/verify-email?token=${rawToken}`;
  return sendEmailVerificationEmail({
    to: user.email,
    firstName: user.firstName,
    verificationUrl
  });
}

export async function registerUser(input: RegisterInput, metadata: RequestMetadata) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email
    }
  });

  if (existingUser && !existingUser.deletedAt) {
    throw new HttpError(409, "Email is already registered");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      phone: input.phone ?? null,
      city: input.city ?? null,
      role: input.role
    }
  });

  /* Auto-create the role-specific profile with data collected at registration */
  const locationData = {
    address: input.address ?? null,
    city: input.city ?? null,
    district: input.district ?? null,
    latitude: input.latitude != null ? input.latitude : null,
    longitude: input.longitude != null ? input.longitude : null,
    contactPhone: input.phone ?? null
  };

  if (input.role === "SHOP") {
    await prisma.shopProfile.create({
      data: {
        userId: user.id,
        businessName: input.businessName ?? null,
        ...locationData
      }
    });
  } else if (input.role === "VET") {
    await prisma.vetProfile.create({
      data: {
        userId: user.id,
        clinicName: input.businessName ?? null,
        ...locationData
      }
    });
  } else if (input.role === "GROOMING") {
    await prisma.groomerProfile.create({
      data: {
        userId: user.id,
        businessName: input.businessName ?? null,
        ...locationData
      }
    });
  } else if (input.role === "OWNER") {
    await prisma.ownerProfile.create({
      data: { userId: user.id }
    });
  }

  const tokens = await createSessionForUser(user, metadata);
  const [welcomeSent, verificationSent] = await Promise.all([
    sendWelcomeEmail({ to: user.email, firstName: user.firstName }),
    issueVerificationEmail(user)
  ]);

  return {
    user: serializeUser(user),
    tokens,
    delivery: {
      welcomeSent,
      verificationSent
    }
  };
}

export async function loginUser(input: LoginInput, metadata: RequestMetadata) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email
    }
  });

  if (!user || user.deletedAt) {
    throw new HttpError(401, "Invalid credentials");
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new HttpError(401, "Invalid credentials");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date()
    }
  });

  const tokens = await createSessionForUser(user, metadata);
  return {
    user: serializeUser(user),
    tokens,
    emailVerified: Boolean(user.emailVerifiedAt)
  };
}

export async function refreshSession(refreshToken: string, metadata: RequestMetadata) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new HttpError(401, "Invalid refresh token");
  }

  const existingSession = await prisma.authSession.findUnique({
    where: {
      id: payload.sessionId
    }
  });

  if (!existingSession || existingSession.userId !== payload.sub) {
    throw new HttpError(401, "Session is not valid");
  }

  if (existingSession.revokedAt || existingSession.expiresAt <= new Date()) {
    throw new HttpError(401, "Session has expired");
  }

  const incomingHash = hashToken(refreshToken);
  if (incomingHash !== existingSession.refreshTokenHash) {
    await prisma.authSession.update({
      where: {
        id: existingSession.id
      },
      data: {
        revokedAt: new Date()
      }
    });
    throw new HttpError(401, "Refresh token rotation mismatch");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: payload.sub
    }
  });

  if (!user || user.deletedAt) {
    throw new HttpError(401, "User not found");
  }

  const tokens = generateSessionTokens({
    userId: user.id,
    role: user.role,
    sessionId: existingSession.id
  });

  await prisma.authSession.update({
    where: {
      id: existingSession.id
    },
    data: {
      refreshTokenHash: hashToken(tokens.refreshToken),
      expiresAt: getRefreshTokenExpiryDate(),
      userAgent: metadata.userAgent ?? existingSession.userAgent,
      ipAddress: metadata.ipAddress ?? existingSession.ipAddress
    }
  });

  return {
    user: serializeUser(user),
    tokens
  };
}

export async function logoutUser(refreshToken: string) {
  try {
    const payload = verifyRefreshToken(refreshToken);
    await prisma.authSession.updateMany({
      where: {
        id: payload.sessionId,
        userId: payload.sub,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
  } catch {
    return {
      ok: true
    };
  }

  return {
    ok: true
  };
}

export async function getCurrentUser(authUser: AuthenticatedUser) {
  const user = await prisma.user.findFirst({
    where: {
      id: authUser.id,
      deletedAt: null
    }
  });

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  return serializeUser(user);
}

export async function verifyEmailToken(input: VerifyEmailInput) {
  const tokenHash = hashToken(input.token);
  const verification = await prisma.emailVerificationToken.findUnique({
    where: {
      tokenHash
    }
  });

  if (!verification || verification.usedAt || verification.expiresAt <= new Date()) {
    throw new HttpError(400, "Verification token is invalid or expired");
  }

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: {
        id: verification.id
      },
      data: {
        usedAt: new Date()
      }
    }),
    prisma.emailVerificationToken.updateMany({
      where: {
        userId: verification.userId,
        usedAt: null,
        id: {
          not: verification.id
        }
      },
      data: {
        usedAt: new Date()
      }
    }),
    prisma.user.update({
      where: {
        id: verification.userId
      },
      data: {
        emailVerifiedAt: new Date()
      }
    })
  ]);
}

export async function requestEmailVerification(email: string) {
  const user = await prisma.user.findFirst({
    where: {
      email,
      deletedAt: null
    }
  });

  if (!user || user.emailVerifiedAt) {
    return {
      accepted: true
    };
  }

  await prisma.emailVerificationToken.updateMany({
    where: {
      userId: user.id,
      usedAt: null
    },
    data: {
      usedAt: new Date()
    }
  });

  await issueVerificationEmail(user);
  return {
    accepted: true
  };
}

export async function requestPasswordReset(input: ForgotPasswordInput) {
  const user = await prisma.user.findFirst({
    where: {
      email: input.email,
      deletedAt: null
    }
  });

  if (!user) {
    return {
      accepted: true
    };
  }

  await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      usedAt: null
    },
    data: {
      usedAt: new Date()
    }
  });

  const rawToken = generateOneTimeToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: getPasswordResetExpiryDate()
    }
  });

  const resetUrl = `${env.APP_BASE_URL}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail({
    to: user.email,
    firstName: user.firstName,
    resetUrl
  });

  return {
    accepted: true
  };
}

export async function resetPassword(input: ResetPasswordInput) {
  const tokenHash = hashToken(input.token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: {
      tokenHash
    }
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
    throw new HttpError(400, "Reset token is invalid or expired");
  }

  const passwordHash = await hashPassword(input.newPassword);

  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: {
        id: resetToken.id
      },
      data: {
        usedAt: new Date()
      }
    }),
    prisma.passwordResetToken.updateMany({
      where: {
        userId: resetToken.userId,
        usedAt: null,
        id: {
          not: resetToken.id
        }
      },
      data: {
        usedAt: new Date()
      }
    }),
    prisma.authSession.updateMany({
      where: {
        userId: resetToken.userId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    }),
    prisma.user.update({
      where: {
        id: resetToken.userId
      },
      data: {
        passwordHash
      }
    })
  ]);
}

import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validate-request";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  requestVerifyEmailSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RefreshInput,
  type RegisterInput,
  type RequestVerifyEmailInput,
  type ResetPasswordInput,
  type VerifyEmailInput
} from "./auth.schemas";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshSession,
  registerUser,
  requestEmailVerification,
  requestPasswordReset,
  resetPassword,
  verifyEmailToken
} from "./auth.service";

export const authRouter = Router();

authRouter.post(
  "/register",
  validateRequest(registerSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as RegisterInput;
    const data = await registerUser(payload, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });

    res.status(201).json({
      ok: true,
      data
    });
  })
);

authRouter.post(
  "/login",
  validateRequest(loginSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as LoginInput;
    const data = await loginUser(payload, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });

    res.status(200).json({
      ok: true,
      data
    });
  })
);

authRouter.post(
  "/refresh",
  validateRequest(refreshSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as RefreshInput;
    const data = await refreshSession(payload.refreshToken, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });

    res.status(200).json({
      ok: true,
      data
    });
  })
);

authRouter.post(
  "/logout",
  validateRequest(refreshSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as RefreshInput;
    const data = await logoutUser(payload.refreshToken);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

authRouter.get(
  "/me",
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    const user = await getCurrentUser(req.authUser!);
    res.status(200).json({
      ok: true,
      data: {
        user
      }
    });
  })
);

authRouter.get(
  "/admin/check",
  asyncHandler(requireAuth),
  requireRoles("ADMIN"),
  (_req, res) => {
    res.status(200).json({
      ok: true,
      data: {
        message: "Admin access granted"
      }
    });
  }
);

authRouter.post(
  "/verify-email",
  validateRequest(verifyEmailSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as VerifyEmailInput;
    await verifyEmailToken(payload);

    res.status(200).json({
      ok: true,
      data: {
        message: "Email verified successfully"
      }
    });
  })
);

authRouter.post(
  "/verify-email/request",
  validateRequest(requestVerifyEmailSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as RequestVerifyEmailInput;
    const data = await requestEmailVerification(payload.email);

    res.status(200).json({
      ok: true,
      data: {
        message: "If your account exists, a verification email was sent",
        ...data
      }
    });
  })
);

authRouter.post(
  "/forgot-password",
  validateRequest(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as ForgotPasswordInput;
    const data = await requestPasswordReset(payload);

    res.status(200).json({
      ok: true,
      data: {
        message: "If your account exists, a password reset email was sent",
        ...data
      }
    });
  })
);

authRouter.post(
  "/reset-password",
  validateRequest(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as ResetPasswordInput;
    await resetPassword(payload);

    res.status(200).json({
      ok: true,
      data: {
        message: "Password has been reset successfully"
      }
    });
  })
);

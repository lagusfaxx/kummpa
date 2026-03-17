import { UserRole } from "@prisma/client";
import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .email("Debes ingresar un email valido")
  .max(255)
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, "La contrasena debe tener al menos 8 caracteres")
  .max(128)
  .regex(/[A-Z]/, "La contrasena debe incluir una mayuscula")
  .regex(/[a-z]/, "La contrasena debe incluir una minuscula")
  .regex(/[0-9]/, "La contrasena debe incluir un numero");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80).optional(),
  role: z
    .enum([UserRole.OWNER, UserRole.VET, UserRole.CAREGIVER, UserRole.SHOP])
    .default(UserRole.OWNER)
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20)
});

export const verifyEmailSchema = z.object({
  token: z.string().min(20)
});

export const requestVerifyEmailSchema = z.object({
  email: emailSchema
});

export const forgotPasswordSchema = z.object({
  email: emailSchema
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  newPassword: passwordSchema
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type RequestVerifyEmailInput = z.infer<typeof requestVerifyEmailSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

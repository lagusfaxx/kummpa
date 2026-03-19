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

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    firstName: z.string().trim().min(2).max(80).optional(),
    lastName: z.string().trim().min(2).max(80).optional(),
    phone: z.string().trim().min(7).max(30).optional(),
    role: z
      .enum([UserRole.OWNER, UserRole.VET, UserRole.CAREGIVER, UserRole.SHOP, UserRole.GROOMING])
      .default(UserRole.OWNER),
    businessName: z.string().trim().min(2).max(120).optional(),
    address: z.string().trim().max(300).optional(),
    city: z.string().trim().max(120).optional(),
    district: z.string().trim().max(120).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional()
  })
  .refine(
    (data) => {
      if (data.role === UserRole.OWNER || data.role === UserRole.CAREGIVER) {
        return !!data.firstName && data.firstName.trim().length >= 2;
      }
      return true;
    },
    { message: "Name is required for personal accounts", path: ["firstName"] }
  )
  .refine(
    (data) => {
      if (
        data.role === UserRole.SHOP ||
        data.role === UserRole.VET ||
        data.role === UserRole.GROOMING
      ) {
        return !!data.businessName && data.businessName.trim().length >= 2;
      }
      return true;
    },
    { message: "Business name is required", path: ["businessName"] }
  );

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

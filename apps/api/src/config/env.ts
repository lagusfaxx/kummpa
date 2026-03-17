import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  APP_BASE_URL: z.string().url(),
  CORS_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  EMAIL_VERIFICATION_TOKEN_EXPIRES_IN: z.string().default("24h"),
  PASSWORD_RESET_TOKEN_EXPIRES_IN: z.string().default("1h"),
  VACCINE_DUE_SOON_DAYS: z.coerce.number().int().positive().default(30),
  REMINDER_DISPATCH_BATCH_LIMIT: z.coerce.number().int().positive().default(100),
  APPOINTMENT_DEFAULT_DURATION_MINUTES: z.coerce.number().int().min(15).max(240).default(30),
  APPOINTMENT_MIN_NOTICE_MINUTES: z.coerce.number().int().min(0).max(43200).default(30),
  MAPBOX_ACCESS_TOKEN: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().email(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info")
});

const platformPort = process.env.PORT?.trim();

const parsed = envSchema.safeParse({
  ...process.env,
  API_PORT: platformPort || process.env.API_PORT
});

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Environment validation failed");
}

export const env = parsed.data;

-- CreateEnum
CREATE TYPE "EmailTemplateKey" AS ENUM ('AUTH_WELCOME', 'AUTH_VERIFY_EMAIL', 'AUTH_PASSWORD_RESET', 'APPOINTMENT_CREATED', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELLED', 'APPOINTMENT_RESCHEDULED', 'REMINDER_GENERIC', 'REMINDER_VACCINE_DUE', 'REMINDER_VACCINE_OVERDUE', 'LOST_PET_ALERT_ACTIVATED', 'LOST_PET_SIGHTING_REPORTED');

-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable
CREATE TABLE "EmailDispatchLog" (
    "id" TEXT NOT NULL,
    "templateKey" "EmailTemplateKey" NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "EmailDeliveryStatus" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailDispatchLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailDispatchLog_templateKey_createdAt_idx" ON "EmailDispatchLog"("templateKey", "createdAt");

-- CreateIndex
CREATE INDEX "EmailDispatchLog_status_createdAt_idx" ON "EmailDispatchLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EmailDispatchLog_toEmail_createdAt_idx" ON "EmailDispatchLog"("toEmail", "createdAt");


import { EmailDeliveryStatus, EmailTemplateKey, Prisma, ReminderType } from "@prisma/client";
import { Resend } from "resend";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");
  if (!_resend) _resend = new Resend(env.RESEND_API_KEY);
  return _resend;
}
const EMAIL_MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [0, 600, 1500] as const;

interface TemplateField {
  label: string;
  value?: string | null;
}

interface MailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  templateKey: EmailTemplateKey;
  metadata?: Prisma.InputJsonValue;
}

interface RenderTemplateInput {
  title: string;
  greeting: string;
  messageLines: string[];
  fields?: TemplateField[];
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateLabel(value: Date): string {
  return (
    new Intl.DateTimeFormat("es-CL", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC"
    }).format(value) + " UTC"
  );
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown email provider error";
  }
}

async function wait(ms: number) {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function renderTemplate(input: RenderTemplateInput) {
  const fields = (input.fields ?? []).filter((field) => Boolean(field.value));
  const escapedTitle = escapeHtml(input.title);
  const escapedGreeting = escapeHtml(input.greeting);
  const messageHtml = input.messageLines
    .filter((line) => Boolean(line))
    .map((line) => `<p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:1.6;">${escapeHtml(line)}</p>`)
    .join("");

  const fieldsHtml =
    fields.length === 0
      ? ""
      : `<div style="margin:16px 0;padding:14px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;">
${fields
  .map(
    (field) =>
      `<p style="margin:0 0 8px;color:#0f172a;font-size:14px;"><strong>${escapeHtml(field.label)}:</strong> ${escapeHtml(field.value ?? "")}</p>`
  )
  .join("")}
</div>`;

  const ctaHtml =
    input.ctaLabel && input.ctaUrl
      ? `<p style="margin:18px 0 0;"><a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">${escapeHtml(input.ctaLabel)}</a></p>`
      : "";

  const footerText = input.footerNote ?? `Este correo fue enviado por Kumpa. Soporte: ${env.EMAIL_FROM}`;
  const escapedFooter = escapeHtml(footerText);

  const html = `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:20px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
      <div style="padding:14px 20px;background:#0f172a;color:#ffffff;font-weight:800;letter-spacing:0.02em;">KUMPA</div>
      <div style="padding:24px 20px;">
        <h1 style="margin:0 0 14px;color:#0f172a;font-size:22px;line-height:1.3;">${escapedTitle}</h1>
        <p style="margin:0 0 12px;color:#0f172a;font-size:15px;line-height:1.6;">${escapedGreeting}</p>
        ${messageHtml}
        ${fieldsHtml}
        ${ctaHtml}
      </div>
      <div style="padding:12px 20px;border-top:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.5;">
        ${escapedFooter}
      </div>
    </div>
  </body>
</html>`;

  const textLines: string[] = [];
  textLines.push(`KUMPA - ${input.title}`);
  textLines.push("");
  textLines.push(input.greeting);
  for (const line of input.messageLines) {
    if (line) {
      textLines.push(line);
    }
  }
  if (fields.length > 0) {
    textLines.push("");
    for (const field of fields) {
      textLines.push(`${field.label}: ${field.value ?? ""}`);
    }
  }
  if (input.ctaLabel && input.ctaUrl) {
    textLines.push("");
    textLines.push(`${input.ctaLabel}: ${input.ctaUrl}`);
  }
  textLines.push("");
  textLines.push(footerText);

  return {
    html,
    text: textLines.join("\n")
  };
}

async function persistDispatchLog(input: {
  payload: MailPayload;
  status: EmailDeliveryStatus;
  attempts: number;
  providerMessageId?: string | null;
  errorMessage?: string | null;
}) {
  try {
    await prisma.emailDispatchLog.create({
      data: {
        templateKey: input.payload.templateKey,
        toEmail: input.payload.to,
        subject: input.payload.subject,
        status: input.status,
        attempts: input.attempts,
        providerMessageId: input.providerMessageId ?? null,
        errorMessage: input.errorMessage ?? null,
        metadata: input.payload.metadata ?? undefined
      }
    });
  } catch (error) {
    console.error("Failed to persist email dispatch log", error);
  }
}

async function sendEmail(payload: MailPayload): Promise<boolean> {
  let attempts = 0;
  let lastErrorMessage: string | null = null;
  let providerMessageId: string | null = null;

  while (attempts < EMAIL_MAX_ATTEMPTS) {
    attempts += 1;
    const waitMs = RETRY_DELAYS_MS[Math.min(attempts - 1, RETRY_DELAYS_MS.length - 1)] ?? 0;
    await wait(waitMs);

    try {
      const response = await getResend().emails.send({
        from: env.EMAIL_FROM,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text
      });

      const maybeResponse = response as { data?: { id?: string | null }; error?: { message?: string } | null };
      if (maybeResponse.error) {
        throw new Error(maybeResponse.error.message ?? "Resend returned an unknown error");
      }

      providerMessageId = maybeResponse.data?.id ?? null;

      await persistDispatchLog({
        payload,
        status: EmailDeliveryStatus.SENT,
        attempts,
        providerMessageId
      });
      return true;
    } catch (error) {
      lastErrorMessage = normalizeErrorMessage(error);
    }
  }

  await persistDispatchLog({
    payload,
    status: EmailDeliveryStatus.FAILED,
    attempts,
    providerMessageId,
    errorMessage: lastErrorMessage
  });

  console.error("Failed to send email with Resend", {
    to: payload.to,
    subject: payload.subject,
    templateKey: payload.templateKey,
    attempts,
    errorMessage: lastErrorMessage
  });

  return false;
}

export async function sendWelcomeEmail(input: { to: string; firstName?: string | null }) {
  const name = input.firstName ?? "amigo pet";
  const rendered = renderTemplate({
    title: "Bienvenido a Kumpa",
    greeting: `Hola ${name},`,
    messageLines: [
      "Tu cuenta fue creada correctamente.",
      "Ya puedes gestionar mascotas, reservas, alertas y comunidad desde un solo lugar."
    ],
    ctaLabel: "Ir a Kumpa",
    ctaUrl: env.APP_BASE_URL
  });

  return sendEmail({
    to: input.to,
    subject: "Bienvenido a Kumpa",
    templateKey: EmailTemplateKey.AUTH_WELCOME,
    metadata: {
      flow: "auth_register"
    },
    ...rendered
  });
}

export async function sendEmailVerificationEmail(input: {
  to: string;
  firstName?: string | null;
  verificationUrl: string;
}) {
  const name = input.firstName ?? "amigo pet";
  const rendered = renderTemplate({
    title: "Verifica tu correo",
    greeting: `Hola ${name},`,
    messageLines: [
      "Necesitamos confirmar tu correo para activar todas las funciones de seguridad de tu cuenta."
    ],
    ctaLabel: "Verificar correo",
    ctaUrl: input.verificationUrl
  });

  return sendEmail({
    to: input.to,
    subject: "Verifica tu correo en Kumpa",
    templateKey: EmailTemplateKey.AUTH_VERIFY_EMAIL,
    metadata: {
      flow: "auth_verify_email"
    },
    ...rendered
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  firstName?: string | null;
  resetUrl: string;
}) {
  const name = input.firstName ?? "amigo pet";
  const rendered = renderTemplate({
    title: "Recuperacion de contrasena",
    greeting: `Hola ${name},`,
    messageLines: [
      "Recibimos una solicitud para restablecer tu contrasena.",
      "Si no hiciste esta solicitud, puedes ignorar este mensaje."
    ],
    ctaLabel: "Restablecer contrasena",
    ctaUrl: input.resetUrl
  });

  return sendEmail({
    to: input.to,
    subject: "Recuperacion de contrasena en Kumpa",
    templateKey: EmailTemplateKey.AUTH_PASSWORD_RESET,
    metadata: {
      flow: "auth_password_reset"
    },
    ...rendered
  });
}

export async function sendReminderEmail(input: {
  to: string;
  firstName?: string | null;
  petId?: string;
  petName: string;
  title: string;
  dueAt: Date;
  reminderType?: ReminderType;
  message?: string | null;
}) {
  const name = input.firstName ?? "amigo pet";
  const dueLabel = formatDateLabel(input.dueAt);
  const isVaccineReminder =
    input.reminderType === ReminderType.VACCINE || input.reminderType === ReminderType.VACCINE_OVERDUE;
  const isOverdue = input.reminderType === ReminderType.VACCINE_OVERDUE || input.dueAt.getTime() < Date.now();
  const vaccineCtaUrl = input.petId ? `${env.APP_BASE_URL}/pets/${input.petId}/vaccine-card` : env.APP_BASE_URL;

  if (isVaccineReminder && isOverdue) {
    const rendered = renderTemplate({
      title: "Vacuna vencida",
      greeting: `Hola ${name},`,
      messageLines: [
        input.message ?? `La vacuna programada para ${input.petName} se encuentra vencida.`,
        "Te recomendamos gestionar una reserva veterinaria lo antes posible."
      ],
      fields: [
        { label: "Mascota", value: input.petName },
        { label: "Fecha de vencimiento", value: dueLabel }
      ],
      ctaLabel: "Ver carnet de vacunas",
      ctaUrl: vaccineCtaUrl
    });

    return sendEmail({
      to: input.to,
      subject: `Vacuna vencida: ${input.petName}`,
      templateKey: EmailTemplateKey.REMINDER_VACCINE_OVERDUE,
      metadata: {
        flow: "reminder_vaccine_overdue",
        petName: input.petName
      },
      ...rendered
    });
  }

  if (isVaccineReminder) {
    const rendered = renderTemplate({
      title: "Recordatorio de vacuna",
      greeting: `Hola ${name},`,
      messageLines: [
        input.message ?? `Tienes una vacuna programada para ${input.petName}.`,
        "Mantener el esquema al dia ayuda a proteger su salud."
      ],
      fields: [
        { label: "Mascota", value: input.petName },
        { label: "Fecha programada", value: dueLabel }
      ],
      ctaLabel: "Ver carnet de vacunas",
      ctaUrl: vaccineCtaUrl
    });

    return sendEmail({
      to: input.to,
      subject: `Recordatorio de vacuna: ${input.petName}`,
      templateKey: EmailTemplateKey.REMINDER_VACCINE_DUE,
      metadata: {
        flow: "reminder_vaccine_due",
        petName: input.petName
      },
      ...rendered
    });
  }

  const rendered = renderTemplate({
    title: `Recordatorio: ${input.title}`,
    greeting: `Hola ${name},`,
    messageLines: [input.message ?? `Tienes un recordatorio pendiente para ${input.petName}.`],
    fields: [
      { label: "Mascota", value: input.petName },
      { label: "Fecha", value: dueLabel }
    ]
  });

  return sendEmail({
    to: input.to,
    subject: `Recordatorio Kumpa: ${input.title}`,
    templateKey: EmailTemplateKey.REMINDER_GENERIC,
    metadata: {
      flow: "reminder_generic",
      petName: input.petName
    },
    ...rendered
  });
}

interface AppointmentEmailInput {
  to: string;
  firstName?: string | null;
  petName: string;
  providerName: string;
  serviceType: string;
  scheduledAt: Date;
  reason?: string | null;
  previousScheduledAt?: Date;
}

function appointmentFields(input: AppointmentEmailInput): TemplateField[] {
  return [
    { label: "Mascota", value: input.petName },
    { label: "Proveedor", value: input.providerName },
    { label: "Servicio", value: input.serviceType },
    { label: "Fecha", value: formatDateLabel(input.scheduledAt) },
    { label: "Motivo", value: input.reason }
  ];
}

export async function sendAppointmentCreatedEmail(input: AppointmentEmailInput) {
  const name = input.firstName ?? "amigo pet";
  const rendered = renderTemplate({
    title: "Reserva creada",
    greeting: `Hola ${name},`,
    messageLines: ["Tu reserva fue creada correctamente en Kumpa."],
    fields: appointmentFields(input),
    ctaLabel: "Ver reservas",
    ctaUrl: `${env.APP_BASE_URL}/appointments`
  });

  return sendEmail({
    to: input.to,
    subject: "Reserva creada en Kumpa",
    templateKey: EmailTemplateKey.APPOINTMENT_CREATED,
    metadata: {
      flow: "appointment_created",
      petName: input.petName
    },
    ...rendered
  });
}

export async function sendAppointmentConfirmedEmail(input: AppointmentEmailInput) {
  const name = input.firstName ?? "amigo pet";
  const rendered = renderTemplate({
    title: "Reserva confirmada",
    greeting: `Hola ${name},`,
    messageLines: ["Tu proveedor confirmo la reserva."],
    fields: appointmentFields(input),
    ctaLabel: "Ver reservas",
    ctaUrl: `${env.APP_BASE_URL}/appointments`
  });

  return sendEmail({
    to: input.to,
    subject: "Reserva confirmada en Kumpa",
    templateKey: EmailTemplateKey.APPOINTMENT_CONFIRMED,
    metadata: {
      flow: "appointment_confirmed",
      petName: input.petName
    },
    ...rendered
  });
}

export async function sendAppointmentCancelledEmail(input: AppointmentEmailInput) {
  const name = input.firstName ?? "amigo pet";
  const rendered = renderTemplate({
    title: "Reserva cancelada",
    greeting: `Hola ${name},`,
    messageLines: ["La reserva fue cancelada."],
    fields: appointmentFields(input),
    ctaLabel: "Ver reservas",
    ctaUrl: `${env.APP_BASE_URL}/appointments`
  });

  return sendEmail({
    to: input.to,
    subject: "Reserva cancelada en Kumpa",
    templateKey: EmailTemplateKey.APPOINTMENT_CANCELLED,
    metadata: {
      flow: "appointment_cancelled",
      petName: input.petName
    },
    ...rendered
  });
}

export async function sendAppointmentRescheduledEmail(input: AppointmentEmailInput) {
  const name = input.firstName ?? "amigo pet";
  const rendered = renderTemplate({
    title: "Reserva reagendada",
    greeting: `Hola ${name},`,
    messageLines: ["Se actualizo la fecha de tu reserva."],
    fields: [
      ...appointmentFields(input),
      {
        label: "Fecha anterior",
        value: input.previousScheduledAt ? formatDateLabel(input.previousScheduledAt) : null
      }
    ],
    ctaLabel: "Ver reservas",
    ctaUrl: `${env.APP_BASE_URL}/appointments`
  });

  return sendEmail({
    to: input.to,
    subject: "Reserva reagendada en Kumpa",
    templateKey: EmailTemplateKey.APPOINTMENT_RESCHEDULED,
    metadata: {
      flow: "appointment_rescheduled",
      petName: input.petName
    },
    ...rendered
  });
}

export async function sendLostPetAlertActivatedEmail(input: {
  to: string;
  firstName?: string | null;
  petName: string;
  lastSeenAt: Date;
  lastSeenAddress?: string | null;
  shareUrl: string;
  detailUrl: string;
}) {
  const name = input.firstName ?? "amigo pet";
  const rendered = renderTemplate({
    title: "Alerta de mascota perdida activada",
    greeting: `Hola ${name},`,
    messageLines: [
      `La alerta de ${input.petName} ya esta activa y visible para la comunidad.`,
      "Te recomendamos compartir el enlace publico y mantener la informacion actualizada."
    ],
    fields: [
      { label: "Mascota", value: input.petName },
      { label: "Ultima vez vista", value: formatDateLabel(input.lastSeenAt) },
      { label: "Zona", value: input.lastSeenAddress },
      { label: "Perfil publico", value: input.shareUrl }
    ],
    ctaLabel: "Ver detalle de alerta",
    ctaUrl: input.detailUrl
  });

  return sendEmail({
    to: input.to,
    subject: `Alerta activada: ${input.petName}`,
    templateKey: EmailTemplateKey.LOST_PET_ALERT_ACTIVATED,
    metadata: {
      flow: "lost_pet_alert_activated",
      petName: input.petName
    },
    ...rendered
  });
}

export async function sendLostPetSightingReportedEmail(input: {
  to: string;
  firstName?: string | null;
  petName: string;
  sightingAt: Date;
  address?: string | null;
  comment?: string | null;
  reporterName?: string | null;
  detailUrl: string;
}) {
  const name = input.firstName ?? "amigo pet";
  const rendered = renderTemplate({
    title: "Nuevo avistamiento reportado",
    greeting: `Hola ${name},`,
    messageLines: [
      `Se reporto un nuevo avistamiento para ${input.petName}.`,
      "Revisa el detalle para validar la informacion y actualizar el estado del caso."
    ],
    fields: [
      { label: "Mascota", value: input.petName },
      { label: "Fecha del avistamiento", value: formatDateLabel(input.sightingAt) },
      { label: "Zona reportada", value: input.address },
      { label: "Reportado por", value: input.reporterName },
      { label: "Comentario", value: input.comment }
    ],
    ctaLabel: "Revisar avistamiento",
    ctaUrl: input.detailUrl
  });

  return sendEmail({
    to: input.to,
    subject: `Nuevo avistamiento: ${input.petName}`,
    templateKey: EmailTemplateKey.LOST_PET_SIGHTING_REPORTED,
    metadata: {
      flow: "lost_pet_sighting_reported",
      petName: input.petName
    },
    ...rendered
  });
}

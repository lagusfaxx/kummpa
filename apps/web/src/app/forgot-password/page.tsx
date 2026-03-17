"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { forgotPassword } from "@/features/auth/auth-api";
import { getAuthErrorMessage } from "@/features/auth/auth-context";
import { isValidEmail, normalizeEmail } from "@/features/auth/validators";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      setError("Debes ingresar un email valido.");
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPassword(normalizedEmail);
      setSuccess("Si existe una cuenta para este email, enviamos un enlace de recuperacion.");
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard title="Recuperar contrasena" subtitle="Te enviaremos un enlace temporal para restablecer tu acceso.">
      <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
        <label className="block text-sm font-semibold text-slate-700">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        {error && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
        {success && <p className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{success}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Enviando..." : "Enviar enlace"}
        </button>
      </form>

      <div className="mt-4 text-sm">
        <Link href="/login" className="font-semibold text-slate-700 hover:text-slate-900">
          Volver a iniciar sesion
        </Link>
      </div>
    </AuthCard>
  );
}

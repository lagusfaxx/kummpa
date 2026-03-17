"use client";

import { Suspense } from "react";
import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { resetPassword } from "@/features/auth/auth-api";
import { getAuthErrorMessage } from "@/features/auth/auth-context";
import { validatePassword } from "@/features/auth/validators";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthCard title="Restablecer contrasena" subtitle="Cargando formulario de recuperacion...">
          <p className="text-sm text-slate-600">Preparando formulario...</p>
        </AuthCard>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token.trim()) {
      setError("Debes ingresar el token de recuperacion.");
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("La confirmacion de contrasena no coincide.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token.trim(), newPassword);
      setSuccess("Contrasena actualizada. Ya puedes iniciar sesion.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard title="Restablecer contrasena" subtitle="Ingresa el token recibido por email y define una nueva contrasena.">
      <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
        <label className="block text-sm font-semibold text-slate-700">
          Token de recuperacion
          <input
            type="text"
            required
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Nueva contrasena
          <input
            type="password"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Confirmar nueva contrasena
          <input
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
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
          {isSubmitting ? "Actualizando..." : "Actualizar contrasena"}
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

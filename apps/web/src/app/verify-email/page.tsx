"use client";

import { Suspense } from "react";
import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { resendVerification, verifyEmail } from "@/features/auth/auth-api";
import { getAuthErrorMessage } from "@/features/auth/auth-context";
import { isValidEmail, normalizeEmail } from "@/features/auth/validators";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <AuthCard title="Verificar correo" subtitle="Cargando formulario de verificacion...">
          <p className="text-sm text-slate-600">Preparando formulario...</p>
        </AuthCard>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [token, setToken] = useState(tokenFromUrl);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const onVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token.trim()) {
      setError("Debes ingresar el token de verificacion.");
      return;
    }

    setIsVerifying(true);
    try {
      await verifyEmail(token.trim());
      setSuccess("Correo verificado correctamente.");
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setIsVerifying(false);
    }
  };

  const onResend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      setError("Debes ingresar un email valido para reenviar.");
      return;
    }

    setIsResending(true);
    try {
      await resendVerification(normalizedEmail);
      setSuccess("Si existe la cuenta, reenviamos el correo de verificacion.");
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthCard title="Verificar correo" subtitle="Confirma tu email para activar todas las funciones de la plataforma.">
      <form className="space-y-3" onSubmit={(event) => void onVerify(event)}>
        <label className="block text-sm font-semibold text-slate-700">
          Token de verificacion
          <input
            type="text"
            required
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <button
          type="submit"
          disabled={isVerifying}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isVerifying ? "Verificando..." : "Verificar correo"}
        </button>
      </form>

      <form className="mt-5 space-y-3 border-t border-slate-200 pt-4" onSubmit={(event) => void onResend(event)}>
        <label className="block text-sm font-semibold text-slate-700">
          Reenviar verificacion
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tu-email@dominio.com"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <button
          type="submit"
          disabled={isResending}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isResending ? "Reenviando..." : "Reenviar correo"}
        </button>
      </form>

      {error && <p className="mt-4 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
      {success && <p className="mt-4 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{success}</p>}

      <div className="mt-4 text-sm">
        <Link href="/login" className="font-semibold text-slate-700 hover:text-slate-900">
          Volver a iniciar sesion
        </Link>
      </div>
    </AuthCard>
  );
}

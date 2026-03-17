"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { getAuthErrorMessage, useAuth } from "@/features/auth/auth-context";
import { isValidEmail, normalizeEmail } from "@/features/auth/validators";
import { useToast } from "@/features/ui/toast-context";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isAuthenticated, isReady } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isReady && isAuthenticated) {
      router.replace("/account");
    }
  }, [isAuthenticated, isReady, router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      setError("Debes ingresar un email valido.");
      return;
    }

    if (!password) {
      setError("Debes ingresar tu contrasena.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn({
        email: normalizedEmail,
        password
      });
      showToast({
        tone: "success",
        title: "Sesion iniciada",
        description: "Tu cuenta ya esta lista para seguir usando la plataforma."
      });
      router.push("/account");
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard title="Iniciar sesion" subtitle="Accede a tu cuenta para gestionar tu ecosistema pet.">
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
        <label className="block text-sm font-semibold text-slate-700">
          Contrasena
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        {error && <InlineBanner tone="error">{error}</InlineBanner>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(15,23,42,0.18)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/forgot-password" className="font-semibold text-brand-700">
          Olvide mi contrasena
        </Link>
        <Link href="/register" className="font-semibold text-slate-700">
          Crear cuenta
        </Link>
      </div>
    </AuthCard>
  );
}

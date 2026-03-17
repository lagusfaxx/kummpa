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
      await signIn({ email: normalizedEmail, password });
      showToast({
        tone: "success",
        title: "Sesion iniciada",
        description: "Bienvenido de vuelta."
      });
      router.push("/account");
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard title="Iniciar sesion" subtitle="Accede a tu cuenta para continuar.">
      <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
        <label className="block text-sm font-medium">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1"
          />
        </label>
        <label className="block text-sm font-medium">
          Contrasena
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1"
          />
        </label>

        {error && <InlineBanner tone="error">{error}</InlineBanner>}

        <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
          {isSubmitting ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/forgot-password" className="font-medium text-secondary hover:underline">
          Olvide mi contrasena
        </Link>
        <Link href="/register" className="font-medium hover:underline">
          Crear cuenta
        </Link>
      </div>
    </AuthCard>
  );
}

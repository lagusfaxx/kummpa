"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { getAuthErrorMessage, useAuth } from "@/features/auth/auth-context";
import { isValidEmail, normalizeEmail, validatePassword } from "@/features/auth/validators";
import type { RegisterPayload } from "@/features/auth/types";
import { useToast } from "@/features/ui/toast-context";

const roleOptions: Array<{ value: RegisterPayload["role"]; label: string }> = [
  { value: "OWNER", label: "Dueño de mascota" },
  { value: "VET", label: "Veterinaria / Clinica" },
  { value: "CAREGIVER", label: "Cuidador / Paseador" },
  { value: "SHOP", label: "Tienda pet" }
];

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, isAuthenticated, isReady } = useAuth();
  const { showToast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [role, setRole] = useState<RegisterPayload["role"]>("OWNER");
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

    if (firstName.trim().length < 2) {
      setError("Debes ingresar tu nombre.");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== passwordConfirm) {
      setError("La confirmacion de contrasena no coincide.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: normalizedEmail,
        password,
        role
      });
      showToast({
        tone: "success",
        title: "Cuenta creada",
        description: "Tu perfil inicial ya fue registrado y quedaste autenticado."
      });
      router.push("/account");
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Crear cuenta"
      subtitle="Registra tu perfil y comienza a gestionar mascotas, reservas y recordatorios."
    >
      <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
        <label className="block text-sm font-semibold text-slate-700">
          Nombre
          <input
            type="text"
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Apellido (opcional)
          <input
            type="text"
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

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
          Rol
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as RegisterPayload["role"])}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Contrasena
          <input
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Confirmar contrasena
          <input
            type="password"
            autoComplete="new-password"
            required
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        {error && <InlineBanner tone="error">{error}</InlineBanner>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(15,23,42,0.18)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <div className="mt-4 text-sm">
        <Link href="/login" className="font-semibold text-slate-700">
          Ya tengo cuenta
        </Link>
      </div>
    </AuthCard>
  );
}

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
  { value: "OWNER", label: "Tutor de mascota" },
  { value: "VET", label: "Veterinaria" },
  { value: "CAREGIVER", label: "Cuidador" },
  { value: "SHOP", label: "Tienda" }
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
      setError("Las contrasenas no coinciden.");
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
        description: "Tu perfil fue registrado correctamente."
      });
      router.push("/account");
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard title="Crear cuenta" subtitle="Registrate para gestionar tus mascotas.">
      <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Nombre
            <input
              type="text"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm font-medium">
            Apellido
            <input
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="mt-1"
            />
          </label>
        </div>

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
          Tipo de cuenta
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as RegisterPayload["role"])}
            className="mt-1"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Contrasena
          <input
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1"
          />
        </label>

        <label className="block text-sm font-medium">
          Confirmar contrasena
          <input
            type="password"
            autoComplete="new-password"
            required
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            className="mt-1"
          />
        </label>

        {error && <InlineBanner tone="error">{error}</InlineBanner>}

        <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
          {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="font-medium hover:underline">
          Ya tengo cuenta
        </Link>
      </p>
    </AuthCard>
  );
}

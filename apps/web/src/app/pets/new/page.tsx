"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/auth/auth-gate";
import { PetEditor } from "@/components/pets/pet-editor";
import { useAuth } from "@/features/auth/auth-context";
import { createPet } from "@/features/pets/pets-api";
import type { PetWritePayload } from "@/features/pets/types";

export default function NewPetPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (payload: PetWritePayload) => {
    const accessToken = session?.tokens.accessToken;
    if (!accessToken) {
      setError("Sesion no disponible.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const created = await createPet(accessToken, payload);
      router.push(`/pets/${created.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear la mascota.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthGate>
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Registrar mascota</h1>
          <p className="text-sm text-slate-600">Completa el perfil de tu mascota para iniciar su historial digital.</p>
        </header>
        <PetEditor
          submitLabel="Crear mascota"
          isSubmitting={isSubmitting}
          error={error}
          onSubmit={handleCreate}
        />
      </div>
    </AuthGate>
  );
}

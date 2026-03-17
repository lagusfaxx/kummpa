"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGate } from "@/components/auth/auth-gate";
import { PetEditor } from "@/components/pets/pet-editor";
import { useAuth } from "@/features/auth/auth-context";
import { deletePet, getPet, updatePet } from "@/features/pets/pets-api";
import type { Pet, PetWritePayload } from "@/features/pets/types";

export default function EditPetPage() {
  const params = useParams<{ id: string }>();
  const petId = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { session } = useAuth();
  const [pet, setPet] = useState<Pet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = session?.tokens.accessToken;
    if (!accessToken || !petId) {
      return;
    }

    const loadPet = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getPet(accessToken, petId);
        setPet(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la mascota.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadPet();
  }, [petId, session?.tokens.accessToken]);

  const handleSubmit = async (payload: PetWritePayload) => {
    const accessToken = session?.tokens.accessToken;
    if (!accessToken || !pet) {
      setError("Sesion no disponible.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const updated = await updatePet(accessToken, pet.id, payload);
      setPet(updated);
      router.push(`/pets/${updated.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo actualizar la mascota.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const accessToken = session?.tokens.accessToken;
    if (!accessToken || !pet) {
      setError("Sesion no disponible.");
      return;
    }

    const confirmed = window.confirm("¿Seguro que quieres eliminar esta mascota?");
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await deletePet(accessToken, pet.id);
      router.push("/pets");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar la mascota.");
      setIsDeleting(false);
    }
  };

  return (
    <AuthGate>
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Editar mascota</h1>
          <p className="text-sm text-slate-600">Actualiza el perfil y visibilidad de tu mascota.</p>
        </header>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Cargando informacion...
          </div>
        ) : pet ? (
          <PetEditor
            initialPet={pet}
            submitLabel="Guardar cambios"
            isSubmitting={isSubmitting}
            isDeleting={isDeleting}
            error={error}
            onSubmit={handleSubmit}
            onDelete={handleDelete}
          />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Mascota no encontrada.
          </div>
        )}
      </div>
    </AuthGate>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
    if (!accessToken || !petId) return;

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
    if (!accessToken || !pet) { setError("Sesión no disponible."); return; }
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
    if (!accessToken || !pet) { setError("Sesión no disponible."); return; }
    if (!window.confirm("¿Seguro que quieres eliminar esta mascota? Esta acción no se puede deshacer.")) return;
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
      <div className="mx-auto max-w-xl">
        {isLoading ? (
          <div className="space-y-4 p-4">
            <div className="h-20 w-full animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-48 w-full animate-pulse rounded-2xl bg-slate-100" />
          </div>
        ) : !pet ? (
          <div className="p-4">
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 py-14 text-center">
              <p className="font-semibold text-slate-700">Mascota no encontrada</p>
              <p className="text-[12px] text-slate-400">{error ?? "La ficha solicitada no existe o fue eliminada."}</p>
              <Link href="/pets" className="rounded-xl border border-slate-200 px-4 py-2 text-[12px] font-semibold text-slate-600">
                Volver a mis mascotas
              </Link>
            </div>
          </div>
        ) : (
          <div>
            {/* ── Mini header ─────────────────────────────────── */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <Link
                href={`/pets/${pet.id}`}
                className="flex items-center gap-1 text-[12px] font-semibold text-slate-400 hover:text-slate-700 transition-colors"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                Volver
              </Link>

              <div className="flex flex-1 items-center gap-2.5">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-slate-100">
                  {pet.primaryPhotoUrl ? (
                    <img src={pet.primaryPhotoUrl} alt={pet.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-50 text-sm font-bold text-slate-300">
                      {pet.name.slice(0, 1)}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[13px] font-bold text-slate-800 leading-tight">{pet.name}</p>
                  <p className="text-[10px] text-slate-400">{pet.species} · {pet.breed}</p>
                </div>
              </div>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Editar
              </span>
            </div>

            {/* ── Editor ──────────────────────────────────────── */}
            <PetEditor
              initialPet={pet}
              submitLabel="Guardar cambios"
              isSubmitting={isSubmitting}
              isDeleting={isDeleting}
              error={error}
              onSubmit={handleSubmit}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>
    </AuthGate>
  );
}

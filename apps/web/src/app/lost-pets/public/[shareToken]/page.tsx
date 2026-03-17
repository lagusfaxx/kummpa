"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MapCanvas } from "@/components/map/map-canvas";
import { getPublicLostPetAlert } from "@/features/lost-pets/lost-pets-api";
import { lostPetAlertToMapPoints } from "@/features/lost-pets/map-points";
import type { LostPetAlertDetail, LostPetAlertStatus } from "@/features/lost-pets/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function statusLabel(status: LostPetAlertStatus) {
  if (status === "ACTIVE") return "Activa";
  if (status === "FOUND") return "Encontrada";
  return "Cerrada";
}

function statusClass(status: LostPetAlertStatus) {
  if (status === "ACTIVE") return "bg-rose-100 text-rose-700";
  if (status === "FOUND") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

export default function PublicLostPetAlertPage() {
  const params = useParams<{ shareToken: string }>();
  const shareToken = typeof params.shareToken === "string" ? params.shareToken : "";

  const [alert, setAlert] = useState<LostPetAlertDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMapPointId, setSelectedMapPointId] = useState<string | null>(null);

  useEffect(() => {
    if (!shareToken) return;

    setIsLoading(true);
    setError(null);

    void getPublicLostPetAlert(shareToken)
      .then((data) => {
        setAlert(data);
        setSelectedMapPointId(`last-seen-${data.id}`);
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error ? loadError.message : "No se pudo cargar la alerta publica."
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [shareToken]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Cargando alerta publica...
      </div>
    );
  }

  if (error || !alert) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
          {error ?? "Alerta no disponible."}
        </p>
        <Link
          href="/lost-pets"
          className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700"
        >
          Ir a alertas
        </Link>
      </div>
    );
  }

  const mapPoints = lostPetAlertToMapPoints(alert);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Alerta: {alert.pet.name}
            </h1>
            <p className="text-sm text-slate-600">
              {alert.pet.species} - {alert.pet.breed}
            </p>
            <p className="text-xs text-slate-500">Ultima vez vista: {formatDate(alert.lastSeenAt)}</p>
          </div>
          <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusClass(alert.status)}`}>
            {statusLabel(alert.status)}
          </span>
        </div>
        {alert.lastSeenAddress && (
          <p className="mt-2 text-sm text-slate-700">Zona: {alert.lastSeenAddress}</p>
        )}
        {alert.description && <p className="mt-2 text-sm text-slate-700">{alert.description}</p>}
        {alert.emergencyNotes && (
          <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
            {alert.emergencyNotes}
          </p>
        )}
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-bold text-slate-900">Contacto</h2>
        <p className="text-sm text-slate-700">Tutor: {alert.owner.fullName}</p>
        {alert.owner.phone && (
          <a
            href={`tel:${alert.owner.phone.replace(/\s+/g, "")}`}
            className="mt-1 inline-block text-sm font-semibold text-brand-700 underline"
          >
            Llamar: {alert.owner.phone}
          </a>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Si viste a {alert.pet.name}, reporta un avistamiento para ayudar a encontrarla.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/lost-pets/${alert.id}`}
            className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
          >
            Yo la vi
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700"
          >
            Iniciar sesion
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-bold text-slate-900">Mapa de avistamientos</h2>
        <MapCanvas
          accessToken={MAPBOX_TOKEN}
          points={mapPoints}
          selectedPointId={selectedMapPointId}
          onSelectPoint={setSelectedMapPointId}
          className="mt-3 h-[46vh] w-full"
        />
        <p className="mt-2 text-xs text-slate-500">
          Avistamientos reportados: {alert.sightings.length}
        </p>
      </section>
    </div>
  );
}

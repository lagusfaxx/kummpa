"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { MapCanvas } from "@/components/map/map-canvas";
import { useAuth } from "@/features/auth/auth-context";
import {
  createLostPetSighting,
  getLostPetAlert,
  updateLostPetAlert
} from "@/features/lost-pets/lost-pets-api";
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

function defaultSightingDateTime() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function LostPetDetailPage() {
  const params = useParams<{ id: string }>();
  const alertId = typeof params.id === "string" ? params.id : "";
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;

  const [alert, setAlert] = useState<LostPetAlertDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedMapPointId, setSelectedMapPointId] = useState<string | null>(null);

  const [sightingAt, setSightingAt] = useState(defaultSightingDateTime());
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const loadDetail = async () => {
    if (!accessToken || !alertId) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = await getLostPetAlert(accessToken, alertId);
      setAlert(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la alerta.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, alertId]);

  useEffect(() => {
    if (!alert) return;
    setSelectedMapPointId((current) => current ?? `last-seen-${alert.id}`);
  }, [alert]);

  const handleStatusChange = async (status: LostPetAlertStatus) => {
    if (!accessToken || !alert) return;

    setIsWorking(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateLostPetAlert(accessToken, alert.id, { status });
      setAlert(updated);
      setSuccess(`Alerta marcada como ${statusLabel(status).toLowerCase()}.`);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "No se pudo actualizar el estado.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleSightingSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !alert) return;

    if (!lat || !lng) {
      setError("Debes ingresar coordenadas del avistamiento.");
      return;
    }

    setIsWorking(true);
    setError(null);
    setSuccess(null);

    try {
      await createLostPetSighting(accessToken, alert.id, {
        sightingAt: new Date(sightingAt).toISOString(),
        lat: Number(lat),
        lng: Number(lng),
        address: address || undefined,
        comment: comment || undefined,
        photoUrl: photoUrl || undefined
      });

      setLat("");
      setLng("");
      setAddress("");
      setComment("");
      setPhotoUrl("");
      setSightingAt(defaultSightingDateTime());
      setSuccess("Avistamiento reportado.");
      await loadDetail();
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "No se pudo reportar avistamiento.");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <AuthGate>
      <div className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Detalle de alerta</h1>
            <p className="text-sm text-slate-600">Historial comunitario de avistamientos y estado del caso.</p>
          </div>
          <Link
            href="/lost-pets"
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700"
          >
            Volver
          </Link>
        </header>

        {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {success && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}

        {isLoading || !alert ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Cargando alerta...
          </div>
        ) : (
          <>
            {(() => {
              const mapPoints = lostPetAlertToMapPoints(alert);

              return (
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h2 className="text-lg font-bold text-slate-900">Mapa de avistamientos</h2>
                  <p className="text-sm text-slate-600">
                    Incluye ultima ubicacion y reportes comunitarios en un solo mapa.
                  </p>
                  <MapCanvas
                    accessToken={MAPBOX_TOKEN}
                    points={mapPoints}
                    selectedPointId={selectedMapPointId}
                    onSelectPoint={setSelectedMapPointId}
                    className="mt-3 h-[46vh] w-full"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    {alert.sightings.length === 0
                      ? "Aun no hay avistamientos comunitarios."
                      : `Total de avistamientos: ${alert.sightings.length}.`}
                  </p>
                </section>
              );
            })()}

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{alert.pet.name}</h2>
                  <p className="text-sm text-slate-600">
                    {alert.pet.species} - {alert.pet.breed}
                  </p>
                  <p className="text-xs text-slate-500">
                    Ultima vez vista: {formatDate(alert.lastSeenAt)}
                  </p>
                  {alert.lastSeenAddress && (
                    <p className="text-xs text-slate-500">Zona: {alert.lastSeenAddress}</p>
                  )}
                </div>
                <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusClass(alert.status)}`}>
                  {statusLabel(alert.status)}
                </span>
              </div>

              {alert.description && (
                <p className="mt-2 text-sm text-slate-700">{alert.description}</p>
              )}
              {alert.emergencyNotes && (
                <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                  {alert.emergencyNotes}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {alert.permissions.canCloseAlert && alert.status === "ACTIVE" && (
                  <button
                    type="button"
                    disabled={isWorking}
                    onClick={() => {
                      void handleStatusChange("FOUND");
                    }}
                    className="inline-flex min-h-10 items-center rounded-xl border border-emerald-300 px-3 text-xs font-semibold text-emerald-700 disabled:opacity-60"
                  >
                    Marcar encontrada
                  </button>
                )}

                {alert.permissions.canCloseAlert && alert.status !== "CLOSED" && (
                  <button
                    type="button"
                    disabled={isWorking}
                    onClick={() => {
                      void handleStatusChange("CLOSED");
                    }}
                    className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 disabled:opacity-60"
                  >
                    Cerrar caso
                  </button>
                )}

                {alert.permissions.canEditAlert && alert.status !== "ACTIVE" && (
                  <button
                    type="button"
                    disabled={isWorking}
                    onClick={() => {
                      void handleStatusChange("ACTIVE");
                    }}
                    className="inline-flex min-h-10 items-center rounded-xl border border-sky-300 px-3 text-xs font-semibold text-sky-700 disabled:opacity-60"
                  >
                    Reabrir alerta
                  </button>
                )}

                <a
                  href={`/lost-pets/public/${alert.shareToken}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700"
                >
                  Ver perfil publico
                </a>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-bold text-slate-900">Reportar avistamiento</h2>
              {!alert.permissions.canReportSighting ? (
                <p className="mt-2 text-sm text-slate-600">
                  Esta alerta no acepta nuevos avistamientos porque no esta activa.
                </p>
              ) : (
                <form onSubmit={(event) => void handleSightingSubmit(event)} className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Fecha/hora
                    <input
                      type="datetime-local"
                      value={sightingAt}
                      onChange={(event) => setSightingAt(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Latitud
                      <input
                        value={lat}
                        onChange={(event) => setLat(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        placeholder="-33.45"
                      />
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                      Longitud
                      <input
                        value={lng}
                        onChange={(event) => setLng(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        placeholder="-70.66"
                      />
                    </label>
                  </div>

                  <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                    Direccion
                    <input
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                    Comentario
                    <textarea
                      rows={2}
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                    URL de foto (opcional)
                    <input
                      type="url"
                      value={photoUrl}
                      onChange={(event) => setPhotoUrl(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={isWorking}
                      className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {isWorking ? "Enviando..." : "Publicar avistamiento"}
                    </button>
                  </div>
                </form>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-bold text-slate-900">Historial de avistamientos</h2>
              <div className="mt-3 grid gap-2">
                {alert.sightings.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    Aun no hay avistamientos reportados.
                  </p>
                ) : (
                  alert.sightings.map((sighting) => (
                    <article key={sighting.id} className="rounded-xl border border-slate-200 p-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatDate(sighting.sightingAt)} - {sighting.reporter?.fullName ?? "Usuario"}
                      </p>
                      <p className="text-xs text-slate-600">
                        Coordenadas: {sighting.lat}, {sighting.lng}
                      </p>
                      {sighting.address && (
                        <p className="text-xs text-slate-600">Direccion: {sighting.address}</p>
                      )}
                      {sighting.comment && (
                        <p className="mt-1 text-sm text-slate-700">{sighting.comment}</p>
                      )}
                      {sighting.photoUrl && (
                        <a
                          href={sighting.photoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs font-semibold text-brand-700 underline"
                        >
                          Ver foto
                        </a>
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AuthGate>
  );
}

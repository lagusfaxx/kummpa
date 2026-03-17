"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthGate } from "@/components/auth/auth-gate";
import { EmptyState } from "@/components/feedback/empty-state";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { SurfaceSkeleton } from "@/components/feedback/skeleton";
import { PageIntro } from "@/components/layout/page-intro";
import { useAuth } from "@/features/auth/auth-context";
import { listAppointments } from "@/features/appointments/appointments-api";
import type { AppointmentRecord } from "@/features/appointments/types";
import {
  getMyProfile,
  updateBaseProfile,
  updateCaregiverProfile,
  updateOwnerProfile,
  updateShopProfile,
  updateVetProfile
} from "@/features/profiles/profiles-api";
import { listToMultiline, multilineToList } from "@/features/profiles/profile-utils";
import type { MyProfile } from "@/features/profiles/types";
import { useToast } from "@/features/ui/toast-context";

type RoleType = "OWNER" | "VET" | "CAREGIVER" | "SHOP" | "ADMIN";

function parseCoordinateInput(value: string): number | undefined {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return undefined;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function AccountPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBase, setIsSavingBase] = useState(false);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [appointmentHistory, setAppointmentHistory] = useState<AppointmentRecord[]>([]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  const [district, setDistrict] = useState("");
  const [approximateAddress, setApproximateAddress] = useState("");
  const [biography, setBiography] = useState("");
  const [prefEmail, setPrefEmail] = useState(true);
  const [prefInApp, setPrefInApp] = useState(true);
  const [prefPush, setPrefPush] = useState(false);

  const [roleField1, setRoleField1] = useState("");
  const [roleField2, setRoleField2] = useState("");
  const [roleField3, setRoleField3] = useState("");
  const [roleField4, setRoleField4] = useState("");
  const [roleField5, setRoleField5] = useState("");
  const [roleField6, setRoleField6] = useState("");
  const [roleField7, setRoleField7] = useState("");
  const [roleField8, setRoleField8] = useState("");
  const [roleFlag, setRoleFlag] = useState(false);
  const [roleGeoLat, setRoleGeoLat] = useState("");
  const [roleGeoLng, setRoleGeoLng] = useState("");

  useEffect(() => {
    const accessToken = session?.tokens.accessToken;
    if (!accessToken) {
      return;
    }

    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [data, history] = await Promise.all([getMyProfile(accessToken), listAppointments(accessToken, { view: "owner", limit: 8 })]);
        setProfile(data);
        setAppointmentHistory(history);
        setFirstName(data.user.firstName ?? "");
        setLastName(data.user.lastName ?? "");
        setPhone(data.user.phone ?? "");
        setCity(data.user.city ?? "");

        if (data.user.role === "OWNER" || data.user.role === "ADMIN") {
          const owner = data.ownerProfile;
          setDistrict(owner?.district ?? "");
          setApproximateAddress(owner?.approximateAddress ?? "");
          setBiography(owner?.biography ?? "");
          setPrefEmail(owner?.notificationPreferences?.email ?? true);
          setPrefInApp(owner?.notificationPreferences?.inApp ?? true);
          setPrefPush(owner?.notificationPreferences?.push ?? false);
        }

        if (data.user.role === "VET") {
          const vet = data.vetProfile;
          setRoleField1(vet?.clinicName ?? "");
          setRoleField2(vet?.address ?? "");
          setRoleField3(vet?.district ?? "");
          setRoleField4(vet?.contactPhone ?? "");
          setRoleField5(vet?.contactEmail ?? "");
          setRoleField6(listToMultiline(vet?.services));
          setRoleField7(listToMultiline(vet?.openingHours));
          setRoleField8(vet?.description ?? "");
          setRoleFlag(Boolean(vet?.isEmergency24x7));
          setRoleGeoLat(vet?.latitude !== null && vet?.latitude !== undefined ? String(vet.latitude) : "");
          setRoleGeoLng(vet?.longitude !== null && vet?.longitude !== undefined ? String(vet.longitude) : "");
        }

        if (data.user.role === "CAREGIVER") {
          const caregiver = data.caregiverProfile;
          setRoleField1(caregiver?.introduction ?? "");
          setRoleField2(caregiver?.experience ?? "");
          setRoleField3(listToMultiline(caregiver?.services));
          setRoleField4(listToMultiline(caregiver?.coverageAreas));
          setRoleField5(listToMultiline(caregiver?.rates));
          setRoleField6(listToMultiline(caregiver?.schedule));
          setRoleGeoLat(
            caregiver?.latitude !== null && caregiver?.latitude !== undefined
              ? String(caregiver.latitude)
              : ""
          );
          setRoleGeoLng(
            caregiver?.longitude !== null && caregiver?.longitude !== undefined
              ? String(caregiver.longitude)
              : ""
          );
        }

        if (data.user.role === "SHOP") {
          const shop = data.shopProfile;
          setRoleField1(shop?.businessName ?? "");
          setRoleField2(shop?.address ?? "");
          setRoleField3(shop?.district ?? "");
          setRoleField4(shop?.city ?? "");
          setRoleField5(shop?.contactPhone ?? "");
          setRoleField6(shop?.contactEmail ?? "");
          setRoleField7(listToMultiline(shop?.basicCatalog));
          setRoleField8(listToMultiline(shop?.discounts));
          setRoleGeoLat(shop?.latitude !== null && shop?.latitude !== undefined ? String(shop.latitude) : "");
          setRoleGeoLng(shop?.longitude !== null && shop?.longitude !== undefined ? String(shop.longitude) : "");
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el perfil.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, [session?.tokens.accessToken]);

  const handleSaveBase = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const accessToken = session?.tokens.accessToken;
    if (!accessToken) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSavingBase(true);
    try {
      const data = await updateBaseProfile(accessToken, {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        city: city.trim() || undefined
      });
      setProfile(data);
      setSuccess("Perfil base actualizado.");
      showToast({
        tone: "success",
        title: "Perfil base actualizado",
        description: "Tus datos principales quedaron guardados."
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar perfil base.");
    } finally {
      setIsSavingBase(false);
    }
  };

  const handleSaveRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const accessToken = session?.tokens.accessToken;
    const role = profile?.user.role as RoleType | undefined;
    if (!accessToken || !role) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSavingRole(true);
    try {
      let data: MyProfile | null = null;

      if (role === "OWNER" || role === "ADMIN") {
        data = await updateOwnerProfile(accessToken, {
          district: district.trim() || undefined,
          approximateAddress: approximateAddress.trim() || undefined,
          biography: biography.trim() || undefined,
          notificationPreferences: {
            email: prefEmail,
            inApp: prefInApp,
            push: prefPush
          }
        });
      }

      if (role === "VET") {
        data = await updateVetProfile(accessToken, {
          clinicName: roleField1.trim() || undefined,
          address: roleField2.trim() || undefined,
          district: roleField3.trim() || undefined,
          contactPhone: roleField4.trim() || undefined,
          contactEmail: roleField5.trim() || undefined,
          services: multilineToList(roleField6),
          openingHours: multilineToList(roleField7),
          description: roleField8.trim() || undefined,
          isEmergency24x7: roleFlag,
          latitude: parseCoordinateInput(roleGeoLat),
          longitude: parseCoordinateInput(roleGeoLng)
        });
      }

      if (role === "CAREGIVER") {
        data = await updateCaregiverProfile(accessToken, {
          introduction: roleField1.trim() || undefined,
          experience: roleField2.trim() || undefined,
          latitude: parseCoordinateInput(roleGeoLat),
          longitude: parseCoordinateInput(roleGeoLng),
          services: multilineToList(roleField3),
          coverageAreas: multilineToList(roleField4),
          rates: multilineToList(roleField5),
          schedule: multilineToList(roleField6)
        });
      }

      if (role === "SHOP") {
        data = await updateShopProfile(accessToken, {
          businessName: roleField1.trim() || undefined,
          address: roleField2.trim() || undefined,
          district: roleField3.trim() || undefined,
          city: roleField4.trim() || undefined,
          contactPhone: roleField5.trim() || undefined,
          contactEmail: roleField6.trim() || undefined,
          latitude: parseCoordinateInput(roleGeoLat),
          longitude: parseCoordinateInput(roleGeoLng),
          basicCatalog: multilineToList(roleField7),
          discounts: multilineToList(roleField8)
        });
      }

      if (data) {
        setProfile(data);
      }
      setSuccess("Perfil de rol actualizado.");
      showToast({
        tone: "success",
        title: "Perfil de rol actualizado",
        description: "Los datos operativos de tu cuenta ya quedaron sincronizados."
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar perfil de rol.");
    } finally {
      setIsSavingRole(false);
    }
  };

  const role = profile?.user.role as RoleType | undefined;

  return (
    <AuthGate>
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <PageIntro
          eyebrow="Cuenta"
          title="Mi perfil"
          description="Configura tus datos de usuario, preferencias y perfil operativo dentro del ecosistema pet con una interfaz preparada para web y futura app movil."
          tone="health"
          actions={
            <Link href="/pets" className="kumpa-button-primary">
              Gestionar mascotas
            </Link>
          }
        />

        {error && <InlineBanner tone="error">{error}</InlineBanner>}
        {success && <InlineBanner tone="success">{success}</InlineBanner>}

        {isLoading ? (
          <SurfaceSkeleton blocks={5} />
        ) : !profile ? (
          <EmptyState
            eyebrow="Perfil"
            title="No se pudo cargar tu perfil"
            description="Intenta recargar la pagina o vuelve a iniciar sesion para recuperar el contexto de tu cuenta."
          />
        ) : (
          <>
            <section className="kumpa-panel space-y-3 p-5">
              <h2 className="text-lg font-bold text-slate-900">Historial de reservas</h2>
              <div className="space-y-2 text-sm">
                {appointmentHistory.map((appointment) => (
                  <p key={appointment.id} className="rounded-xl border border-slate-200 px-3 py-2">{new Date(appointment.scheduledAt).toLocaleDateString("es-CL")} · {appointment.status}</p>
                ))}
                {appointmentHistory.length === 0 ? <p className="text-slate-500">Sin reservas registradas.</p> : null}
              </div>
            </section>

            <form className="kumpa-panel space-y-3 p-5" onSubmit={(event) => void handleSaveBase(event)}>
              <h2 className="text-lg font-bold text-slate-900">Perfil base</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  Nombre
                  <input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Apellido
                  <input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Telefono
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Ciudad
                  <input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={isSavingBase}
                className="kumpa-button-primary"
              >
                {isSavingBase ? "Guardando..." : "Guardar perfil base"}
              </button>
            </form>

            {(role === "OWNER" || role === "ADMIN") && (
              <form className="kumpa-panel space-y-3 p-5" onSubmit={(event) => void handleSaveRole(event)}>
                <h2 className="text-lg font-bold text-slate-900">Perfil de dueño</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Comuna / distrito
                    <input
                      value={district}
                      onChange={(event) => setDistrict(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                    Direccion aproximada
                    <input
                      value={approximateAddress}
                      onChange={(event) => setApproximateAddress(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                    Biografia
                    <textarea
                      rows={4}
                      value={biography}
                      onChange={(event) => setBiography(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-700">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={prefEmail} onChange={(event) => setPrefEmail(event.target.checked)} />
                    Email
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={prefInApp} onChange={(event) => setPrefInApp(event.target.checked)} />
                    In-app
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={prefPush} onChange={(event) => setPrefPush(event.target.checked)} />
                    Push (futuro)
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={isSavingRole}
                  className="kumpa-button-primary"
                >
                  {isSavingRole ? "Guardando..." : "Guardar perfil de dueño"}
                </button>
              </form>
            )}

            {role === "VET" && (
              <form className="kumpa-panel space-y-3 p-5" onSubmit={(event) => void handleSaveRole(event)}>
                <h2 className="text-lg font-bold text-slate-900">Perfil veterinaria</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Nombre de clinica
                    <input value={roleField1} onChange={(event) => setRoleField1(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Direccion
                    <input value={roleField2} onChange={(event) => setRoleField2(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Comuna / distrito
                    <input value={roleField3} onChange={(event) => setRoleField3(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Telefono contacto
                    <input value={roleField4} onChange={(event) => setRoleField4(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Email contacto
                    <input value={roleField5} onChange={(event) => setRoleField5(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Latitud
                    <input
                      value={roleGeoLat}
                      onChange={(event) => setRoleGeoLat(event.target.value)}
                      placeholder="-33.45"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Longitud
                    <input
                      value={roleGeoLng}
                      onChange={(event) => setRoleGeoLng(event.target.value)}
                      placeholder="-70.66"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                    Servicios (una linea por servicio)
                    <textarea rows={3} value={roleField6} onChange={(event) => setRoleField6(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                  <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                    Horarios (una linea por horario)
                    <textarea rows={3} value={roleField7} onChange={(event) => setRoleField7(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                  <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                    Descripcion
                    <textarea rows={3} value={roleField8} onChange={(event) => setRoleField8(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={roleFlag} onChange={(event) => setRoleFlag(event.target.checked)} />
                    Urgencias 24/7
                  </label>
                </div>
                <button type="submit" disabled={isSavingRole} className="kumpa-button-primary">
                  {isSavingRole ? "Guardando..." : "Guardar perfil veterinaria"}
                </button>
              </form>
            )}

            {role === "CAREGIVER" && (
              <form className="kumpa-panel space-y-3 p-5" onSubmit={(event) => void handleSaveRole(event)}>
                <h2 className="text-lg font-bold text-slate-900">Perfil cuidador</h2>
                <label className="block text-sm font-semibold text-slate-700">
                  Presentacion
                  <textarea rows={3} value={roleField1} onChange={(event) => setRoleField1(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Experiencia
                  <textarea rows={3} value={roleField2} onChange={(event) => setRoleField2(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Servicios (una linea por item)
                  <textarea rows={3} value={roleField3} onChange={(event) => setRoleField3(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Cobertura geografica
                  <textarea rows={3} value={roleField4} onChange={(event) => setRoleField4(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Tarifas
                  <textarea rows={3} value={roleField5} onChange={(event) => setRoleField5(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Horarios
                  <textarea rows={3} value={roleField6} onChange={(event) => setRoleField6(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Latitud
                    <input
                      value={roleGeoLat}
                      onChange={(event) => setRoleGeoLat(event.target.value)}
                      placeholder="-33.45"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Longitud
                    <input
                      value={roleGeoLng}
                      onChange={(event) => setRoleGeoLng(event.target.value)}
                      placeholder="-70.66"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <button type="submit" disabled={isSavingRole} className="kumpa-button-primary">
                  {isSavingRole ? "Guardando..." : "Guardar perfil cuidador"}
                </button>
              </form>
            )}

            {role === "SHOP" && (
              <form className="kumpa-panel space-y-3 p-5" onSubmit={(event) => void handleSaveRole(event)}>
                <h2 className="text-lg font-bold text-slate-900">Perfil tienda</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Nombre comercial
                    <input value={roleField1} onChange={(event) => setRoleField1(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Direccion
                    <input value={roleField2} onChange={(event) => setRoleField2(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Comuna / distrito
                    <input value={roleField3} onChange={(event) => setRoleField3(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Ciudad
                    <input value={roleField4} onChange={(event) => setRoleField4(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Telefono
                    <input value={roleField5} onChange={(event) => setRoleField5(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Email
                    <input value={roleField6} onChange={(event) => setRoleField6(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Latitud
                    <input
                      value={roleGeoLat}
                      onChange={(event) => setRoleGeoLat(event.target.value)}
                      placeholder="-33.45"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Longitud
                    <input
                      value={roleGeoLng}
                      onChange={(event) => setRoleGeoLng(event.target.value)}
                      placeholder="-70.66"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                    Catalogo basico (una linea por item)
                    <textarea rows={3} value={roleField7} onChange={(event) => setRoleField7(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                  <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                    Descuentos (una linea por beneficio)
                    <textarea rows={3} value={roleField8} onChange={(event) => setRoleField8(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                </div>
                <button type="submit" disabled={isSavingRole} className="kumpa-button-primary">
                  {isSavingRole ? "Guardando..." : "Guardar perfil tienda"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </AuthGate>
  );
}


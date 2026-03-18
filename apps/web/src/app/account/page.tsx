"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/features/auth/auth-context";
import { listAppointments } from "@/features/appointments/appointments-api";
import type { AppointmentRecord } from "@/features/appointments/types";
import { getMyProfile, updateBaseProfile, updateOwnerProfile } from "@/features/profiles/profiles-api";
import type { MyProfile } from "@/features/profiles/types";

/* ─── Utils ──────────────────────────────────────────────────── */
function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

function statusLabel(status: AppointmentRecord["status"]) {
  const map: Record<AppointmentRecord["status"], string> = {
    CONFIRMED: "Confirmada",
    PENDING: "Pendiente",
    COMPLETED: "Completada",
    CANCELLED: "Cancelada",
    REJECTED: "Rechazada",
    RESCHEDULED: "Reagendada",
  };
  return map[status] ?? status;
}

function statusColor(status: AppointmentRecord["status"]) {
  if (status === "CONFIRMED") return "bg-emerald-100 text-emerald-700";
  if (status === "PENDING") return "bg-amber-100 text-amber-700";
  if (status === "COMPLETED") return "bg-slate-100 text-slate-600";
  if (status === "CANCELLED" || status === "REJECTED") return "bg-red-100 text-red-600";
  return "bg-blue-100 text-blue-700";
}

function getInitials(first?: string | null, last?: string | null) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

/* ─── Icons ──────────────────────────────────────────────────── */
function IcoUser() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>;
}
function IcoCal() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
}
function IcoSettings() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
}
function IcoCamera() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>;
}
function IcoEdit() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
}
function IcoLogout() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
}
function IcoMap() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>;
}
function IcoCheck() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="20 6 9 17 4 12" /></svg>;
}

/* ─── Tab types ──────────────────────────────────────────────── */
type Tab = "perfil" | "reservas" | "config";

const TABS: { id: Tab; label: string; Icon: React.FC }[] = [
  { id: "perfil", label: "Perfil", Icon: IcoUser },
  { id: "reservas", label: "Reservas", Icon: IcoCal },
  { id: "config", label: "Configuración", Icon: IcoSettings },
];

/* ─── Avatar ─────────────────────────────────────────────────── */
function Avatar({
  src, initials, size = "lg", editable, onEdit,
}: {
  src?: string | null;
  initials: string;
  size?: "sm" | "lg";
  editable?: boolean;
  onEdit?: () => void;
}) {
  const dim = size === "lg" ? "h-24 w-24 sm:h-28 sm:w-28" : "h-10 w-10";
  const fontSize = size === "lg" ? "text-2xl sm:text-3xl" : "text-sm";

  return (
    <div className={`relative ${dim} shrink-0`}>
      <div className={`${dim} overflow-hidden rounded-full bg-gradient-to-br from-[hsl(155_48%_38%)] to-[hsl(164_30%_25%)] flex items-center justify-center ring-4 ring-white shadow-md`}>
        {src ? (
          <img src={src} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <span className={`${fontSize} font-bold text-white select-none`}>{initials}</span>
        )}
      </div>
      {editable && (
        <button
          onClick={onEdit}
          className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-white shadow-md ring-2 ring-white transition hover:opacity-90 active:scale-90"
          aria-label="Cambiar foto"
        >
          <IcoCamera />
        </button>
      )}
    </div>
  );
}

/* ─── Field row ──────────────────────────────────────────────── */
function FieldRow({ label, value, editing, inputProps }: {
  label: string;
  value: string;
  editing: boolean;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <div className="flex flex-col gap-1 py-3.5 border-b border-slate-100 last:border-0">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      {editing ? (
        <input
          {...inputProps}
          className="mt-0.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[hsl(var(--primary)/0.4)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.1)] transition"
        />
      ) : (
        <p className="mt-0.5 text-sm font-medium text-slate-800">{value || <span className="text-slate-400 font-normal">No configurado</span>}</p>
      )}
    </div>
  );
}

/* ─── Tab: Perfil ────────────────────────────────────────────── */
function TabPerfil({ profile, accessToken, onSaved }: {
  profile: MyProfile | null;
  accessToken: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    firstName: profile?.user.firstName ?? "",
    lastName: profile?.user.lastName ?? "",
    phone: profile?.user.phone ?? "",
    city: profile?.user.city ?? "",
    biography: profile?.ownerProfile?.biography ?? "",
  });

  const avatarSrc = localAvatar ?? profile?.ownerProfile?.avatarUrl ?? null;
  const initials = getInitials(
    form.firstName || profile?.user.firstName,
    form.lastName || profile?.user.lastName,
  );

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLocalAvatar(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateBaseProfile(accessToken, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        city: form.city,
      });
      await updateOwnerProfile(accessToken, {
        biography: form.biography,
        ...(localAvatar ? { avatarUrl: localAvatar } : {}),
      });
      setSaveOk(true);
      setEditing(false);
      onSaved();
      setTimeout(() => setSaveOk(false), 2500);
    } catch {
      /* error handled silently — could add inline banner */
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Top row: avatar + name + edit button */}
        <div className="flex items-start gap-5">
          <Avatar
            src={avatarSrc}
            initials={initials}
            size="lg"
            editable={editing}
            onEdit={() => fileRef.current?.click()}
          />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Tu cuenta</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900 truncate">
              {[form.firstName, form.lastName].filter(Boolean).join(" ") || "Sin nombre"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 truncate">{profile?.user.email}</p>
            {profile?.ownerProfile?.biography && !editing && (
              <p className="mt-2 text-sm text-slate-500 leading-relaxed line-clamp-2">{profile.ownerProfile.biography}</p>
            )}
          </div>

          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            disabled={saving}
            className={`shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 ${
              editing
                ? "bg-[hsl(var(--primary))] text-white hover:opacity-90"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {saving ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : editing ? (
              <><IcoCheck /> Guardar</>
            ) : (
              <><IcoEdit /> Editar</>
            )}
          </button>
        </div>

        {saveOk && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
            <IcoCheck /> Perfil actualizado correctamente
          </div>
        )}

        {/* Fields */}
        <div className="mt-5">
          <FieldRow
            label="Nombre"
            value={form.firstName}
            editing={editing}
            inputProps={{ placeholder: "Tu nombre", value: form.firstName, onChange: e => setForm(f => ({ ...f, firstName: e.target.value })) }}
          />
          <FieldRow
            label="Apellido"
            value={form.lastName}
            editing={editing}
            inputProps={{ placeholder: "Tu apellido", value: form.lastName, onChange: e => setForm(f => ({ ...f, lastName: e.target.value })) }}
          />
          <FieldRow
            label="Correo"
            value={profile?.user.email ?? ""}
            editing={false}
          />
          <FieldRow
            label="Teléfono"
            value={form.phone}
            editing={editing}
            inputProps={{ type: "tel", placeholder: "+56 9 0000 0000", value: form.phone, onChange: e => setForm(f => ({ ...f, phone: e.target.value })) }}
          />
          <FieldRow
            label="Ciudad"
            value={form.city}
            editing={editing}
            inputProps={{ placeholder: "Santiago, Valparaíso...", value: form.city, onChange: e => setForm(f => ({ ...f, city: e.target.value })) }}
          />

          {editing && (
            <div className="flex flex-col gap-1 pt-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Bio</p>
              <textarea
                placeholder="Cuéntanos sobre ti y tus mascotas..."
                value={form.biography}
                onChange={e => setForm(f => ({ ...f, biography: e.target.value }))}
                rows={3}
                className="mt-0.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[hsl(var(--primary)/0.4)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.1)] transition"
              />
            </div>
          )}
        </div>

        {editing && (
          <button
            onClick={() => setEditing(false)}
            className="mt-4 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
        )}
      </div>

      {/* Verified status */}
      <div className={`flex items-center gap-3 rounded-2xl border px-5 py-4 ${profile?.user.emailVerifiedAt ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${profile?.user.emailVerifiedAt ? "bg-emerald-500 text-white" : "bg-amber-400 text-white"}`}>
          {profile?.user.emailVerifiedAt ? "✓" : "!"}
        </span>
        <div>
          <p className={`text-sm font-semibold ${profile?.user.emailVerifiedAt ? "text-emerald-800" : "text-amber-800"}`}>
            {profile?.user.emailVerifiedAt ? "Correo verificado" : "Correo no verificado"}
          </p>
          <p className={`text-xs mt-0.5 ${profile?.user.emailVerifiedAt ? "text-emerald-600" : "text-amber-600"}`}>
            {profile?.user.emailVerifiedAt
              ? `Verificado el ${new Date(profile.user.emailVerifiedAt).toLocaleDateString("es-CL")}`
              : "Revisa tu bandeja de entrada para verificar tu cuenta"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Tab: Reservas ──────────────────────────────────────────── */
function TabReservas({ appointments }: { appointments: AppointmentRecord[] }) {
  const upcoming = appointments.filter(a => a.status === "CONFIRMED" || a.status === "PENDING");
  const past = appointments.filter(a => a.status === "COMPLETED" || a.status === "CANCELLED" || a.status === "REJECTED" || a.status === "RESCHEDULED");

  if (appointments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-8 py-14 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <IcoCal />
        </div>
        <h3 className="text-base font-bold text-slate-800">Sin reservas aún</h3>
        <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
          Encuentra veterinarias, peluquerías y servicios cercanos para hacer tu primera reserva.
        </p>
        <a
          href="/explore"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90 active:scale-95"
        >
          <IcoMap /> Explorar servicios
        </a>
      </div>
    );
  }

  function AppointmentCard({ apt }: { apt: AppointmentRecord }) {
    return (
      <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 truncate">
              {apt.provider.providerName || apt.appointmentService?.title || apt.serviceTypeLabel}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">{formatDate(apt.scheduledAt)}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusColor(apt.status)}`}>
            {statusLabel(apt.status)}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {apt.pet?.name && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
              {apt.pet.name}
            </span>
          )}
          {apt.appointmentService?.title && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
              {apt.appointmentService.title}
            </span>
          )}
          {apt.appointmentService?.priceCents && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
              ${(apt.appointmentService.priceCents / 100).toLocaleString("es-CL")}
            </span>
          )}
        </div>
      </article>
    );
  }

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <section>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Próximas</h3>
          <div className="space-y-3">
            {upcoming.map(apt => <AppointmentCard key={apt.id} apt={apt} />)}
          </div>
        </section>
      )}
      {past.length > 0 && (
        <section>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Historial</h3>
          <div className="space-y-3">
            {past.map(apt => <AppointmentCard key={apt.id} apt={apt} />)}
          </div>
        </section>
      )}
    </div>
  );
}

/* ─── Tab: Configuración ─────────────────────────────────────── */
function TabConfig({ profile }: { profile: MyProfile | null }) {
  const { logout } = useAuth();
  const router = useRouter();
  const notifPrefs = profile?.ownerProfile?.notificationPreferences;

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <div className="space-y-4">
      {/* Account info */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Cuenta</p>
        </div>
        <div className="divide-y divide-slate-100">
          <ConfigRow label="Correo" value={profile?.user.email ?? "—"} />
          <ConfigRow label="Rol" value={profile?.user.role === "OWNER" ? "Dueño de mascotas" : profile?.user.role ?? "—"} />
          <ConfigRow label="Ciudad" value={profile?.user.city ?? "No configurada"} />
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Notificaciones</p>
        </div>
        <div className="divide-y divide-slate-100">
          <NotifRow label="Correo electrónico" active={notifPrefs?.email ?? true} />
          <NotifRow label="Notificaciones en app" active={notifPrefs?.inApp ?? true} />
          <NotifRow label="Notificaciones push" active={notifPrefs?.push ?? false} />
        </div>
      </div>

      {/* Privacy */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Privacidad y seguridad</p>
        </div>
        <div className="divide-y divide-slate-100">
          <button className="flex w-full items-center justify-between px-5 py-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition text-left">
            Cambiar contraseña
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
          <button className="flex w-full items-center justify-between px-5 py-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition text-left">
            Datos personales
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-red-200 bg-white px-5 py-4 text-sm font-semibold text-red-500 transition hover:bg-red-50 active:scale-[0.98] shadow-sm"
      >
        <IcoLogout />
        Cerrar sesión
      </button>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 gap-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800 text-right truncate max-w-[60%]">{value}</p>
    </div>
  );
}

function NotifRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <p className="text-sm text-slate-700">{label}</p>
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
        {active ? "Activo" : "Inactivo"}
      </span>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function AccountPage() {
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken ?? "";
  const [tab, setTab] = useState<Tab>("perfil");
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [profileData, apptData] = await Promise.all([
        getMyProfile(accessToken),
        listAppointments(accessToken, { limit: 20, view: "owner" }),
      ]);
      setProfile(profileData);
      setAppointments(apptData);
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadData(); }, [accessToken]);

  const firstName = profile?.user.firstName ?? session?.user.firstName ?? "";
  const lastName = profile?.user.lastName ?? "";

  return (
    <AuthGate>
      <div className="mx-auto max-w-2xl pb-16 pt-2">

        {/* ── Page title ──────────────────────────────────── */}
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Mi cuenta</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {firstName ? `Hola, ${firstName}` : "Tu cuenta"}
          </h1>
        </div>

        {/* ── Tab bar ─────────────────────────────────────── */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100/80 p-1" style={{ scrollbarWidth: "none" }}>
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-1 shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition whitespace-nowrap ${
                tab === id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className={tab === id ? "text-[hsl(var(--primary))]" : ""}><Icon /></span>
              {label}
            </button>
          ))}
        </div>

        {/* ── Content ─────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <>
            {tab === "perfil" && (
              <TabPerfil profile={profile} accessToken={accessToken} onSaved={loadData} />
            )}
            {tab === "reservas" && (
              <TabReservas appointments={appointments} />
            )}
            {tab === "config" && (
              <TabConfig profile={profile} />
            )}
          </>
        )}
      </div>
    </AuthGate>
  );
}

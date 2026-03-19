"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/features/auth/auth-context";
import {
  listAppointments,
  listProviderAppointmentServices,
  listProviderAvailability,
  confirmAppointment,
  rejectAppointment,
  replaceProviderAppointmentServices,
  replaceProviderAvailability,
} from "@/features/appointments/appointments-api";
import type {
  AppointmentRecord,
  ProviderAppointmentService,
  ProviderAppointmentServiceWriteItem,
  ScheduleAvailability,
  ScheduleAvailabilityWriteItem,
} from "@/features/appointments/types";
import { getMyProfile } from "@/features/profiles/profiles-api";
import { updateGroomerProfile } from "@/features/profiles/profiles-api";
import type { GroomerProfile, MyProfile } from "@/features/profiles/types";

/* ─── helpers ────────────────────────────────────────────────── */
function fmtClp(cents: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(cents / 100);
}
function fmtDate(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente", CONFIRMED: "Confirmada", COMPLETED: "Completada",
  CANCELLED: "Cancelada", REJECTED: "Rechazada", RESCHEDULED: "Reagendada",
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700", CONFIRMED: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-blue-100 text-blue-700", CANCELLED: "bg-slate-100 text-slate-500",
  REJECTED: "bg-red-100 text-red-600", RESCHEDULED: "bg-purple-100 text-purple-700",
};

/* ─── shared UI ──────────────────────────────────────────────── */
function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
function StatCard({ label, value, color = "slate" }: { label: string; value: string | number; color?: "slate" | "green" | "orange" | "amber" | "blue" }) {
  const bg = { slate: "bg-slate-50", green: "bg-emerald-50", orange: "bg-orange-50", amber: "bg-amber-50", blue: "bg-blue-50" }[color];
  const txt = { slate: "text-slate-800", green: "text-emerald-700", orange: "text-orange-700", amber: "text-amber-700", blue: "text-blue-700" }[color];
  return (
    <div className={`${bg} rounded-2xl p-4 border border-white/60 shadow-sm`}>
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1.5 text-2xl font-black ${txt}`}>{value}</p>
    </div>
  );
}
function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
      {children}
    </div>
  );
}
function Inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/10 transition ${props.className ?? ""}`} />;
}
function Sel(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-400 transition ${props.className ?? ""}`} />;
}
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/10 transition" />;
}
function Btn({ children, variant = "primary", size = "md", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "success"; size?: "sm" | "md" }) {
  const base = "inline-flex items-center gap-2 font-semibold rounded-xl transition active:scale-95 disabled:opacity-50";
  const v = {
    primary: "bg-teal-700 text-white hover:bg-teal-800",
    ghost: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
  }[variant];
  const s = { sm: "px-3 py-1.5 text-xs", md: "px-5 py-2.5 text-sm" }[size];
  return <button {...props} className={`${base} ${v} ${s} ${props.className ?? ""}`}>{children}</button>;
}
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <div
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${checked ? "bg-teal-600" : "bg-slate-200"}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </label>
  );
}

/* ─── Section: Resumen ────────────────────────────────────────── */
function SectionResumen({ appointments, groomer }: { appointments: AppointmentRecord[]; groomer?: GroomerProfile | null }) {
  const pending   = appointments.filter(a => a.status === "PENDING").length;
  const confirmed = appointments.filter(a => a.status === "CONFIRMED").length;
  const completed = appointments.filter(a => a.status === "COMPLETED").length;
  const today     = new Date().toDateString();
  const todayAppts = appointments.filter(a => new Date(a.scheduledAt).toDateString() === today).length;

  return (
    <div className="space-y-6">
      <SectionHeader title="Resumen de tu peluquería" subtitle="Vista general del estado de tu negocio en Kummpa" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Pendientes"  value={pending}    color="amber" />
        <StatCard label="Confirmadas" value={confirmed}  color="green" />
        <StatCard label="Hoy"         value={todayAppts} color="blue" />
        <StatCard label="Completadas" value={completed}  color="slate" />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Estado del negocio</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <span className={`h-2.5 w-2.5 rounded-full ${groomer?.businessName ? "bg-teal-500" : "bg-slate-300"}`} />
            <div>
              <p className="text-sm font-semibold text-slate-800">{groomer?.businessName ?? "Sin nombre configurado"}</p>
              <p className="text-xs text-slate-500">{groomer?.address ?? "Sin dirección configurada"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-2xl">✂️</span>
            <p className="text-xs text-slate-500">{(groomer?.services ?? []).length} servicios configurados</p>
          </div>
        </div>
      </div>
      {appointments.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Próximas reservas</p>
          </div>
          <div className="divide-y divide-slate-100">
            {appointments.filter(a => a.status !== "CANCELLED" && a.status !== "REJECTED").slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{a.owner.fullName} · {a.pet.name}</p>
                  <p className="text-xs text-slate-500">{fmtDate(a.scheduledAt)} · {a.serviceTypeLabel}</p>
                </div>
                <span className={`ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_COLORS[a.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {STATUS_LABELS[a.status] ?? a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Section: Perfil ─────────────────────────────────────────── */
function SectionPerfil({ groomer, accessToken, onSaved }: { groomer?: GroomerProfile | null; accessToken: string; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    businessName: groomer?.businessName ?? "",
    description:  groomer?.description  ?? "",
    address:      groomer?.address      ?? "",
    district:     groomer?.district     ?? "",
    city:         groomer?.city         ?? "",
    contactPhone: groomer?.contactPhone ?? "",
    contactEmail: groomer?.contactEmail ?? "",
    websiteUrl:   groomer?.websiteUrl   ?? "",
    latitude:  groomer?.latitude  ?? null as number | null,
    longitude: groomer?.longitude ?? null as number | null,
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  const setNum = (k: "latitude" | "longitude") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.trim();
    setForm(f => ({ ...f, [k]: v === "" ? null : Number(v) }));
  };

  async function save() {
    setSaving(true); setErr(null);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (payload.latitude === null) delete payload.latitude;
      if (payload.longitude === null) delete payload.longitude;
      await updateGroomerProfile(accessToken, payload);
      setOk(true); onSaved();
      setTimeout(() => setOk(false), 2500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Perfil de la peluquería" subtitle="Información pública de tu servicio de grooming" />
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Nombre del negocio"><Inp value={form.businessName} onChange={set("businessName")} placeholder="Peluquería Canina Las Dalias" /></FormRow>
          <FormRow label="Ciudad"><Inp value={form.city} onChange={set("city")} placeholder="Santiago" /></FormRow>
          <FormRow label="Comuna"><Inp value={form.district} onChange={set("district")} placeholder="Providencia" /></FormRow>
          <FormRow label="Dirección"><Inp value={form.address} onChange={set("address")} placeholder="Av. Ejemplo 123" /></FormRow>
          <FormRow label="Teléfono"><Inp value={form.contactPhone} onChange={set("contactPhone")} placeholder="+56 9 0000 0000" /></FormRow>
          <FormRow label="Email"><Inp value={form.contactEmail} onChange={set("contactEmail")} type="email" placeholder="hola@pelucheria.cl" /></FormRow>
          <FormRow label="Sitio web"><Inp value={form.websiteUrl} onChange={set("websiteUrl")} placeholder="https://mipelucheria.cl" /></FormRow>
        </div>
        <FormRow label="Descripción del negocio">
          <Textarea rows={3} value={form.description} onChange={set("description")} placeholder="Contá un poco sobre tu peluquería, especialidades y filosofía de trabajo..." />
        </FormRow>
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-teal-600 mb-2">📍 Ubicación en el mapa</p>
          <p className="text-xs text-teal-700 mb-3">Para aparecer en &quot;Cerca de ti&quot; necesitas ingresar tus coordenadas. Puedes obtenerlas desde <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Google Maps</a> haciendo clic derecho → &quot;¿Qué hay aquí?&quot;</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormRow label="Latitud"><Inp type="number" step="any" value={form.latitude ?? ""} onChange={setNum("latitude")} placeholder="-33.4489" /></FormRow>
            <FormRow label="Longitud"><Inp type="number" step="any" value={form.longitude ?? ""} onChange={setNum("longitude")} placeholder="-70.6693" /></FormRow>
          </div>
          {form.latitude && form.longitude && <p className="mt-2 text-xs text-teal-700">✓ Coordenadas ingresadas: {form.latitude}, {form.longitude}</p>}
        </div>
        {err && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{err}</div>}
        {ok  && <div className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">✓ Perfil guardado</div>}
        <div className="flex justify-end pt-2"><Btn onClick={() => void save()} disabled={saving}>{saving ? "Guardando..." : "Guardar perfil"}</Btn></div>
      </div>
    </div>
  );
}

/* ─── Section: Servicios ──────────────────────────────────────── */
const GROOMING_SERVICE_TYPES = [
  { value: "GROOMING",  label: "Peluquería / Grooming" },
  { value: "WALKING",   label: "Paseo" },
  { value: "TRAINING",  label: "Entrenamiento" },
  { value: "OTHER",     label: "Otro" },
];

function SectionServicios({ services, accessToken, onSaved }: {
  services: ProviderAppointmentService[];
  accessToken: string;
  onSaved: (s: ProviderAppointmentService[]) => void;
}) {
  const [items, setItems] = useState<ProviderAppointmentServiceWriteItem[]>(
    services.map((s, i) => ({ title: s.title, description: s.description ?? "", serviceType: s.serviceType, durationMinutes: s.durationMinutes, priceCents: s.priceCents ?? 0, currencyCode: s.currencyCode, isActive: s.isActive, sortOrder: i }))
  );
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);

  function addItem() {
    setItems(cur => [...cur, { title: "", description: "", serviceType: "GROOMING", durationMinutes: 60, priceCents: 0, currencyCode: "CLP", isActive: true, sortOrder: cur.length }]);
  }
  function removeItem(idx: number) { setItems(cur => cur.filter((_, i) => i !== idx)); }
  function updateItem<K extends keyof ProviderAppointmentServiceWriteItem>(idx: number, key: K, val: ProviderAppointmentServiceWriteItem[K]) {
    setItems(cur => cur.map((item, i) => i === idx ? { ...item, [key]: val } : item));
  }

  async function save() {
    setSaving(true);
    try {
      const result = await replaceProviderAppointmentServices(accessToken, items);
      onSaved(result); setOk(true);
      setTimeout(() => setOk(false), 2500);
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Servicios y precios" subtitle="Define los servicios que ofreces con duración y precio" action={<Btn size="sm" onClick={addItem}>+ Agregar servicio</Btn>} />
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <div className="mx-auto mb-3 text-3xl">✂️</div>
          <p className="font-semibold text-slate-800">Sin servicios configurados</p>
          <p className="mt-1 text-sm text-slate-500">Agrega los servicios que ofreces para que los clientes puedan reservar.</p>
          <Btn size="sm" variant="ghost" className="mt-4" onClick={addItem}>Agregar primer servicio</Btn>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 grid gap-3 sm:grid-cols-2">
                  <FormRow label="Nombre del servicio">
                    <Inp value={item.title} onChange={(e) => updateItem(idx, "title", e.target.value)} placeholder="Ej: Baño y corte completo" />
                  </FormRow>
                  <FormRow label="Tipo">
                    <Sel value={item.serviceType} onChange={(e) => updateItem(idx, "serviceType", e.target.value as ProviderAppointmentServiceWriteItem["serviceType"])}>
                      {GROOMING_SERVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </Sel>
                  </FormRow>
                  <FormRow label="Duración (min)">
                    <Inp type="number" min={15} step={15} value={item.durationMinutes} onChange={(e) => updateItem(idx, "durationMinutes", Number(e.target.value))} />
                  </FormRow>
                  <FormRow label="Precio (CLP)">
                    <Inp type="number" min={0} step={500} value={(item.priceCents ?? 0) / 100} onChange={(e) => updateItem(idx, "priceCents", Math.round(Number(e.target.value) * 100))} placeholder="0" />
                  </FormRow>
                  <FormRow label="Descripción">
                    <Inp value={item.description ?? ""} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="Descripción breve del servicio" />
                  </FormRow>
                  <div className="flex items-center gap-3 pt-4">
                    <Toggle checked={item.isActive} onChange={(v) => updateItem(idx, "isActive", v)} label={item.isActive ? "Activo" : "Inactivo"} />
                  </div>
                </div>
                <button onClick={() => removeItem(idx)} className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {ok && <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">✓ Servicios guardados</div>}
      {items.length > 0 && <div className="flex justify-end"><Btn onClick={() => void save()} disabled={saving}>{saving ? "Guardando..." : "Guardar servicios"}</Btn></div>}
    </div>
  );
}

/* ─── Section: Horarios ───────────────────────────────────────── */
function SectionHorarios({ availability, accessToken, onSaved }: {
  availability: ScheduleAvailability[];
  accessToken: string;
  onSaved: () => void;
}) {
  const [items, setItems] = useState<ScheduleAvailabilityWriteItem[]>(
    availability.map(a => ({ dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime, timezone: a.timezone, isActive: a.isActive, serviceType: a.serviceType ?? undefined }))
  );
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);

  function addSlot() {
    setItems(cur => [...cur, { dayOfWeek: 1, startTime: "09:00", endTime: "18:00", timezone: "America/Santiago", isActive: true }]);
  }
  function removeSlot(idx: number) { setItems(cur => cur.filter((_, i) => i !== idx)); }
  function updateSlot<K extends keyof ScheduleAvailabilityWriteItem>(idx: number, key: K, val: ScheduleAvailabilityWriteItem[K]) {
    setItems(cur => cur.map((item, i) => i === idx ? { ...item, [key]: val } : item));
  }

  async function save() {
    setSaving(true);
    try { await replaceProviderAvailability(accessToken, items); setOk(true); onSaved(); setTimeout(() => setOk(false), 2500); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Horarios de atención" subtitle="Configura los días y horas en que atiendes" action={<Btn size="sm" onClick={addSlot}>+ Agregar horario</Btn>} />
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <p className="text-3xl mb-3">🕐</p>
          <p className="font-semibold text-slate-800">Sin horarios configurados</p>
          <Btn size="sm" variant="ghost" className="mt-4" onClick={addSlot}>Agregar horario</Btn>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((slot, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <Sel value={slot.dayOfWeek} onChange={(e) => updateSlot(idx, "dayOfWeek", Number(e.target.value))} className="w-28">
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </Sel>
              <div className="flex items-center gap-2">
                <Inp type="time" value={slot.startTime} onChange={(e) => updateSlot(idx, "startTime", e.target.value)} className="w-32" />
                <span className="text-slate-400 text-sm">→</span>
                <Inp type="time" value={slot.endTime} onChange={(e) => updateSlot(idx, "endTime", e.target.value)} className="w-32" />
              </div>
              <Toggle checked={slot.isActive} onChange={(v) => updateSlot(idx, "isActive", v)} label="" />
              <button onClick={() => removeSlot(idx)} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition">✕</button>
            </div>
          ))}
        </div>
      )}
      {ok && <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">✓ Horarios guardados</div>}
      {items.length > 0 && <div className="flex justify-end"><Btn onClick={() => void save()} disabled={saving}>{saving ? "Guardando..." : "Guardar horarios"}</Btn></div>}
    </div>
  );
}

/* ─── Section: Reservas ───────────────────────────────────────── */
function SectionReservas({ appointments, accessToken, onRefresh }: {
  appointments: AppointmentRecord[];
  accessToken: string;
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "PENDING" | "CONFIRMED" | "COMPLETED">("all");
  const [acting, setActing] = useState<string | null>(null);
  const visible = filter === "all" ? appointments : appointments.filter(a => a.status === filter);

  async function act(apptId: string, action: "confirm" | "reject") {
    setActing(apptId);
    try {
      if (action === "confirm") await confirmAppointment(accessToken, apptId);
      else await rejectAppointment(accessToken, apptId);
      onRefresh();
    } finally { setActing(null); }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Reservas de clientes" subtitle="Administra las reservas de tus clientes" />
      <div className="flex gap-2 flex-wrap">
        {(["all", "PENDING", "CONFIRMED", "COMPLETED"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${filter === f ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {f === "all" ? "Todas" : STATUS_LABELS[f]}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <p className="text-3xl mb-3">📅</p>
          <p className="font-semibold text-slate-800">Sin reservas</p>
          <p className="mt-1 text-sm text-slate-500">Las reservas de tus clientes aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(a => (
            <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold text-slate-900">{a.owner.fullName} — {a.pet.name}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{a.serviceTypeLabel} · {fmtDate(a.scheduledAt)}</p>
                  {a.reason && <p className="text-xs text-slate-400 mt-1">Motivo: {a.reason}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLORS[a.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {STATUS_LABELS[a.status] ?? a.status}
                </span>
              </div>
              {a.status === "PENDING" && (
                <div className="mt-3 flex gap-2">
                  <Btn size="sm" variant="success" disabled={acting === a.id} onClick={() => void act(a.id, "confirm")}>Confirmar</Btn>
                  <Btn size="sm" variant="danger"  disabled={acting === a.id} onClick={() => void act(a.id, "reject")}>Rechazar</Btn>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────── */
type Tab = "resumen" | "perfil" | "servicios" | "horarios" | "reservas";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "resumen",   label: "Resumen",   icon: "📊" },
  { id: "perfil",    label: "Mi perfil", icon: "✂️" },
  { id: "servicios", label: "Servicios", icon: "📋" },
  { id: "horarios",  label: "Horarios",  icon: "🕐" },
  { id: "reservas",  label: "Reservas",  icon: "📅" },
];

function GroomerDashboard() {
  const { session } = useAuth();
  const router = useRouter();
  const accessToken = session!.tokens.accessToken;

  const [tab, setTab]               = useState<Tab>("resumen");
  const [profile, setProfile]       = useState<MyProfile | null>(null);
  const [appointments, setAppts]    = useState<AppointmentRecord[]>([]);
  const [aptServices, setAptSvc]    = useState<ProviderAppointmentService[]>([]);
  const [availability, setAvail]    = useState<ScheduleAvailability[]>([]);
  const [loading, setLoading]       = useState(true);

  const groomer = profile?.groomerProfile;

  async function loadAll() {
    const [prof, appts, svcs, avail] = await Promise.all([
      getMyProfile(accessToken),
      listAppointments(accessToken, { view: "provider" }),
      listProviderAppointmentServices(accessToken),
      listProviderAvailability(accessToken),
    ]);
    setProfile(prof);
    setAppts(appts);
    setAptSvc(svcs);
    setAvail(avail);
  }

  useEffect(() => {
    if (session?.user.role !== "GROOMING" && session?.user.role !== "ADMIN") {
      router.replace("/");
      return;
    }
    setLoading(true);
    loadAll().finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-2xl">✂️</div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Dashboard Groomer</h1>
          <p className="text-sm text-slate-500">{groomer?.businessName ?? "Configura tu peluquería"}</p>
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${tab === t.id ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {tab === "resumen"   && <SectionResumen   appointments={appointments} groomer={groomer} />}
      {tab === "perfil"    && <SectionPerfil    groomer={groomer} accessToken={accessToken} onSaved={() => void loadAll()} />}
      {tab === "servicios" && <SectionServicios services={aptServices} accessToken={accessToken} onSaved={(s) => setAptSvc(s)} />}
      {tab === "horarios"  && <SectionHorarios  availability={availability} accessToken={accessToken} onSaved={() => void loadAll()} />}
      {tab === "reservas"  && <SectionReservas  appointments={appointments} accessToken={accessToken} onRefresh={() => void loadAll()} />}
    </div>
  );
}

export default function GroomerPage() {
  return (
    <AuthGate>
      <GroomerDashboard />
    </AuthGate>
  );
}

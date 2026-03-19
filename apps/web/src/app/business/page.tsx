"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/auth/auth-gate";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { useAuth } from "@/features/auth/auth-context";
import {
  confirmAppointment,
  listAppointments,
  listProviderAppointmentServices,
  listProviderAvailability,
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
import { getMyProfile, updateGroomerProfile, updateVetProfile } from "@/features/profiles/profiles-api";
import type { GroomerProfile, MyProfile, VetProfile } from "@/features/profiles/types";

/* ─── helpers ─────────────────────────────────────────────────── */
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

/* ─── shared UI ───────────────────────────────────────────────── */
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

function StatCard({ label, value, sub, color = "slate" }: { label: string; value: string | number; sub?: string; color?: "slate" | "green" | "orange" | "red" | "blue" | "amber" }) {
  const bg = { slate: "bg-slate-50", green: "bg-emerald-50", orange: "bg-orange-50", red: "bg-red-50", blue: "bg-blue-50", amber: "bg-amber-50" }[color];
  const txt = { slate: "text-slate-800", green: "text-emerald-700", orange: "text-orange-700", red: "text-red-700", blue: "text-blue-700", amber: "text-amber-700" }[color];
  return (
    <div className={`${bg} rounded-2xl p-4 border border-white/60 shadow-sm`}>
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1.5 text-2xl font-black ${txt}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function Badge({ label, color = "slate" }: { label: string; color?: "green" | "red" | "amber" | "slate" | "blue" }) {
  const cls = { green: "bg-emerald-100 text-emerald-700", red: "bg-red-100 text-red-600", amber: "bg-amber-100 text-amber-700", slate: "bg-slate-100 text-slate-600", blue: "bg-blue-100 text-blue-700" }[color];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cls}`}>{label}</span>;
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

/* ─── Section: Resumen ─────────────────────────────────────────── */
function SectionResumen({ appointments, vet }: { appointments: AppointmentRecord[]; vet?: VetProfile | null }) {
  const pending   = appointments.filter(a => a.status === "PENDING").length;
  const confirmed = appointments.filter(a => a.status === "CONFIRMED").length;
  const completed = appointments.filter(a => a.status === "COMPLETED").length;
  const today = new Date().toDateString();
  const todayAppts = appointments.filter(a => new Date(a.scheduledAt).toDateString() === today).length;

  return (
    <div className="space-y-6">
      <SectionHeader title="Resumen de tu clínica" subtitle="Vista general del estado de tu veterinaria en Kummpa" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Pendientes" value={pending} color="amber" />
        <StatCard label="Confirmadas" value={confirmed} color="green" />
        <StatCard label="Hoy" value={todayAppts} color="blue" />
        <StatCard label="Completadas" value={completed} color="slate" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Estado de la clínica</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <span className={`h-2.5 w-2.5 rounded-full ${vet?.clinicName ? "bg-teal-500" : "bg-slate-300"}`} />
            <div>
              <p className="text-sm font-semibold text-slate-800">{vet?.clinicName ?? "Sin nombre de clínica"}</p>
              <p className="text-xs text-slate-500">{vet?.address ?? "Sin dirección configurada"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
            {vet?.isEmergency24x7 ? (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600">🚨 24/7</span>
            ) : (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Sin urgencias 24/7</span>
            )}
            <p className="text-xs text-slate-500">{(vet?.services ?? []).length} servicios configurados</p>
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

/* ─── Section: Perfil ──────────────────────────────────────────── */
function SectionPerfil({ vet, accessToken, onSaved }: { vet?: VetProfile | null; accessToken: string; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [form, setForm] = useState({
    clinicName:     vet?.clinicName     ?? "",
    address:        vet?.address        ?? "",
    district:       vet?.district       ?? "",
    city:           vet?.city           ?? "",
    contactPhone:   vet?.contactPhone   ?? "",
    contactEmail:   vet?.contactEmail   ?? "",
    websiteUrl:     vet?.websiteUrl     ?? "",
    description:    vet?.description    ?? "",
    isEmergency24x7: vet?.isEmergency24x7 ?? false,
    latitude:  vet?.latitude  ?? null as number | null,
    longitude: vet?.longitude ?? null as number | null,
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const setNum = (k: "latitude" | "longitude") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.trim();
    setForm(f => ({ ...f, [k]: v === "" ? null : Number(v) }));
  };

  async function save() {
    setSaving(true);
    try {
      await updateVetProfile(accessToken, form);
      setOk(true); onSaved();
      setTimeout(() => setOk(false), 2500);
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Perfil de la clínica" subtitle="Información pública de tu veterinaria" />
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Nombre de la clínica"><Inp value={form.clinicName} onChange={set("clinicName")} placeholder="Veterinaria Las Dalias" /></FormRow>
          <FormRow label="Ciudad"><Inp value={form.city} onChange={set("city")} placeholder="Santiago" /></FormRow>
          <FormRow label="Comuna"><Inp value={form.district} onChange={set("district")} placeholder="Providencia" /></FormRow>
          <FormRow label="Dirección"><Inp value={form.address} onChange={set("address")} placeholder="Av. Ejemplo 123" /></FormRow>
          <FormRow label="Teléfono"><Inp value={form.contactPhone} onChange={set("contactPhone")} placeholder="+56 9 0000 0000" /></FormRow>
          <FormRow label="Email"><Inp value={form.contactEmail} onChange={set("contactEmail")} type="email" placeholder="hola@vet.cl" /></FormRow>
          <FormRow label="Sitio web"><Inp value={form.websiteUrl} onChange={set("websiteUrl")} placeholder="https://mivet.cl" /></FormRow>
        </div>
        <FormRow label="Descripción de la clínica">
          <Textarea rows={3} value={form.description} onChange={set("description")} placeholder="Contá un poco sobre tu clínica, especialidades y filosofía de atención..." />
        </FormRow>
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-teal-600 mb-2">📍 Ubicación en el mapa</p>
          <p className="text-xs text-teal-700 mb-3">Para aparecer en &quot;Cerca de ti&quot; necesitas ingresar tus coordenadas. Puedes obtenerlas desde <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Google Maps</a> haciendo clic derecho sobre tu clínica → &quot;¿Qué hay aquí?&quot;</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormRow label="Latitud">
              <Inp type="number" step="any" value={form.latitude ?? ""} onChange={setNum("latitude")} placeholder="-33.4489" />
            </FormRow>
            <FormRow label="Longitud">
              <Inp type="number" step="any" value={form.longitude ?? ""} onChange={setNum("longitude")} placeholder="-70.6693" />
            </FormRow>
          </div>
          {form.latitude && form.longitude && (
            <p className="mt-2 text-xs text-teal-700">✓ Coordenadas ingresadas: {form.latitude}, {form.longitude}</p>
          )}
        </div>
        <Toggle checked={form.isEmergency24x7} onChange={(v) => setForm(f => ({ ...f, isEmergency24x7: v }))} label="Atención de urgencias 24/7" />
        {ok && <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">✓ Perfil guardado</div>}
        <div className="flex justify-end pt-2"><Btn onClick={() => void save()} disabled={saving}>{saving ? "Guardando..." : "Guardar perfil"}</Btn></div>
      </div>
    </div>
  );
}

/* ─── Section: Servicios ───────────────────────────────────────── */
const SERVICE_TYPES = [
  { value: "GENERAL_CONSULT", label: "Consulta general" },
  { value: "VACCINATION", label: "Vacunación" },
  { value: "EMERGENCY", label: "Urgencias" },
  { value: "DEWORMING", label: "Desparasitación" },
  { value: "GROOMING", label: "Estética" },
  { value: "HOTEL_DAYCARE", label: "Hotel/Guardería" },
  { value: "WALKING", label: "Paseo" },
  { value: "TRAINING", label: "Entrenamiento" },
  { value: "OTHER", label: "Otro" },
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
    setItems(cur => [...cur, { title: "", description: "", serviceType: "GENERAL_CONSULT", durationMinutes: 30, priceCents: 0, currencyCode: "CLP", isActive: true, sortOrder: cur.length }]);
  }
  function removeItem(idx: number) {
    setItems(cur => cur.filter((_, i) => i !== idx));
  }
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
          <div className="mx-auto mb-3 text-3xl">🩺</div>
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
                    <Inp value={item.title} onChange={(e) => updateItem(idx, "title", e.target.value)} placeholder="Ej: Consulta general" />
                  </FormRow>
                  <FormRow label="Tipo">
                    <Sel value={item.serviceType} onChange={(e) => updateItem(idx, "serviceType", e.target.value as ProviderAppointmentServiceWriteItem["serviceType"])}>
                      {SERVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </Sel>
                  </FormRow>
                  <FormRow label="Duración (min)">
                    <Inp type="number" min={5} step={5} value={item.durationMinutes} onChange={(e) => updateItem(idx, "durationMinutes", Number(e.target.value))} />
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

/* ─── Section: Horarios ────────────────────────────────────────── */
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

/* ─── Section: Reservas ────────────────────────────────────────── */
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
      else await rejectAppointment(accessToken, apptId, "No disponible en ese horario.");
      onRefresh();
    } finally { setActing(null); }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Reservas" subtitle="Gestiona las citas de tus clientes" />
      <div className="flex flex-wrap gap-2">
        {[["all", "Todas"], ["PENDING", "Pendientes"], ["CONFIRMED", "Confirmadas"], ["COMPLETED", "Completadas"]] .map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val as typeof filter)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${filter === val ? "bg-teal-700 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
            {label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <p className="text-3xl mb-3">📅</p>
          <p className="font-semibold text-slate-800">Sin reservas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(a => (
            <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-slate-800">{a.owner.fullName}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_COLORS[a.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {STATUS_LABELS[a.status] ?? a.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">🐾 {a.pet.name} · {a.pet.species} · {a.pet.breed}</p>
                  <p className="mt-0.5 text-xs text-slate-500">🩺 {a.serviceTypeLabel} · {a.durationMinutes} min</p>
                  <p className="mt-0.5 text-xs text-slate-500">📅 {fmtDate(a.scheduledAt)}</p>
                  {a.reason && <p className="mt-1 text-xs italic text-slate-400">&ldquo;{a.reason}&rdquo;</p>}
                </div>
                {a.permissions.canConfirm || a.permissions.canReject ? (
                  <div className="flex shrink-0 gap-2">
                    {a.permissions.canConfirm && (
                      <Btn size="sm" variant="success" disabled={acting === a.id} onClick={() => void act(a.id, "confirm")}>
                        {acting === a.id ? "..." : "Confirmar"}
                      </Btn>
                    )}
                    {a.permissions.canReject && (
                      <Btn size="sm" variant="danger" disabled={acting === a.id} onClick={() => void act(a.id, "reject")}>
                        {acting === a.id ? "..." : "Rechazar"}
                      </Btn>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Nav sections ─────────────────────────────────────────────── */
type Section = "resumen" | "perfil" | "servicios" | "horarios" | "reservas";
const NAV: { id: Section; label: string; icon: string }[] = [
  { id: "resumen",   label: "Resumen",   icon: "◈" },
  { id: "perfil",    label: "Perfil",    icon: "🏥" },
  { id: "servicios", label: "Servicios", icon: "🩺" },
  { id: "horarios",  label: "Horarios",  icon: "🕐" },
  { id: "reservas",  label: "Reservas",  icon: "📅" },
];

/* ─── Dashboard shell ──────────────────────────────────────────── */
function VetDashboard({ profile, token }: { profile: MyProfile; token: string }) {
  const vet = profile.vetProfile;
  const [section, setSection] = useState<Section>("resumen");
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [services, setServices]         = useState<ProviderAppointmentService[]>([]);
  const [availability, setAvailability] = useState<ScheduleAvailability[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [vetProfile, setVetProfile]     = useState<VetProfile | null | undefined>(vet);

  const load = async () => {
    setIsLoading(true);
    try {
      const [apptRows, svcRows, avRows] = await Promise.all([
        listAppointments(token, { view: "provider", limit: 50 }),
        listProviderAppointmentServices(token, false),
        listProviderAvailability(token),
      ]);
      setAppointments(apptRows);
      setServices(svcRows);
      setAvailability(avRows);
    } finally { setIsLoading(false); }
  };

  useEffect(() => { void load(); }, [token]);

  const pending = appointments.filter(a => a.status === "PENDING").length;

  return (
    <div className="flex min-h-screen gap-0 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* sidebar */}
      <nav className="w-52 shrink-0 bg-slate-900 py-6">
        <div className="px-5 mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Panel veterinaria</p>
          <p className="mt-1 text-sm font-bold text-white truncate">{vet?.clinicName ?? profile.user.firstName}</p>
        </div>
        <div className="space-y-0.5 px-3">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                section === item.id
                  ? "bg-teal-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
              {item.id === "reservas" && pending > 0 && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white">{pending}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* main */}
      <main className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        ) : (
          <>
            {section === "resumen"   && <SectionResumen appointments={appointments} vet={vetProfile} />}
            {section === "perfil"    && <SectionPerfil vet={vetProfile} accessToken={token} onSaved={() => setVetProfile(prev => prev)} />}
            {section === "servicios" && <SectionServicios services={services} accessToken={token} onSaved={setServices} />}
            {section === "horarios"  && <SectionHorarios availability={availability} accessToken={token} onSaved={() => void load()} />}
            {section === "reservas"  && <SectionReservas appointments={appointments} accessToken={token} onRefresh={() => void load()} />}
          </>
        )}
      </main>
    </div>
  );
}

/* ─── Groomer: Resumen ─────────────────────────────────────────── */
function SectionResumenGroomer({ appointments, groomer }: { appointments: AppointmentRecord[]; groomer?: GroomerProfile | null }) {
  const pending   = appointments.filter(a => a.status === "PENDING").length;
  const confirmed = appointments.filter(a => a.status === "CONFIRMED").length;
  const completed = appointments.filter(a => a.status === "COMPLETED").length;
  const today = new Date().toDateString();
  const todayAppts = appointments.filter(a => new Date(a.scheduledAt).toDateString() === today).length;

  return (
    <div className="space-y-6">
      <SectionHeader title="Resumen de tu peluquería" subtitle="Vista general del estado de tu negocio en Kummpa" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Pendientes" value={pending} color="amber" />
        <StatCard label="Confirmadas" value={confirmed} color="green" />
        <StatCard label="Hoy" value={todayAppts} color="blue" />
        <StatCard label="Completadas" value={completed} color="slate" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Estado de la peluquería</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <span className={`h-2.5 w-2.5 rounded-full ${groomer?.businessName ? "bg-teal-500" : "bg-slate-300"}`} />
            <div>
              <p className="text-sm font-semibold text-slate-800">{groomer?.businessName ?? "Sin nombre de negocio"}</p>
              <p className="text-xs text-slate-500">{groomer?.address ?? "Sin dirección configurada"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-700">✂ Peluquería</span>
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

/* ─── Groomer: Perfil ──────────────────────────────────────────── */
function SectionPerfilGroomer({ groomer, accessToken, onSaved }: {
  groomer?: GroomerProfile | null;
  accessToken: string;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [form, setForm] = useState({
    businessName:  groomer?.businessName  ?? "",
    description:   groomer?.description   ?? "",
    address:       groomer?.address       ?? "",
    district:      groomer?.district      ?? "",
    city:          groomer?.city          ?? "",
    contactPhone:  groomer?.contactPhone  ?? "",
    contactEmail:  groomer?.contactEmail  ?? "",
    websiteUrl:    groomer?.websiteUrl    ?? "",
    latitude:  groomer?.latitude  ?? null as number | null,
    longitude: groomer?.longitude ?? null as number | null,
    photosText: (groomer?.photos ?? []).join("\n"),
    paymentMethodsText: (groomer?.paymentMethods ?? []).join(", "),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const setNum = (k: "latitude" | "longitude") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.trim();
    setForm(f => ({ ...f, [k]: v === "" ? null : Number(v) }));
  };

  async function save() {
    setSaving(true);
    try {
      const photos = form.photosText.split("\n").map(u => u.trim()).filter(u => u.length > 0);
      const paymentMethods = form.paymentMethodsText.split(",").map(p => p.trim()).filter(p => p.length > 0);
      await updateGroomerProfile(accessToken, {
        businessName: form.businessName || undefined,
        description:  form.description  || undefined,
        address:      form.address      || undefined,
        district:     form.district     || undefined,
        city:         form.city         || undefined,
        contactPhone: form.contactPhone || undefined,
        contactEmail: form.contactEmail || undefined,
        websiteUrl:   form.websiteUrl   || undefined,
        latitude:     form.latitude     ?? undefined,
        longitude:    form.longitude    ?? undefined,
        photos:       photos.length > 0 ? photos : undefined,
        paymentMethods: paymentMethods.length > 0 ? paymentMethods : undefined,
      });
      setOk(true); onSaved();
      setTimeout(() => setOk(false), 2500);
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Perfil de la peluquería" subtitle="Información pública de tu negocio" />
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Nombre del negocio"><Inp value={form.businessName} onChange={set("businessName")} placeholder="Peluquería Las Mascotas" /></FormRow>
          <FormRow label="Ciudad"><Inp value={form.city} onChange={set("city")} placeholder="Santiago" /></FormRow>
          <FormRow label="Comuna"><Inp value={form.district} onChange={set("district")} placeholder="Providencia" /></FormRow>
          <FormRow label="Dirección"><Inp value={form.address} onChange={set("address")} placeholder="Av. Ejemplo 123" /></FormRow>
          <FormRow label="Teléfono"><Inp value={form.contactPhone} onChange={set("contactPhone")} placeholder="+56 9 0000 0000" /></FormRow>
          <FormRow label="Email"><Inp value={form.contactEmail} onChange={set("contactEmail")} type="email" placeholder="hola@peluqueria.cl" /></FormRow>
          <FormRow label="Sitio web"><Inp value={form.websiteUrl} onChange={set("websiteUrl")} placeholder="https://mipeluqueria.cl" /></FormRow>
          <FormRow label="Métodos de pago (separados por coma)">
            <Inp value={form.paymentMethodsText} onChange={set("paymentMethodsText")} placeholder="Efectivo, Tarjeta, Transferencia" />
          </FormRow>
        </div>
        <FormRow label="Descripción del negocio">
          <Textarea rows={3} value={form.description} onChange={set("description")} placeholder="Contá un poco sobre tu peluquería, especialidades y filosofía..." />
        </FormRow>
        <FormRow label="Fotos del negocio (una URL por línea)">
          <Textarea rows={3} value={form.photosText} onChange={set("photosText")} placeholder={"https://example.com/foto1.jpg\nhttps://example.com/foto2.jpg"} />
          <p className="text-[11px] text-slate-400">Ingresa las URLs de las fotos de tu peluquería, una por línea</p>
        </FormRow>
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-teal-600 mb-2">📍 Ubicación en el mapa</p>
          <p className="text-xs text-teal-700 mb-3">Para aparecer en &quot;Cerca de ti&quot; necesitas ingresar tus coordenadas. Puedes obtenerlas desde <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Google Maps</a> haciendo clic derecho sobre tu peluquería → &quot;¿Qué hay aquí?&quot;</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormRow label="Latitud"><Inp type="number" step="any" value={form.latitude ?? ""} onChange={setNum("latitude")} placeholder="-33.4489" /></FormRow>
            <FormRow label="Longitud"><Inp type="number" step="any" value={form.longitude ?? ""} onChange={setNum("longitude")} placeholder="-70.6693" /></FormRow>
          </div>
          {form.latitude && form.longitude && (
            <p className="mt-2 text-xs text-teal-700">✓ Coordenadas ingresadas: {form.latitude}, {form.longitude}</p>
          )}
        </div>
        {ok && <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">✓ Perfil guardado</div>}
        <div className="flex justify-end pt-2"><Btn onClick={() => void save()} disabled={saving}>{saving ? "Guardando..." : "Guardar perfil"}</Btn></div>
      </div>
    </div>
  );
}

/* ─── Groomer: Servicios (grooming-specific types) ─────────────── */
const GROOMER_SERVICE_TYPES = [
  { value: "GROOMING", label: "Baño y estética" },
  { value: "OTHER",    label: "Otro" },
];

function SectionServiciosGroomer({ services, accessToken, onSaved }: {
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
          <div className="mx-auto mb-3 text-3xl">✂</div>
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
                    <Inp value={item.title} onChange={(e) => updateItem(idx, "title", e.target.value)} placeholder="Ej: Baño completo, Corte de pelo" />
                  </FormRow>
                  <FormRow label="Tipo">
                    <Sel value={item.serviceType} onChange={(e) => updateItem(idx, "serviceType", e.target.value as ProviderAppointmentServiceWriteItem["serviceType"])}>
                      {GROOMER_SERVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </Sel>
                  </FormRow>
                  <FormRow label="Duración (min)">
                    <Inp type="number" min={5} step={5} value={item.durationMinutes} onChange={(e) => updateItem(idx, "durationMinutes", Number(e.target.value))} />
                  </FormRow>
                  <FormRow label="Precio (CLP)">
                    <Inp type="number" min={0} step={500} value={(item.priceCents ?? 0) / 100} onChange={(e) => updateItem(idx, "priceCents", Math.round(Number(e.target.value) * 100))} placeholder="0" />
                  </FormRow>
                  <FormRow label="Descripción">
                    <Inp value={item.description ?? ""} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="Ej: Incluye baño, secado y corte de uñas" />
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

/* ─── Groomer nav / Dashboard shell ────────────────────────────── */
type GroomerSection = "resumen" | "perfil" | "servicios" | "horarios" | "reservas";
const GROOMER_NAV: { id: GroomerSection; label: string; icon: string }[] = [
  { id: "resumen",   label: "Resumen",   icon: "◈" },
  { id: "perfil",    label: "Mi perfil", icon: "✂" },
  { id: "servicios", label: "Servicios", icon: "🛁" },
  { id: "horarios",  label: "Horarios",  icon: "🕐" },
  { id: "reservas",  label: "Reservas",  icon: "📅" },
];

function GroomerDashboard({ profile, token }: { profile: MyProfile; token: string }) {
  const groomer = profile.groomerProfile;
  const [section, setSection] = useState<GroomerSection>("resumen");
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [services, setServices]         = useState<ProviderAppointmentService[]>([]);
  const [availability, setAvailability] = useState<ScheduleAvailability[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [groomerProfile, setGroomerProfile] = useState<GroomerProfile | null | undefined>(groomer);

  const load = async () => {
    setIsLoading(true);
    try {
      const [apptRows, svcRows, avRows] = await Promise.all([
        listAppointments(token, { view: "provider", limit: 50 }),
        listProviderAppointmentServices(token, true),
        listProviderAvailability(token),
      ]);
      setAppointments(apptRows);
      setServices(svcRows);
      setAvailability(avRows);
    } finally { setIsLoading(false); }
  };

  useEffect(() => { void load(); }, [token]);

  const pending = appointments.filter(a => a.status === "PENDING").length;

  return (
    <div className="flex min-h-screen gap-0 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* sidebar */}
      <nav className="w-52 shrink-0 bg-slate-900 py-6">
        <div className="px-5 mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Panel peluquería</p>
          <p className="mt-1 text-sm font-bold text-white truncate">{groomerProfile?.businessName ?? profile.user.firstName}</p>
        </div>
        <div className="space-y-0.5 px-3">
          {GROOMER_NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                section === item.id
                  ? "bg-teal-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
              {item.id === "reservas" && pending > 0 && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white">{pending}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* main */}
      <main className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        ) : (
          <>
            {section === "resumen"   && <SectionResumenGroomer appointments={appointments} groomer={groomerProfile} />}
            {section === "perfil"    && <SectionPerfilGroomer groomer={groomerProfile} accessToken={token} onSaved={() => void load()} />}
            {section === "servicios" && <SectionServiciosGroomer services={services} accessToken={token} onSaved={setServices} />}
            {section === "horarios"  && <SectionHorarios availability={availability} accessToken={token} onSaved={() => void load()} />}
            {section === "reservas"  && <SectionReservas appointments={appointments} accessToken={token} onRefresh={() => void load()} />}
          </>
        )}
      </main>
    </div>
  );
}

/* ─── Caregiver panel (unchanged) ─────────────────────────────── */
function WalkerPanel({ profile }: { profile: MyProfile }) {
  return (
    <div className="rounded-3xl border border-[hsl(var(--border))] bg-white p-8 text-center">
      <p className="text-3xl">🐕</p>
      <h2 className="mt-3 text-xl font-bold">Panel Cuidador</h2>
      <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Hola {profile.user.firstName}. Tu panel de cuidador está disponible aquí.</p>
      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Puedes gestionar tus servicios y disponibilidad desde la configuración de tu perfil.</p>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────── */
export default function BusinessPage() {
  const { session } = useAuth();
  const router = useRouter();
  const accessToken = session?.tokens.accessToken;
  const role = session?.user.role;

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    if (role === "SHOP") { router.replace("/marketplace/dashboard"); return; }
    getMyProfile(accessToken)
      .then(setProfile)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el perfil."))
      .finally(() => setIsLoading(false));
  }, [accessToken, role]);

  return (
    <AuthGate>
      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-2xl bg-[hsl(var(--muted))]" />)}
        </div>
      ) : error ? (
        <InlineBanner tone="error">{error}</InlineBanner>
      ) : profile && accessToken ? (
        role === "VET" ? (
          <VetDashboard profile={profile} token={accessToken} />
        ) : role === "GROOMING" ? (
          <GroomerDashboard profile={profile} token={accessToken} />
        ) : (
          <WalkerPanel profile={profile} />
        )
      ) : null}
    </AuthGate>
  );
}

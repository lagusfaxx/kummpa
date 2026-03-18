"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/auth/auth-gate";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { useAuth } from "@/features/auth/auth-context";
import { getMyProfile } from "@/features/profiles/profiles-api";
import {
  updateCaregiverProfile,
  updateShopProfile,
  updateVetProfile
} from "@/features/profiles/profiles-api";
import type { MyProfile } from "@/features/profiles/types";

/* ─── helpers ────────────────────────────────────────────────── */
function cls(...args: (string | false | undefined | null)[]) {
  return args.filter(Boolean).join(" ");
}

/* ─── Tag chip input ─────────────────────────────────────────── */
function TagInput({
  label,
  hint,
  values,
  onChange,
  placeholder
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function add() {
    const trimmed = draft.trim();
    if (!trimmed || values.includes(trimmed)) { setDraft(""); return; }
    onChange([...values, trimmed]);
    setDraft("");
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); add(); }
    if (e.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
        {label}
      </label>
      {hint && <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{hint}</p>}
      <div
        className="mt-2 flex min-h-[44px] flex-wrap gap-2 rounded-2xl border border-[hsl(var(--border))] bg-white/70 px-3 py-2 focus-within:border-[hsl(var(--secondary)/0.5)] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {values.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1 rounded-full bg-[hsl(var(--muted))] px-3 py-0.5 text-[12px] font-medium"
          >
            {v}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(values.filter((x) => x !== v)); }}
              className="ml-0.5 rounded-full text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] focus:outline-none"
              aria-label={`Quitar ${v}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={add}
          placeholder={values.length === 0 ? (placeholder ?? "Escribe y presiona Enter") : ""}
          className="min-w-[140px] flex-1 border-none bg-transparent text-sm outline-none placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
        />
      </div>
    </div>
  );
}

/* ─── Toggle ─────────────────────────────────────────────────── */
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <span
        onClick={() => onChange(!checked)}
        className={cls(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
          checked ? "bg-[hsl(var(--secondary))]" : "bg-[hsl(var(--muted))]"
        )}
      >
        <span
          className={cls(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
}

/* ─── Section wrapper ─────────────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-white/70 p-5 space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-[hsl(var(--border))] bg-white/70 px-3 py-2 text-sm outline-none focus:border-[hsl(var(--secondary)/0.5)] placeholder:text-[hsl(var(--muted-foreground)/0.6)]";

/* ─── Vet panel ──────────────────────────────────────────────── */
function VetPanel({ profile, token, onSaved }: { profile: MyProfile; token: string; onSaved: () => void }) {
  const vet = profile.vetProfile ?? {};
  const [clinicName, setClinicName] = useState(vet.clinicName ?? "");
  const [address, setAddress]       = useState(vet.address ?? "");
  const [district, setDistrict]     = useState(vet.district ?? "");
  const [phone, setPhone]           = useState(vet.contactPhone ?? "");
  const [email, setEmail]           = useState(vet.contactEmail ?? "");
  const [website, setWebsite]       = useState(vet.websiteUrl ?? "");
  const [emergency, setEmergency]   = useState(vet.isEmergency24x7 ?? false);
  const [services, setServices]     = useState<string[]>(vet.services ?? []);
  const [prices, setPrices]         = useState<string[]>(vet.referencePrices ?? []);
  const [hours, setHours]           = useState<string[]>(vet.openingHours ?? []);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [saved, setSaved]           = useState(false);

  async function save() {
    setSaving(true); setError(null); setSaved(false);
    try {
      await updateVetProfile(token, {
        clinicName: clinicName || undefined,
        address: address || undefined,
        district: district || undefined,
        contactPhone: phone || undefined,
        contactEmail: email || undefined,
        websiteUrl: website || undefined,
        isEmergency24x7: emergency,
        services,
        referencePrices: prices,
        openingHours: hours
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Section title="Información del comercio">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre de la clínica">
            <input value={clinicName} onChange={(e) => setClinicName(e.target.value)} className={inputCls} placeholder="Veterinaria Las Dalias" />
          </Field>
          <Field label="Dirección">
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} placeholder="Av. Principal 123" />
          </Field>
          <Field label="Sector / Comuna">
            <input value={district} onChange={(e) => setDistrict(e.target.value)} className={inputCls} placeholder="Providencia" />
          </Field>
        </div>
        <Toggle checked={emergency} onChange={setEmergency} label="Atención de urgencias 24/7" />
      </Section>

      <Section title="Servicios">
        <TagInput
          label="Servicios que ofreces"
          hint="Ej: Consulta general, Vacunación, Urgencias, Radiografía"
          values={services}
          onChange={setServices}
          placeholder="Escribe un servicio y presiona Enter"
        />
        <TagInput
          label="Precios de referencia"
          hint="Ej: Consulta $12.000, Vacuna rabia $8.500, Castración desde $80.000"
          values={prices}
          onChange={setPrices}
          placeholder="Ej: Consulta $12.000"
        />
      </Section>

      <Section title="Horarios de atención">
        <TagInput
          label="Horarios"
          hint="Ej: Lunes a Viernes 9–19h, Sábado 9–14h"
          values={hours}
          onChange={setHours}
          placeholder="Ej: Lunes a Viernes 9–19h"
        />
      </Section>

      <Section title="Contacto">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Teléfono">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+56 9 1234 5678" />
          </Field>
          <Field label="Email">
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="hola@vet.cl" />
          </Field>
          <Field label="Sitio web">
            <input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputCls} placeholder="https://mivet.cl" />
          </Field>
        </div>
      </Section>

      {error && <InlineBanner tone="error">{error}</InlineBanner>}
      {saved && <InlineBanner tone="success">Perfil actualizado correctamente.</InlineBanner>}

      <button
        onClick={save}
        disabled={saving}
        className="rounded-full bg-[hsl(var(--primary))] px-8 py-3 text-sm font-bold text-white shadow transition hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </div>
  );
}

/* ─── Shop panel ─────────────────────────────────────────────── */
function ShopPanel({ profile, token, onSaved }: { profile: MyProfile; token: string; onSaved: () => void }) {
  const shop = profile.shopProfile ?? {};
  const [bizName, setBizName]   = useState(shop.businessName ?? "");
  const [address, setAddress]   = useState(shop.address ?? "");
  const [district, setDistrict] = useState(shop.district ?? "");
  const [phone, setPhone]       = useState(shop.contactPhone ?? "");
  const [email, setEmail]       = useState(shop.contactEmail ?? "");
  const [website, setWebsite]   = useState(shop.websiteUrl ?? "");
  const [catalog, setCatalog]   = useState<string[]>(shop.basicCatalog ?? []);
  const [discounts, setDiscounts] = useState<string[]>(shop.discounts ?? []);
  const [hours, setHours]       = useState<string[]>(shop.openingHours ?? []);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [saved, setSaved]       = useState(false);

  async function save() {
    setSaving(true); setError(null); setSaved(false);
    try {
      await updateShopProfile(token, {
        businessName: bizName || undefined,
        address: address || undefined,
        district: district || undefined,
        contactPhone: phone || undefined,
        contactEmail: email || undefined,
        websiteUrl: website || undefined,
        basicCatalog: catalog,
        discounts,
        openingHours: hours
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Section title="Información del comercio">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre del negocio">
            <input value={bizName} onChange={(e) => setBizName(e.target.value)} className={inputCls} placeholder="Pet Shop Las Dalias" />
          </Field>
          <Field label="Dirección">
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} placeholder="Av. Principal 123" />
          </Field>
          <Field label="Sector / Comuna">
            <input value={district} onChange={(e) => setDistrict(e.target.value)} className={inputCls} placeholder="Providencia" />
          </Field>
        </div>
      </Section>

      <Section title="Catálogo de productos y servicios">
        <TagInput
          label="Productos / servicios que ofreces"
          hint="Ej: Comida premium, Accesorios, Peluquería canina, Ropa"
          values={catalog}
          onChange={setCatalog}
          placeholder="Ej: Comida premium"
        />
        <TagInput
          label="Descuentos y promociones"
          hint="Ej: 20% en alimento los martes, 2×1 en juguetes"
          values={discounts}
          onChange={setDiscounts}
          placeholder="Ej: 20% en alimento los martes"
        />
      </Section>

      <Section title="Horarios">
        <TagInput
          label="Horarios de atención"
          hint="Ej: Lunes a Sábado 10–20h, Domingo 11–15h"
          values={hours}
          onChange={setHours}
          placeholder="Ej: Lunes a Sábado 10–20h"
        />
      </Section>

      <Section title="Contacto">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Teléfono">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+56 9 1234 5678" />
          </Field>
          <Field label="Email">
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="hola@tienda.cl" />
          </Field>
          <Field label="Sitio web">
            <input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputCls} placeholder="https://mitienda.cl" />
          </Field>
        </div>
      </Section>

      {error && <InlineBanner tone="error">{error}</InlineBanner>}
      {saved && <InlineBanner tone="success">Perfil actualizado correctamente.</InlineBanner>}

      <button
        onClick={save}
        disabled={saving}
        className="rounded-full bg-[hsl(var(--primary))] px-8 py-3 text-sm font-bold text-white shadow transition hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </div>
  );
}

/* ─── Caregiver / Walker panel ───────────────────────────────── */
function WalkerPanel({ profile, token, onSaved }: { profile: MyProfile; token: string; onSaved: () => void }) {
  const cg = profile.caregiverProfile ?? {};
  const user = profile.user;
  const [intro, setIntro]           = useState(cg.introduction ?? "");
  const [experience, setExperience] = useState(cg.experience ?? "");
  const [services, setServices]     = useState<string[]>(cg.services ?? []);
  const [rates, setRates]           = useState<string[]>(cg.rates ?? []);
  const [schedule, setSchedule]     = useState<string[]>(cg.schedule ?? []);
  const [areas, setAreas]           = useState<string[]>(cg.coverageAreas ?? []);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [saved, setSaved]           = useState(false);

  async function save() {
    setSaving(true); setError(null); setSaved(false);
    try {
      await updateCaregiverProfile(token, {
        introduction: intro || undefined,
        experience: experience || undefined,
        services,
        rates,
        schedule,
        coverageAreas: areas
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Paseador";

  return (
    <div className="space-y-4">
      {/* Public preview card */}
      <div className="rounded-2xl border border-[hsl(var(--secondary)/0.25)] bg-[hsl(155_48%_42%/0.06)] p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Vista pública</p>
        <p className="mt-2 text-xl font-bold">{displayName}</p>
        {intro && <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{intro}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {services.slice(0, 4).map((s) => (
            <span key={s} className="rounded-full bg-[hsl(155_48%_42%/0.12)] px-3 py-0.5 text-xs font-semibold text-[hsl(155_48%_28%)]">{s}</span>
          ))}
          {rates.slice(0, 2).map((r) => (
            <span key={r} className="rounded-full bg-[hsl(22_92%_60%/0.12)] px-3 py-0.5 text-xs font-semibold text-[hsl(22_62%_36%)]">{r}</span>
          ))}
        </div>
      </div>

      <Section title="Presentación">
        <Field label="Cuéntanos sobre ti">
          <textarea
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            rows={3}
            className={cls(inputCls, "resize-none")}
            placeholder="Amante de los animales, con 3 años de experiencia paseando perros en Providencia…"
          />
        </Field>
        <Field label="Experiencia">
          <input value={experience} onChange={(e) => setExperience(e.target.value)} className={inputCls} placeholder="3 años paseando perros, exdueño de golden retriever" />
        </Field>
      </Section>

      <Section title="Servicios y tarifas">
        <TagInput
          label="Servicios que ofreces"
          hint="Ej: Paseo individual, Paseo grupal, Guardería en casa, Visita en tu hogar"
          values={services}
          onChange={setServices}
          placeholder="Ej: Paseo individual"
        />
        <TagInput
          label="Tarifas"
          hint="Ej: Paseo 1h $5.000, Guardería noche $15.000, Visita 30min $3.500"
          values={rates}
          onChange={setRates}
          placeholder="Ej: Paseo 1h $5.000"
        />
      </Section>

      <Section title="Horarios y zona">
        <TagInput
          label="Disponibilidad"
          hint="Ej: Lunes a Viernes 8–18h, Sábados todo el día, Sin domingos"
          values={schedule}
          onChange={setSchedule}
          placeholder="Ej: Lunes a Viernes 8–18h"
        />
        <TagInput
          label="Zonas que cubres"
          hint="Ej: Providencia, Ñuñoa, Las Condes"
          values={areas}
          onChange={setAreas}
          placeholder="Ej: Providencia"
        />
      </Section>

      {error && <InlineBanner tone="error">{error}</InlineBanner>}
      {saved && <InlineBanner tone="success">Perfil actualizado correctamente.</InlineBanner>}

      <button
        onClick={save}
        disabled={saving}
        className="rounded-full bg-[hsl(var(--secondary))] px-8 py-3 text-sm font-bold text-white shadow transition hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </div>
  );
}

/* ─── Role headers ───────────────────────────────────────────── */
const ROLE_META: Record<string, { title: string; subtitle: string; color: string }> = {
  VET: {
    title: "Panel veterinaria",
    subtitle: "Gestiona tu perfil, servicios, precios y horarios para aparecer en el mapa.",
    color: "bg-[hsl(155_48%_42%/0.08)] border-[hsl(155_48%_42%/0.2)]"
  },
  SHOP: {
    title: "Panel tienda",
    subtitle: "Administra tu catálogo, descuentos y horarios de atención.",
    color: "bg-[hsl(22_92%_60%/0.07)] border-[hsl(22_92%_60%/0.2)]"
  },
  CAREGIVER: {
    title: "Perfil paseador",
    subtitle: "Configura tus servicios, tarifas y disponibilidad para que los dueños puedan encontrarte.",
    color: "bg-[hsl(164_30%_18%/0.05)] border-[hsl(164_30%_18%/0.15)]"
  }
};

/* ─── Page ───────────────────────────────────────────────────── */
export default function BusinessPage() {
  const { session } = useAuth();
  const router = useRouter();
  const token = session?.tokens.accessToken ?? "";
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadProfile() {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await getMyProfile(token);
      setProfile(data);
      if (data.user.role === "SHOP") {
        router.replace("/marketplace/dashboard");
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el panel.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (session?.user.role === "SHOP") {
      router.replace("/marketplace/dashboard");
      return;
    }
    void loadProfile();
  }, [token, session?.user.role]);

  const role = profile?.user.role ?? "";
  const meta = ROLE_META[role] ?? ROLE_META["VET"]!;

  return (
    <AuthGate>
      <div className="mx-auto max-w-3xl space-y-6 pb-12">
        {/* Header */}
        <div className={cls("rounded-2xl border p-6", meta.color)}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
            Comercio · {role || "…"}
          </p>
          <h1 className="mt-2 text-2xl font-bold">{meta.title}</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{meta.subtitle}</p>
        </div>

        {error && <InlineBanner tone="error">{error}</InlineBanner>}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-[hsl(var(--muted)/0.5)]" />
            ))}
          </div>
        ) : profile ? (
          <>
            {role === "VET" && (
              <VetPanel profile={profile} token={token} onSaved={loadProfile} />
            )}
            {role === "SHOP" && (
              <ShopPanel profile={profile} token={token} onSaved={loadProfile} />
            )}
            {role === "CAREGIVER" && (
              <WalkerPanel profile={profile} token={token} onSaved={loadProfile} />
            )}
            {!["VET", "SHOP", "CAREGIVER"].includes(role) && (
              <InlineBanner tone="info">
                Este panel es para veterinarias, tiendas y paseadores. Tu cuenta es de tipo <strong>{role}</strong>.
              </InlineBanner>
            )}
          </>
        ) : null}
      </div>
    </AuthGate>
  );
}

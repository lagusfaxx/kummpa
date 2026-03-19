"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { getAuthErrorMessage, useAuth } from "@/features/auth/auth-context";
import { isValidEmail, normalizeEmail, validatePassword } from "@/features/auth/validators";
import type { RegisterPayload } from "@/features/auth/types";
import { useToast } from "@/features/ui/toast-context";

/* ─── Icons ───────────────────────────────────────────────────── */
function IcoPaw({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="7"  cy="5.5" r="1.5" />
      <circle cx="12" cy="4"   r="1.5" />
      <circle cx="17" cy="5.5" r="1.5" />
      <circle cx="4.5" cy="10" r="1.5" />
      <path d="M12 21c-3.5 0-8-4.5-8-8.5 0-2 1.5-3.5 3.5-3.5 1.3 0 2.3.6 4.5.6s3.2-.6 4.5-.6c2 0 3.5 1.5 3.5 3.5 0 4-4.5 8.5-8 8.5z" />
    </svg>
  );
}
function IcoBag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
function IcoScissors({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="6"  cy="6"  r="3" />
      <circle cx="6"  cy="18" r="3" />
      <line x1="20" y1="4"  x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12"  x2="12" y2="12" />
    </svg>
  );
}
function IcoCross({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 9h6V3h6v6h6v6h-6v6H9v-6H3z" />
    </svg>
  );
}

/* ─── Account type cards ──────────────────────────────────────── */
type AccountType = "OWNER" | "SHOP" | "GROOMING" | "VET";

const ACCOUNT_TYPES: Array<{
  value: AccountType;
  Icon: ({ className }: { className?: string }) => JSX.Element;
  title: string;
  desc: string;
  iconColor: string;
  iconBg: string;
  border: string;
}> = [
  {
    value: "OWNER",
    Icon: IcoPaw,
    title: "Tutor de mascota",
    desc: "Gestiona tus mascotas, vacunas, citas y comunidad",
    iconColor: "text-[hsl(164_42%_30%)]",
    iconBg: "bg-[hsl(164_30%_93%)]",
    border: "hover:border-[hsl(164_30%_55%)]"
  },
  {
    value: "SHOP",
    Icon: IcoBag,
    title: "Tienda",
    desc: "Vende productos para mascotas en el marketplace",
    iconColor: "text-orange-600",
    iconBg: "bg-orange-50",
    border: "hover:border-orange-400"
  },
  {
    value: "GROOMING",
    Icon: IcoScissors,
    title: "Peluquería",
    desc: "Ofrece servicios de grooming y estética canina y felina",
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50",
    border: "hover:border-violet-400"
  },
  {
    value: "VET",
    Icon: IcoCross,
    title: "Veterinaria",
    desc: "Gestiona reservas, pacientes y servicios clínicos",
    iconColor: "text-sky-600",
    iconBg: "bg-sky-50",
    border: "hover:border-sky-400"
  }
];

/* ─── Mapbox geocoding ────────────────────────────────────────── */
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

interface GeoResult {
  lat: number;
  lng: number;
  place: string;
  district?: string;
  city?: string;
}

async function geocodeAddress(raw: string): Promise<GeoResult | null> {
  if (!MAPBOX_TOKEN || !raw.trim()) return null;
  try {
    const query = encodeURIComponent(`${raw.trim()}, Chile`);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?country=cl&language=es&limit=1&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    const data = (await res.json()) as {
      features?: Array<{
        center: [number, number];
        place_name: string;
        context?: Array<{ id: string; text: string }>;
      }>;
    };
    const feat = data.features?.[0];
    if (!feat) return null;
    const [lng, lat] = feat.center;
    const ctx = feat.context ?? [];
    const district = ctx.find((c) => c.id.startsWith("locality") || c.id.startsWith("district"))?.text;
    const city = ctx.find((c) => c.id.startsWith("place") || c.id.startsWith("region"))?.text;
    return { lat, lng, place: feat.place_name, district, city };
  } catch {
    return null;
  }
}

/* ─── Shared logo ─────────────────────────────────────────────── */
function BrandLogo() {
  return (
    <Link href="/" className="flex items-center gap-1.5 select-none mx-auto w-fit mb-8">
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden">
        <Image
          src="/brand/logo-sin-titulo.png"
          alt="KuMMpa"
          fill
          sizes="36px"
          priority
          className="object-contain scale-[1.45]"
        />
      </span>
      <span className="font-display text-[22px] font-black leading-[1] tracking-tight translate-y-px">
        <span className="text-[hsl(164_42%_30%)]">Ku</span><span className="text-[hsl(22_92%_60%)]">MM</span><span className="text-[hsl(164_42%_30%)]">pa</span>
      </span>
    </Link>
  );
}

/* ─── Input helper ────────────────────────────────────────────── */
function Field({
  label,
  required,
  optional,
  hint,
  children
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {required && <span className="ml-0.5 text-red-500">*</span>}
      {optional && <span className="ml-1 font-normal text-slate-400 text-xs">(opcional)</span>}
      {children}
      {hint && <span className="mt-1 block text-[11px] font-normal text-slate-400">{hint}</span>}
    </label>
  );
}

const inputCls =
  "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]";

/* ─── Page ────────────────────────────────────────────────────── */
export default function RegisterPage() {
  const router = useRouter();
  const { signUp, isAuthenticated, isReady } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [accountType, setAccountType] = useState<AccountType>("OWNER");

  /* Common */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [phone, setPhone] = useState("");

  /* Personal */
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("");

  /* Business */
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);

  /* Geocoding */
  const [geoResult, setGeoResult] = useState<GeoResult | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  /* Form state */
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isReady && isAuthenticated) router.replace("/account");
  }, [isAuthenticated, isReady, router]);

  const isBusiness = accountType !== "OWNER";

  function selectType(type: AccountType) {
    setAccountType(type);
    setStep(2);
    setError(null);
  }

  async function handleGeocode() {
    if (!address.trim()) return;
    setGeocoding(true);
    setGeoError(null);
    setGeoResult(null);
    const result = await geocodeAddress(address);
    setGeocoding(false);
    if (result) {
      setGeoResult(result);
    } else {
      setGeoError("No encontramos esa dirección. Prueba con algo más completo (ej: Av. Providencia 1234, Santiago).");
    }
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      setError("Debes ingresar un email válido.");
      return;
    }
    if (!isBusiness && firstName.trim().length < 2) {
      setError("Debes ingresar tu nombre (mínimo 2 caracteres).");
      return;
    }
    if (isBusiness && businessName.trim().length < 2) {
      setError("Debes ingresar el nombre del negocio.");
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) { setError(passwordError); return; }
    if (password !== passwordConfirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    let geo = geoResult;
    if (isBusiness && address.trim() && !geo) {
      setGeocoding(true);
      geo = await geocodeAddress(address);
      setGeocoding(false);
      if (geo) setGeoResult(geo);
    }

    setIsSubmitting(true);
    try {
      const payload: RegisterPayload = isBusiness
        ? {
            email: normalizedEmail,
            password,
            role: accountType,
            phone: phone.trim() || undefined,
            businessName: businessName.trim(),
            address: address.trim() || undefined,
            city: geo?.city || undefined,
            district: geo?.district || undefined,
            latitude: geo?.lat,
            longitude: geo?.lng
          }
        : {
            email: normalizedEmail,
            password,
            role: "OWNER",
            firstName: firstName.trim(),
            lastName: lastName.trim() || undefined,
            phone: phone.trim() || undefined,
            city: city.trim() || undefined
          };

      await signUp(payload);
      showToast({ tone: "success", title: "Cuenta creada", description: "Tu perfil fue registrado correctamente." });
      router.push("/account");
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Step 1: type selector ────────────────────────────────── */
  if (step === 1) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[hsl(var(--background))] px-4 py-12">
        <div className="w-full max-w-xl">
          <BrandLogo />
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-black text-slate-900">Crear cuenta</h1>
            <p className="mt-1.5 text-sm text-slate-500">Elige el tipo que mejor describe tu perfil</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {ACCOUNT_TYPES.map(({ value, Icon, title, desc, iconColor, iconBg, border }) => (
              <button
                key={value}
                type="button"
                onClick={() => selectType(value)}
                className={`group flex flex-col gap-3 rounded-2xl border-2 border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] ${border}`}
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-slate-500">{desc}</p>
                </div>
              </button>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-semibold text-[hsl(var(--primary))] hover:underline">
              Ingresar
            </Link>
          </p>
        </div>
      </div>
    );
  }

  /* ── Step 2: role-specific form ───────────────────────────── */
  const typeInfo = ACCOUNT_TYPES.find((t) => t.value === accountType)!;
  const { Icon: TypeIcon } = typeInfo;

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-[hsl(var(--background))] px-4 py-10">
      <div className="w-full max-w-md">
        <BrandLogo />

        {/* Header */}
        <div className="mb-6 text-center">
          <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${typeInfo.iconBg}`}>
            <TypeIcon className={`h-7 w-7 ${typeInfo.iconColor}`} />
          </div>
          <h1 className="text-xl font-black text-slate-900">{typeInfo.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{typeInfo.desc}</p>
        </div>

        <button
          type="button"
          onClick={() => { setStep(1); setError(null); }}
          className="mb-5 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Cambiar tipo de cuenta
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>

            {/* Business fields */}
            {isBusiness && (
              <>
                <Field
                  label={
                    accountType === "VET"
                      ? "Nombre de la clínica"
                      : accountType === "GROOMING"
                      ? "Nombre del local"
                      : "Nombre de la tienda"
                  }
                  required
                >
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder={
                      accountType === "VET"
                        ? "Clínica Veterinaria San Pedro"
                        : accountType === "GROOMING"
                        ? "Peluquería Canina Lola"
                        : "Pet Shop Los Animales"
                    }
                    className={inputCls}
                  />
                </Field>

                <div>
                  <Field
                    label="Dirección"
                    hint="Usamos tu dirección para aparecer en «Cerca de ti». Las coordenadas exactas no se muestran."
                  >
                    <div className="mt-1 flex gap-2">
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => { setAddress(e.target.value); setGeoResult(null); setGeoError(null); }}
                        placeholder="Av. Providencia 1234, Providencia"
                        className="block flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                      />
                      <button
                        type="button"
                        onClick={() => void handleGeocode()}
                        disabled={geocoding || !address.trim()}
                        className="shrink-0 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      >
                        {geocoding ? "..." : "Verificar"}
                      </button>
                    </div>
                    {geoResult && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-emerald-700">
                        <span>✓</span> {geoResult.place}
                      </p>
                    )}
                    {geoError && <p className="mt-1.5 text-xs text-red-600">{geoError}</p>}
                  </Field>
                </div>

                {accountType === "VET" && (
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isEmergency}
                      onChange={(e) => setIsEmergency(e.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Urgencias 24/7</p>
                      <p className="text-xs text-slate-500">Aparecerás como servicio de urgencias disponible siempre</p>
                    </div>
                  </label>
                )}
              </>
            )}

            {/* Personal (OWNER) fields */}
            {!isBusiness && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre" required>
                  <input type="text" autoComplete="given-name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Apellido">
                  <input type="text" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
                </Field>
              </div>
            )}

            <Field label="Email" required>
              <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            </Field>

            <Field label="Teléfono" optional={!isBusiness}>
              <input type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+56 9 1234 5678" className={inputCls} />
            </Field>

            {!isBusiness && (
              <Field label="Ciudad / Comuna" optional>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Santiago" className={inputCls} />
              </Field>
            )}

            <Field label="Contraseña" required hint="Mínimo 8 caracteres, una mayúscula y un número">
              <input type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
            </Field>

            <Field label="Confirmar contraseña" required>
              <input type="password" autoComplete="new-password" required value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className={inputCls} />
            </Field>

            {error && <InlineBanner tone="error">{error}</InlineBanner>}

            <button type="submit" disabled={isSubmitting || geocoding} className="btn btn-primary w-full">
              {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-[hsl(var(--primary))] hover:underline">
            Ingresar
          </Link>
        </p>
      </div>
    </div>
  );
}

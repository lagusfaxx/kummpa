"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { getAuthErrorMessage, useAuth } from "@/features/auth/auth-context";
import { isValidEmail, normalizeEmail, validatePassword } from "@/features/auth/validators";
import type { RegisterPayload } from "@/features/auth/types";
import { useToast } from "@/features/ui/toast-context";

/* ─── Account type cards ──────────────────────────────────────── */
type AccountType = "OWNER" | "SHOP" | "GROOMING" | "VET";

const ACCOUNT_TYPES: Array<{
  value: AccountType;
  icon: string;
  title: string;
  desc: string;
  bg: string;
  border: string;
}> = [
  {
    value: "OWNER",
    icon: "🐾",
    title: "Tutor de mascota",
    desc: "Gestiona tus mascotas, vacunas, citas y comunidad",
    bg: "bg-[hsl(164_30%_95%)]",
    border: "border-[hsl(164_30%_60%)]"
  },
  {
    value: "SHOP",
    icon: "🏪",
    title: "Tienda",
    desc: "Vende productos para mascotas en el marketplace",
    bg: "bg-orange-50",
    border: "border-orange-300"
  },
  {
    value: "GROOMING",
    icon: "✂️",
    title: "Peluquería",
    desc: "Ofrece servicios de grooming y estética canina/felina",
    bg: "bg-purple-50",
    border: "border-purple-300"
  },
  {
    value: "VET",
    icon: "🩺",
    title: "Veterinaria",
    desc: "Gestiona reservas, pacientes y servicios clínicos",
    bg: "bg-sky-50",
    border: "border-sky-300"
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

/* ─── Logo ────────────────────────────────────────────────────── */
function KummpaLogo() {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      <svg viewBox="0 0 40 40" className="h-9 w-9" fill="none">
        <circle cx="20" cy="20" r="20" fill="hsl(164 30% 18%)" />
        <circle cx="14" cy="13" r="3" fill="white" opacity=".9" />
        <circle cx="26" cy="13" r="3" fill="white" opacity=".9" />
        <circle cx="10" cy="20" r="2.5" fill="white" opacity=".9" />
        <circle cx="30" cy="20" r="2.5" fill="white" opacity=".9" />
        <path d="M20 34c-5 0-10-6-10-11 0-3 2-5 5-5 2 0 3.5 1 5 1s3-1 5-1c3 0 5 2 5 5 0 5-5 11-10 11z" fill="white" opacity=".95" />
      </svg>
      <span className="text-xl font-black tracking-tight text-slate-900">KuMMpa</span>
    </div>
  );
}

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

  /* Personal (OWNER) */
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
      setGeoError("No encontramos esa dirección. Prueba con una dirección más completa (ej: Av. Providencia 1234, Santiago).");
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

    /* Geocode address on submit if not already done */
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
      showToast({
        tone: "success",
        title: "Cuenta creada",
        description: "Tu perfil fue registrado correctamente."
      });
      router.push("/account");
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Step 1: type selector ── */
  if (step === 1) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[hsl(var(--background))] px-4 py-12">
        <div className="w-full max-w-xl">
          <KummpaLogo />
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-black text-slate-900">Crear cuenta</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Elige el tipo que mejor describe tu perfil
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ACCOUNT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => selectType(t.value)}
                className={`flex flex-col gap-3 rounded-2xl border-2 bg-white p-5 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] ${t.border}`}
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-2xl ${t.bg}`}>
                  {t.icon}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{t.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500 leading-snug">{t.desc}</p>
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

  /* ── Step 2: registration form ── */
  const typeInfo = ACCOUNT_TYPES.find((t) => t.value === accountType)!;

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-[hsl(var(--background))] px-4 py-10">
      <div className="w-full max-w-md">
        <KummpaLogo />

        {/* Header */}
        <div className="mb-6 text-center">
          <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${typeInfo.bg}`}>
            {typeInfo.icon}
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

            {/* ── Business fields ── */}
            {isBusiness && (
              <>
                <label className="block text-sm font-medium text-slate-700">
                  {accountType === "VET"
                    ? "Nombre de la clínica"
                    : accountType === "GROOMING"
                    ? "Nombre del local"
                    : "Nombre de la tienda"}{" "}
                  <span className="text-red-500">*</span>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder={
                      accountType === "VET"
                        ? "Clínica Veterinaria San Pedro..."
                        : accountType === "GROOMING"
                        ? "Peluquería Canina Lola..."
                        : "Pet Shop Los Animales..."
                    }
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  />
                </label>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Dirección
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        setGeoResult(null);
                        setGeoError(null);
                      }}
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
                      <span className="text-emerald-500">✓</span>
                      {geoResult.place}
                    </p>
                  )}
                  {geoError && (
                    <p className="mt-1.5 text-xs text-red-600">{geoError}</p>
                  )}
                  <p className="mt-1 text-[11px] text-slate-400">
                    Usamos tu dirección para aparecer en "Cerca de ti". No se muestran coordenadas.
                  </p>
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
                      <p className="text-xs text-slate-500">
                        Aparecerás como servicio de urgencias disponible siempre
                      </p>
                    </div>
                  </label>
                )}
              </>
            )}

            {/* ── Personal (OWNER) fields ── */}
            {!isBusiness && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Nombre <span className="text-red-500">*</span>
                  <input
                    type="text"
                    autoComplete="given-name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Apellido
                  <input
                    type="text"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  />
                </label>
              </div>
            )}

            {/* Email */}
            <label className="block text-sm font-medium text-slate-700">
              Email <span className="text-red-500">*</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
              />
            </label>

            {/* Phone */}
            <label className="block text-sm font-medium text-slate-700">
              Teléfono{!isBusiness && " (opcional)"}
              {isBusiness && " "}
              <input
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+56 9 1234 5678"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
              />
            </label>

            {/* City for OWNER only */}
            {!isBusiness && (
              <label className="block text-sm font-medium text-slate-700">
                Ciudad / Comuna{" "}
                <span className="text-slate-400 font-normal">(opcional)</span>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Santiago"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                />
              </label>
            )}

            {/* Password */}
            <label className="block text-sm font-medium text-slate-700">
              Contraseña <span className="text-red-500">*</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
              />
              <span className="mt-1 block text-[11px] text-slate-400">
                Mínimo 8 caracteres, una mayúscula y un número
              </span>
            </label>

            {/* Confirm password */}
            <label className="block text-sm font-medium text-slate-700">
              Confirmar contraseña <span className="text-red-500">*</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
              />
            </label>

            {error && <InlineBanner tone="error">{error}</InlineBanner>}

            <button
              type="submit"
              disabled={isSubmitting || geocoding}
              className="btn btn-primary w-full"
            >
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

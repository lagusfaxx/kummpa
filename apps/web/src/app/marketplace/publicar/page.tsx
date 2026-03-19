"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthGate } from "@/components/auth/auth-gate";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { useAuth } from "@/features/auth/auth-context";
import { createMarketplaceListing } from "@/features/marketplace/marketplace-api";
import type { MarketplaceCategory } from "@/features/marketplace/types";
import { CommercialNav } from "@/components/commercial/commercial-nav";

const CATEGORIES: Array<{ value: MarketplaceCategory; label: string }> = [
  { value: "TOY", label: "Juguetes" },
  { value: "BED", label: "Camas y descanso" },
  { value: "CARRIER", label: "Transportadoras" },
  { value: "LEASH", label: "Correas y arneses" },
  { value: "FEEDER", label: "Comederos y bebederos" },
  { value: "CLOTHES", label: "Ropa y accesorios" },
  { value: "CAGE", label: "Jaulas y corrales" },
  { value: "ACCESSORY", label: "Accesorios varios" },
  { value: "OTHER", label: "Otros" }
];

const inputCls = "mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]";

export default function PublicarPage() {
  const router = useRouter();
  const { session } = useAuth();
  const token = session?.tokens.accessToken ?? "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceCLP, setPriceCLP] = useState("");
  const [category, setCategory] = useState<MarketplaceCategory>("ACCESSORY");
  const [condition, setCondition] = useState<"NEW" | "USED">("USED");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);

    const price = parseFloat(priceCLP.replace(/[^0-9.]/g, ""));
    if (!price || price <= 0) {
      setError("Ingresa un precio válido.");
      return;
    }

    setSubmitting(true);
    try {
      const listing = await createMarketplaceListing(token, {
        title: title.trim(),
        description: description.trim(),
        priceCents: Math.round(price * 100),
        category,
        condition,
        photoUrls: photoUrl.trim() ? [photoUrl.trim()] : [],
        district: district.trim() || undefined,
        city: city.trim() || undefined
      });
      router.push(`/marketplace/${listing.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo publicar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGate>
      <div className="space-y-4">
        <CommercialNav />

        <div className="mx-auto max-w-2xl">
          <div className="mb-6">
            <h1 className="text-xl font-black text-slate-900">Nueva publicación</h1>
            <p className="mt-1 text-sm text-slate-500">
              Publica productos nuevos o usados para otros usuarios de KuMMpa
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <form className="space-y-5" onSubmit={(e) => void onSubmit(e)}>
              {/* Type */}
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Estado del producto</p>
                <div className="flex gap-3">
                  {(["NEW", "USED"] as const).map((c) => (
                    <label
                      key={c}
                      className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition-colors ${
                        condition === c
                          ? "border-[hsl(var(--primary))] bg-[hsl(164_30%_95%)] text-[hsl(var(--primary))]"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <input type="radio" name="condition" value={c} checked={condition === c} onChange={() => setCondition(c)} className="sr-only" />
                      {c === "NEW" ? "✨ Nuevo" : "♻️ Usado"}
                    </label>
                  ))}
                </div>
              </div>

              {/* Category */}
              <label className="block text-sm font-semibold text-slate-700">
                Categoría
                <select value={category} onChange={(e) => setCategory(e.target.value as MarketplaceCategory)} className={inputCls}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </label>

              {/* Title */}
              <label className="block text-sm font-semibold text-slate-700">
                Título del producto <span className="text-red-500">*</span>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Cama ortopédica para perro grande"
                  className={inputCls}
                />
              </label>

              {/* Description */}
              <label className="block text-sm font-semibold text-slate-700">
                Descripción <span className="text-red-500">*</span>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe el producto, talla, color, estado actual..."
                  className={`${inputCls} resize-none`}
                />
              </label>

              {/* Price */}
              <label className="block text-sm font-semibold text-slate-700">
                Precio (CLP) <span className="text-red-500">*</span>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={priceCLP}
                    onChange={(e) => setPriceCLP(e.target.value)}
                    placeholder="15000"
                    className="block w-full rounded-xl border border-slate-300 py-2.5 pl-7 pr-3 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  />
                </div>
              </label>

              {/* Photo URL */}
              <label className="block text-sm font-semibold text-slate-700">
                Foto del producto{" "}
                <span className="font-normal text-slate-400 text-xs">(URL, opcional)</span>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className={inputCls}
                />
              </label>

              {/* Location */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Comuna
                  <input type="text" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Providencia" className={inputCls} />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Ciudad
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Santiago" className={inputCls} />
                </label>
              </div>

              {error && <InlineBanner tone="error">{error}</InlineBanner>}

              <div className="flex gap-3 pt-1">
                <Link href="/marketplace" className="btn btn-secondary flex-1 text-center">
                  Cancelar
                </Link>
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
                  {submitting ? "Publicando..." : "Publicar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AuthGate>
  );
}

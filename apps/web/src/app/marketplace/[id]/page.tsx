"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import {
  favoriteMarketplaceListing,
  getMarketplaceListing,
  startMarketplaceConversation,
  unfavoriteMarketplaceListing
} from "@/features/marketplace/marketplace-api";
import type { MarketplaceListing } from "@/features/marketplace/types";

function fmtClp(cents: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(cents / 100);
}
function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d < 1) return "hoy";
  if (d === 1) return "ayer";
  if (d < 7) return `hace ${d} días`;
  return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
}

const CAT_LABEL: Record<string, string> = {
  BED: "Camas", CARRIER: "Transportadoras", TOY: "Juguetes",
  LEASH: "Correas", CAGE: "Jaulas", CLOTHES: "Ropa",
  FEEDER: "Comederos", ACCESSORY: "Accesorios", OTHER: "Otros"
};

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const token = session?.tokens.accessToken ?? "";

  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true);
    getMarketplaceListing(token, id)
      .then(setListing)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, id]);

  async function toggleFav() {
    if (!token || !listing) return;
    setWorking(true);
    try {
      if (listing.viewer.isFavorite) {
        await unfavoriteMarketplaceListing(token, listing.id);
      } else {
        await favoriteMarketplaceListing(token, listing.id);
      }
      const updated = await getMarketplaceListing(token, listing.id);
      setListing(updated);
    } finally { setWorking(false); }
  }

  async function startChat() {
    if (!token || !listing) return;
    setWorking(true);
    try {
      const conv = await startMarketplaceConversation(token, listing.id);
      router.push(`/marketplace/chats?conv=${conv.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar el chat");
    } finally { setWorking(false); }
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center">
        <p className="font-bold text-slate-800">Inicia sesión para ver los detalles</p>
        <Link href="/login" className="btn btn-primary mt-4">Ingresar</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2 animate-pulse">
        <div className="aspect-square rounded-2xl bg-slate-100" />
        <div className="space-y-4">
          <div className="h-8 rounded-xl bg-slate-100 w-3/4" />
          <div className="h-12 rounded-xl bg-slate-100 w-1/3" />
          <div className="h-40 rounded-xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
        <p className="font-bold text-red-700">{error ?? "Publicación no encontrada"}</p>
        <Link href="/marketplace" className="btn btn-secondary mt-4">← Volver</Link>
      </div>
    );
  }

  const photos = listing.photoUrls.length > 0 ? listing.photoUrls : [];

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        ← Volver al Marketplace
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Photo gallery */}
        <div className="space-y-3">
          <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100">
            {photos.length > 0 ? (
              <img src={photos[photoIdx]} alt={listing.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl text-slate-300">🐾</div>
            )}
          </div>
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPhotoIdx(i)}
                  className={`shrink-0 h-16 w-16 rounded-xl overflow-hidden border-2 transition-colors ${i === photoIdx ? "border-[hsl(var(--primary))]" : "border-transparent"}`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4">
          {/* Badges */}
          <div className="flex gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${listing.condition === "NEW" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
              {listing.condition === "NEW" ? "✨ Nuevo" : "♻️ Usado"}
            </span>
            {listing.category && (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {CAT_LABEL[listing.category] ?? listing.category}
              </span>
            )}
          </div>

          {/* Title & price */}
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">{listing.title}</h1>
            <p className="mt-2 text-3xl font-black text-[hsl(var(--primary))]">{fmtClp(listing.priceCents)}</p>
          </div>

          {/* Location & time */}
          <div className="flex flex-wrap gap-3 text-sm text-slate-500">
            {(listing.district ?? listing.city) && (
              <span>📍 {[listing.district, listing.city].filter(Boolean).join(", ")}</span>
            )}
            <span>🕒 Publicado {timeAgo(listing.createdAt)}</span>
            <span>❤️ {listing.stats.favoritesCount} guardados</span>
          </div>

          {/* Description */}
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700 mb-2">Descripción</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{listing.description}</p>
          </div>

          {/* Seller */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-200 text-base font-bold text-slate-600 shrink-0">
              {listing.seller.fullName[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{listing.seller.fullName}</p>
              <p className="text-xs text-slate-500">Vendedor</p>
            </div>
          </div>

          {/* CTAs */}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            {!listing.viewer.isSeller && listing.viewer.canChat && (
              <button
                type="button"
                disabled={working}
                onClick={() => void startChat()}
                className="btn btn-primary flex-1"
              >
                💬 Enviar mensaje
              </button>
            )}
            {!listing.viewer.isSeller && (
              <button
                type="button"
                disabled={working}
                onClick={() => void toggleFav()}
                className="btn btn-secondary px-4"
                title={listing.viewer.isFavorite ? "Quitar de guardados" : "Guardar"}
              >
                {listing.viewer.isFavorite ? "❤️" : "🤍"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

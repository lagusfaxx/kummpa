"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/auth-context";
import {
  favoriteMarketplaceListing,
  listMarketplaceListings,
  unfavoriteMarketplaceListing
} from "@/features/marketplace/marketplace-api";
import type { MarketplaceCategory, MarketplaceListing } from "@/features/marketplace/types";
import { CommercialNav } from "@/components/commercial/commercial-nav";

/* ─── Helpers ─────────────────────────────────────────────────── */
function fmtClp(cents: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(cents / 100);
}
function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 2) return "recién";
  if (m < 60) return `hace ${m}m`;
  if (h < 24) return `hace ${h}h`;
  if (d < 7) return `hace ${d}d`;
  return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "", label: "Todo" },
  { value: "TOY", label: "Juguetes" },
  { value: "BED", label: "Camas" },
  { value: "CARRIER", label: "Transportadoras" },
  { value: "LEASH", label: "Correas" },
  { value: "FEEDER", label: "Comederos" },
  { value: "CLOTHES", label: "Ropa" },
  { value: "CAGE", label: "Jaulas" },
  { value: "ACCESSORY", label: "Accesorios" },
  { value: "OTHER", label: "Otros" }
];

const COND_LABEL: Record<string, string> = { NEW: "Nuevo", USED: "Usado" };

/* ─── Listing card ────────────────────────────────────────────── */
function ListingCard({
  listing,
  onFavToggle
}: {
  listing: MarketplaceListing;
  onFavToggle: (l: MarketplaceListing) => void;
}) {
  const photo = listing.photoUrls[0];
  return (
    <div className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md overflow-hidden">
      {/* Image */}
      <Link href={`/marketplace/${listing.id}`} className="block aspect-square bg-slate-100 overflow-hidden">
        {photo ? (
          <img src={photo} alt={listing.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-slate-300">🐾</div>
        )}
      </Link>

      {/* Condition badge */}
      <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${listing.condition === "NEW" ? "bg-emerald-500 text-white" : "bg-slate-700 text-white"}`}>
        {COND_LABEL[listing.condition]}
      </span>

      {/* Fav button */}
      <button
        type="button"
        onClick={() => onFavToggle(listing)}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-sm shadow backdrop-blur-sm"
      >
        {listing.viewer.isFavorite ? "❤️" : "🤍"}
      </button>

      {/* Info */}
      <div className="flex flex-col gap-1 p-3">
        <Link href={`/marketplace/${listing.id}`} className="text-sm font-bold text-slate-900 line-clamp-2 hover:underline leading-tight">
          {listing.title}
        </Link>
        <p className="text-base font-black text-[hsl(var(--primary))]">{fmtClp(listing.priceCents)}</p>
        <div className="flex items-center justify-between gap-1 mt-1">
          <span className="text-[11px] text-slate-500 truncate">{listing.district ?? listing.city ?? ""}</span>
          <span className="text-[11px] text-slate-400 shrink-0">{timeAgo(listing.createdAt)}</span>
        </div>
        <p className="text-[11px] text-slate-400 truncate">{listing.seller.fullName}</p>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────── */
export default function MarketplacePage() {
  const { session } = useAuth();
  const token = session?.tokens.accessToken;

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MarketplaceCategory | "">("");
  const [condition, setCondition] = useState<"NEW" | "USED" | "">("");
  const [district, setDistrict] = useState("");

  async function load(opts?: { q?: string; cat?: string; cond?: string; dist?: string }) {
    if (!token) return;
    setLoading(true);
    try {
      const rows = await listMarketplaceListings(token, {
        q: opts?.q || query || undefined,
        category: ((opts?.cat ?? category) || undefined) as MarketplaceCategory | undefined,
        condition: ((opts?.cond ?? condition) || undefined) as "NEW" | "USED" | undefined,
        district: (opts?.dist ?? district) || undefined,
        sortBy: "recent",
        limit: 80
      });
      setListings(rows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [token]);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    await load();
  }

  async function onFavToggle(listing: MarketplaceListing) {
    if (!token) return;
    if (listing.viewer.isFavorite) {
      await unfavoriteMarketplaceListing(token, listing.id);
    } else {
      await favoriteMarketplaceListing(token, listing.id);
    }
    await load();
  }

  function selectCategory(cat: string) {
    setCategory(cat as MarketplaceCategory | "");
    void load({ cat });
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <CommercialNav />
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-2xl mb-3">🛍️</p>
          <p className="font-bold text-slate-800">Inicia sesión para ver las publicaciones</p>
          <p className="mt-1 text-sm text-slate-500">Encuentra productos nuevos y usados de otros usuarios</p>
          <a href="/login" className="btn btn-primary mt-4">Ingresar</a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CommercialNav />

      {/* Search bar */}
      <form onSubmit={(e) => void handleSearch(e)} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar productos..."
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
        />
        <select
          value={condition}
          onChange={(e) => { setCondition(e.target.value as "NEW" | "USED" | ""); void load({ cond: e.target.value }); }}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Nuevo o usado</option>
          <option value="NEW">Nuevo</option>
          <option value="USED">Usado</option>
        </select>
        <button type="submit" className="btn btn-primary shrink-0">Buscar</button>
      </form>

      {/* Category filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:-mx-6 sm:px-6">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => selectCategory(c.value)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              category === c.value
                ? "bg-[hsl(var(--primary))] text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {loading ? "Cargando..." : `${listings.length} publicaciones`}
        </p>
        <Link href="/marketplace/publicar" className="btn btn-primary text-sm">
          + Publicar
        </Link>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-3xl mb-3">📭</p>
          <p className="font-bold text-slate-700">Sin resultados</p>
          <p className="text-sm text-slate-500 mt-1">Prueba con otra búsqueda o categoría</p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} onFavToggle={(lst) => void onFavToggle(lst)} />
          ))}
        </div>
      )}
    </div>
  );
}

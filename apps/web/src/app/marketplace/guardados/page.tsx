"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/features/auth/auth-context";
import {
  listMarketplaceListings,
  unfavoriteMarketplaceListing
} from "@/features/marketplace/marketplace-api";
import type { MarketplaceListing } from "@/features/marketplace/types";
import { CommercialNav } from "@/components/commercial/commercial-nav";

function fmtClp(cents: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(cents / 100);
}

const COND_LABEL: Record<string, string> = { NEW: "Nuevo", USED: "Usado" };

export default function GuardadosPage() {
  const { session } = useAuth();
  const token = session?.tokens.accessToken ?? "";
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const rows = await listMarketplaceListings(token, { favoritesOnly: true, limit: 80 });
      setListings(rows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [token]);

  async function removeFav(listing: MarketplaceListing) {
    if (!token) return;
    setRemoving(listing.id);
    try {
      await unfavoriteMarketplaceListing(token, listing.id);
      setListings((prev) => prev.filter((l) => l.id !== listing.id));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <AuthGate>
      <div className="space-y-4">
        <CommercialNav />
        <h1 className="text-xl font-black text-slate-900">Guardados</h1>

        {loading ? (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-3xl mb-3">🔖</p>
            <p className="font-bold text-slate-700">Sin publicaciones guardadas</p>
            <p className="text-sm text-slate-500 mt-1">Toca el corazón en cualquier publicación para guardarla aquí</p>
            <Link href="/marketplace" className="btn btn-primary mt-4">Ver marketplace</Link>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((l) => {
              const photo = l.photoUrls[0];
              return (
                <div key={l.id} className="relative flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <Link href={`/marketplace/${l.id}`} className="block aspect-square bg-slate-100 overflow-hidden">
                    {photo ? (
                      <img src={photo} alt={l.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl text-slate-300">🐾</div>
                    )}
                  </Link>
                  <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${l.condition === "NEW" ? "bg-emerald-500 text-white" : "bg-slate-700 text-white"}`}>
                    {COND_LABEL[l.condition]}
                  </span>
                  <button
                    type="button"
                    onClick={() => void removeFav(l)}
                    disabled={removing === l.id}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-sm shadow backdrop-blur-sm"
                    title="Quitar de guardados"
                  >
                    ❤️
                  </button>
                  <div className="flex flex-col gap-1 p-3">
                    <Link href={`/marketplace/${l.id}`} className="text-sm font-bold text-slate-900 line-clamp-2 hover:underline leading-tight">
                      {l.title}
                    </Link>
                    <p className="text-base font-black text-[hsl(var(--primary))]">{fmtClp(l.priceCents)}</p>
                    <p className="text-[11px] text-slate-500 truncate">{l.district ?? l.city ?? ""}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AuthGate>
  );
}

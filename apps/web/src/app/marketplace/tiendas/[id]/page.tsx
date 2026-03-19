"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { getPublicShop, type PublicShop } from "@/features/shops/shops-api";
import { listMarketplaceListings } from "@/features/marketplace/marketplace-api";
import type { MarketplaceListing } from "@/features/marketplace/types";

function fmtClp(cents: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(cents / 100);
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-slate-600">
      <span className="shrink-0 text-base">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

export default function ShopDetailPage() {
  const { id: userId } = useParams<{ id: string }>();
  const { session } = useAuth();
  const token = session?.tokens.accessToken ?? "";

  const [shop, setShop] = useState<PublicShop | null>(null);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      getPublicShop(userId),
      token ? listMarketplaceListings(token, { sellerId: userId, limit: 50, includeInactive: false }) : Promise.resolve([])
    ])
      .then(([s, l]) => { setShop(s); setListings(l); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId, token]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-40 rounded-2xl bg-slate-100" />
        <div className="h-8 rounded-xl bg-slate-100 w-1/2" />
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="aspect-square rounded-2xl bg-slate-100" />)}
        </div>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
        <p className="font-bold text-red-700">{error ?? "Tienda no encontrada"}</p>
        <Link href="/marketplace/tiendas" className="btn btn-secondary mt-4">← Volver a Tiendas</Link>
      </div>
    );
  }

  const initial = shop.businessName?.[0]?.toUpperCase() ?? "T";
  const openingHours = shop.openingHours as Record<string, string> | null;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/marketplace/tiendas" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        ← Volver a Tiendas
      </Link>

      {/* Shop header */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {/* Cover */}
        <div className="h-36 bg-[hsl(164_30%_18%)] flex items-center justify-center">
          {shop.logoUrl ? (
            <img src={shop.logoUrl} alt={shop.businessName ?? ""} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 text-4xl font-black text-white select-none">
              {initial}
            </div>
          )}
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{shop.businessName}</h1>
            {shop.description && <p className="mt-2 text-sm text-slate-600 leading-relaxed">{shop.description}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {shop.address && <InfoRow icon="📍" text={shop.address} />}
            {(shop.district ?? shop.city) && (
              <InfoRow icon="🏙️" text={[shop.district, shop.city].filter(Boolean).join(", ")} />
            )}
            {shop.contactPhone && <InfoRow icon="📞" text={shop.contactPhone} />}
            {shop.contactEmail && <InfoRow icon="✉️" text={shop.contactEmail} />}
            {shop.websiteUrl && (
              <a href={shop.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[hsl(var(--primary))] hover:underline">
                <span>🌐</span>
                <span className="truncate">{shop.websiteUrl}</span>
              </a>
            )}
          </div>

          {openingHours && Object.keys(openingHours).length > 0 && (
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">Horarios</p>
              <div className="grid gap-1">
                {Object.entries(openingHours).map(([day, hours]) => (
                  <div key={day} className="flex justify-between text-xs text-slate-600">
                    <span className="capitalize">{day}</span>
                    <span>{hours}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Products */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">
          Productos{listings.length > 0 ? ` (${listings.length})` : ""}
        </h2>

        {!token ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm font-semibold text-slate-700">Inicia sesión para ver los productos</p>
            <Link href="/login" className="btn btn-primary mt-3">Ingresar</Link>
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-2xl mb-2">📦</p>
            <p className="text-sm font-semibold text-slate-700">Esta tienda aún no tiene productos publicados</p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((l) => {
              const photo = l.photoUrls[0];
              return (
                <Link
                  key={l.id}
                  href={`/marketplace/${l.id}`}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md overflow-hidden transition-shadow"
                >
                  <div className="aspect-square bg-slate-100 overflow-hidden">
                    {photo ? (
                      <img src={photo} alt={l.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl text-slate-300">🐾</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 p-3">
                    <p className="text-sm font-bold text-slate-900 line-clamp-2 leading-tight">{l.title}</p>
                    <p className="text-base font-black text-[hsl(var(--primary))]">{fmtClp(l.priceCents)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

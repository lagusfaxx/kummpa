"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listPublicShops, type PublicShop } from "@/features/shops/shops-api";
import { CommercialNav } from "@/components/commercial/commercial-nav";

function ShopCard({ shop }: { shop: PublicShop }) {
  const initial = shop.businessName?.[0]?.toUpperCase() ?? "T";
  return (
    <Link
      href={`/marketplace/tiendas/${shop.userId}`}
      className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md overflow-hidden"
    >
      {/* Logo / cover */}
      <div className="aspect-[3/2] bg-slate-100 flex items-center justify-center overflow-hidden">
        {shop.logoUrl ? (
          <img src={shop.logoUrl} alt={shop.businessName ?? ""} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(164_30%_18%)] text-2xl font-black text-white select-none">
            {initial}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-0.5 p-3">
        <p className="font-bold text-slate-900 truncate">{shop.businessName}</p>
        {(shop.district ?? shop.city) && (
          <p className="text-xs text-slate-500 truncate">
            {[shop.district, shop.city].filter(Boolean).join(", ")}
          </p>
        )}
        {shop.contactPhone && (
          <p className="text-xs text-slate-400 truncate">{shop.contactPhone}</p>
        )}
        <span className="mt-2 inline-flex w-fit items-center rounded-full bg-[hsl(164_30%_93%)] px-2.5 py-0.5 text-[10px] font-semibold text-[hsl(164_42%_30%)]">
          Ver tienda →
        </span>
      </div>
    </Link>
  );
}

export default function TiendasPage() {
  const [shops, setShops] = useState<PublicShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listPublicShops({ limit: 80 })
      .then(setShops)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = shops.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.businessName?.toLowerCase().includes(q) ||
      s.district?.toLowerCase().includes(q) ||
      s.city?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <CommercialNav />

      <div className="flex items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar tienda por nombre o comuna..."
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
        />
      </div>

      <p className="text-sm text-slate-500">
        {loading ? "Cargando..." : `${filtered.length} ${filtered.length === 1 ? "tienda registrada" : "tiendas registradas"}`}
      </p>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-slate-100 animate-pulse" style={{ height: 220 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-3xl mb-3">🏪</p>
          <p className="font-bold text-slate-700">Sin tiendas registradas</p>
          <p className="text-sm text-slate-500 mt-1">
            {search ? "Prueba con otro nombre o comuna" : "Las tiendas registradas aparecerán aquí"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((s) => (
            <ShopCard key={s.userId} shop={s} />
          ))}
        </div>
      )}
    </div>
  );
}

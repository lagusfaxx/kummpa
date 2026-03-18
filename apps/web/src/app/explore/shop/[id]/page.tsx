"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { listMapServices } from "@/features/map/map-api";
import type { MapServicePoint } from "@/features/map/types";
import { listMarketplaceListings } from "@/features/marketplace/marketplace-api";
import type { MarketplaceListing, MarketplaceCategory } from "@/features/marketplace/types";

/* ─── helpers ─────────────────────────────────────────────────── */
function fmtClp(cents: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(cents / 100);
}

const CAT_LABELS: Record<MarketplaceCategory, string> = {
  BED: "Camas", CARRIER: "Transportadoras", TOY: "Juguetes", LEASH: "Correas",
  CAGE: "Jaulas", CLOTHES: "Ropa", FEEDER: "Comederos", ACCESSORY: "Accesorios", OTHER: "Otros",
};

/* ─── Cart ────────────────────────────────────────────────────── */
type CartItem = { listing: MarketplaceListing; qty: number };

function CartPanel({ items, onRemove, onQty, onClose }: {
  items: CartItem[];
  onRemove: (id: string) => void;
  onQty: (id: string, qty: number) => void;
  onClose: () => void;
}) {
  const subtotal = items.reduce((s, i) => s + i.listing.priceCents * i.qty, 0);

  return (
    <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border)/0.5)] px-5 py-4">
        <p className="font-bold text-[hsl(var(--foreground))]">🛒 Carrito ({items.length})</p>
        <button onClick={onClose} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition text-lg">✕</button>
      </div>
      {items.length === 0 ? (
        <div className="p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">Tu carrito está vacío</div>
      ) : (
        <>
          <div className="divide-y divide-[hsl(var(--border)/0.5)] max-h-80 overflow-y-auto">
            {items.map(({ listing, qty }) => (
              <div key={listing.id} className="flex items-start gap-3 px-5 py-3">
                {listing.photoUrls[0] && (
                  <img src={listing.photoUrls[0]} alt={listing.title} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[hsl(var(--foreground))] truncate">{listing.title}</p>
                  <p className="text-xs font-bold text-[hsl(22_92%_50%)]">{fmtClp(listing.priceCents)}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <button onClick={() => onQty(listing.id, Math.max(1, qty - 1))} className="h-6 w-6 rounded-full bg-[hsl(var(--muted))] text-sm font-bold hover:bg-[hsl(var(--muted-foreground)/0.2)] transition">−</button>
                    <span className="text-xs font-bold w-4 text-center">{qty}</span>
                    <button onClick={() => onQty(listing.id, qty + 1)} className="h-6 w-6 rounded-full bg-[hsl(var(--muted))] text-sm font-bold hover:bg-[hsl(var(--muted-foreground)/0.2)] transition">+</button>
                  </div>
                </div>
                <button onClick={() => onRemove(listing.id)} className="text-[hsl(var(--muted-foreground))] hover:text-red-500 transition text-sm mt-1">✕</button>
              </div>
            ))}
          </div>
          <div className="border-t border-[hsl(var(--border)/0.5)] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[hsl(var(--muted-foreground))]">Subtotal</span>
              <span className="text-base font-black text-[hsl(var(--foreground))]">{fmtClp(subtotal)}</span>
            </div>
            <button
              className="w-full rounded-2xl bg-[hsl(22_92%_60%)] py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
              onClick={() => alert("Función de pago disponible próximamente. Contacta a la tienda directamente.")}
            >
              Ir al pago
            </button>
            <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
              O contáctanos directamente para coordinar
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Product card ────────────────────────────────────────────── */
function ProductCard({ listing, onAdd }: { listing: MarketplaceListing; onAdd: (l: MarketplaceListing) => void }) {
  return (
    <div className="group overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white shadow-sm transition hover:shadow-md">
      {listing.photoUrls[0] ? (
        <div className="overflow-hidden h-44">
          <img src={listing.photoUrls[0]} alt={listing.title} className="h-full w-full object-cover transition group-hover:scale-105" />
        </div>
      ) : (
        <div className="flex h-44 items-center justify-center bg-[hsl(var(--muted)/0.5)] text-4xl">📦</div>
      )}
      <div className="p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{CAT_LABELS[listing.category]}</p>
        <p className="mt-1 text-sm font-bold text-[hsl(var(--foreground))] leading-snug line-clamp-2">{listing.title}</p>
        <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">{listing.description}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-base font-black text-[hsl(22_92%_50%)]">{fmtClp(listing.priceCents)}</p>
            <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">{listing.condition === "NEW" ? "Nuevo" : "Usado"}</p>
          </div>
          <button
            onClick={() => onAdd(listing)}
            className="rounded-full bg-[hsl(22_92%_60%)] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-90"
          >
            + Carrito
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────── */
export default function PublicShopPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;

  const [shop, setShop]         = useState<MapServicePoint | null>(null);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [catFilter, setCatFilter] = useState<MarketplaceCategory | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [cart, setCart]         = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    const mapPromise = listMapServices({ limit: 100 });
    const mktPromise = accessToken
      ? listMarketplaceListings(accessToken, { limit: 50, sortBy: "recent" })
      : Promise.resolve([] as MarketplaceListing[]);

    void Promise.all([mapPromise, mktPromise]).then(([mapRes, mktRes]) => {
      const point = mapRes.items.find(p => p.sourceId === id || p.id === id);
      setShop(point ?? null);
      setListings(mktRes.filter(l => l.isActive));
    }).catch(() => setError("No se pudo cargar la tienda.")).finally(() => setIsLoading(false));
  }, [id, accessToken]);

  function addToCart(listing: MarketplaceListing) {
    setCart(cur => {
      const found = cur.find(i => i.listing.id === listing.id);
      if (found) return cur.map(i => i.listing.id === listing.id ? { ...i, qty: i.qty + 1 } : i);
      return [...cur, { listing, qty: 1 }];
    });
    setShowCart(true);
  }
  function removeFromCart(id: string) { setCart(cur => cur.filter(i => i.listing.id !== id)); }
  function setQty(id: string, qty: number) { setCart(cur => cur.map(i => i.listing.id === id ? { ...i, qty } : i)); }

  const cats = Array.from(new Set(listings.map(l => l.category)));
  const visible = catFilter ? listings.filter(l => l.category === catFilter) : listings;
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  if (isLoading) {
    return (
      <div className="space-y-4 py-8">
        <div className="h-40 animate-pulse rounded-3xl bg-[hsl(var(--muted))]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 animate-pulse rounded-3xl bg-[hsl(var(--muted))]" />)}
        </div>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="py-8 text-center">
        <p className="text-4xl">🏪</p>
        <p className="mt-3 font-bold text-[hsl(var(--foreground))]">Tienda no encontrada</p>
        <Link href="/explore" className="mt-4 inline-block text-sm font-semibold text-[hsl(var(--secondary))] hover:underline">← Volver a Cerca de ti</Link>
      </div>
    );
  }

  return (
    <div className="pb-16 space-y-6">
      {/* back */}
      <Link href="/explore" className="inline-flex items-center gap-1 text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition">
        ← Volver
      </Link>

      {/* shop header */}
      <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white shadow-sm">
        <div className="h-32 bg-gradient-to-r from-amber-600 to-orange-500" />
        <div className="p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-black text-[hsl(var(--foreground))]">{shop.name}</h1>
              {shop.subtitle && <p className="mt-0.5 text-sm text-[hsl(var(--muted-foreground))]">{shop.subtitle}</p>}
              {(shop.address ?? shop.district ?? shop.city) && (
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  📍 {[shop.address, shop.district, shop.city].filter(Boolean).join(", ")}
                </p>
              )}
              {shop.openingHours.length > 0 && (
                <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">🕐 {shop.openingHours[0]}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {shop.hasDiscount && (
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                  {shop.discountLabel ?? "Descuentos activos"}
                </span>
              )}
              {shop.isOpenNow !== null && (
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${shop.isOpenNow ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {shop.isOpenNow ? "Abierto ahora" : "Cerrado"}
                </span>
              )}
              <button
                onClick={() => setShowCart(v => !v)}
                className="relative rounded-full bg-[hsl(22_92%_60%)] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
              >
                🛒 Carrito
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white">{cartCount}</span>
                )}
              </button>
            </div>
          </div>
          {shop.description && (
            <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--foreground)/0.7)]">{shop.description}</p>
          )}
          {shop.phone && (
            <a href={`tel:${shop.phone}`} className="mt-3 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] px-4 py-2 text-sm font-semibold transition hover:bg-[hsl(var(--muted)/0.5)]">
              📞 {shop.phone}
            </a>
          )}
        </div>
      </div>

      {/* discounts */}
      {shop.priceInfo.length > 0 && (
        <div className="overflow-hidden rounded-3xl border border-orange-200 bg-orange-50 shadow-sm p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-orange-500 mb-2">Descuentos y promociones</p>
          <div className="flex flex-wrap gap-2">
            {shop.priceInfo.map((p, i) => (
              <span key={i} className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">{p}</span>
            ))}
          </div>
        </div>
      )}

      {/* main grid: catalog + cart */}
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {/* category filter */}
          {cats.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setCatFilter("")}
                className={`rounded-full border px-4 py-1.5 text-xs font-bold transition ${catFilter === "" ? "border-orange-400 bg-orange-50 text-orange-700" : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-orange-300"}`}>
                Todo ({listings.length})
              </button>
              {cats.map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-bold transition ${catFilter === cat ? "border-orange-400 bg-orange-50 text-orange-700" : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-orange-300"}`}>
                  {CAT_LABELS[cat]}
                </button>
              ))}
            </div>
          )}

          {/* product grid */}
          {visible.length === 0 ? (
            <div className="rounded-3xl border border-[hsl(var(--border))] bg-white p-8 text-center">
              <p className="text-4xl">📦</p>
              <p className="mt-3 font-bold text-[hsl(var(--foreground))]">
                {listings.length === 0 ? "Esta tienda aún no tiene productos publicados" : "Sin productos en esta categoría"}
              </p>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                {shop.phone ? `Llama directamente: ${shop.phone}` : "Contáctanos para más información."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map(l => <ProductCard key={l.id} listing={l} onAdd={addToCart} />)}
            </div>
          )}
        </div>

        {/* cart panel */}
        {showCart && (
          <CartPanel items={cart} onRemove={removeFromCart} onQty={setQty} onClose={() => setShowCart(false)} />
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { listMapServices } from "@/features/map/map-api";
import type { MapServicePoint } from "@/features/map/types";
import { listMarketplaceListings } from "@/features/marketplace/marketplace-api";
import type { MarketplaceListing, MarketplaceCategory } from "@/features/marketplace/types";
import { createOrder } from "@/features/orders/orders-api";

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

/* ─── Checkout panel ──────────────────────────────────────────── */
type CheckoutStep = "cart" | "delivery" | "confirm" | "success";

function CheckoutPanel({ items, onRemove, onQty, onClose, accessToken, shopName }: {
  items: CartItem[];
  onRemove: (id: string) => void;
  onQty: (id: string, qty: number) => void;
  onClose: () => void;
  accessToken: string | undefined;
  shopName: string;
}) {
  const [step, setStep] = useState<CheckoutStep>("cart");
  const [deliveryType, setDeliveryType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const subtotal = items.reduce((s, i) => s + i.listing.priceCents * i.qty, 0);

  async function handleConfirm() {
    if (!accessToken) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const order = await createOrder(accessToken, {
        items: items.map(i => ({ listingId: i.listing.id, quantity: i.qty })),
        deliveryType,
        deliveryAddress: deliveryType === "DELIVERY" ? deliveryAddress : undefined,
        notes: notes.trim() || undefined,
      });
      setOrderNumber(order.orderNumber);
      setOrderId(order.id);
      setStep("success");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "No se pudo realizar el pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Success ── */
  if (step === "success") {
    return (
      <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border)/0.5)] px-5 py-4">
          <p className="font-bold text-[hsl(var(--foreground))]">✅ ¡Pedido realizado!</p>
        </div>
        <div className="p-6 space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">✅</div>
          <div>
            <p className="font-bold text-[hsl(var(--foreground))] text-lg">¡Tu pedido fue enviado!</p>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              Número de pedido: <span className="font-black text-[hsl(var(--foreground))]">{orderNumber}</span>
            </p>
            <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
              {shopName} confirmará tu pedido pronto.
            </p>
          </div>
          <Link href="/account?tab=pedidos"
            className="inline-block rounded-2xl bg-[hsl(var(--primary))] px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90">
            Ver mis pedidos
          </Link>
        </div>
      </div>
    );
  }

  /* ── Cart step ── */
  if (step === "cart") {
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
              {!accessToken ? (
                <Link href="/login"
                  className="block w-full rounded-2xl bg-[hsl(22_92%_60%)] py-3 text-center text-sm font-bold text-white transition hover:opacity-90">
                  Inicia sesión para comprar
                </Link>
              ) : (
                <button
                  className="w-full rounded-2xl bg-[hsl(22_92%_60%)] py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
                  onClick={() => setStep("delivery")}
                >
                  Ir al pago →
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  /* ── Delivery step ── */
  if (step === "delivery") {
    return (
      <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border)/0.5)] px-5 py-4">
          <p className="font-bold text-[hsl(var(--foreground))]">📦 Entrega</p>
          <button onClick={onClose} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition text-lg">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Tipo de entrega</p>
            <div className="grid grid-cols-2 gap-2">
              {(["PICKUP", "DELIVERY"] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDeliveryType(type)}
                  className={`flex flex-col items-center gap-1 rounded-2xl border px-3 py-4 text-center transition ${
                    deliveryType === type
                      ? "border-[hsl(22_92%_60%)] bg-orange-50 text-orange-700"
                      : "border-slate-200 hover:border-orange-200"
                  }`}
                >
                  <span className="text-xl">{type === "PICKUP" ? "🏪" : "🚚"}</span>
                  <span className="text-xs font-bold">{type === "PICKUP" ? "Retiro en tienda" : "Despacho"}</span>
                </button>
              ))}
            </div>
          </div>

          {deliveryType === "DELIVERY" && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Dirección de despacho *</label>
              <input
                value={deliveryAddress}
                onChange={e => setDeliveryAddress(e.target.value)}
                placeholder="Av. Ejemplo 123, Providencia, Santiago"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-orange-300"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Ej: timbre 4, dejar en portería..."
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-orange-300"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => setStep("cart")} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
              ← Atrás
            </button>
            <button
              disabled={deliveryType === "DELIVERY" && !deliveryAddress.trim()}
              onClick={() => setStep("confirm")}
              className="flex-1 rounded-2xl bg-[hsl(22_92%_60%)] py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 transition"
            >
              Revisar pedido →
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Confirm step ── */
  return (
    <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border)/0.5)] px-5 py-4">
        <p className="font-bold text-[hsl(var(--foreground))]">✅ Confirmar pedido</p>
        <button onClick={onClose} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition text-lg">✕</button>
      </div>
      <div className="p-5 space-y-4">
        {submitError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{submitError}</div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Resumen</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {items.map(({ listing, qty }) => (
              <div key={listing.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700 truncate flex-1 mr-2">{listing.title} <span className="text-slate-400">×{qty}</span></span>
                <span className="font-bold text-slate-800 shrink-0">{fmtClp(listing.priceCents * qty)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">Total</span>
            <span className="text-base font-black text-[hsl(22_92%_50%)]">{fmtClp(subtotal)}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1.5 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 w-20 shrink-0">Entrega</span>
            <span className="font-semibold text-slate-800">{deliveryType === "PICKUP" ? "🏪 Retiro en tienda" : "🚚 Despacho a domicilio"}</span>
          </div>
          {deliveryType === "DELIVERY" && deliveryAddress && (
            <div className="flex items-start gap-2">
              <span className="text-slate-500 w-20 shrink-0 mt-0.5">Dirección</span>
              <span className="font-semibold text-slate-800">{deliveryAddress}</span>
            </div>
          )}
          {notes.trim() && (
            <div className="flex items-start gap-2">
              <span className="text-slate-500 w-20 shrink-0 mt-0.5">Notas</span>
              <span className="font-semibold text-slate-800">{notes}</span>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400">Pago al momento de retirar o recibir el pedido</p>

        <div className="flex gap-2">
          <button onClick={() => setStep("delivery")} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
            ← Atrás
          </button>
          <button
            onClick={() => void handleConfirm()}
            disabled={submitting}
            className="flex-1 rounded-2xl bg-[hsl(22_92%_60%)] py-3 text-sm font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50 transition"
          >
            {submitting ? "Enviando pedido..." : "Confirmar pedido ✓"}
          </button>
        </div>
      </div>
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
    void listMapServices({ limit: 100 }).then(async (mapRes) => {
      const point = mapRes.items.find(p => p.sourceId === id || p.id === id);
      setShop(point ?? null);
      if (point?.ownerId && accessToken) {
        try {
          const mktRes = await listMarketplaceListings(accessToken, {
            sellerId: point.ownerId,
            limit: 60,
            sortBy: "recent",
          });
          setListings(mktRes.filter(l => l.isActive));
        } catch { /* ignore */ }
      }
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
  function removeFromCart(listingId: string) { setCart(cur => cur.filter(i => i.listing.id !== listingId)); }
  function setQty(listingId: string, qty: number) { setCart(cur => cur.map(i => i.listing.id === listingId ? { ...i, qty } : i)); }

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
      <Link href="/explore" className="inline-flex items-center gap-1 text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition">
        ← Volver
      </Link>

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

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
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

        {showCart && (
          <CheckoutPanel
            items={cart}
            onRemove={removeFromCart}
            onQty={setQty}
            onClose={() => setShowCart(false)}
            accessToken={accessToken}
            shopName={shop.name}
          />
        )}
      </div>
    </div>
  );
}

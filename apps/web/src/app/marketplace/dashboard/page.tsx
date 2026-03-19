"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/features/auth/auth-context";
import { listOrders, updateOrderStatus } from "@/features/orders/orders-api";
import type { Order, OrderStatus } from "@/features/orders/types";
import {
  createMarketplaceListing,
  listMarketplaceListings,
  removeMarketplaceListing,
  updateMarketplaceListing,
} from "@/features/marketplace/marketplace-api";
import type { MarketplaceCategory, MarketplaceListing } from "@/features/marketplace/types";
import { getMyProfile, updateShopProfile } from "@/features/profiles/profiles-api";
import type { MyProfile, ShopProfile } from "@/features/profiles/types";

/* ─── Constants ──────────────────────────────────────────────── */
const CAT_LABELS: Record<MarketplaceCategory, string> = {
  BED: "Camas", CARRIER: "Transportadoras", TOY: "Juguetes",
  LEASH: "Correas", CAGE: "Jaulas", CLOTHES: "Ropa",
  FEEDER: "Comederos", ACCESSORY: "Accesorios", OTHER: "Otros",
};
const CATS = Object.entries(CAT_LABELS) as [MarketplaceCategory, string][];

function fmtClp(cents: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(cents / 100);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

/* ─── Section ids ────────────────────────────────────────────── */
type Section = "resumen" | "tienda" | "productos" | "categorias" | "inventario" | "promociones" | "pagos" | "envios" | "pedidos" | "config";

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: "resumen", label: "Resumen", icon: "◈" },
  { id: "tienda", label: "Tienda", icon: "🏪" },
  { id: "productos", label: "Productos", icon: "📦" },
  { id: "categorias", label: "Categorías", icon: "🗂" },
  { id: "inventario", label: "Inventario", icon: "📊" },
  { id: "promociones", label: "Promociones", icon: "🏷" },
  { id: "pagos", label: "Pagos", icon: "💳" },
  { id: "envios", label: "Envíos", icon: "🚚" },
  { id: "pedidos", label: "Pedidos", icon: "🛒" },
  { id: "config", label: "Configuración", icon: "⚙️" },
];

/* ─── Shared UI ──────────────────────────────────────────────── */
function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function StatCard({ label, value, sub, color = "slate" }: { label: string; value: string | number; sub?: string; color?: "slate" | "green" | "orange" | "red" | "blue" }) {
  const bg = { slate: "bg-slate-50", green: "bg-emerald-50", orange: "bg-orange-50", red: "bg-red-50", blue: "bg-blue-50" }[color];
  const txt = { slate: "text-slate-800", green: "text-emerald-700", orange: "text-orange-700", red: "text-red-700", blue: "text-blue-700" }[color];
  return (
    <div className={`${bg} rounded-2xl p-4 border border-white/60 shadow-sm`}>
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1.5 text-2xl font-black ${txt}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function Badge({ label, color = "slate" }: { label: string; color?: "green" | "red" | "amber" | "slate" | "blue" }) {
  const cls = {
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-600",
    amber: "bg-amber-100 text-amber-700",
    slate: "bg-slate-100 text-slate-600",
    blue: "bg-blue-100 text-blue-700",
  }[color];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cls}`}>{label}</span>;
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function Inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[hsl(var(--primary)/0.5)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.1)] transition ${props.className ?? ""}`} />;
}

function Sel(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[hsl(var(--primary)/0.5)] transition ${props.className ?? ""}`} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[hsl(var(--primary)/0.5)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.1)] transition" />;
}

function Btn({ children, variant = "primary", size = "md", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger"; size?: "sm" | "md" }) {
  const base = "inline-flex items-center gap-2 font-semibold rounded-xl transition active:scale-95 disabled:opacity-50";
  const v = {
    primary: "bg-[hsl(var(--primary))] text-white hover:opacity-90",
    ghost: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
  }[variant];
  const s = { sm: "px-3 py-1.5 text-xs", md: "px-5 py-2.5 text-sm" }[size];
  return <button {...props} className={`${base} ${v} ${s} ${props.className ?? ""}`}>{children}</button>;
}

function ComingSoon({ section }: { section: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">🚧</div>
      <h3 className="font-bold text-slate-800">{section} — Próximamente</h3>
      <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">Esta sección está en desarrollo. La infraestructura backend está lista para conectar.</p>
    </div>
  );
}

/* ─── Resumen ────────────────────────────────────────────────── */
function SectionResumen({ listings, shop }: { listings: MarketplaceListing[]; shop: ShopProfile | null | undefined }) {
  const active = listings.filter(l => l.isActive).length;
  const inactive = listings.filter(l => !l.isActive).length;
  const featured = listings.filter(l => l.isFeatured).length;
  const totalFavs = listings.reduce((s, l) => s + l.stats.favoritesCount, 0);

  return (
    <div className="space-y-6">
      <SectionHeader title="Resumen de tu tienda" subtitle="Vista general del estado de tu negocio en Kummpa" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Productos activos" value={active} color="green" />
        <StatCard label="Inactivos" value={inactive} color="slate" />
        <StatCard label="Destacados" value={featured} color="orange" />
        <StatCard label="Total favoritos" value={totalFavs} color="blue" sub="en todos tus productos" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Estado de la tienda</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <span className={`h-2.5 w-2.5 rounded-full ${shop?.businessName ? "bg-emerald-500" : "bg-slate-300"}`} />
            <div>
              <p className="text-sm font-semibold text-slate-800">{shop?.businessName ?? "Sin nombre comercial"}</p>
              <p className="text-xs text-slate-500">{shop?.address ?? "Sin dirección"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-lg">📦</span>
            <div>
              <p className="text-sm font-semibold text-slate-800">{listings.length} publicaciones</p>
              <p className="text-xs text-slate-500">{active} activas · {inactive} pausadas</p>
            </div>
          </div>
        </div>
      </div>

      {listings.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Últimas publicaciones</p>
          </div>
          <div className="divide-y divide-slate-100">
            {listings.slice(0, 5).map(l => (
              <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                <div className={`h-2 w-2 rounded-full shrink-0 ${l.isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                <p className="flex-1 text-sm font-medium text-slate-800 truncate">{l.title}</p>
                <p className="text-sm font-bold text-slate-700 shrink-0">{fmtClp(l.priceCents)}</p>
                <Badge label={CAT_LABELS[l.category]} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tienda ─────────────────────────────────────────────────── */
function SectionTienda({ shop, accessToken, onSaved }: { shop: ShopProfile | null | undefined; accessToken: string; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [form, setForm] = useState({
    businessName: shop?.businessName ?? "",
    address: shop?.address ?? "",
    district: shop?.district ?? "",
    city: shop?.city ?? "",
    contactPhone: shop?.contactPhone ?? "",
    contactEmail: shop?.contactEmail ?? "",
    websiteUrl: shop?.websiteUrl ?? "",
    latitude:  shop?.latitude  ?? null as number | null,
    longitude: shop?.longitude ?? null as number | null,
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const setNum = (k: "latitude" | "longitude") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.trim();
    setForm(f => ({ ...f, [k]: v === "" ? null : Number(v) }));
  };

  async function save() {
    setSaving(true);
    try {
      await updateShopProfile(accessToken, form);
      setOk(true);
      onSaved();
      setTimeout(() => setOk(false), 2500);
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Información de la tienda" subtitle="Datos públicos de tu negocio en el marketplace" />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Nombre comercial">
            <Inp value={form.businessName} onChange={set("businessName")} placeholder="Ej: Pet Store Santiago" />
          </FormRow>
          <FormRow label="Ciudad">
            <Inp value={form.city} onChange={set("city")} placeholder="Santiago" />
          </FormRow>
          <FormRow label="Comuna">
            <Inp value={form.district} onChange={set("district")} placeholder="Providencia" />
          </FormRow>
          <FormRow label="Dirección">
            <Inp value={form.address} onChange={set("address")} placeholder="Av. Ejemplo 123" />
          </FormRow>
          <FormRow label="Teléfono de contacto">
            <Inp value={form.contactPhone} onChange={set("contactPhone")} placeholder="+56 9 0000 0000" />
          </FormRow>
          <FormRow label="Email de contacto">
            <Inp value={form.contactEmail} onChange={set("contactEmail")} type="email" placeholder="tienda@ejemplo.cl" />
          </FormRow>
          <FormRow label="Sitio web">
            <Inp value={form.websiteUrl} onChange={set("websiteUrl")} placeholder="https://mitienda.cl" />
          </FormRow>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-600 mb-2">📍 Ubicación en el mapa</p>
          <p className="text-xs text-amber-700 mb-3">Para aparecer en &quot;Cerca de ti&quot; necesitas ingresar tus coordenadas. Puedes obtenerlas desde <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Google Maps</a> haciendo clic derecho sobre tu tienda → &quot;¿Qué hay aquí?&quot;</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormRow label="Latitud">
              <Inp type="number" step="any" value={form.latitude ?? ""} onChange={setNum("latitude")} placeholder="-33.4489" />
            </FormRow>
            <FormRow label="Longitud">
              <Inp type="number" step="any" value={form.longitude ?? ""} onChange={setNum("longitude")} placeholder="-70.6693" />
            </FormRow>
          </div>
          {form.latitude && form.longitude && (
            <p className="mt-2 text-xs font-semibold text-amber-700">✓ Coordenadas guardadas: {form.latitude}, {form.longitude}</p>
          )}
        </div>

        {ok && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
            ✓ Información guardada correctamente
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Btn onClick={() => void save()} disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Btn>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-700">Logo y banner — Próximamente</p>
        <p className="mt-1 text-xs text-slate-500">La carga de imágenes de tienda estará disponible cuando se integre el servicio de almacenamiento.</p>
      </div>
    </div>
  );
}

/* ─── Productos ──────────────────────────────────────────────── */
function SectionProductos({ listings, accessToken, onRefresh }: { listings: MarketplaceListing[]; accessToken: string; onRefresh: () => void }) {
  const [creating, setCreating] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", priceCents: "", category: "ACCESSORY" as MarketplaceCategory, condition: "NEW" as "NEW" | "USED", photoUrl: "", district: "", stock: "" });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setWorking("create");
    try {
      await createMarketplaceListing(accessToken, {
        title: form.title, description: form.description,
        priceCents: Math.trunc(Number(form.priceCents) * 100),
        condition: form.condition, category: form.category,
        photoUrls: form.photoUrl ? [form.photoUrl] : [],
        district: form.district || undefined,
        stockQuantity: form.stock !== "" ? parseInt(form.stock, 10) : undefined,
      });
      setCreating(false);
      setForm({ title: "", description: "", priceCents: "", category: "ACCESSORY", condition: "NEW", photoUrl: "", district: "", stock: "" });
      onRefresh();
    } finally { setWorking(null); }
  }

  async function toggleActive(l: MarketplaceListing) {
    setWorking(`toggle-${l.id}`);
    try { await updateMarketplaceListing(accessToken, l.id, { isActive: !l.isActive }); onRefresh(); }
    finally { setWorking(null); }
  }

  async function remove(l: MarketplaceListing) {
    if (!window.confirm("¿Eliminar esta publicación?")) return;
    setWorking(`del-${l.id}`);
    try { await removeMarketplaceListing(accessToken, l.id); onRefresh(); }
    finally { setWorking(null); }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Productos"
        subtitle={`${listings.length} publicaciones en tu tienda`}
        action={<Btn onClick={() => setCreating(true)} size="sm">+ Nuevo producto</Btn>}
      />

      {creating && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Nueva publicación</h3>
          <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormRow label="Nombre del producto">
                <Inp required value={form.title} onChange={set("title")} placeholder="Nombre del producto" />
              </FormRow>
              <FormRow label="Precio (CLP)">
                <Inp required type="number" value={form.priceCents} onChange={set("priceCents")} placeholder="0" />
              </FormRow>
              <FormRow label="Categoría">
                <Sel value={form.category} onChange={set("category")}>
                  {CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Sel>
              </FormRow>
              <FormRow label="Estado">
                <Sel value={form.condition} onChange={set("condition")}>
                  <option value="NEW">Nuevo</option>
                  <option value="USED">Usado</option>
                </Sel>
              </FormRow>
              <FormRow label="URL foto (opcional)">
                <Inp value={form.photoUrl} onChange={set("photoUrl")} placeholder="https://..." />
              </FormRow>
              <FormRow label="Comuna">
                <Inp value={form.district} onChange={set("district")} placeholder="Providencia" />
              </FormRow>
              <FormRow label="Stock disponible (opcional)">
                <Inp type="number" min="0" value={form.stock} onChange={set("stock")} placeholder="Sin límite" />
              </FormRow>
            </div>
            <FormRow label="Descripción">
              <Textarea rows={3} value={form.description} onChange={set("description")} placeholder="Descripción del producto..." required />
            </FormRow>
            <div className="flex gap-3 justify-end pt-2">
              <Btn type="button" variant="ghost" onClick={() => setCreating(false)}>Cancelar</Btn>
              <Btn type="submit" disabled={working === "create"}>{working === "create" ? "Publicando..." : "Publicar producto"}</Btn>
            </div>
          </form>
        </div>
      )}

      {listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">📦</div>
          <h3 className="font-bold text-slate-800">Sin productos aún</h3>
          <p className="mt-2 text-sm text-slate-500">Crea tu primera publicación para empezar a vender.</p>
          <Btn className="mt-5 mx-auto" onClick={() => setCreating(true)}>+ Agregar producto</Btn>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">Producto</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 hidden sm:table-cell">Categoría</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-slate-400">Precio</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400 hidden sm:table-cell">Estado</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listings.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {l.photoUrls[0] ? (
                          <img src={l.photoUrls[0]} alt={l.title} className="h-10 w-10 rounded-xl object-cover bg-slate-100 shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">📦</div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate max-w-[160px]">{l.title}</p>
                          <p className="text-xs text-slate-400">{l.condition === "NEW" ? "Nuevo" : "Usado"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge label={CAT_LABELS[l.category]} />
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{fmtClp(l.priceCents)}</td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <Badge label={l.isActive ? "Activo" : "Pausado"} color={l.isActive ? "green" : "slate"} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => void toggleActive(l)}
                          disabled={working === `toggle-${l.id}`}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                        >
                          {l.isActive ? "Pausar" : "Activar"}
                        </button>
                        <button
                          onClick={() => void remove(l)}
                          disabled={working === `del-${l.id}`}
                          className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Inventario ─────────────────────────────────────────────── */
function SectionInventario({ listings }: { listings: MarketplaceListing[] }) {
  const active = listings.filter(l => l.isActive);
  const inactive = listings.filter(l => !l.isActive);

  return (
    <div className="space-y-6">
      <SectionHeader title="Inventario" subtitle="Estado y control de tus publicaciones" />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Activos" value={active.length} color="green" />
        <StatCard label="Pausados" value={inactive.length} color="slate" />
        <StatCard label="Destacados" value={listings.filter(l => l.isFeatured).length} color="orange" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Estado por producto</p>
        </div>
        {listings.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Sin productos aún</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {listings.map(l => (
              <div key={l.id} className="flex items-center gap-4 px-5 py-3">
                <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${l.isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                <p className="flex-1 text-sm font-medium text-slate-800 truncate">{l.title}</p>
                <div className="flex items-center gap-2 shrink-0">
                  {l.isFeatured && <Badge label="Destacado" color="amber" />}
                  <Badge label={l.isActive ? "Activo" : "Pausado"} color={l.isActive ? "green" : "slate"} />
                  {l.stockQuantity != null && (
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${l.stockQuantity <= 0 ? "bg-red-100 text-red-600" : l.stockQuantity <= 3 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                      Stock: {l.stockQuantity}
                    </span>
                  )}
                  <p className="text-sm font-bold text-slate-700 hidden sm:block">{fmtClp(l.priceCents)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Próximas funciones</p>
        <ul className="space-y-2 text-sm text-slate-500">
          {["Control de stock por unidades", "Alertas de stock bajo", "Control por variantes (talla, color)", "Venta automática cuando stock = 0"].map(f => (
            <li key={f} className="flex items-center gap-2">
              <span className="text-slate-300">◌</span> {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─── Categorías ─────────────────────────────────────────────── */
function SectionCategorias({ listings }: { listings: MarketplaceListing[] }) {
  const counts = CATS.map(([cat, label]) => ({
    cat, label, count: listings.filter(l => l.category === cat).length,
  }));

  return (
    <div className="space-y-6">
      <SectionHeader title="Categorías" subtitle="Distribución de tus productos por categoría" />

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {counts.map(({ cat, label, count }) => (
            <div key={cat} className="flex items-center justify-between px-5 py-3.5">
              <p className="text-sm font-medium text-slate-700">{label}</p>
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden hidden sm:block">
                  <div
                    className="h-full rounded-full bg-[hsl(var(--primary))]"
                    style={{ width: listings.length ? `${(count / listings.length) * 100}%` : "0%" }}
                  />
                </div>
                <span className={`text-sm font-bold ${count > 0 ? "text-slate-900" : "text-slate-300"}`}>{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-800">Categorías personalizadas — Próximamente</p>
        <p className="mt-1 text-xs text-amber-600">Podrás crear subcategorías y etiquetas propias para organizar mejor tu catálogo.</p>
      </div>
    </div>
  );
}

/* ─── Promociones ────────────────────────────────────────────── */
function SectionPromociones() {
  const promos = [
    { type: "% Descuento", desc: "Aplicar descuento porcentual a un producto o categoría", icon: "🏷" },
    { type: "Cupón", desc: "Código de descuento para compartir con clientes", icon: "🎟" },
    { type: "2x1", desc: "Lleva dos por el precio de uno", icon: "🎁" },
    { type: "Combo", desc: "Pack de productos con precio especial", icon: "📦" },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="Promociones" subtitle="Descuentos, cupones y ofertas especiales" />

      <div className="grid gap-3 sm:grid-cols-2">
        {promos.map(p => (
          <div key={p.type} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm opacity-60">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">{p.icon}</span>
              <p className="font-bold text-slate-800">{p.type}</p>
            </div>
            <p className="text-xs text-slate-500">{p.desc}</p>
            <div className="mt-3">
              <Badge label="Próximamente" color="slate" />
            </div>
          </div>
        ))}
      </div>

      <ComingSoon section="Gestión de promociones" />
    </div>
  );
}

/* ─── Pagos ──────────────────────────────────────────────────── */
function SectionPagos() {
  const methods = [
    { id: "cash", label: "Efectivo", desc: "Pago en persona", icon: "💵" },
    { id: "transfer", label: "Transferencia bancaria", desc: "Datos de cuenta al comprar", icon: "🏦" },
    { id: "webpay", label: "Webpay / Flow", desc: "Pago online con tarjeta", icon: "💳" },
    { id: "cod", label: "Contra entrega", desc: "Pago al recibir el pedido", icon: "📬" },
    { id: "mp", label: "Mercado Pago", desc: "Plataforma de pagos digitales", icon: "🟣" },
  ];
  const [enabled, setEnabled] = useState<Set<string>>(new Set(["cash", "transfer"]));

  return (
    <div className="space-y-6">
      <SectionHeader title="Métodos de pago" subtitle="Configura cómo recibirás pagos de tus clientes" />

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {methods.map(m => (
            <div key={m.id} className="flex items-center gap-4 px-5 py-4">
              <span className="text-xl shrink-0">{m.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{m.label}</p>
                <p className="text-xs text-slate-500">{m.desc}</p>
              </div>
              <button
                onClick={() => setEnabled(prev => {
                  const n = new Set(prev);
                  n.has(m.id) ? n.delete(m.id) : n.add(m.id);
                  return n;
                })}
                className={`relative h-6 w-11 rounded-full transition ${enabled.has(m.id) ? "bg-[hsl(var(--primary))]" : "bg-slate-200"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled.has(m.id) ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-800">Nota</p>
        <p className="mt-1 text-xs text-amber-600">La configuración de pagos se guardará en el backend en una próxima actualización. Las preferencias actualmente son locales.</p>
      </div>
    </div>
  );
}

/* ─── Envíos ─────────────────────────────────────────────────── */
function SectionEnvios() {
  const methods = [
    { id: "pickup", label: "Retiro en tienda", desc: "El cliente recoge en tu local", icon: "🏪" },
    { id: "local", label: "Despacho local", desc: "Envío dentro de tu ciudad", icon: "🛵" },
    { id: "courier", label: "Courier externo", desc: "Chilexpress, Starken u otro", icon: "📦" },
    { id: "free", label: "Envío gratis", desc: "Sobre un monto mínimo definido", icon: "🎁" },
  ];
  const [enabled, setEnabled] = useState<Set<string>>(new Set(["pickup"]));

  return (
    <div className="space-y-6">
      <SectionHeader title="Métodos de envío" subtitle="Define cómo llegarán tus productos a los clientes" />

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {methods.map(m => (
            <div key={m.id} className="flex items-center gap-4 px-5 py-4">
              <span className="text-xl shrink-0">{m.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{m.label}</p>
                <p className="text-xs text-slate-500">{m.desc}</p>
              </div>
              <button
                onClick={() => setEnabled(prev => {
                  const n = new Set(prev);
                  n.has(m.id) ? n.delete(m.id) : n.add(m.id);
                  return n;
                })}
                className={`relative h-6 w-11 rounded-full transition ${enabled.has(m.id) ? "bg-[hsl(var(--primary))]" : "bg-slate-200"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled.has(m.id) ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <ComingSoon section="Tarifas y zonas de envío" />
    </div>
  );
}

/* ─── Pedidos ────────────────────────────────────────────────── */
const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  SHIPPED: "En camino",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

const SELLER_TRANSITIONS: Partial<Record<OrderStatus, { next: OrderStatus; label: string }[]>> = {
  PENDING: [
    { next: "CONFIRMED", label: "✓ Confirmar" },
    { next: "CANCELLED", label: "✕ Rechazar" },
  ],
  CONFIRMED: [
    { next: "SHIPPED", label: "🚚 Marcar enviado" },
    { next: "CANCELLED", label: "✕ Cancelar" },
  ],
  SHIPPED: [
    { next: "DELIVERED", label: "✓ Marcar entregado" },
  ],
};

function SectionPedidos({ accessToken }: { accessToken: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadOrders = useCallback(() => {
    if (!accessToken) return;
    setLoadingOrders(true);
    void listOrders(accessToken, { role: "seller", limit: 50 })
      .then(setOrders)
      .catch(() => null)
      .finally(() => setLoadingOrders(false));
  }, [accessToken]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    setUpdating(orderId);
    try {
      const updated = await updateOrderStatus(accessToken, orderId, status);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
    } catch { /* ignore */ }
    finally { setUpdating(null); }
  }

  const byStatus = {
    PENDING: orders.filter(o => o.status === "PENDING").length,
    CONFIRMED: orders.filter(o => o.status === "CONFIRMED").length,
    SHIPPED: orders.filter(o => o.status === "SHIPPED").length,
    DELIVERED: orders.filter(o => o.status === "DELIVERED").length,
    CANCELLED: orders.filter(o => o.status === "CANCELLED").length,
  };

  const ORDER_STATUS_COLOR: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700",
    CONFIRMED: "bg-emerald-100 text-emerald-700",
    SHIPPED: "bg-blue-100 text-blue-700",
    DELIVERED: "bg-slate-100 text-slate-600",
    CANCELLED: "bg-red-100 text-red-600",
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Pedidos" subtitle="Órdenes de compra recibidas" />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Pendientes" value={byStatus.PENDING} color="orange" />
        <StatCard label="Confirmados" value={byStatus.CONFIRMED} color="green" />
        <StatCard label="En camino" value={byStatus.SHIPPED} color="blue" />
        <StatCard label="Entregados" value={byStatus.DELIVERED} color="slate" />
        <StatCard label="Cancelados" value={byStatus.CANCELLED} color="red" />
      </div>

      {loadingOrders ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-5xl">🛒</p>
          <p className="mt-4 font-bold text-slate-800">Aún no has recibido pedidos</p>
          <p className="mt-1 text-sm text-slate-500">Cuando un cliente realice una compra, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const transitions = SELLER_TRANSITIONS[order.status] ?? [];
            return (
              <div key={order.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <button
                  className="flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-slate-50/60 transition"
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-slate-900">{order.orderNumber}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ORDER_STATUS_COLOR[order.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {ORDER_STATUS_LABEL[order.status] ?? order.status}
                      </span>
                      <span className="text-[11px] text-slate-400">{order.deliveryType === "PICKUP" ? "🏪 Retiro" : "🚚 Despacho"}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {order.buyer.firstName} {order.buyer.lastName} — {order.buyer.email}
                    </p>
                    <p className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-[hsl(22_92%_50%)]">{fmtClp(order.totalCents)}</p>
                    <p className="mt-1 text-xs text-slate-400">{expanded === order.id ? "▲" : "▼"}</p>
                  </div>
                </button>

                {expanded === order.id && (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-3 space-y-4">
                    <div className="space-y-2">
                      {order.items.map(item => (
                        <div key={item.id} className="flex items-center gap-3">
                          {item.photoUrl && (
                            <img src={item.photoUrl} alt={item.title} className="h-10 w-10 rounded-xl object-cover shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{item.title}</p>
                            <p className="text-[11px] text-slate-500">{fmtClp(item.priceCents)} × {item.quantity}</p>
                          </div>
                          <p className="text-xs font-bold text-slate-700 shrink-0">{fmtClp(item.priceCents * item.quantity)}</p>
                        </div>
                      ))}
                    </div>

                    {order.deliveryAddress && (
                      <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                        <span className="font-bold">Dirección: </span>{order.deliveryAddress}
                      </div>
                    )}
                    {order.notes && (
                      <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                        <span className="font-bold">Notas: </span>{order.notes}
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                      <span className="text-xs text-slate-500">Total</span>
                      <span className="text-sm font-black text-[hsl(22_92%_50%)]">{fmtClp(order.totalCents)}</span>
                    </div>

                    {transitions.length > 0 && (
                      <div className="flex gap-2 flex-wrap pt-1">
                        {transitions.map(({ next, label }) => (
                          <button
                            key={next}
                            disabled={updating === order.id}
                            onClick={() => void handleStatusChange(order.id, next)}
                            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                              next === "CANCELLED"
                                ? "border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                : "bg-[hsl(var(--primary))] text-white hover:opacity-90 disabled:opacity-50"
                            }`}
                          >
                            {updating === order.id ? "..." : label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Configuración ──────────────────────────────────────────── */
function SectionConfig({ shop }: { shop: ShopProfile | null | undefined }) {
  return (
    <div className="space-y-6">
      <SectionHeader title="Configuración" subtitle="Ajustes generales de tu tienda" />

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Estado de la tienda</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Tienda activa</p>
              <p className="text-xs text-slate-500">Tu tienda aparece en el marketplace</p>
            </div>
            <Badge label="Próximamente" color="slate" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Aceptar pedidos</p>
              <p className="text-xs text-slate-500">Pausa temporalmente la recepción de órdenes</p>
            </div>
            <Badge label="Próximamente" color="slate" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Datos registrados</p>
        </div>
        <div className="divide-y divide-slate-100">
          {[
            { label: "Nombre", value: shop?.businessName ?? "—" },
            { label: "Ciudad", value: shop?.city ?? "—" },
            { label: "Comuna", value: shop?.district ?? "—" },
            { label: "Teléfono", value: shop?.contactPhone ?? "—" },
            { label: "Email", value: shop?.contactEmail ?? "—" },
            { label: "Web", value: shop?.websiteUrl ?? "—" },
          ].map(r => (
            <div key={r.label} className="flex justify-between items-center px-5 py-3.5 gap-4">
              <p className="text-sm text-slate-500">{r.label}</p>
              <p className="text-sm font-medium text-slate-800 text-right truncate max-w-[55%]">{r.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/marketplace" className="flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 text-center hover:bg-slate-50 transition shadow-sm">
          Ver marketplace público
        </Link>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function ShopDashboardPage() {
  const { session } = useAuth();
  const token = session?.tokens.accessToken ?? "";
  const [section, setSection] = useState<Section>("resumen");
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  async function loadData() {
    if (!token) return;
    setLoading(true);
    try {
      const [prof, list] = await Promise.all([
        getMyProfile(token),
        listMarketplaceListings(token, { mine: true, includeInactive: true, limit: 100 }),
      ]);
      setProfile(prof);
      setListings(list);
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadData(); }, [token]);

  const shop = profile?.shopProfile;

  function goTo(id: Section) {
    setSection(id);
    setSidebarOpen(false);
  }

  return (
    <AuthGate>
      <div className="min-h-screen -mx-4 -mt-5 sm:-mx-6 sm:-mt-7 lg:-mx-8 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

          {/* ── Top bar ────────────────────────────────────────── */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm text-slate-600"
              >
                ☰
              </button>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Kummpa Marketplace</p>
                <h1 className="text-lg font-black text-slate-900 leading-tight">Panel de tienda</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/marketplace" className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition shadow-sm">
                ← Marketplace
              </Link>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--primary))] text-white text-sm font-bold shadow-sm">
                {shop?.businessName?.[0] ?? session?.user.firstName?.[0] ?? "T"}
              </div>
            </div>
          </div>

          {/* ── Mobile sidebar overlay ─────────────────────────── */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
          )}
          <aside
            ref={sidebarRef}
            className={`fixed inset-y-0 left-0 z-40 w-56 overflow-y-auto bg-white shadow-xl transition-transform duration-200 lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
          >
            <div className="p-3 pt-16">
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Secciones</p>
              <nav className="space-y-0.5">
                {NAV.map(n => (
                  <button key={n.id} onClick={() => goTo(n.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition text-left ${section === n.id ? "bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))]" : "text-slate-600 hover:bg-slate-50"}`}>
                    <span className="text-base w-5 text-center shrink-0">{n.icon}</span>
                    {n.label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* ── Mobile nav pills ───────────────────────────────── */}
          <div className="lg:hidden mb-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <div className="flex gap-1.5 w-max">
              {NAV.map(n => (
                <button key={n.id} onClick={() => goTo(n.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${section === n.id ? "bg-[hsl(var(--primary))] text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
                  {n.icon} {n.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Desktop layout: sidebar + content ──────────────── */}
          <div className="flex gap-6">
            <aside className="hidden lg:flex w-52 shrink-0 flex-col">
              <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Secciones</p>
                <nav className="space-y-0.5">
                  {NAV.map(n => (
                    <button key={n.id} onClick={() => goTo(n.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition text-left ${section === n.id ? "bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))]" : "text-slate-600 hover:bg-slate-50"}`}>
                      <span className="text-base w-5 text-center shrink-0">{n.icon}</span>
                      {n.label}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* ── Shared content ───────────────────────────────── */}
            <main className="flex-1 min-w-0">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-white" />)}
                </div>
              ) : (
                <>
                  {section === "resumen" && <SectionResumen listings={listings} shop={shop} />}
                  {section === "tienda" && <SectionTienda shop={shop} accessToken={token} onSaved={() => void loadData()} />}
                  {section === "productos" && <SectionProductos listings={listings} accessToken={token} onRefresh={() => void loadData()} />}
                  {section === "categorias" && <SectionCategorias listings={listings} />}
                  {section === "inventario" && <SectionInventario listings={listings} />}
                  {section === "promociones" && <SectionPromociones />}
                  {section === "pagos" && <SectionPagos />}
                  {section === "envios" && <SectionEnvios />}
                  {section === "pedidos" && <SectionPedidos accessToken={token} />}
                  {section === "config" && <SectionConfig shop={shop} />}
                </>
              )}
            </main>
          </div>
        </div>
      </div>
    </AuthGate>
  );
}

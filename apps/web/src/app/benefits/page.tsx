"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { PageIntro } from "@/components/layout/page-intro";
import { useAuth } from "@/features/auth/auth-context";
import {
  createBenefit,
  listBenefits,
  listMyRedemptions,
  redeemBenefit,
  saveBenefit,
  unsaveBenefit,
  updateBenefit
} from "@/features/benefits/benefits-api";
import type { BenefitItem, BenefitProviderType, BenefitRedemptionItem } from "@/features/benefits/types";

const providerLabels: Record<BenefitProviderType, string> = {
  VET: "Veterinaria",
  CAREGIVER: "Cuidador",
  SHOP: "Pet shop",
  GROOMING: "Peluqueria",
  HOTEL: "Hotel/guarderia",
  OTHER: "Otro"
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", { dateStyle: "medium" });
}

export default function BenefitsPage() {
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;
  const isAdmin = session?.user.role === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [providerType, setProviderType] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [benefits, setBenefits] = useState<BenefitItem[]>([]);
  const [redemptions, setRedemptions] = useState<BenefitRedemptionItem[]>([]);

  const [newTitle, setNewTitle] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [newProviderType, setNewProviderType] = useState<BenefitProviderType>("OTHER");
  const [newCity, setNewCity] = useState("");
  const [newDistrict, setNewDistrict] = useState("");
  const [newValidFrom, setNewValidFrom] = useState("");
  const [newValidTo, setNewValidTo] = useState("");
  const [newDiscount, setNewDiscount] = useState("");
  const [newCouponCode, setNewCouponCode] = useState("");

  const loadBenefits = async () => {
    if (!accessToken) return;
    const rows = await listBenefits(accessToken, {
      q: q || undefined,
      city: city || undefined,
      district: district || undefined,
      providerType: (providerType || undefined) as BenefitProviderType | undefined,
      featuredOnly,
      savedOnly,
      activeOnly: false,
      validOnly: false,
      sortBy: "featured",
      limit: 80
    });
    setBenefits(rows);
  };

  const loadRedemptions = async () => {
    if (!accessToken) return;
    const rows = await listMyRedemptions(accessToken, { limit: 80 });
    setRedemptions(rows);
  };

  const loadAll = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadBenefits(), loadRedemptions()]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar beneficios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const handleFilterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWorkingId("search");
    setError(null);
    setSuccess(null);
    try {
      await loadBenefits();
    } catch (filterError) {
      setError(filterError instanceof Error ? filterError.message : "No se pudo filtrar beneficios.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleToggleSave = async (benefit: BenefitItem) => {
    if (!accessToken) return;
    setWorkingId(`save-${benefit.id}`);
    setError(null);
    setSuccess(null);
    try {
      if (benefit.viewer.isSaved) {
        await unsaveBenefit(accessToken, benefit.id);
      } else {
        await saveBenefit(accessToken, benefit.id);
      }
      await loadBenefits();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar beneficio.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleRedeem = async (benefit: BenefitItem) => {
    if (!accessToken) return;
    setWorkingId(`redeem-${benefit.id}`);
    setError(null);
    setSuccess(null);
    try {
      const redemption = await redeemBenefit(accessToken, benefit.id);
      await Promise.all([loadBenefits(), loadRedemptions()]);
      setSuccess(`Cupon activado: ${redemption.activationCode}`);
    } catch (redeemError) {
      setError(redeemError instanceof Error ? redeemError.message : "No se pudo canjear beneficio.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleCreateBenefit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !isAdmin) return;
    setWorkingId("create-benefit");
    setError(null);
    setSuccess(null);
    try {
      await createBenefit(accessToken, {
        title: newTitle,
        summary: newSummary,
        providerType: newProviderType,
        city: newCity || undefined,
        district: newDistrict || undefined,
        discountLabel: newDiscount || undefined,
        couponCode: newCouponCode || undefined,
        validFrom: new Date(newValidFrom).toISOString(),
        validTo: new Date(newValidTo).toISOString(),
        isFeatured: true,
        isActive: true
      });
      setNewTitle("");
      setNewSummary("");
      setNewCity("");
      setNewDistrict("");
      setNewDiscount("");
      setNewCouponCode("");
      setSuccess("Beneficio creado.");
      await loadBenefits();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear beneficio.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleToggleBenefitActive = async (benefit: BenefitItem) => {
    if (!accessToken || !isAdmin) return;
    setWorkingId(`active-${benefit.id}`);
    setError(null);
    setSuccess(null);
    try {
      await updateBenefit(accessToken, benefit.id, {
        isActive: !benefit.flags.isActive
      });
      await loadBenefits();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "No se pudo actualizar beneficio.");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <AuthGate>
      <div className="space-y-4">
        <PageIntro
          eyebrow="Convenios"
          title="Beneficios y convenios"
          description="Explora descuentos activables, cupones y alianzas del ecosistema pet con una capa visual mas alineada al producto."
          tone="community"
          metrics={[
            { value: String(benefits.length), label: "beneficios" },
            { value: String(redemptions.length), label: "cupones activos" }
          ]}
        />

        {error && <InlineBanner tone="error">{error}</InlineBanner>}
        {success && <InlineBanner tone="success">{success}</InlineBanner>}

        {loading ? (
          <div className="kumpa-panel p-6 text-sm text-slate-600">
            Cargando beneficios...
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_360px]">
            <aside className="space-y-4">
              <section className="kumpa-panel p-4">
                <h2 className="text-lg font-bold text-slate-900">Filtros</h2>
                <form className="mt-2 grid gap-2" onSubmit={(event) => void handleFilterSubmit(event)}>
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Buscar beneficio"
                  />
                  <input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Ciudad"
                  />
                  <input
                    value={district}
                    onChange={(event) => setDistrict(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Comuna"
                  />
                  <select
                    value={providerType}
                    onChange={(event) => setProviderType(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Todos los tipos</option>
                    {Object.entries(providerLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={featuredOnly}
                      onChange={(event) => setFeaturedOnly(event.target.checked)}
                    />
                    Solo destacados
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={savedOnly}
                      onChange={(event) => setSavedOnly(event.target.checked)}
                    />
                    Solo guardados
                  </label>
                  <button
                    type="submit"
                    disabled={workingId === "search"}
                    className="kumpa-button-primary"
                  >
                    {workingId === "search" ? "Buscando..." : "Aplicar filtros"}
                  </button>
                </form>
              </section>

              {isAdmin && (
                <section className="kumpa-panel p-4">
                  <h2 className="text-lg font-bold text-slate-900">Nuevo convenio (ADMIN)</h2>
                  <form className="mt-2 grid gap-2" onSubmit={(event) => void handleCreateBenefit(event)}>
                    <input
                      value={newTitle}
                      onChange={(event) => setNewTitle(event.target.value)}
                      required
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Titulo"
                    />
                    <textarea
                      value={newSummary}
                      onChange={(event) => setNewSummary(event.target.value)}
                      required
                      rows={3}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Resumen"
                    />
                    <select
                      value={newProviderType}
                      onChange={(event) => setNewProviderType(event.target.value as BenefitProviderType)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      {Object.entries(providerLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={newCity}
                      onChange={(event) => setNewCity(event.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Ciudad"
                    />
                    <input
                      value={newDistrict}
                      onChange={(event) => setNewDistrict(event.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Comuna"
                    />
                    <input
                      value={newDiscount}
                      onChange={(event) => setNewDiscount(event.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Etiqueta descuento (ej: 15% OFF)"
                    />
                    <input
                      value={newCouponCode}
                      onChange={(event) => setNewCouponCode(event.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Codigo base cupon"
                    />
                    <label className="text-xs font-semibold text-slate-700">Vigencia desde</label>
                    <input
                      type="datetime-local"
                      value={newValidFrom}
                      onChange={(event) => setNewValidFrom(event.target.value)}
                      required
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <label className="text-xs font-semibold text-slate-700">Vigencia hasta</label>
                    <input
                      type="datetime-local"
                      value={newValidTo}
                      onChange={(event) => setNewValidTo(event.target.value)}
                      required
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={workingId === "create-benefit"}
                      className="kumpa-button-primary"
                    >
                      {workingId === "create-benefit" ? "Guardando..." : "Crear beneficio"}
                    </button>
                  </form>
                </section>
              )}
            </aside>

            <section className="space-y-4">
              <section className="kumpa-panel p-4">
                <h2 className="text-lg font-bold text-slate-900">Beneficios disponibles</h2>
                <div className="mt-2 space-y-2">
                  {benefits.length === 0 ? (
                    <p className="text-sm text-slate-600">No hay beneficios para este filtro.</p>
                  ) : (
                    benefits.map((benefit) => (
                      <article key={benefit.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">{benefit.title}</h3>
                            <p className="text-xs text-slate-600">
                              {providerLabels[benefit.provider.type]} |{" "}
                              {benefit.provider.name ?? "Proveedor no informado"}
                            </p>
                          </div>
                          {benefit.discountLabel && (
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-800">
                              {benefit.discountLabel}
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-sm text-slate-700">{benefit.summary}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {benefit.location.city ?? "Sin ciudad"} | {benefit.location.district ?? "Sin comuna"} |{" "}
                          Vigente hasta {formatDate(benefit.validity.validTo)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Estado: {benefit.validity.status} | Guardados: {benefit.stats.savesCount} |
                          Canjes: {benefit.stats.redemptionsCount}
                        </p>

                        {benefit.viewer.redemption && (
                          <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-700">
                            Cupón activo: <strong>{benefit.viewer.redemption.activationCode}</strong>
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={workingId === `save-${benefit.id}`}
                            onClick={() => {
                              void handleToggleSave(benefit);
                            }}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
                          >
                            {benefit.viewer.isSaved ? "Quitar guardado" : "Guardar"}
                          </button>

                          <button
                            type="button"
                            disabled={!benefit.viewer.canRedeem || workingId === `redeem-${benefit.id}`}
                            onClick={() => {
                              void handleRedeem(benefit);
                            }}
                            className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-60"
                          >
                            {workingId === `redeem-${benefit.id}` ? "Canjeando..." : "Canjear cupón"}
                          </button>

                          {isAdmin && (
                            <button
                              type="button"
                              disabled={workingId === `active-${benefit.id}`}
                              onClick={() => {
                                void handleToggleBenefitActive(benefit);
                              }}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
                            >
                              {benefit.flags.isActive ? "Desactivar" : "Activar"}
                            </button>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </section>

            <aside className="space-y-4">
              <section className="kumpa-panel p-4">
                <h2 className="text-lg font-bold text-slate-900">Mis cupones activos</h2>
                <div className="mt-2 max-h-[560px] space-y-2 overflow-y-auto pr-1">
                  {redemptions.length === 0 ? (
                    <p className="text-xs text-slate-600">Aun no tienes cupones activados.</p>
                  ) : (
                    redemptions.map((item) => (
                      <article key={item.id} className="rounded-xl border border-slate-200 p-3">
                        <p className="text-sm font-semibold text-slate-900">{item.benefit.title}</p>
                        <p className="mt-1 rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-700">
                          Codigo: <strong>{item.activationCode}</strong>
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          Estado: {item.status} | Expira: {formatDate(item.expiresAt)}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {providerLabels[item.benefit.provider.type]} |{" "}
                          {item.benefit.provider.name ?? "Proveedor no informado"}
                        </p>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </AuthGate>
  );
}


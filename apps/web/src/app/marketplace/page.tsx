"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthGate } from "@/components/auth/auth-gate";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { PageIntro } from "@/components/layout/page-intro";
import { useAuth } from "@/features/auth/auth-context";
import {
  createMarketplaceListing,
  createMarketplaceMessage,
  createMarketplaceReport,
  favoriteMarketplaceListing,
  featureMarketplaceListing,
  getMarketplaceListing,
  listMarketplaceConversationMessages,
  listMarketplaceConversations,
  listMarketplaceListings,
  listMarketplaceReports,
  removeMarketplaceListing,
  reviewMarketplaceReport,
  startMarketplaceConversation,
  unfavoriteMarketplaceListing,
  updateMarketplaceListing
} from "@/features/marketplace/marketplace-api";
import type {
  MarketplaceCategory,
  MarketplaceConversationMessages,
  MarketplaceListing,
  MarketplaceReport
} from "@/features/marketplace/types";

const CATEGORY_LABELS: Record<MarketplaceCategory, string> = {
  BED: "Camas",
  CARRIER: "Transportadoras",
  TOY: "Juguetes",
  LEASH: "Correas",
  CAGE: "Jaulas",
  CLOTHES: "Ropa",
  FEEDER: "Comederos",
  ACCESSORY: "Accesorios",
  OTHER: "Otros"
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 })
    .format(priceCents / 100);
}

function parseMaybeNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function MarketplacePage() {
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;
  const isAdmin = session?.user.role === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [district, setDistrict] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriceCents, setNewPriceCents] = useState("");
  const [newCategory, setNewCategory] = useState<MarketplaceCategory>("ACCESSORY");
  const [newCondition, setNewCondition] = useState<"NEW" | "USED">("USED");
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newDistrict, setNewDistrict] = useState("");

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [selectedListingId, setSelectedListingId] = useState("");
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);

  const [conversation, setConversation] = useState<MarketplaceConversationMessages | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [reports, setReports] = useState<MarketplaceReport[]>([]);

  const loadReports = async () => {
    if (!accessToken || !isAdmin) return;
    const rows = await listMarketplaceReports(accessToken, { openOnly: false, limit: 80 });
    setReports(rows);
  };

  const loadListingDetail = async (listingId: string) => {
    if (!accessToken) return;
    const detail = await getMarketplaceListing(accessToken, listingId);
    setSelectedListing(detail);
    setSelectedListingId(detail.id);
  };

  const loadListings = async (listingIdToSelect?: string) => {
    if (!accessToken) return;
    const rows = await listMarketplaceListings(accessToken, {
      q: query || undefined,
      category: (category || undefined) as MarketplaceCategory | undefined,
      condition: (condition || undefined) as "NEW" | "USED" | undefined,
      district: district || undefined,
      priceMin: parseMaybeNumber(priceMin),
      priceMax: parseMaybeNumber(priceMax),
      mine: mineOnly,
      favoritesOnly,
      sortBy: "recent",
      limit: 50
    });

    setListings(rows);
    const nextId = listingIdToSelect ?? rows[0]?.id ?? "";
    if (nextId) {
      await loadListingDetail(nextId);
    } else {
      setSelectedListingId("");
      setSelectedListing(null);
    }
  };

  const loadAll = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      await loadListings();
      await loadReports();
      const conversations = await listMarketplaceConversations(accessToken, { limit: 1 });
      if (conversations[0]) {
        const detail = await listMarketplaceConversationMessages(accessToken, conversations[0].id, 80);
        setConversation(detail);
      } else {
        setConversation(null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar marketplace.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const refreshSelected = async () => {
    if (!selectedListingId) return;
    await loadListingDetail(selectedListingId);
  };

  const handleFilterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWorking("filters");
    setError(null);
    setSuccess(null);
    try {
      await loadListings();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo filtrar.");
    } finally {
      setWorking(null);
    }
  };

  const handleCreateListing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;
    setWorking("create");
    setError(null);
    setSuccess(null);
    try {
      const created = await createMarketplaceListing(accessToken, {
        title: newTitle,
        description: newDescription,
        priceCents: Math.trunc(Number(newPriceCents)),
        condition: newCondition,
        category: newCategory,
        photoUrls: [newPhotoUrl],
        district: newDistrict || undefined
      });
      setSuccess("Publicacion creada.");
      setNewTitle("");
      setNewDescription("");
      setNewPriceCents("");
      setNewPhotoUrl("");
      setNewDistrict("");
      await loadListings(created.id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear publicacion.");
    } finally {
      setWorking(null);
    }
  };

  const toggleFavorite = async (listing: MarketplaceListing) => {
    if (!accessToken) return;
    setWorking(`fav-${listing.id}`);
    try {
      if (listing.viewer.isFavorite) {
        await unfavoriteMarketplaceListing(accessToken, listing.id);
      } else {
        await favoriteMarketplaceListing(accessToken, listing.id);
      }
      await loadListings(selectedListingId || listing.id);
      await refreshSelected();
    } catch (favoriteError) {
      setError(favoriteError instanceof Error ? favoriteError.message : "No se pudo actualizar favorito.");
    } finally {
      setWorking(null);
    }
  };

  const openChat = async (listing: MarketplaceListing) => {
    if (!accessToken) return;
    setWorking(`chat-${listing.id}`);
    try {
      const existingConversationId = listing.viewer.conversationId;
      const conversationId = existingConversationId
        ? existingConversationId
        : (
            await startMarketplaceConversation(
              accessToken,
              listing.id,
              window.prompt("Mensaje inicial (opcional):") ?? undefined
            )
          ).id;
      const detail = await listMarketplaceConversationMessages(accessToken, conversationId, 80);
      setConversation(detail);
      await loadListings(selectedListingId || listing.id);
      await refreshSelected();
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "No se pudo abrir chat.");
    } finally {
      setWorking(null);
    }
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !conversation || !messageBody.trim()) return;
    setWorking("send-message");
    try {
      await createMarketplaceMessage(accessToken, conversation.conversation.id, messageBody);
      const detail = await listMarketplaceConversationMessages(
        accessToken,
        conversation.conversation.id,
        80
      );
      setConversation(detail);
      setMessageBody("");
    } catch (messageError) {
      setError(messageError instanceof Error ? messageError.message : "No se pudo enviar mensaje.");
    } finally {
      setWorking(null);
    }
  };

  const reportListing = async (listingId: string) => {
    if (!accessToken) return;
    const reason = window.prompt("Motivo del reporte (min. 10 caracteres):");
    if (!reason) return;
    setWorking(`report-${listingId}`);
    try {
      await createMarketplaceReport(accessToken, { listingId, reason });
      setSuccess("Reporte enviado.");
      await loadReports();
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "No se pudo reportar.");
    } finally {
      setWorking(null);
    }
  };

  const featureListing = async (listing: MarketplaceListing) => {
    if (!accessToken) return;
    setWorking(`feature-${listing.id}`);
    try {
      await featureMarketplaceListing(accessToken, listing.id, 7);
      setSuccess("Publicacion destacada por 7 dias.");
      await loadListings(listing.id);
      await refreshSelected();
    } catch (featureError) {
      setError(featureError instanceof Error ? featureError.message : "No se pudo destacar.");
    } finally {
      setWorking(null);
    }
  };

  const toggleActive = async (listing: MarketplaceListing) => {
    if (!accessToken) return;
    setWorking(`active-${listing.id}`);
    try {
      await updateMarketplaceListing(accessToken, listing.id, { isActive: !listing.isActive });
      await loadListings(listing.id);
      await refreshSelected();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo actualizar estado.");
    } finally {
      setWorking(null);
    }
  };

  const removeListing = async (listing: MarketplaceListing) => {
    if (!accessToken) return;
    if (!window.confirm("Eliminar publicacion?")) return;
    setWorking(`remove-${listing.id}`);
    try {
      await removeMarketplaceListing(accessToken, listing.id);
      setSuccess("Publicacion eliminada.");
      await loadListings();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "No se pudo eliminar.");
    } finally {
      setWorking(null);
    }
  };

  const reviewReport = async (reportId: string, status: "REVIEWED" | "DISMISSED") => {
    if (!accessToken) return;
    setWorking(`review-${reportId}`);
    try {
      await reviewMarketplaceReport(accessToken, reportId, { status });
      await loadReports();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "No se pudo revisar reporte.");
    } finally {
      setWorking(null);
    }
  };

  return (
    <AuthGate>
      <div className="space-y-4">
        <PageIntro
          eyebrow="Comercio"
          title="Marketplace pet"
          description="Publicaciones nuevas y usadas, favoritos, chat comprador-vendedor y moderacion con una interfaz mas coherente y clara."
          tone="community"
          metrics={[
            { value: String(listings.length), label: "publicaciones" },
            { value: conversation ? "1" : "0", label: "chat activo" }
          ]}
        />
        <div className="flex justify-end">
          <Link href="/marketplace/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition">
            🏪 Panel de mi tienda
          </Link>
        </div>
        {error && <InlineBanner tone="error">{error}</InlineBanner>}
        {success && <InlineBanner tone="success">{success}</InlineBanner>}

        {loading ? (
          <div className="kumpa-panel p-6 text-sm text-slate-600">Cargando...</div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)_360px]">
            <aside className="space-y-4">
              <section className="kumpa-panel p-4">
                <h2 className="text-lg font-bold text-slate-900">Filtros</h2>
                <form className="mt-2 grid gap-2" onSubmit={(event) => void handleFilterSubmit(event)}>
                  <input value={query} onChange={(event) => setQuery(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Busqueda" />
                  <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">Todas las categorias</option>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <select value={condition} onChange={(event) => setCondition(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">Nuevo o usado</option>
                    <option value="NEW">Nuevo</option>
                    <option value="USED">Usado</option>
                  </select>
                  <input value={district} onChange={(event) => setDistrict(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Comuna" />
                  <input value={priceMin} onChange={(event) => setPriceMin(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Precio minimo (centavos)" />
                  <input value={priceMax} onChange={(event) => setPriceMax(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Precio maximo (centavos)" />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mineOnly} onChange={(event) => setMineOnly(event.target.checked)} />Solo mis publicaciones</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={favoritesOnly} onChange={(event) => setFavoritesOnly(event.target.checked)} />Solo favoritos</label>
                  <button disabled={working === "filters"} className="kumpa-button-primary">{working === "filters" ? "Buscando..." : "Aplicar filtros"}</button>
                </form>
              </section>

              <section className="kumpa-panel p-4">
                <h2 className="text-lg font-bold text-slate-900">Nueva publicacion</h2>
                <form className="mt-2 grid gap-2" onSubmit={(event) => void handleCreateListing(event)}>
                  <input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Titulo" />
                  <textarea value={newDescription} onChange={(event) => setNewDescription(event.target.value)} required rows={3} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Descripcion" />
                  <input value={newPriceCents} onChange={(event) => setNewPriceCents(event.target.value)} required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Precio en centavos" />
                  <select value={newCondition} onChange={(event) => setNewCondition(event.target.value as "NEW" | "USED")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="NEW">Nuevo</option><option value="USED">Usado</option></select>
                  <select value={newCategory} onChange={(event) => setNewCategory(event.target.value as MarketplaceCategory)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">{Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                  <input value={newPhotoUrl} onChange={(event) => setNewPhotoUrl(event.target.value)} required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="URL foto principal" />
                  <input value={newDistrict} onChange={(event) => setNewDistrict(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Comuna" />
                  <button disabled={working === "create"} className="kumpa-button-primary">{working === "create" ? "Publicando..." : "Crear publicacion"}</button>
                </form>
              </section>
            </aside>

            <section className="space-y-4">
              <section className="kumpa-panel p-4">
                <h2 className="text-lg font-bold text-slate-900">Publicaciones</h2>
                <div className="mt-2 space-y-2">
                  {listings.map((listing) => (
                    <button key={listing.id} type="button" onClick={() => void loadListingDetail(listing.id)} className={`w-full rounded-xl border p-3 text-left ${listing.id === selectedListingId ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"}`}>
                      <div className="flex items-center justify-between gap-2"><p className="text-sm font-bold">{listing.title}</p><p className="text-sm font-bold">{formatPrice(listing.priceCents)}</p></div>
                      <p className="mt-1 text-xs text-slate-600">{CATEGORY_LABELS[listing.category]} | {listing.condition} | {listing.district ?? "Sin comuna"}</p>
                    </button>
                  ))}
                </div>
              </section>

              {selectedListing && (
                <section className="kumpa-panel p-4">
                  <h3 className="text-xl font-black text-slate-900">{selectedListing.title}</h3>
                  <p className="text-xs text-slate-600">{formatPrice(selectedListing.priceCents)} | {selectedListing.seller.fullName}</p>
                  <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{selectedListing.description}</p>
                  <p className="mt-2 text-xs text-slate-600">Comuna: {selectedListing.district ?? "Sin comuna"} | Favoritos: {selectedListing.stats.favoritesCount}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!selectedListing.viewer.isSeller && <button disabled={working === `fav-${selectedListing.id}`} onClick={() => void toggleFavorite(selectedListing)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold">{selectedListing.viewer.isFavorite ? "Quitar favorito" : "Agregar favorito"}</button>}
                    {selectedListing.viewer.canChat && <button disabled={working === `chat-${selectedListing.id}`} onClick={() => void openChat(selectedListing)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold">Chat</button>}
                    {!selectedListing.viewer.isSeller && <button disabled={working === `report-${selectedListing.id}`} onClick={() => void reportListing(selectedListing.id)} className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700">Reportar</button>}
                    {selectedListing.viewer.canFeature && <button disabled={working === `feature-${selectedListing.id}`} onClick={() => void featureListing(selectedListing)} className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700">Destacar</button>}
                    {selectedListing.viewer.canEdit && <button disabled={working === `active-${selectedListing.id}`} onClick={() => void toggleActive(selectedListing)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold">{selectedListing.isActive ? "Desactivar" : "Activar"}</button>}
                    {selectedListing.viewer.canEdit && <button disabled={working === `remove-${selectedListing.id}`} onClick={() => void removeListing(selectedListing)} className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700">Eliminar</button>}
                  </div>
                </section>
              )}
            </section>

            <aside className="space-y-4">
              <section className="kumpa-panel p-4">
                <h2 className="text-lg font-bold text-slate-900">Chat activo</h2>
                {conversation ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-slate-600">{conversation.conversation.listing.title}</p>
                    <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-2">
                      {conversation.messages.map((item) => <p key={item.id} className={`rounded-lg px-2 py-1 text-xs ${item.isMine ? "bg-slate-900 text-white ml-8" : "bg-white text-slate-800 mr-8"}`}>{item.sender.fullName}: {item.body}</p>)}
                    </div>
                    {conversation.conversation.viewer.canSend && (
                      <form className="grid gap-2" onSubmit={(event) => void sendMessage(event)}>
                        <textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} rows={3} required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Escribe mensaje" />
                        <button disabled={working === "send-message"} className="kumpa-button-primary">{working === "send-message" ? "Enviando..." : "Enviar"}</button>
                      </form>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-600">Sin conversaciones.</p>
                )}
              </section>

              {isAdmin && (
                <section className="kumpa-panel p-4">
                  <h2 className="text-lg font-bold text-slate-900">Moderacion</h2>
                  <div className="mt-2 max-h-80 space-y-2 overflow-y-auto">
                    {reports.map((report) => (
                      <article key={report.id} className="rounded-xl border border-slate-200 p-3">
                        <p className="text-xs font-semibold text-slate-800">{report.status} | {report.listing.title}</p>
                        <p className="mt-1 text-xs text-slate-700">{report.reason}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{report.reporter.fullName} | {formatDate(report.createdAt)}</p>
                        {report.status === "OPEN" && (
                          <div className="mt-2 flex gap-1.5">
                            <button disabled={working === `review-${report.id}`} onClick={() => void reviewReport(report.id, "REVIEWED")} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700">Revisado</button>
                            <button disabled={working === `review-${report.id}`} onClick={() => void reviewReport(report.id, "DISMISSED")} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">Descartar</button>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </aside>
          </div>
        )}
      </div>
    </AuthGate>
  );
}


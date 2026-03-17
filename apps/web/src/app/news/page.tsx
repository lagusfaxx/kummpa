"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { PageIntro } from "@/components/layout/page-intro";
import { useAuth } from "@/features/auth/auth-context";
import {
  createNewsArticle,
  getNewsArticle,
  listNewsArticles,
  listNewsCategories,
  listSavedNewsArticles,
  saveNewsArticle,
  shareNewsArticle,
  unsaveNewsArticle
} from "@/features/news/news-api";
import type { NewsArticleDetail, NewsArticleListItem, NewsCategory, NewsCategoryStat } from "@/features/news/types";

const NEWS_CATEGORIES: NewsCategory[] = [
  "FOOD",
  "GADGETS",
  "VET_NEWS",
  "HEALTH_TIPS",
  "PET_EVENTS",
  "HEALTH_ALERTS",
  "ADOPTION",
  "OTHER"
];

const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  FOOD: "Alimentos nuevos",
  GADGETS: "Gadgets pet",
  VET_NEWS: "Novedades veterinarias",
  HEALTH_TIPS: "Consejos de salud",
  PET_EVENTS: "Eventos pet-friendly",
  HEALTH_ALERTS: "Alertas sanitarias",
  ADOPTION: "Adopcion",
  OTHER: "Otros"
};

function formatDate(iso?: string | null) {
  if (!iso) return "Sin fecha";
  return new Date(iso).toLocaleDateString("es-CL", { dateStyle: "medium" });
}

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function NewsPage() {
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;
  const isAdmin = session?.user.role === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);

  const [categories, setCategories] = useState<NewsCategoryStat[]>([]);
  const [articles, setArticles] = useState<NewsArticleListItem[]>([]);
  const [savedArticles, setSavedArticles] = useState<NewsArticleListItem[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<NewsArticleDetail | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newExcerpt, setNewExcerpt] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState<NewsCategory>("OTHER");
  const [newTags, setNewTags] = useState("");
  const [newCoverImageUrl, setNewCoverImageUrl] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newIsFeatured, setNewIsFeatured] = useState(false);

  const loadArticleDetail = async (articleId: string) => {
    if (!accessToken) return;
    const detail = await getNewsArticle(accessToken, articleId);
    setSelectedArticle(detail);
    setSelectedArticleId(detail.id);
  };

  const loadArticles = async (articleIdToSelect?: string) => {
    if (!accessToken) return;
    const rows = await listNewsArticles(accessToken, {
      q: q || undefined,
      category: (categoryFilter || undefined) as NewsCategory | undefined,
      featuredOnly,
      savedOnly,
      publishedOnly: true,
      sortBy: "featured",
      limit: 80
    });
    setArticles(rows);

    const nextId = articleIdToSelect ?? rows[0]?.id ?? "";
    if (nextId) {
      await loadArticleDetail(nextId);
    } else {
      setSelectedArticleId("");
      setSelectedArticle(null);
    }
  };

  const loadSavedArticles = async () => {
    if (!accessToken) return;
    const rows = await listSavedNewsArticles(accessToken);
    setSavedArticles(rows);
  };

  const loadCategories = async () => {
    if (!accessToken) return;
    const rows = await listNewsCategories(accessToken);
    setCategories(rows);
  };

  const loadAll = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadCategories(), loadArticles(), loadSavedArticles()]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar noticias.");
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
      await loadArticles();
    } catch (filterError) {
      setError(filterError instanceof Error ? filterError.message : "No se pudo filtrar noticias.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleToggleSave = async (article: NewsArticleListItem) => {
    if (!accessToken) return;
    setWorkingId(`save-${article.id}`);
    setError(null);
    setSuccess(null);
    try {
      if (article.viewer.isSaved) {
        await unsaveNewsArticle(accessToken, article.id);
      } else {
        await saveNewsArticle(accessToken, article.id);
      }
      await Promise.all([loadArticles(selectedArticleId || article.id), loadSavedArticles()]);
      if (selectedArticleId) {
        await loadArticleDetail(selectedArticleId);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la noticia.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleShare = async (articleId: string) => {
    if (!accessToken) return;
    const channel = window.prompt("Canal de compartido (ej: whatsapp, instagram, internal):") ?? "internal";
    setWorkingId(`share-${articleId}`);
    setError(null);
    setSuccess(null);
    try {
      const shared = await shareNewsArticle(accessToken, articleId, channel.trim() || "internal");
      setSuccess(`Compartido por ${shared.channel}. Total shares: ${shared.sharesCount}`);
      await loadArticles(selectedArticleId || articleId);
      if (selectedArticleId) {
        await loadArticleDetail(selectedArticleId);
      }
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : "No se pudo compartir la noticia.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleCreateArticle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !isAdmin) return;
    setWorkingId("create-article");
    setError(null);
    setSuccess(null);
    try {
      const created = await createNewsArticle(accessToken, {
        title: newTitle,
        slug: newSlug || slugify(newTitle),
        excerpt: newExcerpt,
        body: newBody,
        category: newCategory,
        tags: newTags
          .split(",")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
        coverImageUrl: newCoverImageUrl || undefined,
        sourceUrl: newSourceUrl || undefined,
        isFeatured: newIsFeatured,
        isPublished: true,
        publishedAt: new Date().toISOString()
      });
      setSuccess("Articulo creado.");
      setNewTitle("");
      setNewSlug("");
      setNewExcerpt("");
      setNewBody("");
      setNewCategory("OTHER");
      setNewTags("");
      setNewCoverImageUrl("");
      setNewSourceUrl("");
      setNewIsFeatured(false);
      await Promise.all([loadCategories(), loadArticles(created.id)]);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear articulo.");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <AuthGate>
      <div className="space-y-4">
        <PageIntro
          eyebrow="Novedades"
          title="Noticias y novedades"
          description="Sigue alimentos, gadgets, salud veterinaria, eventos pet-friendly y alertas sanitarias con una presentacion editorial mas consistente."
          tone="community"
          metrics={[
            { value: String(articles.length), label: "articulos" },
            { value: String(savedArticles.length), label: "guardadas" }
          ]}
        />

        {error && <InlineBanner tone="error">{error}</InlineBanner>}
        {success && <InlineBanner tone="success">{success}</InlineBanner>}

        {loading ? (
          <div className="kumpa-panel p-6 text-sm text-slate-600">
            Cargando noticias...
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
                    placeholder="Buscar en noticias"
                  />
                  <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Todas las categorias</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={featuredOnly}
                      onChange={(event) => setFeaturedOnly(event.target.checked)}
                    />
                    Solo destacadas
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={savedOnly}
                      onChange={(event) => setSavedOnly(event.target.checked)}
                    />
                    Solo guardadas
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
                  <h2 className="text-lg font-bold text-slate-900">Nuevo articulo (ADMIN)</h2>
                  <form className="mt-2 grid gap-2" onSubmit={(event) => void handleCreateArticle(event)}>
                    <input
                      value={newTitle}
                      onChange={(event) => setNewTitle(event.target.value)}
                      required
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Titulo"
                    />
                    <input
                      value={newSlug}
                      onChange={(event) => setNewSlug(event.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Slug (opcional)"
                    />
                    <textarea
                      value={newExcerpt}
                      onChange={(event) => setNewExcerpt(event.target.value)}
                      required
                      rows={2}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Extracto"
                    />
                    <textarea
                      value={newBody}
                      onChange={(event) => setNewBody(event.target.value)}
                      required
                      rows={5}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Contenido"
                    />
                    <select
                      value={newCategory}
                      onChange={(event) => setNewCategory(event.target.value as NewsCategory)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      {NEWS_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {NEWS_CATEGORY_LABELS[category]}
                        </option>
                      ))}
                    </select>
                    <input
                      value={newTags}
                      onChange={(event) => setNewTags(event.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Tags separados por coma"
                    />
                    <input
                      value={newCoverImageUrl}
                      onChange={(event) => setNewCoverImageUrl(event.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="URL imagen de portada"
                    />
                    <input
                      value={newSourceUrl}
                      onChange={(event) => setNewSourceUrl(event.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="URL fuente"
                    />
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={newIsFeatured}
                        onChange={(event) => setNewIsFeatured(event.target.checked)}
                      />
                      Destacada
                    </label>
                    <button
                      type="submit"
                      disabled={workingId === "create-article"}
                      className="kumpa-button-primary"
                    >
                      {workingId === "create-article" ? "Guardando..." : "Crear articulo"}
                    </button>
                  </form>
                </section>
              )}
            </aside>

            <section className="space-y-4">
              <section className="kumpa-panel p-4">
                <h2 className="text-lg font-bold text-slate-900">Articulos</h2>
                <div className="mt-2 space-y-2">
                  {articles.length === 0 ? (
                    <p className="text-sm text-slate-600">No hay articulos para este filtro.</p>
                  ) : (
                    articles.map((article) => (
                      <button
                        key={article.id}
                        type="button"
                        onClick={() => {
                          void loadArticleDetail(article.id);
                        }}
                        className={`w-full rounded-xl border p-3 text-left ${
                          article.id === selectedArticleId
                            ? "border-slate-900 bg-slate-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900">{article.title}</p>
                          {article.flags.isFeatured && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                              Destacada
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          {article.category.label} | {formatDate(article.publishedAt)}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-700">{article.excerpt}</p>
                      </button>
                    ))
                  )}
                </div>
              </section>

              {selectedArticle ? (
                <section className="kumpa-panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">{selectedArticle.title}</h3>
                      <p className="text-xs text-slate-600">
                        {selectedArticle.category.label} | {formatDate(selectedArticle.publishedAt)}
                      </p>
                    </div>
                  </div>

                  {selectedArticle.coverImageUrl && (
                    <img
                      src={selectedArticle.coverImageUrl}
                      alt={selectedArticle.title}
                      className="mt-3 h-56 w-full rounded-xl border border-slate-200 object-cover"
                    />
                  )}

                  <p className="mt-3 text-sm font-semibold text-slate-800">{selectedArticle.excerpt}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{selectedArticle.body}</p>

                  {selectedArticle.tags.length > 0 && (
                    <p className="mt-2 text-xs text-slate-600">Tags: #{selectedArticle.tags.join(" #")}</p>
                  )}

                  <p className="mt-1 text-xs text-slate-500">
                    Guardados: {selectedArticle.stats.savesCount} | Compartidos:{" "}
                    {selectedArticle.stats.sharesCount}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={workingId === `save-${selectedArticle.id}`}
                      onClick={() => {
                        void handleToggleSave(selectedArticle);
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
                    >
                      {selectedArticle.viewer.isSaved ? "Quitar guardado" : "Guardar"}
                    </button>
                    <button
                      type="button"
                      disabled={workingId === `share-${selectedArticle.id}`}
                      onClick={() => {
                        void handleShare(selectedArticle.id);
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
                    >
                      {workingId === `share-${selectedArticle.id}` ? "Compartiendo..." : "Compartir"}
                    </button>
                    {selectedArticle.sourceUrl && (
                      <a
                        href={selectedArticle.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                      >
                        Ver fuente
                      </a>
                    )}
                  </div>
                </section>
              ) : (
                <section className="kumpa-panel p-6 text-sm text-slate-600">
                  Selecciona un articulo para ver el detalle.
                </section>
              )}
            </section>

            <aside className="space-y-4">
              <section className="kumpa-panel p-4">
                <h2 className="text-lg font-bold text-slate-900">Categorias</h2>
                <div className="mt-2 space-y-2">
                  {categories.map((category) => (
                    <div key={category.id} className="rounded-xl border border-slate-200 p-3">
                      <p className="text-sm font-semibold text-slate-900">{category.label}</p>
                      <p className="text-xs text-slate-600">{category.articlesCount} articulos</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="kumpa-panel p-4">
                <h2 className="text-lg font-bold text-slate-900">Guardadas</h2>
                <div className="mt-2 max-h-80 space-y-2 overflow-y-auto pr-1">
                  {savedArticles.length === 0 ? (
                    <p className="text-xs text-slate-600">No tienes noticias guardadas.</p>
                  ) : (
                    savedArticles.map((article) => (
                      <button
                        key={article.id}
                        type="button"
                        onClick={() => {
                          void loadArticleDetail(article.id);
                        }}
                        className="w-full rounded-xl border border-slate-200 p-3 text-left"
                      >
                        <p className="text-xs font-semibold text-slate-900">{article.title}</p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {article.category.label} | {formatDate(article.publishedAt)}
                        </p>
                      </button>
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


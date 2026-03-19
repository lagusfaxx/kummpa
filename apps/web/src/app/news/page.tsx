"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/features/auth/auth-context";
import {
  createNewsArticle,
  listNewsArticles,
  listNewsCategories
} from "@/features/news/news-api";
import type { NewsArticleListItem, NewsCategory, NewsCategoryStat } from "@/features/news/types";

const CATEGORY_COLORS: Record<NewsCategory, string> = {
  FOOD: "bg-emerald-100 text-emerald-800",
  GADGETS: "bg-blue-100 text-blue-800",
  VET_NEWS: "bg-violet-100 text-violet-800",
  HEALTH_TIPS: "bg-teal-100 text-teal-800",
  PET_EVENTS: "bg-orange-100 text-orange-800",
  HEALTH_ALERTS: "bg-red-100 text-red-800",
  ADOPTION: "bg-pink-100 text-pink-800",
  OTHER: "bg-slate-100 text-slate-700"
};

const NEWS_CATEGORIES: NewsCategory[] = [
  "FOOD", "GADGETS", "VET_NEWS", "HEALTH_TIPS",
  "PET_EVENTS", "HEALTH_ALERTS", "ADOPTION", "OTHER"
];

const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  FOOD: "Alimentos",
  GADGETS: "Gadgets",
  VET_NEWS: "Veterinaria",
  HEALTH_TIPS: "Salud",
  PET_EVENTS: "Eventos",
  HEALTH_ALERTS: "Alertas",
  ADOPTION: "Adopción",
  OTHER: "Otros"
};

function formatDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-CL", { dateStyle: "medium" });
}

function slugify(input: string) {
  return input
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function CategoryChip({ cat, active, onClick }: { cat: NewsCategory; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all ${
        active
          ? "bg-[hsl(var(--primary))] text-white shadow-sm"
          : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800"
      }`}
    >
      {NEWS_CATEGORY_LABELS[cat]}
    </button>
  );
}

function FeaturedCard({ article }: { article: NewsArticleListItem }) {
  return (
    <Link href={`/news/${article.id}`} className="group relative block h-[360px] overflow-hidden bg-slate-900 sm:h-[420px]">
      {article.coverImageUrl ? (
        <img
          src={article.coverImageUrl}
          alt={article.title}
          className="absolute inset-0 h-full w-full object-cover opacity-55 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-65"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(164_40%_28%)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
        <span className={`mb-3 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${CATEGORY_COLORS[article.category.id]}`}>
          {article.category.label}
        </span>
        <h2 className="font-display text-2xl font-black leading-tight text-white sm:text-3xl">
          {article.title}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/75">
          {article.excerpt}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-white/50">{formatDate(article.publishedAt)}</span>
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-white/90">
            Leer artículo
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

function ArticleCard({ article }: { article: NewsArticleListItem }) {
  return (
    <Link href={`/news/${article.id}`} className="group flex flex-col overflow-hidden border border-slate-200 bg-white transition-all hover:border-slate-300 hover:shadow-md">
      <div className="h-44 overflow-hidden bg-slate-100">
        {article.coverImageUrl ? (
          <img
            src={article.coverImageUrl}
            alt={article.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <span className="text-3xl text-slate-300 select-none">K</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${CATEGORY_COLORS[article.category.id]}`}>
            {article.category.label}
          </span>
          {article.flags.isFeatured && (
            <span className="text-[10px] font-semibold text-amber-500">Destacada</span>
          )}
        </div>
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-slate-900">
          {article.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-slate-500">
          {article.excerpt}
        </p>
        <p className="mt-3 text-xs text-slate-400">{formatDate(article.publishedAt)}</p>
      </div>
    </Link>
  );
}

export default function NewsPage() {
  const router = useRouter();
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;
  const isAdmin = session?.user.role === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<NewsCategory | "">("");
  const [categories, setCategories] = useState<NewsCategoryStat[]>([]);
  const [articles, setArticles] = useState<NewsArticleListItem[]>([]);

  const [showAdmin, setShowAdmin] = useState(false);
  const [working, setWorking] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newExcerpt, setNewExcerpt] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState<NewsCategory>("OTHER");
  const [newTags, setNewTags] = useState("");
  const [newCoverImageUrl, setNewCoverImageUrl] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newIsFeatured, setNewIsFeatured] = useState(false);

  const loadArticles = async (cat?: NewsCategory | "") => {
    if (!accessToken) return;
    const rows = await listNewsArticles(accessToken, {
      q: q || undefined,
      category: ((cat ?? categoryFilter) || undefined) as NewsCategory | undefined,
      publishedOnly: true,
      sortBy: "featured",
      limit: 80
    });
    setArticles(rows);
  };

  const loadAll = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [cats] = await Promise.all([
        listNewsCategories(accessToken),
        loadArticles()
      ]);
      setCategories(cats);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadAll(); }, [accessToken]);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try { await loadArticles(); } finally { setLoading(false); }
  };

  const handleCategoryClick = async (cat: NewsCategory | "") => {
    const next = cat === categoryFilter ? "" : cat;
    setCategoryFilter(next);
    setLoading(true);
    try { await loadArticles(next); } finally { setLoading(false); }
  };

  const handleCreateArticle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !isAdmin) return;
    setWorking(true);
    setAdminError(null);
    try {
      const created = await createNewsArticle(accessToken, {
        title: newTitle,
        slug: newSlug || slugify(newTitle),
        excerpt: newExcerpt,
        body: newBody,
        category: newCategory,
        tags: newTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
        coverImageUrl: newCoverImageUrl || undefined,
        sourceUrl: newSourceUrl || undefined,
        isFeatured: newIsFeatured,
        isPublished: true,
        publishedAt: new Date().toISOString()
      });
      setNewTitle(""); setNewSlug(""); setNewExcerpt(""); setNewBody("");
      setNewCategory("OTHER"); setNewTags(""); setNewCoverImageUrl("");
      setNewSourceUrl(""); setNewIsFeatured(false);
      await loadAll();
      router.push(`/news/${created.id}`);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Error al crear artículo.");
    } finally {
      setWorking(false);
    }
  };

  const featured = articles.filter((a) => a.flags.isFeatured);
  const heroArticle = featured[0] ?? articles[0];
  const gridArticles = articles.filter((a) => a.id !== heroArticle?.id);

  return (
    <AuthGate>
      <div className="space-y-0">

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--accent))]">Novedades</p>
            <h1 className="font-display text-3xl font-black text-slate-900 sm:text-4xl">Noticias para tu mascota</h1>
            <p className="mt-1 text-sm text-slate-500">Salud, gadgets, eventos y más — siempre actualizado.</p>
          </div>
          <Link
            href="/news/saved"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-1.5 text-[13px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            Guardadas
          </Link>
        </div>

        {/* ── Search ───────────────────────────────────────────── */}
        <form onSubmit={(e) => void handleSearch(e)} className="mb-4 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar noticias..."
            className="flex-1 border-0 border-b-2 border-slate-200 bg-transparent py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[hsl(var(--primary))] focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-[hsl(var(--primary))] px-5 py-2 text-[13px] font-bold text-white transition hover:opacity-90"
          >
            Buscar
          </button>
        </form>

        {/* ── Category chips ───────────────────────────────────── */}
        <div className="mb-6 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <button
            type="button"
            onClick={() => void handleCategoryClick("")}
            className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all ${
              categoryFilter === ""
                ? "bg-[hsl(var(--primary))] text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            Todas
          </button>
          {NEWS_CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat}
              cat={cat}
              active={categoryFilter === cat}
              onClick={() => void handleCategoryClick(cat)}
            />
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">Cargando noticias...</div>
        ) : articles.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">No hay artículos para este filtro.</div>
        ) : (
          <div className="space-y-6">

            {/* ── Featured hero ─────────────────────────────────── */}
            {heroArticle && <FeaturedCard article={heroArticle} />}

            {/* ── Article grid ──────────────────────────────────── */}
            {gridArticles.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {gridArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Admin panel ──────────────────────────────────────── */}
        {isAdmin && (
          <div className="mt-10 border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={() => setShowAdmin(!showAdmin)}
              className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93A10 10 0 0 0 4.93 19.07M4.93 4.93A10 10 0 0 1 19.07 19.07" />
              </svg>
              {showAdmin ? "Ocultar panel admin" : "Panel admin — Crear artículo"}
            </button>
            {showAdmin && (
              <form onSubmit={(e) => void handleCreateArticle(e)} className="mt-4 grid gap-3 rounded-none border border-dashed border-slate-300 bg-slate-50 p-4 sm:grid-cols-2">
                <h2 className="col-span-full text-sm font-bold text-slate-700">Nuevo artículo</h2>
                {adminError && <p className="col-span-full text-xs text-red-600">{adminError}</p>}
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required placeholder="Título" className="col-span-full rounded border border-slate-300 px-3 py-2 text-sm" />
                <input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="Slug (opcional)" className="rounded border border-slate-300 px-3 py-2 text-sm" />
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as NewsCategory)} className="rounded border border-slate-300 px-3 py-2 text-sm">
                  {NEWS_CATEGORIES.map((c) => <option key={c} value={c}>{NEWS_CATEGORY_LABELS[c]}</option>)}
                </select>
                <textarea value={newExcerpt} onChange={(e) => setNewExcerpt(e.target.value)} required rows={2} placeholder="Extracto" className="col-span-full rounded border border-slate-300 px-3 py-2 text-sm" />
                <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} required rows={5} placeholder="Contenido" className="col-span-full rounded border border-slate-300 px-3 py-2 text-sm" />
                <input value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="Tags (coma)" className="rounded border border-slate-300 px-3 py-2 text-sm" />
                <input value={newCoverImageUrl} onChange={(e) => setNewCoverImageUrl(e.target.value)} placeholder="URL imagen" className="rounded border border-slate-300 px-3 py-2 text-sm" />
                <input value={newSourceUrl} onChange={(e) => setNewSourceUrl(e.target.value)} placeholder="URL fuente" className="rounded border border-slate-300 px-3 py-2 text-sm" />
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={newIsFeatured} onChange={(e) => setNewIsFeatured(e.target.checked)} />
                  Destacada
                </label>
                <button type="submit" disabled={working} className="col-span-full rounded bg-[hsl(var(--primary))] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
                  {working ? "Guardando..." : "Crear artículo"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </AuthGate>
  );
}

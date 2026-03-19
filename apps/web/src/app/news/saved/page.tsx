"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/features/auth/auth-context";
import { listSavedNewsArticles, unsaveNewsArticle } from "@/features/news/news-api";
import type { NewsArticleListItem, NewsCategory } from "@/features/news/types";

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

function formatDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-CL", { dateStyle: "medium" });
}

function IcoBookmarkFilled() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SavedCard({
  article,
  onUnsave,
  unsaving
}: {
  article: NewsArticleListItem;
  onUnsave: (id: string) => void;
  unsaving: boolean;
}) {
  return (
    <div className="group flex overflow-hidden border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm">
      <Link href={`/news/${article.id}`} className="flex flex-1 gap-3 p-3">
        {article.coverImageUrl ? (
          <div className="h-20 w-24 shrink-0 overflow-hidden">
            <img src={article.coverImageUrl} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
          </div>
        ) : (
          <div className="flex h-20 w-24 shrink-0 items-center justify-center bg-slate-100 text-slate-300 text-2xl select-none">K</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${CATEGORY_COLORS[article.category.id]}`}>
              {article.category.label}
            </span>
          </div>
          <p className="line-clamp-2 text-[14px] font-bold leading-snug text-slate-900">
            {article.title}
          </p>
          <p className="mt-1 line-clamp-1 text-xs text-slate-500">{article.excerpt}</p>
          <p className="mt-1.5 text-[11px] text-slate-400">{formatDate(article.publishedAt)}</p>
        </div>
      </Link>
      <div className="flex items-center border-l border-slate-100 px-3">
        <button
          type="button"
          disabled={unsaving}
          onClick={() => onUnsave(article.id)}
          title="Quitar de guardados"
          className="text-[hsl(var(--primary))] opacity-70 transition hover:opacity-100 disabled:opacity-30"
        >
          <IcoBookmarkFilled />
        </button>
      </div>
    </div>
  );
}

export default function SavedNewsPage() {
  const router = useRouter();
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;

  const [articles, setArticles] = useState<NewsArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unsaving, setUnsaving] = useState<string | null>(null);

  const load = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const rows = await listSavedNewsArticles(accessToken);
      setArticles(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [accessToken]);

  const handleUnsave = async (articleId: string) => {
    if (!accessToken) return;
    setUnsaving(articleId);
    try {
      await unsaveNewsArticle(accessToken, articleId);
      setArticles((prev) => prev.filter((a) => a.id !== articleId));
    } finally {
      setUnsaving(null);
    }
  };

  return (
    <AuthGate>
      <div className="mx-auto max-w-2xl space-y-6">

        {/* ── Header ───────────────────────────────────────────── */}
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 4L6 8l4 4" />
            </svg>
            Novedades
          </button>
          <p className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--accent))]">Novedades</p>
          <h1 className="font-display text-2xl font-black text-slate-900 sm:text-3xl">
            Guardadas
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {loading ? "Cargando..." : articles.length === 0 ? "Todavía no has guardado noticias." : `${articles.length} ${articles.length === 1 ? "artículo guardado" : "artículos guardados"}`}
          </p>
        </div>

        {/* ── List ─────────────────────────────────────────────── */}
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">Cargando guardados...</div>
        ) : articles.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-400">No tienes noticias guardadas aún.</p>
            <Link
              href="/news"
              className="mt-4 inline-block rounded-full bg-[hsl(var(--primary))] px-5 py-2 text-sm font-bold text-white transition hover:opacity-90"
            >
              Explorar Novedades
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {articles.map((article) => (
              <SavedCard
                key={article.id}
                article={article}
                onUnsave={(id) => void handleUnsave(id)}
                unsaving={unsaving === article.id}
              />
            ))}
          </div>
        )}
      </div>
    </AuthGate>
  );
}

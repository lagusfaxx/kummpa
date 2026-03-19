"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/features/auth/auth-context";
import {
  getNewsArticle,
  listNewsArticles,
  saveNewsArticle,
  shareNewsArticle,
  unsaveNewsArticle
} from "@/features/news/news-api";
import type { NewsArticleDetail, NewsArticleListItem, NewsCategory } from "@/features/news/types";

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
  return new Date(iso).toLocaleDateString("es-CL", { dateStyle: "long" });
}

function renderBody(body: string) {
  return body.split(/\n\n+/).map((para, i) => (
    <p key={i} className="text-base leading-[1.8] text-slate-700">
      {para.replace(/\n/g, " ")}
    </p>
  ));
}

function IcoBookmark({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IcoShare() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  );
}

function IcoLink() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function RelatedCard({ article }: { article: NewsArticleListItem }) {
  return (
    <Link href={`/news/${article.id}`} className="group flex gap-3 border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:shadow-sm">
      {article.coverImageUrl ? (
        <div className="h-16 w-20 shrink-0 overflow-hidden">
          <img src={article.coverImageUrl} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
        </div>
      ) : (
        <div className="flex h-16 w-20 shrink-0 items-center justify-center bg-slate-100 text-slate-300 text-xl select-none">K</div>
      )}
      <div className="min-w-0">
        <span className={`mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${CATEGORY_COLORS[article.category.id]}`}>
          {article.category.label}
        </span>
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-800">
          {article.title}
        </p>
      </div>
    </Link>
  );
}

export default function NewsArticlePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;

  const [article, setArticle] = useState<NewsArticleDetail | null>(null);
  const [related, setRelated] = useState<NewsArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !id) return;
    void (async () => {
      setLoading(true);
      try {
        const data = await getNewsArticle(accessToken, id);
        setArticle(data);
        const rel = await listNewsArticles(accessToken, {
          category: data.category.id,
          publishedOnly: true,
          limit: 6
        });
        setRelated(rel.filter((a) => a.id !== id).slice(0, 3));
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken, id]);

  const handleToggleSave = async () => {
    if (!accessToken || !article) return;
    setWorking("save");
    try {
      if (article.viewer.isSaved) {
        await unsaveNewsArticle(accessToken, article.id);
        setArticle({ ...article, viewer: { isSaved: false }, stats: { ...article.stats, savesCount: article.stats.savesCount - 1 } });
      } else {
        await saveNewsArticle(accessToken, article.id);
        setArticle({ ...article, viewer: { isSaved: true }, stats: { ...article.stats, savesCount: article.stats.savesCount + 1 } });
      }
    } finally {
      setWorking(null);
    }
  };

  const handleShare = async () => {
    if (!accessToken || !article) return;
    setWorking("share");
    try {
      await shareNewsArticle(accessToken, article.id, "internal");
      setShareMsg("Compartido");
      setTimeout(() => setShareMsg(null), 2000);
      setArticle({ ...article, stats: { ...article.stats, sharesCount: article.stats.sharesCount + 1 } });
    } finally {
      setWorking(null);
    }
  };

  return (
    <AuthGate>
      {loading ? (
        <div className="py-20 text-center text-sm text-slate-500">Cargando artículo...</div>
      ) : !article ? (
        <div className="py-20 text-center">
          <p className="text-slate-500">Artículo no encontrado.</p>
          <Link href="/news" className="mt-4 inline-block text-sm font-semibold text-[hsl(var(--primary))]">
            Volver a Novedades
          </Link>
        </div>
      ) : (
        <article className="mx-auto max-w-3xl">

          {/* ── Back ──────────────────────────────────────────── */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 4L6 8l4 4" />
              </svg>
              Novedades
            </button>
          </div>

          {/* ── Category + meta ───────────────────────────────── */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${CATEGORY_COLORS[article.category.id]}`}>
              {article.category.label}
            </span>
            {article.flags.isFeatured && (
              <span className="text-[11px] font-semibold text-amber-500">Destacada</span>
            )}
            <span className="text-xs text-slate-400">{formatDate(article.publishedAt)}</span>
          </div>

          {/* ── Title + excerpt ───────────────────────────────── */}
          <h1 className="font-display text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
            {article.title}
          </h1>
          {article.excerpt && (
            <p className="mt-3 text-lg leading-relaxed text-slate-500">
              {article.excerpt}
            </p>
          )}

          {/* ── Actions ───────────────────────────────────────── */}
          <div className="mt-5 flex items-center gap-2 border-y border-slate-100 py-3">
            <button
              type="button"
              disabled={working === "save"}
              onClick={() => void handleToggleSave()}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all ${
                article.viewer.isSaved
                  ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                  : "border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              } disabled:opacity-60`}
            >
              <IcoBookmark filled={article.viewer.isSaved} />
              {article.viewer.isSaved ? "Guardado" : "Guardar"}
            </button>
            <button
              type="button"
              disabled={working === "share"}
              onClick={() => void handleShare()}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-[13px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
            >
              <IcoShare />
              {shareMsg ?? "Compartir"}
            </button>
            {article.sourceUrl && (
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto flex items-center gap-1.5 text-[13px] font-semibold text-slate-400 transition hover:text-slate-700"
              >
                <IcoLink />
                Ver fuente
              </a>
            )}
          </div>

          {/* ── Cover image ───────────────────────────────────── */}
          {article.coverImageUrl && (
            <div className="mt-6 overflow-hidden">
              <img
                src={article.coverImageUrl}
                alt={article.title}
                className="w-full object-cover"
                style={{ maxHeight: 460 }}
              />
            </div>
          )}

          {/* ── Body ──────────────────────────────────────────── */}
          <div className="mt-8 space-y-5">
            {renderBody(article.body)}
          </div>

          {/* ── Tags ──────────────────────────────────────────── */}
          {article.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-100 pt-6">
              {article.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-medium text-slate-600">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* ── Stats ─────────────────────────────────────────── */}
          <p className="mt-4 text-xs text-slate-400">
            {article.stats.savesCount} guardados · {article.stats.sharesCount} compartidos
          </p>

          {/* ── Related ───────────────────────────────────────── */}
          {related.length > 0 && (
            <section className="mt-10 border-t border-slate-200 pt-8">
              <h2 className="mb-4 text-[13px] font-bold uppercase tracking-widest text-slate-400">
                Más en {article.category.label}
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {related.map((rel) => (
                  <RelatedCard key={rel.id} article={rel} />
                ))}
              </div>
            </section>
          )}

          {/* ── Bottom back link ──────────────────────────────── */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <Link href="/news" className="text-sm font-semibold text-[hsl(var(--primary))] transition hover:underline">
              ← Volver a Novedades
            </Link>
          </div>
        </article>
      )}
    </AuthGate>
  );
}

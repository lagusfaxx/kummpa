"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { useAuth } from "@/features/auth/auth-context";
import {
  addCommunityComment,
  createCommunityPost,
  likeCommunityPost,
  listCommunityFeed,
  listGroupEvents,
  listMyPetSocialProfiles,
  saveCommunityPost,
  unlikeCommunityPost,
  unsaveCommunityPost
} from "@/features/community/community-api";
import type {
  CommunityFeedMode,
  CommunityPost,
  GroupEvent,
  PetSocialProfileItem
} from "@/features/community/types";
import { listNewsArticles } from "@/features/news/news-api";
import type { NewsArticleListItem } from "@/features/news/types";

/* ─── helpers ──────────────────────────────────────────────── */
function cls(...args: (string | false | undefined | null)[]) {
  return args.filter(Boolean).join(" ");
}

function relativeTime(iso?: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "justo ahora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} d`;
  return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

/* ─── Avatar ────────────────────────────────────────────────── */
function Avatar({ src, name, size = "md" }: { src?: string | null; name?: string | null; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs";
  if (src) return <img src={src} alt={name ?? ""} className={cls(dim, "rounded-full object-cover shrink-0")} />;
  return (
    <div className={cls(dim, "flex shrink-0 items-center justify-center rounded-full bg-[hsl(155_48%_42%/0.15)] font-bold text-[hsl(155_48%_28%)]")}>
      {initials(name)}
    </div>
  );
}

/* ─── Icons ─────────────────────────────────────────────────── */
function IcoHeart({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function IcoComment() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function IcoBookmark({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function IcoPencil() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z" />
    </svg>
  );
}

/* ─── PostCard ──────────────────────────────────────────────── */
function PostCard({
  post, onLike, onSave, onComment,
}: {
  post: CommunityPost;
  onLike: (p: CommunityPost) => void;
  onSave: (p: CommunityPost) => void;
  onComment: (p: CommunityPost, body: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  return (
    <article className="overflow-hidden rounded-none border border-[hsl(var(--border))] bg-white/85 shadow-sm">
      {/* header */}
      <div className="flex items-start gap-3 px-4 pt-4">
        <Avatar src={post.author.avatarUrl} name={post.author.fullName} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="text-sm font-bold text-[hsl(var(--foreground))]">{post.author.fullName}</span>
            {post.author.city && <span className="text-[11px] text-[hsl(var(--muted-foreground))]">· {post.author.city}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <span className="text-[11px] text-[hsl(var(--muted-foreground))]">{relativeTime(post.createdAt)}</span>
            {post.pet && (
              <Link href={`/pets/${post.pet.id}`} className="flex items-center gap-1 rounded-full bg-[hsl(155_48%_42%/0.1)] px-2.5 py-0.5 text-[11px] font-semibold text-[hsl(155_48%_28%)] hover:bg-[hsl(155_48%_42%/0.18)] transition">
                🐾 {post.pet.name}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* body */}
      <p className="px-4 pt-3 text-sm leading-relaxed text-[hsl(var(--foreground))] whitespace-pre-wrap">{post.body}</p>

      {/* image */}
      {post.imageUrl && (
        <div className="mt-3 mx-4 overflow-hidden rounded-2xl">
          <img src={post.imageUrl} alt="" className="w-full max-h-72 object-cover" />
        </div>
      )}

      {/* action bar */}
      <div className="flex items-center gap-1 px-3 pt-3 pb-2">
        <button type="button" onClick={() => onLike(post)}
          className={cls("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
            post.viewer.liked ? "bg-red-50 text-red-500" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.5)]")}>
          <IcoHeart filled={post.viewer.liked} /> {post.metrics.likesCount}
        </button>
        <button type="button" onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted)/0.5)]">
          <IcoComment /> {post.metrics.commentsCount}
        </button>
        <button type="button" onClick={() => onSave(post)}
          className={cls("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
            post.viewer.saved ? "bg-amber-50 text-amber-500" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.5)]")}>
          <IcoBookmark filled={post.viewer.saved} /> {post.metrics.savesCount}
        </button>
      </div>

      {/* comments */}
      {showComments && (
        <div className="border-t border-[hsl(var(--border)/0.5)] mx-4 mb-4 pt-3 space-y-2">
          {post.commentsPreview.length === 0 && (
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Sin comentarios aún.</p>
          )}
          {post.commentsPreview.map((c) => (
            <div key={c.id} className="flex gap-2">
              <Avatar src={c.author.avatarUrl} name={c.author.fullName} size="sm" />
              <div className="rounded-2xl bg-[hsl(var(--muted)/0.5)] px-3 py-2 text-xs leading-relaxed">
                <span className="font-semibold">{c.author.fullName} </span>{c.body}
              </div>
            </div>
          ))}
          {post.allowComments && (
            <form onSubmit={(e) => { e.preventDefault(); if (!commentText.trim()) return; onComment(post, commentText.trim()); setCommentText(""); }} className="flex gap-2 pt-1">
              <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Comenta algo…"
                className="flex-1 rounded-full border border-[hsl(var(--border))] bg-white/80 px-4 py-2 text-xs outline-none focus:border-[hsl(var(--secondary))] focus:shadow-[0_0_0_3px_hsl(155_48%_42%/0.1)]" />
              <button type="submit" className="rounded-full bg-[hsl(var(--secondary))] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90">Enviar</button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}

/* ─── Composer ──────────────────────────────────────────────── */
const POST_TYPES = [
  { label: "Momento",        placeholder: "¿Qué pasó hoy con tu mascota?" },
  { label: "Recomendación",  placeholder: "Recomienda un lugar, parque o veterinaria…" },
  { label: "Consulta",       placeholder: "Pregunta a la comunidad…" },
  { label: "Paseo",          placeholder: "¿Organizas una salida? Cuéntanos…" },
  { label: "Tip",            placeholder: "Comparte algo que aprendiste…" },
];

function Composer({ pets, onPublish, isPublishing }: {
  pets: PetSocialProfileItem[];
  onPublish: (body: string, petId: string, imageUrl: string) => Promise<void>;
  isPublishing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [typeIdx, setTypeIdx] = useState(0);
  const [body, setBody] = useState("");
  const [petId, setPetId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [typedPrompt, setTypedPrompt] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const PROMPT = "¿Qué hay de nuevo con tu mascota?";

  useEffect(() => {
    if (expanded) return;
    let cancelled = false;
    let i = 0;

    function tick() {
      if (cancelled) return;
      i++;
      setTypedPrompt(PROMPT.slice(0, i));
      if (i < PROMPT.length) {
        setTimeout(tick, 38);
      } else {
        setTimeout(() => {
          if (cancelled) return;
          setTypedPrompt("");
          i = 0;
          setTimeout(tick, 600);
        }, 2800);
      }
    }

    const startId = setTimeout(tick, 500);
    return () => { cancelled = true; clearTimeout(startId); };
  }, [expanded]);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    await onPublish(body.trim(), petId, imageUrl);
    setBody(""); setPetId(""); setImageUrl(""); setExpanded(false);
  }

  if (!expanded) {
    return (
      <div className="overflow-hidden rounded-none border border-[hsl(var(--border))] bg-white/85 shadow-sm">
        <button type="button" onClick={() => setExpanded(true)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--secondary)/0.12)] text-[hsl(var(--secondary))]"><IcoPencil /></div>
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            {typedPrompt || <span className="opacity-40">¿Qué hay de nuevo con tu mascota?</span>}
            {typedPrompt && <span className="ml-px inline-block w-px animate-pulse bg-current align-middle" style={{ height: "1em" }} />}
          </span>
        </button>
        <div className="flex border-t border-[hsl(var(--border)/0.5)]">
          {POST_TYPES.map((t, i) => (
            <button key={t.label} type="button"
              onClick={() => { setTypeIdx(i); setExpanded(true); }}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted)/0.4)] hover:text-[hsl(var(--foreground))]">
              <span className="hidden sm:block">{t.label}</span>
              <span className="sm:hidden text-[10px]">{t.label.slice(0, 3)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)}
      className="overflow-hidden rounded-none border border-[hsl(var(--secondary)/0.3)] bg-white/90 shadow-sm space-y-3 p-4">
      <div className="flex flex-wrap gap-2">
        {POST_TYPES.map((t, i) => (
          <button key={t.label} type="button" onClick={() => setTypeIdx(i)}
            className={cls("rounded-full border px-3 py-1 text-xs font-semibold transition",
              typeIdx === i
                ? "border-[hsl(var(--secondary))] bg-[hsl(155_48%_42%/0.1)] text-[hsl(155_48%_24%)]"
                : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--secondary)/0.4)]")}>
            {t.label}
          </button>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        autoFocus
        rows={6}
        value={body}
        onChange={(e) => { setBody(e.target.value); autoResize(); }}
        placeholder={POST_TYPES[typeIdx]!.placeholder}
        className="w-full resize-none border-0 border-b border-[hsl(var(--border))] bg-transparent px-1 py-2 text-base leading-relaxed outline-none placeholder:text-[hsl(var(--muted-foreground)/0.4)] placeholder:italic focus:border-[hsl(var(--secondary))] transition-[border-color]"
        style={{ minHeight: "144px", overflow: "hidden" }}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {pets.length > 0 && (
          <select value={petId} onChange={(e) => setPetId(e.target.value)}
            className="rounded-xl border border-[hsl(var(--border))] bg-white/80 px-3 py-2 text-sm outline-none focus:border-[hsl(var(--secondary))]">
            <option value="">Sin mascota asociada</option>
            {pets.map((p) => <option key={p.pet.id} value={p.pet.id}>{p.pet.name}</option>)}
          </select>
        )}
        <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
          placeholder="URL de imagen (opcional)"
          className="rounded-xl border border-[hsl(var(--border))] bg-white/80 px-3 py-2 text-sm outline-none focus:border-[hsl(var(--secondary))] placeholder:text-[hsl(var(--muted-foreground)/0.5)]" />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => { setExpanded(false); setBody(""); }}
          className="rounded-full border border-[hsl(var(--border))] px-5 py-2 text-sm font-semibold text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted)/0.4)]">
          Cancelar
        </button>
        <button type="submit" disabled={isPublishing || !body.trim()}
          className="rounded-full bg-[hsl(var(--secondary))] px-6 py-2 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50">
          {isPublishing ? "Publicando…" : "Publicar"}
        </button>
      </div>
    </form>
  );
}

/* ─── Skeletons ─────────────────────────────────────────────── */
function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="overflow-hidden rounded-none border border-[hsl(var(--border))] bg-white/70 p-4 space-y-3">
          <div className="flex gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
            <div className="flex-1 space-y-1.5 pt-1">
              <div className="h-3 w-1/3 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
              <div className="h-2.5 w-1/4 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
            </div>
          </div>
          <div className="h-3 w-full animate-pulse rounded-full bg-[hsl(var(--muted))]" />
          <div className="h-3 w-3/4 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
          <div className="h-44 animate-pulse rounded-2xl bg-[hsl(var(--muted))]" />
        </div>
      ))}
    </div>
  );
}

/* ─── constants ─────────────────────────────────────────────── */
const FEED_TABS: Array<{ value: CommunityFeedMode; label: string }> = [
  { value: "discover",  label: "Descubrir" },
  { value: "following", label: "Siguiendo" },
  { value: "saved",     label: "Guardados" },
];

const TYPE_FILTERS = [
  { key: "", label: "Todo" },
  { key: "STORY", label: "Momentos" },
  { key: "RECOMMENDATION", label: "Recomendaciones" },
  { key: "QUESTION", label: "Consultas" },
  { key: "WALK", label: "Paseos" },
  { key: "TIP", label: "Tips" },
];

function eventTypeLabel(type: GroupEvent["type"]) {
  if (type === "WALK") return "Paseo";
  if (type === "PLAYDATE") return "Playdate";
  if (type === "TRAINING") return "Entrenamiento";
  if (type === "HIKE") return "Salida";
  return "Actividad";
}

/* ─── Page ──────────────────────────────────────────────────── */
export default function CommunityPage() {
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;

  const [mode, setMode] = useState<CommunityFeedMode>("discover");
  const [typeFilter, setTypeFilter] = useState("");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [pets, setPets] = useState<PetSocialProfileItem[]>([]);
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [news, setNews] = useState<NewsArticleListItem[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (feedMode: CommunityFeedMode) => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const [feedRows, petRows, eventRows, newsRows] = await Promise.all([
        listCommunityFeed(accessToken, { mode: feedMode, limit: 20 }),
        listMyPetSocialProfiles(accessToken),
        listGroupEvents(accessToken, { limit: 4, includePast: false }),
        listNewsArticles(accessToken, { featuredOnly: true, publishedOnly: true, limit: 3 }),
      ]);
      setPosts(feedRows);
      setPets(petRows);
      setEvents(eventRows);
      setNews(newsRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el feed.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(mode); }, [accessToken, mode]);

  const handlePublish = async (body: string, petId: string, imageUrl: string) => {
    if (!accessToken) return;
    setIsPublishing(true);
    try {
      const post = await createCommunityPost(accessToken, {
        body, imageUrl: imageUrl || undefined, petId: petId || undefined,
        visibility: "PUBLIC", allowComments: true,
      });
      setPosts((cur) => [post, ...cur]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo publicar.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleLike = async (post: CommunityPost) => {
    if (!accessToken) return;
    try {
      const snap = post.viewer.liked
        ? await unlikeCommunityPost(accessToken, post.id)
        : await likeCommunityPost(accessToken, post.id);
      setPosts((cur) => cur.map((p) =>
        p.id === post.id ? { ...p, metrics: { ...p.metrics, likesCount: snap.likesCount }, viewer: { ...p.viewer, liked: snap.liked } } : p
      ));
    } catch { setError("No se pudo actualizar me gusta."); }
  };

  const handleSave = async (post: CommunityPost) => {
    if (!accessToken) return;
    try {
      const snap = post.viewer.saved
        ? await unsaveCommunityPost(accessToken, post.id)
        : await saveCommunityPost(accessToken, post.id);
      setPosts((cur) => cur.map((p) =>
        p.id === post.id ? { ...p, metrics: { ...p.metrics, savesCount: snap.savesCount }, viewer: { ...p.viewer, saved: snap.saved } } : p
      ));
    } catch { setError("No se pudo guardar."); }
  };

  const handleComment = async (post: CommunityPost, body: string) => {
    if (!accessToken) return;
    try {
      const c = await addCommunityComment(accessToken, post.id, { body });
      setPosts((cur) => cur.map((p) =>
        p.id === post.id
          ? { ...p, commentsPreview: [c, ...p.commentsPreview].slice(0, 3), metrics: { ...p.metrics, commentsCount: p.metrics.commentsCount + 1 } }
          : p
      ));
    } catch { setError("No se pudo comentar."); }
  };

  /* client-side type filter (no extra API call) */
  const visiblePosts = typeFilter
    ? posts.filter((p) => (p as unknown as Record<string, unknown>).type === typeFilter)
    : posts;

  return (
    <AuthGate>
      <div className="space-y-5 pb-16">

        {/* ── header ── */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Comunidad</p>
            <h1 className="mt-0.5 text-2xl font-black tracking-tight text-[hsl(var(--foreground))]">Feed</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/community/meet"
              className="rounded-full border border-[hsl(var(--border))] px-4 py-2 text-xs font-bold text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--muted)/0.5)]">
              Paseos
            </Link>
            <Link href="/community/profile"
              className="rounded-full bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-90">
              Mi perfil
            </Link>
          </div>
        </div>

        {error && <InlineBanner tone="error">{error}</InlineBanner>}

        {/* ── pet strip ── */}
        {pets.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            {pets.map((p) => (
              <Link key={p.pet.id} href={`/pets/${p.pet.id}`} className="flex shrink-0 flex-col items-center gap-1.5">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[hsl(var(--secondary))] bg-[hsl(155_48%_42%/0.1)] text-2xl">
                  {p.pet.species === "Perro" ? "🐕" : p.pet.species === "Gato" ? "🐈" : "🐾"}
                </div>
                <span className="max-w-[60px] truncate text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">{p.pet.name}</span>
              </Link>
            ))}
            <Link href="/pets/new" className="flex shrink-0 flex-col items-center gap-1.5">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-[hsl(var(--border))] text-xl text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--secondary))] transition">+</div>
              <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">Agregar</span>
            </Link>
          </div>
        )}

        {/* ── main layout ── */}
        <div className="grid gap-5 xl:grid-cols-[1fr_300px]">

          {/* ── feed column ── */}
          <div className="space-y-4 min-w-0">

            {/* feed mode tabs */}
            <div className="flex gap-1 overflow-x-auto scrollbar-none -mx-1 px-1">
              {FEED_TABS.map((tab) => (
                <button key={tab.value} type="button" onClick={() => setMode(tab.value)}
                  className={cls("shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition",
                    mode === tab.value
                      ? "bg-[hsl(var(--primary))] text-white"
                      : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.5)]")}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* type filters */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
              {TYPE_FILTERS.map((f) => (
                <button key={f.key} type="button" onClick={() => setTypeFilter(f.key)}
                  className={cls("shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold transition",
                    typeFilter === f.key
                      ? "border-[hsl(var(--secondary))] bg-[hsl(155_48%_42%/0.1)] text-[hsl(155_48%_24%)]"
                      : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--secondary)/0.4)]")}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* composer */}
            <Composer pets={pets} onPublish={handlePublish} isPublishing={isPublishing} />

            {/* feed */}
            {isLoading ? (
              <FeedSkeleton />
            ) : visiblePosts.length === 0 ? (
              <div className="rounded-none border border-[hsl(var(--border))] bg-white/70 p-8 text-center">
                <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(155_48%_42%/0.1)]">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-[hsl(155_48%_38%)]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><circle cx="4" cy="8" r="2"/>
                    <path d="M12 18c-3.5 0-6-1.5-6-4 0-1.5 1-3 2.5-3.5C9.5 10 11 9 12 7c1 2 2.5 3 3.5 3.5C17 11 18 12.5 18 14c0 2.5-2.5 4-6 4z"/>
                  </svg>
                </div>
                <p className="mt-3 font-bold text-[hsl(var(--foreground))]">
                  {mode === "discover" ? "Sé el primero en compartir algo" :
                   mode === "following" ? "Aún no sigues a nadie" : "No tienes publicaciones guardadas"}
                </p>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  {mode === "discover" ? "La comunidad está esperando sus primeras historias." : "Explora el feed de Descubrir para encontrar perfiles."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {visiblePosts.map((post) => (
                  <PostCard key={post.id} post={post} onLike={handleLike} onSave={handleSave} onComment={handleComment} />
                ))}
              </div>
            )}
          </div>

          {/* ── sidebar ── */}
          <aside className="space-y-4">

            {/* paseos */}
            <div className="overflow-hidden rounded-none border border-[hsl(var(--border))] bg-white/85 shadow-sm p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Paseos y encuentros</p>
              {isLoading ? (
                <div className="mt-3 space-y-2">{[1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-2xl bg-[hsl(var(--muted))]" />)}</div>
              ) : events.length === 0 ? (
                <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">Sin encuentros activos por ahora.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {events.slice(0, 3).map((ev) => (
                    <div key={ev.id} className="flex items-center gap-3 rounded-2xl bg-[hsl(var(--muted)/0.4)] px-3 py-2.5">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${ev.type === "WALK" ? "bg-green-100 text-green-700" : ev.type === "PLAYDATE" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                        {ev.type === "WALK" ? "P" : ev.type === "PLAYDATE" ? "J" : "S"}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{ev.title}</p>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{ev.location.district ?? ev.location.city} · {eventTypeLabel(ev.type)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/community/meet"
                className="mt-3 block w-full rounded-full border border-[hsl(var(--border))] py-2 text-center text-xs font-bold text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--muted)/0.4)]">
                Ver todos los paseos
              </Link>
            </div>

            {/* noticias y foro */}
            <div className="overflow-hidden rounded-none border border-[hsl(var(--border))] bg-white/85 shadow-sm p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Novedades</p>
              <div className="mt-3 space-y-1">
                {news.length === 0
                  ? <p className="text-xs text-[hsl(var(--muted-foreground))]">Sin novedades por ahora.</p>
                  : news.map((n) => (
                    <div key={n.id} className="rounded-2xl px-3 py-2.5 transition hover:bg-[hsl(var(--muted)/0.4)]">
                      <p className="text-xs font-semibold leading-snug text-[hsl(var(--foreground))]">{n.title}</p>
                    </div>
                  ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Link href="/news" className="flex-1 rounded-full border border-[hsl(var(--border))] py-2 text-center text-xs font-bold transition hover:bg-[hsl(var(--muted)/0.4)]">Noticias</Link>
                <Link href="/forum" className="flex-1 rounded-full border border-[hsl(var(--border))] py-2 text-center text-xs font-bold transition hover:bg-[hsl(var(--muted)/0.4)]">Foro</Link>
              </div>
            </div>

          </aside>
        </div>
      </div>
    </AuthGate>
  );
}

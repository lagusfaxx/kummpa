"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { useAuth } from "@/features/auth/auth-context";
import {
  addCommunityComment,
  createCommunityPost,
  getMyCommunityProfile,
  likeCommunityPost,
  listCommunityFeed,
  listGroupEvents,
  listMyPetSocialProfiles,
  listWalkInvitations,
  saveCommunityPost,
  unlikeCommunityPost,
  unsaveCommunityPost
} from "@/features/community/community-api";
import type {
  CommunityFeedMode,
  CommunityPost,
  CommunityProfile,
  GroupEvent,
  PetSocialProfileItem,
  WalkInvitation
} from "@/features/community/types";
import { listForumTopics } from "@/features/forum/forum-api";
import { listNewsArticles } from "@/features/news/news-api";
import type { NewsArticleListItem } from "@/features/news/types";

/* ─── helpers ────────────────────────────────────────────── */
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

function initials(name?: string | null): string {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

/* ─── Avatar ──────────────────────────────────────────────── */
function Avatar({ src, name, size = "md" }: { src?: string | null; name?: string | null; size?: "sm" | "md" | "lg" }) {
  const dim = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-sm";
  if (src) {
    return <img src={src} alt={name ?? ""} className={cls(dim, "rounded-full object-cover shrink-0")} />;
  }
  return (
    <div className={cls(dim, "flex shrink-0 items-center justify-center rounded-full bg-[hsl(155_48%_42%/0.15)] font-bold text-[hsl(155_48%_28%)]")}>
      {initials(name)}
    </div>
  );
}

/* ─── PostCard ────────────────────────────────────────────── */
const POST_TYPE_ICONS: Record<string, string> = {
  STORY: "📸", RECOMMENDATION: "📍", QUESTION: "❓", WALK: "🐕", TIP: "💡"
};

function PostCard({
  post,
  onLike,
  onSave,
  onComment,
}: {
  post: CommunityPost;
  onLike: (p: CommunityPost) => void;
  onSave: (p: CommunityPost) => void;
  onComment: (p: CommunityPost, body: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  return (
    <article className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white/80 shadow-sm">
      {/* post header */}
      <div className="flex items-start gap-3 px-4 pt-4">
        <Link href={`/community/users/${post.author.id}`}>
          <Avatar src={post.author.avatarUrl} name={post.author.fullName} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <Link href={`/community/users/${post.author.id}`} className="text-sm font-bold text-[hsl(var(--foreground))] hover:underline">
              {post.author.fullName}
            </Link>
            {post.author.city && (
              <span className="text-xs text-[hsl(var(--muted-foreground))]">· {post.author.city}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <span className="text-[11px] text-[hsl(var(--muted-foreground))]">{relativeTime(post.createdAt)}</span>
            {post.pet && (
              <Link href={`/pets/${post.pet.id}/public-profile`} className="flex items-center gap-1 rounded-full bg-[hsl(155_48%_42%/0.1)] px-2.5 py-0.5 text-[11px] font-semibold text-[hsl(155_48%_28%)] hover:bg-[hsl(155_48%_42%/0.18)] transition">
                🐾 {post.pet.name}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* body */}
      <p className="px-4 pt-3 text-sm leading-relaxed text-[hsl(var(--foreground))] whitespace-pre-wrap">
        {post.body}
      </p>

      {/* image */}
      {post.imageUrl && (
        <div className="mt-3 mx-4 overflow-hidden rounded-2xl">
          <img src={post.imageUrl} alt="" className="w-full max-h-72 object-cover" />
        </div>
      )}

      {/* action bar */}
      <div className="flex items-center gap-1 px-3 pt-3 pb-2">
        <button
          type="button"
          onClick={() => onLike(post)}
          className={cls(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
            post.viewer.liked
              ? "bg-red-50 text-red-600"
              : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.5)]"
          )}
        >
          {post.viewer.liked ? "❤️" : "🤍"} {post.metrics.likesCount}
        </button>
        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted)/0.5)]"
        >
          💬 {post.metrics.commentsCount}
        </button>
        <button
          type="button"
          onClick={() => onSave(post)}
          className={cls(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
            post.viewer.saved
              ? "bg-amber-50 text-amber-600"
              : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.5)]"
          )}
        >
          {post.viewer.saved ? "🔖" : "🏷️"} {post.metrics.savesCount}
        </button>
      </div>

      {/* comments panel */}
      {showComments && (
        <div className="border-t border-[hsl(var(--border)/0.5)] mx-4 mb-4 pt-3 space-y-2">
          {post.commentsPreview.length === 0 && (
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Sin comentarios aún. ¡Sé el primero!</p>
          )}
          {post.commentsPreview.map((c) => (
            <div key={c.id} className="flex gap-2">
              <Avatar src={c.author.avatarUrl} name={c.author.fullName} size="sm" />
              <div className="rounded-2xl bg-[hsl(var(--muted)/0.5)] px-3 py-2 text-xs leading-relaxed">
                <span className="font-semibold">{c.author.fullName} </span>
                {c.body}
              </div>
            </div>
          ))}
          {post.allowComments && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!commentText.trim()) return;
                onComment(post, commentText.trim());
                setCommentText("");
              }}
              className="flex gap-2 pt-1"
            >
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Comenta algo…"
                className="flex-1 rounded-full border border-[hsl(var(--border))] bg-white/80 px-4 py-2 text-xs outline-none focus:border-[hsl(var(--secondary))] focus:shadow-[0_0_0_3px_hsl(155_48%_42%/0.1)]"
              />
              <button
                type="submit"
                className="rounded-full bg-[hsl(var(--secondary))] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
              >
                Enviar
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}

/* ─── Composer ────────────────────────────────────────────── */
const POST_TYPES = [
  { label: "📸 Momento", placeholder: "¿Qué pasó hoy con tu mascota? Comparte la historia…" },
  { label: "📍 Recomendación", placeholder: "Recomienda un lugar, parque, veterinaria, tienda…" },
  { label: "❓ Consulta", placeholder: "Pregunta a la comunidad, alguien ya vivió lo mismo…" },
  { label: "🐕 Paseo", placeholder: "¿Organizas una salida? Cuéntanos dónde y cuándo…" },
  { label: "💡 Tip útil", placeholder: "Comparte algo que aprendiste con tu mascota…" },
];

function Composer({
  pets,
  onPublish,
  isPublishing,
}: {
  pets: PetSocialProfileItem[];
  onPublish: (body: string, petId: string, imageUrl: string) => Promise<void>;
  isPublishing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedType, setSelectedType] = useState(0);
  const [body, setBody] = useState("");
  const [petId, setPetId] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    await onPublish(body.trim(), petId, imageUrl);
    setBody("");
    setPetId("");
    setImageUrl("");
    setExpanded(false);
  }

  if (!expanded) {
    return (
      <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white/80 shadow-sm">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--secondary)/0.15)] text-base">
            ✏️
          </div>
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            ¿Qué hay de nuevo con tu mascota?
          </span>
        </button>
        <div className="flex border-t border-[hsl(var(--border)/0.5)]">
          {POST_TYPES.map((t, i) => (
            <button
              key={t.label}
              type="button"
              onClick={() => { setSelectedType(i); setExpanded(true); }}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted)/0.4)] hover:text-[hsl(var(--foreground))]"
            >
              <span className="text-base leading-none">{t.label.split(" ")[0]}</span>
              <span className="hidden sm:block">{t.label.split(" ").slice(1).join(" ")}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="overflow-hidden rounded-3xl border border-[hsl(var(--secondary)/0.3)] bg-white/90 shadow-sm space-y-3 p-4"
    >
      {/* type selector */}
      <div className="flex flex-wrap gap-2">
        {POST_TYPES.map((t, i) => (
          <button
            key={t.label}
            type="button"
            onClick={() => setSelectedType(i)}
            className={cls(
              "rounded-full border px-3 py-1 text-xs font-semibold transition",
              selectedType === i
                ? "border-[hsl(var(--secondary))] bg-[hsl(155_48%_42%/0.1)] text-[hsl(155_48%_24%)]"
                : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--secondary)/0.4)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <textarea
        autoFocus
        rows={4}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={POST_TYPES[selectedType]!.placeholder}
        className="w-full resize-none rounded-2xl border border-[hsl(var(--border))] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[hsl(var(--secondary))] focus:shadow-[0_0_0_3px_hsl(155_48%_42%/0.1)] placeholder:text-[hsl(var(--muted-foreground)/0.5)] leading-relaxed"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {pets.length > 0 && (
          <select
            value={petId}
            onChange={(e) => setPetId(e.target.value)}
            className="rounded-xl border border-[hsl(var(--border))] bg-white/80 px-3 py-2 text-sm outline-none focus:border-[hsl(var(--secondary))]"
          >
            <option value="">Sin mascota asociada</option>
            {pets.map((p) => (
              <option key={p.pet.id} value={p.pet.id}>{p.pet.name}</option>
            ))}
          </select>
        )}
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="URL de imagen (opcional)"
          className="rounded-xl border border-[hsl(var(--border))] bg-white/80 px-3 py-2 text-sm outline-none focus:border-[hsl(var(--secondary))] placeholder:text-[hsl(var(--muted-foreground)/0.5)]"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => { setExpanded(false); setBody(""); }}
          className="rounded-full border border-[hsl(var(--border))] px-5 py-2 text-sm font-semibold text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted)/0.4)]"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPublishing || !body.trim()}
          className="rounded-full bg-[hsl(var(--secondary))] px-6 py-2 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {isPublishing ? "Publicando…" : "Publicar"}
        </button>
      </div>
    </form>
  );
}

/* ─── ProfileWidget ───────────────────────────────────────── */
function ProfileWidget({ profile, pets }: { profile: CommunityProfile; pets: PetSocialProfileItem[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white/80 shadow-sm">
      {/* cover strip */}
      <div className="h-14 bg-gradient-to-r from-[hsl(155_48%_28%)] to-[hsl(155_48%_18%)]" />
      <div className="px-4 pb-4">
        {/* avatar overlapping cover */}
        <div className="-mt-7 mb-3">
          <Avatar src={profile.profile.avatarUrl} name={profile.profile.displayName} size="lg" />
        </div>
        <p className="font-bold text-[hsl(var(--foreground))]">{profile.profile.displayName}</p>
        {profile.profile.bio && (
          <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">{profile.profile.bio}</p>
        )}
        {profile.profile.city && (
          <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">📍 {profile.profile.city}</p>
        )}

        {/* stats */}
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-[hsl(var(--muted)/0.4)] p-2 text-center">
          {[
            { val: profile.stats.posts, label: "posts" },
            { val: profile.stats.followers, label: "seguidores" },
            { val: profile.stats.following, label: "siguiendo" },
          ].map(({ val, label }) => (
            <div key={label} className="py-1">
              <p className="text-base font-black text-[hsl(var(--foreground))]">{val}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{label}</p>
            </div>
          ))}
        </div>

        {/* pets chips */}
        {pets.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-2">
              Mis mascotas
            </p>
            <div className="flex flex-wrap gap-2">
              {pets.map((p) => (
                <Link
                  key={p.pet.id}
                  href={`/pets/${p.pet.id}`}
                  className="flex items-center gap-1.5 rounded-full bg-[hsl(155_48%_42%/0.1)] px-3 py-1 text-xs font-semibold text-[hsl(155_48%_28%)] transition hover:bg-[hsl(155_48%_42%/0.18)]"
                >
                  {p.pet.species === "Perro" ? "🐕" : p.pet.species === "Gato" ? "🐈" : "🐾"} {p.pet.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        <Link
          href={`/community/users/${profile.user.id}`}
          className="mt-3 block w-full rounded-full border border-[hsl(var(--border))] py-2 text-center text-xs font-bold text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--muted)/0.4)]"
        >
          Ver mi perfil completo
        </Link>
      </div>
    </div>
  );
}

/* ─── Feed skeleton ───────────────────────────────────────── */
function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white/70 p-4 space-y-3">
          <div className="flex gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
            <div className="flex-1 space-y-1.5">
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

/* ─── SidebarSkeleton ─────────────────────────────────────── */
function SidebarSkeleton() {
  return (
    <div className="space-y-3 rounded-3xl border border-[hsl(var(--border))] bg-white/70 p-4">
      <div className="h-14 animate-pulse rounded-2xl bg-[hsl(var(--muted))]" />
      <div className="h-3 w-2/3 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
      <div className="h-3 w-1/2 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
    </div>
  );
}

/* ─── Feed tabs ───────────────────────────────────────────── */
const TABS: Array<{ value: CommunityFeedMode; label: string }> = [
  { value: "discover", label: "Descubrir" },
  { value: "following", label: "Siguiendo" },
  { value: "mine",     label: "Mis posts" },
  { value: "saved",    label: "Guardados" },
];

/* ─── Event type label ────────────────────────────────────── */
function eventTypeLabel(type: GroupEvent["type"]) {
  if (type === "WALK") return "Paseo";
  if (type === "PLAYDATE") return "Playdate";
  if (type === "TRAINING") return "Entrenamiento";
  if (type === "HIKE") return "Salida";
  return "Actividad";
}

/* ─── Page ────────────────────────────────────────────────── */
export default function CommunityPage() {
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;

  const [mode, setMode] = useState<CommunityFeedMode>("discover");
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
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
      const [feedRows, profileRow, petRows, eventRows, newsRows] = await Promise.all([
        listCommunityFeed(accessToken, { mode: feedMode, limit: 20 }),
        getMyCommunityProfile(accessToken),
        listMyPetSocialProfiles(accessToken),
        listGroupEvents(accessToken, { limit: 4, includePast: false }),
        listNewsArticles(accessToken, { featuredOnly: true, publishedOnly: true, limit: 3 }),
      ]);
      setPosts(feedRows);
      setProfile(profileRow);
      setPets(petRows);
      setEvents(eventRows);
      setNews(newsRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la comunidad.");
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
        body,
        imageUrl: imageUrl || undefined,
        petId: petId || undefined,
        visibility: "PUBLIC",
        allowComments: true,
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
    } catch { setError("No se pudo guardar la publicación."); }
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

  return (
    <AuthGate>
      <div className="space-y-5 pb-16">

        {/* ── page header ── */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
              Comunidad
            </p>
            <h1 className="mt-0.5 text-2xl font-black tracking-tight text-[hsl(var(--foreground))]">
              Tu mundo pet
            </h1>
          </div>
          <Link
            href="/community/meet"
            className="rounded-full border border-[hsl(var(--border))] px-4 py-2 text-xs font-bold text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--muted)/0.5)]"
          >
            🐕 Paseos
          </Link>
        </div>

        {error && <InlineBanner tone="error">{error}</InlineBanner>}

        {/* ── pet strip (quick nav) ── */}
        {pets.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            {pets.map((p) => (
              <Link
                key={p.pet.id}
                href={`/pets/${p.pet.id}`}
                className="flex shrink-0 flex-col items-center gap-1.5"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[hsl(var(--secondary))] bg-[hsl(155_48%_42%/0.1)] text-2xl">
                  {p.pet.species === "Perro" ? "🐕" : p.pet.species === "Gato" ? "🐈" : "🐾"}
                </div>
                <span className="max-w-[60px] truncate text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
                  {p.pet.name}
                </span>
              </Link>
            ))}
            <Link
              href="/pets/new"
              className="flex shrink-0 flex-col items-center gap-1.5"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-[hsl(var(--border))] text-2xl text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--secondary))] transition">
                +
              </div>
              <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">Agregar</span>
            </Link>
          </div>
        )}

        {/* ── main 2-col layout ── */}
        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">

          {/* ── feed column ── */}
          <div className="space-y-4 min-w-0">

            {/* feed tabs */}
            <div className="flex overflow-x-auto scrollbar-none -mx-1 px-1">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setMode(tab.value)}
                  className={cls(
                    "shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition mr-1",
                    mode === tab.value
                      ? "bg-[hsl(var(--primary))] text-white"
                      : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.5)]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* composer */}
            <Composer pets={pets} onPublish={handlePublish} isPublishing={isPublishing} />

            {/* feed */}
            {isLoading ? (
              <FeedSkeleton />
            ) : posts.length === 0 ? (
              <div className="rounded-3xl border border-[hsl(var(--border))] bg-white/70 p-8 text-center">
                <p className="text-4xl">🐾</p>
                <p className="mt-3 font-bold text-[hsl(var(--foreground))]">
                  {mode === "discover" ? "La comunidad está esperando sus primeras historias" :
                   mode === "following" ? "Aún no sigues a nadie — descubre perfiles" :
                   mode === "mine" ? "Aún no has publicado nada" :
                   "No tienes publicaciones guardadas"}
                </p>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  {mode === "discover" ? "Sé el primero en compartir." : "Empieza a explorar la comunidad."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onLike={handleLike}
                    onSave={handleSave}
                    onComment={handleComment}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── sidebar ── */}
          <aside className="space-y-4">

            {/* profile widget */}
            {isLoading ? (
              <SidebarSkeleton />
            ) : profile ? (
              <ProfileWidget profile={profile} pets={pets} />
            ) : null}

            {/* upcoming walks */}
            <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white/80 shadow-sm p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                Paseos y encuentros
              </p>
              {isLoading ? (
                <div className="mt-3 space-y-2">
                  {[1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-2xl bg-[hsl(var(--muted))]" />)}
                </div>
              ) : events.length === 0 ? (
                <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">
                  Sin encuentros activos por ahora.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {events.slice(0, 3).map((ev) => (
                    <div key={ev.id} className="flex items-center gap-3 rounded-2xl bg-[hsl(var(--muted)/0.4)] px-3 py-2.5">
                      <span className="text-xl">
                        {ev.type === "WALK" ? "🐕" : ev.type === "PLAYDATE" ? "🎾" : "🏕️"}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{ev.title}</p>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                          {ev.location.district ?? ev.location.city} · {eventTypeLabel(ev.type)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link
                href="/community/meet"
                className="mt-3 block w-full rounded-full border border-[hsl(var(--border))] py-2 text-center text-xs font-bold text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--muted)/0.4)]"
              >
                Ver todos los paseos
              </Link>
            </div>

            {/* news & tips */}
            <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white/80 shadow-sm p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                Tips y noticias
              </p>
              <div className="mt-3 space-y-1">
                {news.slice(0, 3).map((n) => (
                  <div key={n.id} className="rounded-2xl px-3 py-2.5 transition hover:bg-[hsl(var(--muted)/0.4)]">
                    <p className="text-xs font-semibold leading-snug text-[hsl(var(--foreground))]">{n.title}</p>
                  </div>
                ))}
                {news.length === 0 && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Sin novedades por ahora.</p>
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <Link
                  href="/news"
                  className="flex-1 rounded-full border border-[hsl(var(--border))] py-2 text-center text-xs font-bold text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--muted)/0.4)]"
                >
                  Noticias
                </Link>
                <Link
                  href="/forum"
                  className="flex-1 rounded-full border border-[hsl(var(--border))] py-2 text-center text-xs font-bold text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--muted)/0.4)]"
                >
                  Foro
                </Link>
              </div>
            </div>

          </aside>
        </div>
      </div>
    </AuthGate>
  );
}

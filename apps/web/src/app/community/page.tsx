"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { PageIntro } from "@/components/layout/page-intro";
import { useAuth } from "@/features/auth/auth-context";
import {
  addCommunityComment,
  createCommunityPost,
  deleteCommunityPost,
  getMyCommunityProfile,
  likeCommunityPost,
  listCommunityFeed,
  listMyPetSocialProfiles,
  saveCommunityPost,
  unlikeCommunityPost,
  unsaveCommunityPost
} from "@/features/community/community-api";
import type {
  CommunityFeedMode,
  CommunityPost,
  CommunityProfile,
  PetSocialProfileItem
} from "@/features/community/types";

const FEED_TABS: Array<{ value: CommunityFeedMode; label: string }> = [
  { value: "discover", label: "Descubrir" },
  { value: "following", label: "Siguiendo" },
  { value: "mine", label: "Mis posts" },
  { value: "saved", label: "Guardados" }
];

function formatDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Ahora";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function PostCard({
  post,
  isWorking,
  onLike,
  onSave,
  onDelete,
  onComment,
  isOwner
}: {
  post: CommunityPost;
  isWorking: boolean;
  onLike: () => void;
  onSave: () => void;
  onDelete: () => void;
  onComment: (body: string) => void;
  isOwner: boolean;
}) {
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);

  const handleComment = (e: FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      onComment(commentText.trim());
      setCommentText("");
    }
  };

  return (
    <article className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-0">
        <div className="h-10 w-10 rounded-full bg-[hsl(var(--muted))]">
          {post.author.avatarUrl ? (
            <img
              src={post.author.avatarUrl}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-[hsl(var(--muted-foreground))]">
              {post.author.fullName.charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/community/users/${post.author.id}`}
            className="block truncate font-semibold hover:underline"
          >
            {post.author.fullName}
          </Link>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {post.author.handle ? `@${post.author.handle}` : ""} · {formatDate(post.createdAt)}
          </p>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isWorking}
            className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
          >
            Eliminar
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="whitespace-pre-wrap">{post.body}</p>
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt=""
            className="mt-3 max-h-96 w-full rounded-lg object-cover"
          />
        )}
        {post.pet && (
          <Link
            href={`/pets/${post.pet.id}`}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-sm"
          >
            🐾 {post.pet.name}
          </Link>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 border-t border-[hsl(var(--border))] px-2 py-1">
        <button
          type="button"
          onClick={onLike}
          disabled={isWorking}
          className={`btn btn-ghost flex-1 ${post.viewer.liked ? "text-red-500" : ""}`}
        >
          {post.viewer.liked ? "❤️" : "🤍"} {post.metrics.likesCount || ""}
        </button>
        <button
          type="button"
          onClick={() => setShowComments(!showComments)}
          className="btn btn-ghost flex-1"
        >
          💬 {post.metrics.commentsCount || ""}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isWorking}
          className={`btn btn-ghost flex-1 ${post.viewer.saved ? "text-amber-500" : ""}`}
        >
          {post.viewer.saved ? "🔖" : "📑"}
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="border-t border-[hsl(var(--border))] p-4">
          {post.commentsPreview.length > 0 && (
            <div className="mb-3 space-y-2">
              {post.commentsPreview.map((comment) => (
                <div key={comment.id} className="text-sm">
                  <span className="font-semibold">{comment.author.fullName}</span>{" "}
                  <span className="text-[hsl(var(--muted-foreground))]">{comment.body}</span>
                </div>
              ))}
              {post.metrics.commentsCount > post.commentsPreview.length && (
                <Link
                  href={`/community/posts/${post.id}`}
                  className="text-sm text-[hsl(var(--secondary))]"
                >
                  Ver {post.metrics.commentsCount - post.commentsPreview.length} comentarios mas
                </Link>
              )}
            </div>
          )}
          {post.allowComments && (
            <form onSubmit={handleComment} className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Escribe un comentario..."
                className="flex-1"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || isWorking}
                className="btn btn-secondary"
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

export default function CommunityPage() {
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;
  const userId = session?.user.id;

  const [mode, setMode] = useState<CommunityFeedMode>("discover");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [petProfiles, setPetProfiles] = useState<PetSocialProfileItem[]>([]);

  const [postBody, setPostBody] = useState("");
  const [postPetId, setPostPetId] = useState("");
  const [showNewPost, setShowNewPost] = useState(false);

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [workingPostId, setWorkingPostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAll = async (feedMode: CommunityFeedMode) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [feed, me, pets] = await Promise.all([
        listCommunityFeed(accessToken, { mode: feedMode, limit: 30 }),
        getMyCommunityProfile(accessToken),
        listMyPetSocialProfiles(accessToken)
      ]);
      setPosts(feed);
      setProfile(me);
      setPetProfiles(pets);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar comunidad.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, mode]);

  const updatePostMetrics = (
    postId: string,
    snapshot: {
      likesCount: number;
      savesCount: number;
      sharesCount: number;
      commentsCount: number;
      liked: boolean;
      saved: boolean;
    }
  ) => {
    setPosts((current) =>
      current.map((p) =>
        p.id !== postId
          ? p
          : {
              ...p,
              metrics: {
                likesCount: snapshot.likesCount,
                savesCount: snapshot.savesCount,
                sharesCount: snapshot.sharesCount,
                commentsCount: snapshot.commentsCount
              },
              viewer: { ...p.viewer, liked: snapshot.liked, saved: snapshot.saved }
            }
      )
    );
  };

  const handleCreatePost = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!accessToken || !postBody.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const created = await createCommunityPost(accessToken, {
        body: postBody,
        petId: postPetId || undefined,
        visibility: "PUBLIC",
        allowComments: true
      });
      setPosts((current) => [created, ...current]);
      setPostBody("");
      setPostPetId("");
      setShowNewPost(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo publicar.");
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (post: CommunityPost) => {
    if (!accessToken) return;
    setWorkingPostId(post.id);
    try {
      const snapshot = post.viewer.liked
        ? await unlikeCommunityPost(accessToken, post.id)
        : await likeCommunityPost(accessToken, post.id);
      updatePostMetrics(post.id, snapshot);
    } catch {
      setError("No se pudo actualizar like.");
    } finally {
      setWorkingPostId(null);
    }
  };

  const handleSave = async (post: CommunityPost) => {
    if (!accessToken) return;
    setWorkingPostId(post.id);
    try {
      const snapshot = post.viewer.saved
        ? await unsaveCommunityPost(accessToken, post.id)
        : await saveCommunityPost(accessToken, post.id);
      updatePostMetrics(post.id, snapshot);
    } catch {
      setError("No se pudo guardar.");
    } finally {
      setWorkingPostId(null);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!accessToken || !confirm("Eliminar esta publicacion?")) return;
    setWorkingPostId(postId);
    try {
      await deleteCommunityPost(accessToken, postId);
      setPosts((current) => current.filter((p) => p.id !== postId));
    } catch {
      setError("No se pudo eliminar.");
    } finally {
      setWorkingPostId(null);
    }
  };

  const handleComment = async (post: CommunityPost, body: string) => {
    if (!accessToken) return;
    setWorkingPostId(post.id);
    try {
      const comment = await addCommunityComment(accessToken, post.id, { body });
      setPosts((current) =>
        current.map((p) =>
          p.id !== post.id
            ? p
            : {
                ...p,
                commentsPreview: [comment, ...p.commentsPreview].slice(0, 3),
                metrics: { ...p.metrics, commentsCount: p.metrics.commentsCount + 1 }
              }
        )
      );
    } catch {
      setError("No se pudo comentar.");
    } finally {
      setWorkingPostId(null);
    }
  };

  return (
    <AuthGate>
      <div className="space-y-4">
        <PageIntro
          title="Comunidad"
          description="Conecta con otros amantes de mascotas"
          actions={
            <Link href="/community/meet" className="btn btn-secondary">
              Encuentros
            </Link>
          }
        />

        {error && <InlineBanner tone="error">{error}</InlineBanner>}

        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          {/* Main feed */}
          <div className="space-y-4">
            {/* New post button */}
            {!showNewPost && (
              <button
                type="button"
                onClick={() => setShowNewPost(true)}
                className="card w-full p-4 text-left text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
              >
                Que quieres compartir hoy?
              </button>
            )}

            {/* New post form */}
            {showNewPost && (
              <form onSubmit={(e) => void handleCreatePost(e)} className="card p-4">
                <textarea
                  value={postBody}
                  onChange={(e) => setPostBody(e.target.value)}
                  placeholder="Comparte algo sobre tu mascota..."
                  rows={3}
                  autoFocus
                />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <select
                    value={postPetId}
                    onChange={(e) => setPostPetId(e.target.value)}
                    className="min-h-0 w-auto py-1.5 text-sm"
                  >
                    <option value="">Sin mascota</option>
                    {petProfiles.map((item) => (
                      <option key={item.pet.id} value={item.pet.id}>
                        {item.pet.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNewPost(false)}
                      className="btn btn-ghost"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={posting || !postBody.trim()}
                      className="btn btn-primary"
                    >
                      {posting ? "Publicando..." : "Publicar"}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Feed tabs */}
            <div className="flex gap-2 overflow-x-auto">
              {FEED_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setMode(tab.value)}
                  className={`btn whitespace-nowrap ${
                    mode === tab.value ? "btn-primary" : "btn-outline"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Posts */}
            {loading ? (
              <div className="card p-6 text-center text-[hsl(var(--muted-foreground))]">
                Cargando...
              </div>
            ) : posts.length === 0 ? (
              <div className="card p-6 text-center">
                <p className="text-[hsl(var(--muted-foreground))]">
                  {mode === "following"
                    ? "Sigue a otros usuarios para ver sus publicaciones aqui."
                    : mode === "saved"
                      ? "No tienes publicaciones guardadas."
                      : mode === "mine"
                        ? "Aun no has publicado nada."
                        : "No hay publicaciones para mostrar."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    isWorking={workingPostId === post.id}
                    onLike={() => void handleLike(post)}
                    onSave={() => void handleSave(post)}
                    onDelete={() => void handleDelete(post.id)}
                    onComment={(body) => void handleComment(post, body)}
                    isOwner={post.author.id === userId}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden space-y-4 lg:block">
            {/* Profile card */}
            {profile && (
              <div className="card p-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-[hsl(var(--muted))]">
                    {profile.profile.avatarUrl ? (
                      <img
                        src={profile.profile.avatarUrl}
                        alt=""
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-[hsl(var(--muted-foreground))]">
                        {profile.profile.displayName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{profile.profile.displayName}</p>
                    {profile.profile.handle && (
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        @{profile.profile.handle}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <p className="font-semibold">{profile.stats.posts}</p>
                    <p className="text-[hsl(var(--muted-foreground))]">Posts</p>
                  </div>
                  <div>
                    <p className="font-semibold">{profile.stats.followers}</p>
                    <p className="text-[hsl(var(--muted-foreground))]">Seguidores</p>
                  </div>
                  <div>
                    <p className="font-semibold">{profile.stats.following}</p>
                    <p className="text-[hsl(var(--muted-foreground))]">Siguiendo</p>
                  </div>
                </div>
                <Link href="/community/profile" className="btn btn-outline mt-3 w-full">
                  Editar perfil
                </Link>
              </div>
            )}

            {/* My pets */}
            {petProfiles.length > 0 && (
              <div className="card p-4">
                <h3 className="mb-3 font-semibold">Mis mascotas</h3>
                <div className="space-y-2">
                  {petProfiles.map((item) => (
                    <Link
                      key={item.pet.id}
                      href={`/pets/${item.pet.id}`}
                      className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-[hsl(var(--muted))]"
                    >
                      <div className="h-8 w-8 rounded-full bg-[hsl(var(--muted))]">
                        {item.pet.avatarUrl ? (
                          <img
                            src={item.pet.avatarUrl}
                            alt=""
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm">
                            🐾
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium">{item.pet.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Quick links */}
            <div className="card p-4">
              <h3 className="mb-3 font-semibold">Explorar</h3>
              <div className="space-y-1">
                <Link
                  href="/community/meet"
                  className="block rounded-lg p-2 text-sm transition-colors hover:bg-[hsl(var(--muted))]"
                >
                  🐕 Encuentros y paseos
                </Link>
                <Link
                  href="/lost-pets"
                  className="block rounded-lg p-2 text-sm transition-colors hover:bg-[hsl(var(--muted))]"
                >
                  🔍 Mascotas perdidas
                </Link>
                <Link
                  href="/news"
                  className="block rounded-lg p-2 text-sm transition-colors hover:bg-[hsl(var(--muted))]"
                >
                  📰 Noticias pet
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AuthGate>
  );
}

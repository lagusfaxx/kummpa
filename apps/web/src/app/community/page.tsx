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
  createCommunityReport,
  deleteCommunityComment,
  deleteCommunityPost,
  getMyCommunityProfile,
  likeCommunityPost,
  listCommunityFeed,
  listMyPetSocialProfiles,
  saveCommunityPost,
  shareCommunityPost,
  unlikeCommunityPost,
  unsaveCommunityPost,
  updateMyCommunityProfile,
  upsertPetSocialProfile
} from "@/features/community/community-api";
import type {
  CommunityFeedMode,
  CommunityPost,
  CommunityProfile,
  PetSocialProfileItem,
  SocialPostVisibility
} from "@/features/community/types";

const FEED_MODES: Array<{ value: CommunityFeedMode; label: string }> = [
  { value: "discover", label: "Descubrir" },
  { value: "following", label: "Siguiendo" },
  { value: "mine", label: "Mis publicaciones" },
  { value: "saved", label: "Guardadas" }
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

type PetDraft = { handle: string; bio: string; isPublic: boolean };

export default function CommunityPage() {
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;

  const [mode, setMode] = useState<CommunityFeedMode>("discover");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [petProfiles, setPetProfiles] = useState<PetSocialProfileItem[]>([]);
  const [petDrafts, setPetDrafts] = useState<Record<string, PetDraft>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const [postBody, setPostBody] = useState("");
  const [postImageUrl, setPostImageUrl] = useState("");
  const [postPetId, setPostPetId] = useState("");
  const [postVisibility, setPostVisibility] = useState<SocialPostVisibility>("PUBLIC");
  const [postAllowComments, setPostAllowComments] = useState(true);

  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [workingPostId, setWorkingPostId] = useState<string | null>(null);
  const [workingPetId, setWorkingPetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const syncProfile = (next: CommunityProfile) => {
    setProfile(next);
    setDisplayName(next.profile.displayName);
    setHandle(next.profile.handle ?? "");
    setBio(next.profile.bio ?? "");
    setIsPublic(next.profile.isPublic);
  };

  const syncPets = (items: PetSocialProfileItem[]) => {
    setPetProfiles(items);
    const nextDrafts: Record<string, PetDraft> = {};
    for (const item of items) {
      nextDrafts[item.pet.id] = {
        handle: item.profile.handle ?? "",
        bio: item.profile.bio ?? "",
        isPublic: item.profile.isPublic
      };
    }
    setPetDrafts(nextDrafts);
  };

  const loadAll = async (feedMode: CommunityFeedMode) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [feed, me, pets] = await Promise.all([
        listCommunityFeed(accessToken, { mode: feedMode, limit: 40 }),
        getMyCommunityProfile(accessToken),
        listMyPetSocialProfiles(accessToken)
      ]);
      setPosts(feed);
      syncProfile(me);
      syncPets(pets);
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

  const applySnapshot = (
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
      current.map((post) =>
        post.id !== postId
          ? post
          : {
              ...post,
              metrics: {
                likesCount: snapshot.likesCount,
                savesCount: snapshot.savesCount,
                sharesCount: snapshot.sharesCount,
                commentsCount: snapshot.commentsCount
              },
              viewer: { ...post.viewer, liked: snapshot.liked, saved: snapshot.saved }
            }
      )
    );
  };

  const handleCreatePost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !postBody.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const created = await createCommunityPost(accessToken, {
        body: postBody,
        imageUrl: postImageUrl || undefined,
        petId: postPetId || undefined,
        visibility: postVisibility,
        allowComments: postAllowComments
      });
      setPosts((current) => [created, ...current]);
      setPostBody("");
      setPostImageUrl("");
      setPostPetId("");
      setPostVisibility("PUBLIC");
      setPostAllowComments(true);
      setSuccess("Publicacion creada.");
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
      applySnapshot(post.id, snapshot);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No se pudo actualizar like.");
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
      applySnapshot(post.id, snapshot);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No se pudo actualizar guardado.");
    } finally {
      setWorkingPostId(null);
    }
  };

  const handleShare = async (postId: string) => {
    if (!accessToken) return;
    setWorkingPostId(postId);
    try {
      const snapshot = await shareCommunityPost(accessToken, postId, "community");
      applySnapshot(postId, snapshot);
      setSuccess("Compartido.");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No se pudo compartir.");
    } finally {
      setWorkingPostId(null);
    }
  };

  const handleAddComment = async (post: CommunityPost) => {
    if (!accessToken) return;
    const body = commentDrafts[post.id]?.trim() ?? "";
    if (!body) return;
    setWorkingPostId(post.id);
    try {
      const created = await addCommunityComment(accessToken, post.id, { body });
      setCommentDrafts((current) => ({ ...current, [post.id]: "" }));
      setPosts((current) =>
        current.map((item) =>
          item.id !== post.id
            ? item
            : {
                ...item,
                commentsPreview: [created, ...item.commentsPreview].slice(0, 3),
                metrics: { ...item.metrics, commentsCount: item.metrics.commentsCount + 1 }
              }
        )
      );
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : "No se pudo comentar.");
    } finally {
      setWorkingPostId(null);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!accessToken) return;
    setWorkingPostId(postId);
    try {
      await deleteCommunityComment(accessToken, postId, commentId);
      setPosts((current) =>
        current.map((item) =>
          item.id !== postId
            ? item
            : {
                ...item,
                commentsPreview: item.commentsPreview.filter((comment) => comment.id !== commentId),
                metrics: { ...item.metrics, commentsCount: Math.max(0, item.metrics.commentsCount - 1) }
              }
        )
      );
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : "No se pudo eliminar comentario.");
    } finally {
      setWorkingPostId(null);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!accessToken) return;
    setWorkingPostId(postId);
    try {
      await deleteCommunityPost(accessToken, postId);
      setPosts((current) => current.filter((post) => post.id !== postId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar publicación.");
    } finally {
      setWorkingPostId(null);
    }
  };

  const handleReportPost = async (postId: string) => {
    if (!accessToken) return;
    const reason = window.prompt("Motivo del reporte (min 10 caracteres):");
    if (!reason) return;
    try {
      await createCommunityReport(accessToken, { targetType: "POST", targetId: postId, reason });
      setSuccess("Reporte enviado.");
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "No se pudo reportar.");
    }
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;
    setSavingProfile(true);
    try {
      const updated = await updateMyCommunityProfile(accessToken, {
        displayName,
        handle,
        bio,
        isPublic
      });
      syncProfile(updated);
      setSuccess("Perfil actualizado.");
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : "No se pudo actualizar perfil.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePet = async (petId: string) => {
    if (!accessToken) return;
    const draft = petDrafts[petId];
    if (!draft) return;
    setWorkingPetId(petId);
    try {
      await upsertPetSocialProfile(accessToken, petId, draft);
      const refreshed = await listMyPetSocialProfiles(accessToken);
      syncPets(refreshed);
      setSuccess("Perfil de mascota actualizado.");
    } catch (petError) {
      setError(petError instanceof Error ? petError.message : "No se pudo actualizar mascota.");
    } finally {
      setWorkingPetId(null);
    }
  };

  const updatePetDraft = (petId: string, patch: Partial<PetDraft>) => {
    setPetDrafts((current) => {
      const base = current[petId] ?? { handle: "", bio: "", isPublic: false };
      return {
        ...current,
        [petId]: {
          ...base,
          ...patch
        }
      };
    });
  };

  return (
    <AuthGate>
      <div className="space-y-4">
        <PageIntro
          eyebrow="Social"
          title="Comunidad social"
          description="Publicaciones, comentarios, perfiles pet y encuentros en una experiencia mas expresiva y coherente con la nueva identidad visual."
          tone="community"
          actions={
            <Link href="/community/meet" className="kumpa-button-accent">
              Encuentros y paseos
            </Link>
          }
          metrics={[
            { value: String(posts.length), label: "posts visibles" },
            { value: String(petProfiles.length), label: "mascotas sociales" }
          ]}
        />
        {error && <InlineBanner tone="error">{error}</InlineBanner>}
        {success && <InlineBanner tone="success">{success}</InlineBanner>}

        <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="kumpa-panel p-4">
              <h2 className="text-lg font-bold text-slate-900">Mi perfil social</h2>
              {profile && (
                <p className="text-xs text-slate-500">
                  {profile.stats.posts} posts | {profile.stats.followers} seguidores
                </p>
              )}
              <form onSubmit={(event) => void handleSaveProfile(event)} className="mt-2 grid gap-2">
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Nombre visible" />
                <input value={handle} onChange={(event) => setHandle(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Handle" />
                <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={2} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Bio" />
                <label className="inline-flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />Perfil publico</label>
                <button type="submit" disabled={savingProfile} className="kumpa-button-primary">{savingProfile ? "Guardando..." : "Guardar"}</button>
              </form>
            </section>

            <section className="kumpa-panel p-4">
              <h2 className="text-lg font-bold text-slate-900">Mascotas sociales</h2>
              <div className="mt-2 space-y-3">
                {petProfiles.map((item) => (
                  <article key={item.pet.id} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">{item.pet.name}</p>
                    <input value={petDrafts[item.pet.id]?.handle ?? ""} onChange={(event) => updatePetDraft(item.pet.id, { handle: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" placeholder="Handle" />
                    <textarea value={petDrafts[item.pet.id]?.bio ?? ""} onChange={(event) => updatePetDraft(item.pet.id, { bio: event.target.value })} rows={2} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" placeholder="Bio" />
                    <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={petDrafts[item.pet.id]?.isPublic ?? false} onChange={(event) => updatePetDraft(item.pet.id, { isPublic: event.target.checked })} />Publico</label>
                    <button type="button" disabled={workingPetId === item.pet.id} onClick={() => { void handleSavePet(item.pet.id); }} className="mt-2 inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 disabled:opacity-60">{workingPetId === item.pet.id ? "Guardando..." : "Guardar mascota"}</button>
                  </article>
                ))}
              </div>
            </section>
          </aside>

          <section className="space-y-4">
            <section className="kumpa-panel p-4">
              <h2 className="text-lg font-bold text-slate-900">Nueva publicación</h2>
              <form onSubmit={(event) => void handleCreatePost(event)} className="mt-2 grid gap-2">
                <textarea value={postBody} onChange={(event) => setPostBody(event.target.value)} rows={3} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Comparte una historia pet..." />
                <input value={postImageUrl} onChange={(event) => setPostImageUrl(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="URL imagen (opcional)" />
                <select value={postPetId} onChange={(event) => setPostPetId(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Sin mascota asociada</option>
                  {petProfiles.map((item) => <option key={item.pet.id} value={item.pet.id}>{item.pet.name}</option>)}
                </select>
                <select value={postVisibility} onChange={(event) => setPostVisibility(event.target.value as SocialPostVisibility)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  <option value="PUBLIC">Publico</option>
                  <option value="FOLLOWERS">Seguidores</option>
                  <option value="PRIVATE">Privado</option>
                </select>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={postAllowComments} onChange={(event) => setPostAllowComments(event.target.checked)} />Permitir comentarios</label>
                <button type="submit" disabled={posting} className="kumpa-button-primary">{posting ? "Publicando..." : "Publicar"}</button>
              </form>
            </section>

            <section className="kumpa-panel p-4">
              <div className="flex flex-wrap gap-2">
                {FEED_MODES.map((item) => (
                  <button key={item.value} type="button" onClick={() => setMode(item.value)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === item.value ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700"}`}>
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            {loading ? (
              <div className="kumpa-panel p-6 text-sm text-slate-600">Cargando feed...</div>
            ) : posts.length === 0 ? (
              <div className="kumpa-panel p-6 text-sm text-slate-600">Sin publicaciones para este modo.</div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <article key={post.id} className="kumpa-panel p-4">
                    <Link href={`/community/users/${post.author.id}`} className="text-sm font-bold text-slate-900 underline">{post.author.fullName}</Link>
                    <p className="text-xs text-slate-500">@{post.author.handle ?? "sin-handle"} | {formatDate(post.createdAt)}</p>
                    <p className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">{post.body}</p>
                    {post.imageUrl && <a href={post.imageUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-brand-700 underline">Ver imagen</a>}
                    <p className="mt-2 text-xs text-slate-600">Likes {post.metrics.likesCount} | Comentarios {post.metrics.commentsCount} | Guardados {post.metrics.savesCount}</p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" disabled={workingPostId === post.id} onClick={() => { void handleLike(post); }} className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 disabled:opacity-60">{post.viewer.liked ? "Quitar like" : "Like"}</button>
                      <button type="button" disabled={workingPostId === post.id} onClick={() => { void handleSave(post); }} className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 disabled:opacity-60">{post.viewer.saved ? "Quitar guardado" : "Guardar"}</button>
                      <button type="button" disabled={workingPostId === post.id} onClick={() => { void handleShare(post.id); }} className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 disabled:opacity-60">Compartir</button>
                      {post.viewer.canReport && <button type="button" onClick={() => { void handleReportPost(post.id); }} className="inline-flex min-h-10 items-center rounded-lg border border-rose-300 px-3 text-xs font-semibold text-rose-700">Reportar</button>}
                      {post.viewer.canDelete && <button type="button" disabled={workingPostId === post.id} onClick={() => { void handleDeletePost(post.id); }} className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 disabled:opacity-60">Eliminar</button>}
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-700">Comentarios</p>
                      {post.commentsPreview.map((comment) => (
                        <div key={comment.id} className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
                          <p className="text-xs font-semibold text-slate-800">{comment.author.fullName}</p>
                          <p className="text-xs text-slate-600">{comment.body}</p>
                          {comment.permissions.canDelete && (
                            <button type="button" disabled={workingPostId === post.id} onClick={() => { void handleDeleteComment(post.id, comment.id); }} className="mt-1 text-[11px] font-semibold text-rose-700 underline">
                              Eliminar comentario
                            </button>
                          )}
                        </div>
                      ))}
                      {post.viewer.canComment && (
                        <div className="mt-2 flex gap-2">
                          <input value={commentDrafts[post.id] ?? ""} onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" placeholder="Escribe un comentario" />
                          <button type="button" disabled={workingPostId === post.id} onClick={() => { void handleAddComment(post); }} className="inline-flex min-h-10 items-center rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white disabled:opacity-60">
                            Enviar
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AuthGate>
  );
}


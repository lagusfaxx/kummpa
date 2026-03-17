"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { EmptyState } from "@/components/feedback/empty-state";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { SurfaceSkeleton } from "@/components/feedback/skeleton";
import { PageIntro } from "@/components/layout/page-intro";
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
import type { ForumTopicListItem } from "@/features/forum/types";
import { listNewsArticles } from "@/features/news/news-api";
import type { NewsArticleListItem } from "@/features/news/types";

const FEED_TABS: Array<{
  value: CommunityFeedMode;
  label: string;
  description: string;
}> = [
  {
    value: "discover",
    label: "Publicaciones",
    description: "Historias, recomendaciones y experiencias de la comunidad."
  },
  {
    value: "following",
    label: "Siguiendo",
    description: "Lo que comparten los perfiles que ya sigues."
  },
  {
    value: "mine",
    label: "Mis posts",
    description: "Tus historias, tips y actualizaciones de mascotas."
  },
  {
    value: "saved",
    label: "Guardados",
    description: "Contenido util para volver rapido cuando lo necesites."
  }
];

const LAYER_COPY = [
  {
    title: "Publicaciones",
    detail: "Historias, fotos y recomendaciones con identidad pet clara.",
    accent: "from-amber-50 via-white to-rose-50"
  },
  {
    title: "Encuentros y paseos",
    detail: "Paseos, playdates y actividades por zona para mascotas compatibles.",
    accent: "from-emerald-50 via-white to-teal-50"
  },
  {
    title: "Tips y consultas",
    detail: "Conversaciones utiles sobre salud, vacunas, alimentacion y entrenamiento.",
    accent: "from-sky-50 via-white to-cyan-50"
  },
  {
    title: "Noticias pet",
    detail: "Campanas, novedades y tendencias curadas dentro de la misma experiencia.",
    accent: "from-orange-50 via-white to-amber-50"
  }
] as const;

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function eventTypeLabel(type: GroupEvent["type"]) {
  if (type === "WALK") return "Paseo";
  if (type === "PLAYDATE") return "Playdate";
  if (type === "TRAINING") return "Entrenamiento";
  if (type === "HIKE") return "Salida";
  return "Actividad";
}

function invitationStatusLabel(status: WalkInvitation["status"]) {
  if (status === "PENDING") return "Pendiente";
  if (status === "ACCEPTED") return "Aceptada";
  if (status === "REJECTED") return "Rechazada";
  return "Cancelada";
}

function PostCard({
  post,
  onLike,
  onSave,
  onComment
}: {
  post: CommunityPost;
  onLike: (post: CommunityPost) => void;
  onSave: (post: CommunityPost) => void;
  onComment: (post: CommunityPost, body: string) => void;
}) {
  const [comment, setComment] = useState("");

  return (
    <article className="card overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
            {post.author.fullName}
          </p>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            {formatDate(post.createdAt)}
            {post.author.city ? ` | ${post.author.city}` : ""}
          </p>
        </div>
        {post.pet ? <span className="kumpa-chip whitespace-nowrap">{post.pet.name}</span> : null}
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[hsl(var(--foreground))]">
        {post.body}
      </p>

      {post.imageUrl ? (
        <img
          src={post.imageUrl}
          alt=""
          className="mt-4 h-60 w-full rounded-[1.5rem] object-cover"
        />
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="kumpa-chip">{post.metrics.likesCount} me gusta</span>
        <span className="kumpa-chip">{post.metrics.commentsCount} comentarios</span>
        <span className="kumpa-chip">{post.metrics.savesCount} guardados</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => onLike(post)} className="btn btn-outline text-xs">
          {post.viewer.liked ? "Quitar me gusta" : "Me gusta"}
        </button>
        <button type="button" onClick={() => onSave(post)} className="btn btn-outline text-xs">
          {post.viewer.saved ? "Quitar guardado" : "Guardar"}
        </button>
      </div>

      <div className="mt-4 rounded-[1.4rem] border border-[hsl(var(--border))] bg-white/70 p-4">
        <div className="space-y-2 text-sm">
          {post.commentsPreview.slice(0, 2).map((item) => (
            <p key={item.id} className="leading-6">
              <strong>{item.author.fullName}:</strong> {item.body}
            </p>
          ))}
          {post.commentsPreview.length === 0 ? (
            <p className="text-[hsl(var(--muted-foreground))]">
              Todavia no hay comentarios en esta historia.
            </p>
          ) : null}
        </div>

        {post.allowComments ? (
          <form
            className="mt-4 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!comment.trim()) return;
              onComment(post, comment.trim());
              setComment("");
            }}
          >
            <input
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Aporta algo util o cuenta si te paso lo mismo"
            />
            <button type="submit" className="btn btn-primary text-xs">
              Enviar
            </button>
          </form>
        ) : null}
      </div>
    </article>
  );
}

export default function CommunityPage() {
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;

  const [mode, setMode] = useState<CommunityFeedMode>("discover");
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [pets, setPets] = useState<PetSocialProfileItem[]>([]);
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [invitations, setInvitations] = useState<WalkInvitation[]>([]);
  const [topics, setTopics] = useState<ForumTopicListItem[]>([]);
  const [news, setNews] = useState<NewsArticleListItem[]>([]);
  const [postBody, setPostBody] = useState("");
  const [postPetId, setPostPetId] = useState("");
  const [postImageUrl, setPostImageUrl] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentTab = useMemo(
    () => FEED_TABS.find((tab) => tab.value === mode) ?? FEED_TABS[0]!,
    [mode]
  );
  const categoryHighlights = useMemo(
    () => Array.from(new Set(topics.map((topic) => topic.category.name))).slice(0, 4),
    [topics]
  );
  const visibleEvents = useMemo(() => events.slice(0, 4), [events]);
  const visibleInvitations = useMemo(() => invitations.slice(0, 4), [invitations]);
  const visibleTopics = useMemo(() => topics.slice(0, 4), [topics]);
  const visibleNews = useMemo(() => news.slice(0, 3), [news]);

  const loadPage = async (feedMode: CommunityFeedMode) => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);

    try {
      const [
        feedRows,
        profileRow,
        petRows,
        eventRows,
        invitationRows,
        topicRows,
        newsRows
      ] = await Promise.all([
        listCommunityFeed(accessToken, { mode: feedMode, limit: 20 }),
        getMyCommunityProfile(accessToken),
        listMyPetSocialProfiles(accessToken),
        listGroupEvents(accessToken, { limit: 6, includePast: false }),
        listWalkInvitations(accessToken, { role: "all", limit: 8 }),
        listForumTopics(accessToken, { limit: 6 }),
        listNewsArticles(accessToken, {
          featuredOnly: true,
          publishedOnly: true,
          limit: 4
        })
      ]);

      setPosts(feedRows);
      setProfile(profileRow);
      setPets(petRows);
      setEvents(eventRows);
      setInvitations(invitationRows);
      setTopics(topicRows);
      setNews(newsRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar comunidad.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPage(mode);
  }, [accessToken, mode]);

  const handleCreatePost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !postBody.trim()) return;

    setIsPublishing(true);
    setError(null);

    try {
      const created = await createCommunityPost(accessToken, {
        body: postBody.trim(),
        imageUrl: postImageUrl || undefined,
        petId: postPetId || undefined,
        visibility: "PUBLIC",
        allowComments: true
      });

      setPosts((current) => [created, ...current]);
      setPostBody("");
      setPostPetId("");
      setPostImageUrl("");
      setShowComposer(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo publicar.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleLike = async (post: CommunityPost) => {
    if (!accessToken) return;

    try {
      const snapshot = post.viewer.liked
        ? await unlikeCommunityPost(accessToken, post.id)
        : await likeCommunityPost(accessToken, post.id);

      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? {
                ...item,
                metrics: {
                  ...item.metrics,
                  likesCount: snapshot.likesCount
                },
                viewer: {
                  ...item.viewer,
                  liked: snapshot.liked
                }
              }
            : item
        )
      );
    } catch {
      setError("No se pudo actualizar me gusta.");
    }
  };

  const handleSave = async (post: CommunityPost) => {
    if (!accessToken) return;

    try {
      const snapshot = post.viewer.saved
        ? await unsaveCommunityPost(accessToken, post.id)
        : await saveCommunityPost(accessToken, post.id);

      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? {
                ...item,
                viewer: {
                  ...item.viewer,
                  saved: snapshot.saved
                },
                metrics: {
                  ...item.metrics,
                  savesCount: snapshot.savesCount
                }
              }
            : item
        )
      );
    } catch {
      setError("No se pudo guardar la publicacion.");
    }
  };

  const handleComment = async (post: CommunityPost, body: string) => {
    if (!accessToken) return;

    try {
      const comment = await addCommunityComment(accessToken, post.id, { body });
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? {
                ...item,
                commentsPreview: [comment, ...item.commentsPreview].slice(0, 3),
                metrics: {
                  ...item.metrics,
                  commentsCount: item.metrics.commentsCount + 1
                }
              }
            : item
        )
      );
    } catch {
      setError("No se pudo comentar la publicacion.");
    }
  };

  return (
    <AuthGate>
      <div className="space-y-6">
        <PageIntro
          eyebrow="Comunidad"
          title="Una comunidad pet util, viva y organizada por necesidades reales"
          description="Publicaciones, encuentros y paseos, tips y consultas, y noticias pet conviven en una misma portada. La experiencia prioriza ayuda, compania y descubrimiento por encima del feed vacio."
          tone="community"
          metrics={[
            { value: String(posts.length), label: "historias activas" },
            { value: String(events.length), label: "encuentros" },
            { value: String(topics.length), label: "consultas utiles" },
            { value: String(news.length), label: "novedades pet" }
          ]}
          actions={
            <>
              <button
                type="button"
                onClick={() => setShowComposer(true)}
                className="btn btn-primary"
              >
                Crear publicacion
              </button>
              <Link href="/community/meet" className="btn btn-outline">
                Encuentros y paseos
              </Link>
            </>
          }
        />

        {error ? <InlineBanner tone="error">{error}</InlineBanner> : null}

        {isLoading ? (
          <>
            <SurfaceSkeleton blocks={5} />
            <div className="grid gap-4 xl:grid-cols-3">
              <SurfaceSkeleton blocks={4} compact />
              <SurfaceSkeleton blocks={4} compact />
              <SurfaceSkeleton blocks={4} compact />
            </div>
          </>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {LAYER_COPY.map((item) => (
                <article
                  key={item.title}
                  className={`kumpa-soft-section bg-gradient-to-br p-5 ${item.accent}`}
                >
                  <p className="kumpa-eyebrow">{item.title}</p>
                  <p className="mt-3 text-sm leading-6 text-[hsl(var(--foreground))]">
                    {item.detail}
                  </p>
                </article>
              ))}
            </section>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
              <section className="space-y-4">
                <div className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="kumpa-eyebrow">Publicaciones</p>
                      <h2 className="mt-2 text-xl font-semibold">{currentTab.label}</h2>
                      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        {currentTab.description}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {FEED_TABS.map((tab) => (
                        <button
                          key={tab.value}
                          type="button"
                          onClick={() => setMode(tab.value)}
                          className={`kumpa-chip ${mode === tab.value ? "kumpa-chip-active" : ""}`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {!showComposer ? (
                    <button
                      type="button"
                      onClick={() => setShowComposer(true)}
                      className="mt-4 block w-full rounded-[1.5rem] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.6)] px-5 py-5 text-left text-sm text-[hsl(var(--muted-foreground))]"
                    >
                      Comparte una historia, una foto, una recomendacion o una experiencia con tu mascota.
                    </button>
                  ) : (
                    <form
                      onSubmit={(event) => void handleCreatePost(event)}
                      className="mt-4 space-y-3 rounded-[1.5rem] border border-[hsl(var(--border))] bg-white/75 p-4"
                    >
                      <textarea
                        rows={4}
                        value={postBody}
                        onChange={(event) => setPostBody(event.target.value)}
                        placeholder="Que paso hoy con tu mascota? Recomienda un lugar, cuenta una experiencia o deja un tip."
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <select
                          value={postPetId}
                          onChange={(event) => setPostPetId(event.target.value)}
                        >
                          <option value="">Publicar sin mascota asociada</option>
                          {pets.map((pet) => (
                            <option key={pet.pet.id} value={pet.pet.id}>
                              {pet.pet.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="url"
                          value={postImageUrl}
                          onChange={(event) => setPostImageUrl(event.target.value)}
                          placeholder="URL de foto opcional"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setShowComposer(false)}
                          className="btn btn-outline"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={isPublishing}
                          className="btn btn-primary"
                        >
                          {isPublishing ? "Publicando..." : "Publicar"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {posts.length === 0 ? (
                  <EmptyState
                    eyebrow="Comunidad"
                    title="Tu feed pet aun necesita sus primeras historias"
                    description="La comunidad gana valor cuando compartes paseos, recomendaciones, dudas o momentos con tus mascotas."
                    highlights={[
                      "recomendaciones locales",
                      "fotos y experiencias",
                      "tips comunitarios",
                      "ayuda entre duenos"
                    ]}
                    action={
                      <button
                        type="button"
                        onClick={() => setShowComposer(true)}
                        className="btn btn-primary"
                      >
                        Crear la primera publicacion
                      </button>
                    }
                  />
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
              </section>

              <aside className="space-y-4">
                {profile ? (
                  <section className="card p-5">
                    <p className="kumpa-eyebrow">Tu comunidad</p>
                    <h2 className="mt-2 text-xl font-semibold">
                      {profile.profile.displayName}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                      {profile.profile.bio ||
                        "Perfil listo para compartir historias, consejos y panoramas pet."}
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="kumpa-metric">
                        <p className="text-xl font-bold">{profile.stats.posts}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                          posts
                        </p>
                      </div>
                      <div className="kumpa-metric">
                        <p className="text-xl font-bold">{profile.stats.followers}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                          seguidores
                        </p>
                      </div>
                      <div className="kumpa-metric">
                        <p className="text-xl font-bold">{profile.stats.following}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                          siguiendo
                        </p>
                      </div>
                    </div>
                    {pets.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {pets.slice(0, 3).map((pet) => (
                          <span key={pet.pet.id} className="kumpa-chip">
                            {pet.pet.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </section>
                ) : null}

                <section className="card p-5">
                  <p className="kumpa-eyebrow">Encuentros y paseos</p>
                  <h2 className="mt-2 text-xl font-semibold">Planes y conexiones por zona</h2>
                  <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    Crea encuentros, revisa invitaciones pendientes y coordina actividades con otras mascotas compatibles.
                  </p>
                  <div className="mt-4 space-y-3">
                    {visibleInvitations.length === 0 ? (
                      <div className="rounded-[1.4rem] bg-[hsl(var(--muted)/0.7)] p-4 text-sm text-[hsl(var(--muted-foreground))]">
                        Aun no tienes invitaciones activas. Puedes abrir la seccion de paseos y descubrir perfiles compatibles.
                      </div>
                    ) : (
                      visibleInvitations.map((invitation) => (
                        <article
                          key={invitation.id}
                          className="rounded-[1.4rem] border border-[hsl(var(--border))] bg-white/70 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold">
                                {invitation.otherUser.fullName}
                              </p>
                              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                                {invitation.location.city || "Zona por definir"}
                                {invitation.location.district
                                  ? ` | ${invitation.location.district}`
                                  : ""}
                              </p>
                            </div>
                            <span className="kumpa-chip">
                              {invitationStatusLabel(invitation.status)}
                            </span>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                  <div className="mt-4">
                    <Link href="/community/meet" className="btn btn-primary">
                      Ver encuentros y paseos
                    </Link>
                  </div>
                </section>

                <section className="card p-5">
                  <p className="kumpa-eyebrow">Tips y consultas</p>
                  <h2 className="mt-2 text-xl font-semibold">Temas que mas mueve la comunidad</h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {categoryHighlights.length === 0 ? (
                      <span className="kumpa-chip">salud general</span>
                    ) : (
                      categoryHighlights.map((item) => (
                        <span key={item} className="kumpa-chip">
                          {item}
                        </span>
                      ))
                    )}
                  </div>
                  <div className="mt-4">
                    <Link href="/forum" className="btn btn-outline">
                      Abrir tips y consultas
                    </Link>
                  </div>
                </section>
              </aside>
            </div>

            <section className="grid gap-5 xl:grid-cols-3">
              <article className="card p-5">
                <p className="kumpa-eyebrow">Encuentros y paseos</p>
                <h2 className="mt-2 text-xl font-semibold">Actividades pet-friendly cerca</h2>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  Paseos, playdates, grupos y salidas compartidas con contexto claro de zona, fecha y compatibilidad.
                </p>
                <div className="mt-4 space-y-3">
                  {visibleEvents.length === 0 ? (
                    <div className="rounded-[1.4rem] bg-[hsl(var(--muted)/0.7)] p-4 text-sm text-[hsl(var(--muted-foreground))]">
                      Aun no hay encuentros activos. Puedes crear uno nuevo desde la seccion de paseos.
                    </div>
                  ) : (
                    visibleEvents.map((event) => (
                      <article
                        key={event.id}
                        className="rounded-[1.4rem] border border-[hsl(var(--border))] bg-white/70 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{event.title}</p>
                            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                              {event.location.city}
                              {event.location.district ? ` | ${event.location.district}` : ""}
                            </p>
                          </div>
                          <span className="kumpa-chip">{eventTypeLabel(event.type)}</span>
                        </div>
                        <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                          {formatDate(event.startsAt)} | {event.metrics.attendeeCount} asistentes
                        </p>
                      </article>
                    ))
                  )}
                </div>
                <div className="mt-4">
                  <Link href="/community/meet" className="btn btn-outline">
                    Crear o unirme
                  </Link>
                </div>
              </article>

              <article className="card p-5">
                <p className="kumpa-eyebrow">Tips y consultas</p>
                <h2 className="mt-2 text-xl font-semibold">Preguntas utiles, no ruido</h2>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  Salud, alimentacion, vacunas, entrenamiento y experiencias con servicios en un solo lugar.
                </p>
                <div className="mt-4 space-y-3">
                  {visibleTopics.length === 0 ? (
                    <div className="rounded-[1.4rem] bg-[hsl(var(--muted)/0.7)] p-4 text-sm text-[hsl(var(--muted-foreground))]">
                      Todavia no hay consultas destacadas.
                    </div>
                  ) : (
                    visibleTopics.map((topic) => (
                      <article
                        key={topic.id}
                        className="rounded-[1.4rem] border border-[hsl(var(--border))] bg-white/70 p-4"
                      >
                        <p className="text-sm font-semibold">{topic.title}</p>
                        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                          {topic.category.name} | {topic.metrics.repliesCount} respuestas
                        </p>
                        {topic.tags.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {topic.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="kumpa-chip">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>
                <div className="mt-4">
                  <Link href="/forum" className="btn btn-outline">
                    Ir al foro
                  </Link>
                </div>
              </article>

              <article className="card p-5">
                <p className="kumpa-eyebrow">Noticias pet</p>
                <h2 className="mt-2 text-xl font-semibold">Campanas, productos y novedades</h2>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  La portada de comunidad tambien sirve para enterarte de alertas sanitarias, lanzamientos y panoramas pet.
                </p>
                <div className="mt-4 space-y-3">
                  {visibleNews.length === 0 ? (
                    <div className="rounded-[1.4rem] bg-[hsl(var(--muted)/0.7)] p-4 text-sm text-[hsl(var(--muted-foreground))]">
                      No hay noticias destacadas por ahora.
                    </div>
                  ) : (
                    visibleNews.map((article) => (
                      <article
                        key={article.id}
                        className="overflow-hidden rounded-[1.4rem] border border-[hsl(var(--border))] bg-white/70"
                      >
                        {article.coverImageUrl ? (
                          <img
                            src={article.coverImageUrl}
                            alt=""
                            className="h-32 w-full object-cover"
                          />
                        ) : null}
                        <div className="p-4">
                          <p className="text-sm font-semibold">{article.title}</p>
                          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                            {article.category.label}
                            {article.publishedAt ? ` | ${formatDate(article.publishedAt)}` : ""}
                          </p>
                          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                            {article.excerpt}
                          </p>
                        </div>
                      </article>
                    ))
                  )}
                </div>
                <div className="mt-4">
                  <Link href="/news" className="btn btn-outline">
                    Ver noticias pet
                  </Link>
                </div>
              </article>
            </section>
          </>
        )}
      </div>
    </AuthGate>
  );
}

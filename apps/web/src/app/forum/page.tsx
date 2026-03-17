"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { PageIntro } from "@/components/layout/page-intro";
import { useAuth } from "@/features/auth/auth-context";
import {
  createForumReply,
  createForumReport,
  createForumTopic,
  getForumTopic,
  listForumCategories,
  listForumReports,
  listForumTopics,
  moderateForumReply,
  moderateForumTopic,
  reviewForumReport,
  unvoteReplyUseful,
  voteReplyUseful
} from "@/features/forum/forum-api";
import type { ForumCategory, ForumReport, ForumTopicDetail, ForumTopicListItem } from "@/features/forum/types";

const FORUM_DISCLAIMER =
  "Disclaimer: este foro no reemplaza atencion veterinaria profesional. Ante urgencias, consulta a un veterinario.";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

export default function ForumPage() {
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;
  const isAdmin = session?.user.role === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [topics, setTopics] = useState<ForumTopicListItem[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<ForumTopicDetail | null>(null);
  const [reports, setReports] = useState<ForumReport[]>([]);

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  const [newCategory, setNewCategory] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newTags, setNewTags] = useState("");

  const [replyBody, setReplyBody] = useState("");
  const [quotedReplyId, setQuotedReplyId] = useState("");

  const selectedQuotedReply = useMemo(
    () => selectedTopic?.replies.find((reply) => reply.id === quotedReplyId) ?? null,
    [selectedTopic, quotedReplyId]
  );

  const loadTopicDetail = async (topicId: string) => {
    if (!accessToken) return;
    const detail = await getForumTopic(accessToken, topicId);
    setSelectedTopic(detail);
    setSelectedTopicId(topicId);
  };

  const loadTopics = async (topicIdToSelect?: string) => {
    if (!accessToken) return;
    const items = await listForumTopics(accessToken, {
      q: query || undefined,
      category: categoryFilter || undefined,
      tag: tagFilter || undefined,
      limit: 50
    });
    setTopics(items);

    const nextTopicId = topicIdToSelect ?? items[0]?.id ?? "";
    if (nextTopicId) {
      await loadTopicDetail(nextTopicId);
    } else {
      setSelectedTopicId("");
      setSelectedTopic(null);
    }
  };

  const loadReports = async () => {
    if (!accessToken || !isAdmin) return;
    const rows = await listForumReports(accessToken, { openOnly: false, limit: 80 });
    setReports(rows);
  };

  const loadAll = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [categoryRows] = await Promise.all([listForumCategories(accessToken), loadTopics()]);
      setCategories(categoryRows);
      if (!newCategory && categoryRows.length > 0) {
        setNewCategory(categoryRows[0]?.slug ?? "");
      }
      if (isAdmin) {
        await loadReports();
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el foro.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;
    setWorkingId("search");
    setError(null);
    try {
      await loadTopics();
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "No se pudo buscar temas.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleCreateTopic = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;
    if (!newCategory) {
      setError("Selecciona una categoria para crear el tema.");
      return;
    }

    setWorkingId("new-topic");
    setError(null);
    try {
      const created = await createForumTopic(accessToken, {
        categorySlug: newCategory,
        title: newTitle,
        body: newBody,
        tags: newTags
          .split(",")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean)
      });

      setNewTitle("");
      setNewBody("");
      setNewTags("");
      setSuccess("Tema creado.");
      await loadTopics(created.id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear el tema.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleCreateReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !selectedTopicId || !replyBody.trim()) return;
    setWorkingId("new-reply");
    setError(null);
    try {
      await createForumReply(accessToken, selectedTopicId, {
        body: replyBody,
        quotedReplyId: quotedReplyId || undefined
      });
      setReplyBody("");
      setQuotedReplyId("");
      await loadTopicDetail(selectedTopicId);
      await loadTopics(selectedTopicId);
      setSuccess("Respuesta publicada.");
    } catch (replyError) {
      setError(replyError instanceof Error ? replyError.message : "No se pudo publicar la respuesta.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleToggleUseful = async (replyId: string, voted: boolean) => {
    if (!accessToken || !selectedTopicId) return;
    setWorkingId(`useful-${replyId}`);
    setError(null);
    try {
      if (voted) {
        await unvoteReplyUseful(accessToken, replyId);
      } else {
        await voteReplyUseful(accessToken, replyId);
      }
      await loadTopicDetail(selectedTopicId);
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : "No se pudo actualizar el voto.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleReport = async (targetType: "TOPIC" | "REPLY", targetId: string) => {
    if (!accessToken) return;
    const reason = window.prompt("Motivo del reporte (min. 10 caracteres):");
    if (!reason) return;

    setWorkingId(`report-${targetId}`);
    setError(null);
    try {
      await createForumReport(accessToken, { targetType, targetId, reason });
      if (isAdmin) {
        await loadReports();
      }
      setSuccess("Reporte enviado.");
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "No se pudo enviar el reporte.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleModerateTopic = async (payload: {
    isPinned?: boolean;
    isLocked?: boolean;
    deleted?: boolean;
  }) => {
    if (!accessToken || !selectedTopicId) return;
    setWorkingId(`topic-moderation-${selectedTopicId}`);
    setError(null);
    try {
      const updated = await moderateForumTopic(accessToken, selectedTopicId, payload);
      setSelectedTopic(updated);
      await loadTopics(selectedTopicId);
      if (isAdmin) {
        await loadReports();
      }
      setSuccess("Moderacion de tema aplicada.");
    } catch (moderationError) {
      setError(moderationError instanceof Error ? moderationError.message : "No se pudo moderar tema.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleModerateReply = async (replyId: string, deleted: boolean) => {
    if (!accessToken || !selectedTopicId) return;
    setWorkingId(`reply-moderation-${replyId}`);
    setError(null);
    try {
      await moderateForumReply(accessToken, replyId, { deleted });
      await loadTopicDetail(selectedTopicId);
      setSuccess("Moderacion de respuesta aplicada.");
    } catch (moderationError) {
      setError(
        moderationError instanceof Error ? moderationError.message : "No se pudo moderar respuesta."
      );
    } finally {
      setWorkingId(null);
    }
  };

  const handleReviewReport = async (reportId: string, status: "REVIEWED" | "DISMISSED") => {
    if (!accessToken) return;
    const notes = window.prompt("Notas de revision (opcional):") ?? undefined;
    setWorkingId(`review-${reportId}`);
    setError(null);
    try {
      await reviewForumReport(accessToken, reportId, {
        status,
        reviewNotes: notes
      });
      await loadReports();
      setSuccess("Reporte revisado.");
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "No se pudo revisar reporte.");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <AuthGate>
      <div className="space-y-4">
        <PageIntro
          eyebrow="Conocimiento"
          title="Foros y tips"
          description={FORUM_DISCLAIMER}
          tone="community"
          metrics={[
            { value: String(topics.length), label: "temas" },
            { value: String(categories.length), label: "categorias" }
          ]}
        />

        {error && <InlineBanner tone="error">{error}</InlineBanner>}
        {success && <InlineBanner tone="success">{success}</InlineBanner>}

        {loading ? (
          <div className="kumpa-panel p-6 text-sm text-slate-600">
            Cargando foro...
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_360px]">
            <aside className="space-y-4">
              <section className="kumpa-panel p-4">
                <h2 className="text-lg font-bold text-slate-900">Buscar temas</h2>
                <form className="mt-2 grid gap-2" onSubmit={(event) => void handleSearch(event)}>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Buscar por titulo o contenido"
                  />
                  <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Todas las categorias</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={tagFilter}
                    onChange={(event) => setTagFilter(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Tag (ej: vacunas)"
                  />
                  <button
                    type="submit"
                    disabled={workingId === "search"}
                    className="kumpa-button-primary"
                  >
                    {workingId === "search" ? "Buscando..." : "Buscar"}
                  </button>
                </form>
              </section>

              <section className="kumpa-panel p-4">
                <h2 className="text-lg font-bold text-slate-900">Nuevo tema</h2>
                <form className="mt-2 grid gap-2" onSubmit={(event) => void handleCreateTopic(event)}>
                  <select
                    value={newCategory}
                    onChange={(event) => setNewCategory(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Selecciona categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={newTitle}
                    onChange={(event) => setNewTitle(event.target.value)}
                    required
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Titulo"
                  />
                  <textarea
                    value={newBody}
                    onChange={(event) => setNewBody(event.target.value)}
                    required
                    rows={4}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Describe tu consulta o experiencia"
                  />
                  <input
                    value={newTags}
                    onChange={(event) => setNewTags(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Tags separados por coma"
                  />
                  <button
                    type="submit"
                    disabled={workingId === "new-topic"}
                    className="kumpa-button-primary"
                  >
                    {workingId === "new-topic" ? "Publicando..." : "Crear tema"}
                  </button>
                </form>
              </section>
            </aside>

            <section className="space-y-4">
              <section className="kumpa-panel p-4">
                <h2 className="text-lg font-bold text-slate-900">Temas</h2>
                <div className="mt-2 space-y-2">
                  {topics.length === 0 ? (
                    <p className="text-sm text-slate-600">No hay temas para este filtro.</p>
                  ) : (
                    topics.map((topic) => (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => {
                          void loadTopicDetail(topic.id);
                        }}
                        className={`w-full rounded-xl border p-3 text-left ${
                          topic.id === selectedTopicId
                            ? "border-slate-900 bg-slate-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <p className="text-sm font-bold text-slate-900">{topic.title}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {topic.category.name} | {topic.metrics.repliesCount} respuestas
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-700">{topic.excerpt}</p>
                        {topic.tags.length > 0 && (
                          <p className="mt-1 text-[11px] text-slate-500">#{topic.tags.join(" #")}</p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </section>

              {selectedTopic ? (
                <section className="kumpa-panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">{selectedTopic.title}</h3>
                      <p className="text-xs text-slate-600">
                        {selectedTopic.category.name} | {selectedTopic.author.fullName} |{" "}
                        {formatDate(selectedTopic.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          void handleReport("TOPIC", selectedTopic.id);
                        }}
                        className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700"
                      >
                        Reportar
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              void handleModerateTopic({ isPinned: !selectedTopic.moderation.isPinned });
                            }}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                          >
                            {selectedTopic.moderation.isPinned ? "Quitar pin" : "Fijar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleModerateTopic({ isLocked: !selectedTopic.moderation.isLocked });
                            }}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                          >
                            {selectedTopic.moderation.isLocked ? "Desbloquear" : "Bloquear"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleModerateTopic({ deleted: !selectedTopic.moderation.isDeleted });
                            }}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                          >
                            {selectedTopic.moderation.isDeleted ? "Restaurar" : "Ocultar"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800">{selectedTopic.body}</p>
                  {selectedTopic.tags.length > 0 && (
                    <p className="mt-2 text-xs text-slate-600">Tags: #{selectedTopic.tags.join(" #")}</p>
                  )}

                  <div className="mt-4 rounded-xl bg-slate-50 p-3">
                    <h4 className="text-sm font-bold text-slate-900">Respuestas</h4>
                    <div className="mt-2 space-y-2">
                      {selectedTopic.replies.length === 0 ? (
                        <p className="text-xs text-slate-600">Aun no hay respuestas.</p>
                      ) : (
                        selectedTopic.replies.map((reply) => (
                          <article key={reply.id} className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-slate-800">
                                {reply.author.fullName} | {formatDate(reply.createdAt)}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  disabled={workingId === `useful-${reply.id}`}
                                  onClick={() => {
                                    void handleToggleUseful(reply.id, reply.viewer.votedUseful);
                                  }}
                                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-60"
                                >
                                  {reply.viewer.votedUseful ? "Quitar util" : "Votar util"} ({reply.metrics.usefulVotes})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setQuotedReplyId(reply.id)}
                                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                                >
                                  Citar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleReport("REPLY", reply.id);
                                  }}
                                  className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700"
                                >
                                  Reportar
                                </button>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    disabled={workingId === `reply-moderation-${reply.id}`}
                                    onClick={() => {
                                      void handleModerateReply(reply.id, true);
                                    }}
                                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                                  >
                                    Ocultar
                                  </button>
                                )}
                              </div>
                            </div>

                            {reply.quotedReply && (
                              <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-600">
                                Cita a {reply.quotedReply.authorName}: {reply.quotedReply.bodyExcerpt}
                              </p>
                            )}
                            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{reply.body}</p>
                          </article>
                        ))
                      )}
                    </div>

                    {selectedTopic.viewer.canReply ? (
                      <form className="mt-3 grid gap-2" onSubmit={(event) => void handleCreateReply(event)}>
                        {selectedQuotedReply && (
                          <p className="rounded-lg bg-white px-2 py-1 text-xs text-slate-600">
                            Citando respuesta de {selectedQuotedReply.author.fullName}
                            <button
                              type="button"
                              onClick={() => setQuotedReplyId("")}
                              className="ml-2 font-semibold text-slate-800 underline"
                            >
                              quitar
                            </button>
                          </p>
                        )}
                        <textarea
                          value={replyBody}
                          onChange={(event) => setReplyBody(event.target.value)}
                          required
                          rows={3}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          placeholder="Escribe tu respuesta"
                        />
                        <button
                          type="submit"
                          disabled={workingId === "new-reply"}
                          className="kumpa-button-primary"
                        >
                          {workingId === "new-reply" ? "Publicando..." : "Responder"}
                        </button>
                      </form>
                    ) : (
                      <p className="mt-3 text-xs text-slate-600">Este tema esta bloqueado para respuestas.</p>
                    )}
                  </div>
                </section>
              ) : (
                <section className="kumpa-panel p-6 text-sm text-slate-600">
                  Selecciona un tema para ver el detalle.
                </section>
              )}
            </section>

            <aside className="space-y-4">
              <section className="kumpa-panel p-4">
                <h2 className="text-lg font-bold text-slate-900">Categorias</h2>
                <div className="mt-2 space-y-2">
                  {categories.map((category) => (
                    <div key={category.id} className="rounded-xl border border-slate-200 p-3">
                      <p className="text-sm font-semibold text-slate-900">{category.name}</p>
                      <p className="text-xs text-slate-600">{category.description}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{category.stats.topicsCount} temas</p>
                    </div>
                  ))}
                </div>
              </section>

              {isAdmin && (
                <section className="kumpa-panel p-4">
                  <h2 className="text-lg font-bold text-slate-900">Moderacion</h2>
                  <div className="mt-2 max-h-80 space-y-2 overflow-y-auto pr-1">
                    {reports.length === 0 ? (
                      <p className="text-xs text-slate-600">Sin reportes.</p>
                    ) : (
                      reports.map((report) => (
                        <article key={report.id} className="rounded-xl border border-slate-200 p-3">
                          <p className="text-xs font-semibold text-slate-800">
                            {report.targetType} | {report.status}
                          </p>
                          <p className="mt-1 text-xs text-slate-700">{report.reason}</p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {report.reporter.fullName} | {formatDate(report.createdAt)}
                          </p>
                          {report.status === "OPEN" && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                disabled={workingId === `review-${report.id}`}
                                onClick={() => {
                                  void handleReviewReport(report.id, "REVIEWED");
                                }}
                                className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700"
                              >
                                Revisado
                              </button>
                              <button
                                type="button"
                                disabled={workingId === `review-${report.id}`}
                                onClick={() => {
                                  void handleReviewReport(report.id, "DISMISSED");
                                }}
                                className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                              >
                                Descartar
                              </button>
                            </div>
                          )}
                        </article>
                      ))
                    )}
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


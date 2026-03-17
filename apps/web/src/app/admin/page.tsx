"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { EmptyState } from "@/components/feedback/empty-state";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { SurfaceSkeleton } from "@/components/feedback/skeleton";
import {
  getAdminSummary,
  listAdminPets,
  listAdminUsers,
  updateAdminPet,
  updateAdminUser
} from "@/features/admin/admin-api";
import type { AdminPetItem, AdminSummary, AdminUserItem } from "@/features/admin/types";
import { listAppointments } from "@/features/appointments/appointments-api";
import type {
  AppointmentRecord,
  AppointmentStatus,
  ProviderType
} from "@/features/appointments/types";
import {
  deleteCommunityPost,
  listCommunityReports,
  reviewCommunityReport
} from "@/features/community/community-api";
import type { CommunityReport } from "@/features/community/types";
import {
  listForumReports,
  moderateForumReply,
  moderateForumTopic,
  reviewForumReport
} from "@/features/forum/forum-api";
import type { ForumReport } from "@/features/forum/types";
import { useAuth } from "@/features/auth/auth-context";
import { listLostPetAlerts, updateLostPetAlert } from "@/features/lost-pets/lost-pets-api";
import type { LostPetAlert, LostPetAlertStatus } from "@/features/lost-pets/types";
import { listBenefits, updateBenefit } from "@/features/benefits/benefits-api";
import type { BenefitItem, BenefitProviderType } from "@/features/benefits/types";
import { listNewsArticles, updateNewsArticle } from "@/features/news/news-api";
import type { NewsArticleListItem } from "@/features/news/types";
import { useToast } from "@/features/ui/toast-context";

const roleOptions = ["OWNER", "VET", "CAREGIVER", "SHOP", "ADMIN"] as const;
const appointmentStatusOptions: AppointmentStatus[] = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
  "RESCHEDULED"
];
const providerTypeOptions: Array<ProviderType | BenefitProviderType> = [
  "VET",
  "CAREGIVER",
  "SHOP",
  "GROOMING",
  "HOTEL",
  "OTHER"
];

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function MetricCard({
  label,
  value,
  helper
}: {
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-600">{helper}</p>
    </article>
  );
}

export default function AdminPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const accessToken = session?.tokens.accessToken;
  const isAdmin = session?.user.role === "ADMIN";

  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [pets, setPets] = useState<AdminPetItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [communityReports, setCommunityReports] = useState<CommunityReport[]>([]);
  const [forumReports, setForumReports] = useState<ForumReport[]>([]);
  const [lostAlerts, setLostAlerts] = useState<LostPetAlert[]>([]);
  const [benefits, setBenefits] = useState<BenefitItem[]>([]);
  const [news, setNews] = useState<NewsArticleListItem[]>([]);

  const [userQuery, setUserQuery] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userStatus, setUserStatus] = useState<"active" | "deleted" | "unverified" | "all">(
    "active"
  );

  const [petQuery, setPetQuery] = useState("");
  const [petSpecies, setPetSpecies] = useState("");
  const [petVisibility, setPetVisibility] = useState<"public" | "private" | "all">("all");
  const [petStatus, setPetStatus] = useState<"active" | "deleted" | "all">("active");

  const [appointmentStatus, setAppointmentStatus] = useState("");
  const [appointmentProviderType, setAppointmentProviderType] = useState("");
  const [lostStatus, setLostStatus] = useState<LostPetAlertStatus | "">("");

  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    if (!accessToken) return;
    setSummary(await getAdminSummary(accessToken));
  }, [accessToken]);

  const loadUsers = useCallback(async () => {
    if (!accessToken) return;
    const data = await listAdminUsers(accessToken, {
      q: userQuery || undefined,
      role: (userRole || undefined) as (typeof roleOptions)[number] | undefined,
      status: userStatus,
      limit: 80
    });
    setUsers(data);
  }, [accessToken, userQuery, userRole, userStatus]);

  const loadPets = useCallback(async () => {
    if (!accessToken) return;
    const data = await listAdminPets(accessToken, {
      q: petQuery || undefined,
      species: petSpecies || undefined,
      visibility: petVisibility,
      status: petStatus,
      limit: 80
    });
    setPets(data);
  }, [accessToken, petQuery, petSpecies, petStatus, petVisibility]);

  const loadAppointments = useCallback(async () => {
    if (!accessToken) return;
    const data = await listAppointments(accessToken, {
      view: "all",
      status: appointmentStatus ? [appointmentStatus as AppointmentStatus] : undefined,
      providerType: (appointmentProviderType || undefined) as ProviderType | undefined,
      limit: 80
    });
    setAppointments(data);
  }, [accessToken, appointmentProviderType, appointmentStatus]);

  const loadCommunityReports = useCallback(async () => {
    if (!accessToken) return;
    setCommunityReports(await listCommunityReports(accessToken, { openOnly: true, limit: 20 }));
  }, [accessToken]);

  const loadForumReports = useCallback(async () => {
    if (!accessToken) return;
    setForumReports(await listForumReports(accessToken, { openOnly: true, limit: 20 }));
  }, [accessToken]);

  const loadLostAlerts = useCallback(async () => {
    if (!accessToken) return;
    setLostAlerts(
      await listLostPetAlerts(accessToken, {
        status: lostStatus || undefined,
        activeOnly: false,
        limit: 20
      })
    );
  }, [accessToken, lostStatus]);

  const loadBenefits = useCallback(async () => {
    if (!accessToken) return;
    setBenefits(
      await listBenefits(accessToken, {
        activeOnly: false,
        validOnly: false,
        sortBy: "recent",
        limit: 20
      })
    );
  }, [accessToken]);

  const loadNews = useCallback(async () => {
    if (!accessToken) return;
    setNews(
      await listNewsArticles(accessToken, {
        publishedOnly: false,
        sortBy: "recent",
        limit: 20
      })
    );
  }, [accessToken]);

  const loadAll = useCallback(async () => {
    if (!accessToken || !isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadSummary(),
        loadUsers(),
        loadPets(),
        loadAppointments(),
        loadCommunityReports(),
        loadForumReports(),
        loadLostAlerts(),
        loadBenefits(),
        loadNews()
      ]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el panel admin.");
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    isAdmin,
    loadAppointments,
    loadBenefits,
    loadCommunityReports,
    loadForumReports,
    loadLostAlerts,
    loadNews,
    loadPets,
    loadSummary,
    loadUsers
  ]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const runAction = async (id: string, fn: () => Promise<void>) => {
    setWorkingId(id);
    setError(null);
    setSuccess(null);
    try {
      await fn();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No se pudo completar la accion.");
    } finally {
      setWorkingId(null);
    }
  };

  const notifySuccess = (message: string, description?: string) => {
    setSuccess(message);
    showToast({
      tone: "success",
      title: message,
      description
    });
  };

  const handleVerifyUser = async (user: AdminUserItem) => {
    await runAction(`user-verify-${user.id}`, async () => {
      await updateAdminUser(accessToken!, user.id, { markEmailVerified: true });
      await Promise.all([loadUsers(), loadSummary()]);
      notifySuccess(`Usuario ${user.email} verificado.`);
    });
  };

  const handleToggleUserDeleted = async (user: AdminUserItem) => {
    const nextDeleted = !user.flags.isDeleted;
    const confirmed = window.confirm(
      nextDeleted
        ? `Desactivar a ${user.email}? Se revocaran sus sesiones activas.`
        : `Restaurar a ${user.email}?`
    );
    if (!confirmed) return;

    await runAction(`user-delete-${user.id}`, async () => {
      await updateAdminUser(accessToken!, user.id, { deleted: nextDeleted });
      await Promise.all([loadUsers(), loadSummary()]);
      notifySuccess(nextDeleted ? "Usuario desactivado." : "Usuario restaurado.");
    });
  };

  const handleTogglePetVisibility = async (pet: AdminPetItem) => {
    await runAction(`pet-visibility-${pet.id}`, async () => {
      await updateAdminPet(accessToken!, pet.id, { isPublic: !pet.isPublic });
      await Promise.all([loadPets(), loadSummary()]);
      notifySuccess("Visibilidad de mascota actualizada.");
    });
  };

  const handleTogglePetDeleted = async (pet: AdminPetItem) => {
    const nextDeleted = !pet.flags.isDeleted;
    const confirmed = window.confirm(
      nextDeleted ? `Eliminar logicamente a ${pet.name}?` : `Restaurar a ${pet.name}?`
    );
    if (!confirmed) return;

    await runAction(`pet-delete-${pet.id}`, async () => {
      await updateAdminPet(accessToken!, pet.id, { deleted: nextDeleted });
      await Promise.all([loadPets(), loadSummary()]);
      notifySuccess(nextDeleted ? "Mascota archivada." : "Mascota restaurada.");
    });
  };

  const handleCommunityReview = async (
    reportId: string,
    status: "REVIEWED" | "DISMISSED",
    notes?: string
  ) => {
    await runAction(`community-review-${reportId}`, async () => {
      await reviewCommunityReport(accessToken!, reportId, {
        status,
        reviewNotes: notes
      });
      await Promise.all([loadCommunityReports(), loadSummary()]);
      notifySuccess("Reporte comunitario revisado.");
    });
  };

  const handleCommunityDeletePost = async (report: CommunityReport) => {
    if (!report.target.postId) return;
    const confirmed = window.confirm("Eliminar la publicacion reportada y marcar el reporte como revisado?");
    if (!confirmed) return;

    await runAction(`community-delete-${report.id}`, async () => {
      await deleteCommunityPost(accessToken!, report.target.postId!);
      await reviewCommunityReport(accessToken!, report.id, {
        status: "REVIEWED",
        reviewNotes: "Publicacion eliminada por admin"
      });
      await Promise.all([loadCommunityReports(), loadSummary()]);
      notifySuccess("Publicacion eliminada y reporte cerrado.");
    });
  };

  const handleForumReview = async (
    reportId: string,
    status: "REVIEWED" | "DISMISSED",
    notes?: string
  ) => {
    await runAction(`forum-review-${reportId}`, async () => {
      await reviewForumReport(accessToken!, reportId, {
        status,
        reviewNotes: notes
      });
      await Promise.all([loadForumReports(), loadSummary()]);
      notifySuccess("Reporte de foro revisado.");
    });
  };

  const handleForumHideTopic = async (report: ForumReport) => {
    if (!report.target.topicId) return;
    const confirmed = window.confirm("Ocultar el tema reportado y cerrar el reporte?");
    if (!confirmed) return;

    await runAction(`forum-topic-${report.id}`, async () => {
      await moderateForumTopic(accessToken!, report.target.topicId!, { deleted: true });
      await reviewForumReport(accessToken!, report.id, {
        status: "REVIEWED",
        reviewNotes: "Tema ocultado por admin"
      });
      await Promise.all([loadForumReports(), loadSummary()]);
      notifySuccess("Tema ocultado.");
    });
  };

  const handleForumHideReply = async (report: ForumReport) => {
    if (!report.target.replyId) return;
    const confirmed = window.confirm("Ocultar la respuesta reportada y cerrar el reporte?");
    if (!confirmed) return;

    await runAction(`forum-reply-${report.id}`, async () => {
      await moderateForumReply(accessToken!, report.target.replyId!, { deleted: true });
      await reviewForumReport(accessToken!, report.id, {
        status: "REVIEWED",
        reviewNotes: "Respuesta ocultada por admin"
      });
      await Promise.all([loadForumReports(), loadSummary()]);
      notifySuccess("Respuesta ocultada.");
    });
  };

  const handleLostAlertStatus = async (alert: LostPetAlert, status: LostPetAlertStatus) => {
    const confirmed = window.confirm(`Cambiar estado de ${alert.pet.name} a ${status}?`);
    if (!confirmed) return;

    await runAction(`lost-alert-${alert.id}-${status}`, async () => {
      await updateLostPetAlert(accessToken!, alert.id, { status });
      await Promise.all([loadLostAlerts(), loadSummary()]);
      notifySuccess("Alerta actualizada.");
    });
  };

  const handleToggleBenefitActive = async (benefit: BenefitItem) => {
    await runAction(`benefit-active-${benefit.id}`, async () => {
      await updateBenefit(accessToken!, benefit.id, {
        isActive: !benefit.flags.isActive
      });
      await Promise.all([loadBenefits(), loadSummary()]);
      notifySuccess("Beneficio actualizado.");
    });
  };

  const handleToggleBenefitFeatured = async (benefit: BenefitItem) => {
    await runAction(`benefit-featured-${benefit.id}`, async () => {
      await updateBenefit(accessToken!, benefit.id, {
        isFeatured: !benefit.flags.isFeatured
      });
      await loadBenefits();
      notifySuccess("Destacado de beneficio actualizado.");
    });
  };

  const handleToggleNewsPublished = async (article: NewsArticleListItem) => {
    await runAction(`news-published-${article.id}`, async () => {
      await updateNewsArticle(accessToken!, article.id, {
        isPublished: !article.flags.isPublished,
        publishedAt: article.flags.isPublished ? null : article.publishedAt ?? new Date().toISOString()
      });
      await Promise.all([loadNews(), loadSummary()]);
      notifySuccess("Estado de publicacion actualizado.");
    });
  };

  const handleToggleNewsFeatured = async (article: NewsArticleListItem) => {
    await runAction(`news-featured-${article.id}`, async () => {
      await updateNewsArticle(accessToken!, article.id, {
        isFeatured: !article.flags.isFeatured
      });
      await loadNews();
      notifySuccess("Destacado de noticia actualizado.");
    });
  };

  return (
    <AuthGate>
      {!isAdmin ? (
        <EmptyState
          eyebrow="Admin"
          title="Acceso restringido"
          description="Este panel esta disponible solo para cuentas con rol ADMIN."
        />
      ) : loading ? (
        <div className="space-y-4">
          <SurfaceSkeleton blocks={3} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SurfaceSkeleton compact className="min-h-[160px]" />
            <SurfaceSkeleton compact className="min-h-[160px]" />
            <SurfaceSkeleton compact className="min-h-[160px]" />
            <SurfaceSkeleton compact className="min-h-[160px]" />
          </div>
          <SurfaceSkeleton blocks={5} />
        </div>
      ) : (
        <div className="space-y-4">
          <header className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Panel admin</h1>
                <p className="text-sm text-slate-600">
                  Operacion centralizada de usuarios, mascotas, moderacion, reservas y contenido.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/community" className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700">
                  Comunidad
                </Link>
                <Link href="/forum" className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700">
                  Foro
                </Link>
                <Link href="/benefits" className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700">
                  Beneficios
                </Link>
                <Link href="/news" className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700">
                  Noticias
                </Link>
              </div>
            </div>
          </header>

          {error && <InlineBanner tone="error">{error}</InlineBanner>}
          {success && <InlineBanner tone="success">{success}</InlineBanner>}

          {summary && (
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Usuarios activos" value={summary.users.active} helper={`${summary.users.unverified} sin verificar`} />
              <MetricCard label="Mascotas activas" value={summary.pets.active} helper={`${summary.pets.public} publicas`} />
              <MetricCard label="Reservas pendientes" value={summary.appointments.pending} helper={`${summary.appointments.upcoming} proximas`} />
              <MetricCard label="Moderacion abierta" value={summary.moderation.communityReportsOpen + summary.moderation.forumReportsOpen} helper={`${summary.moderation.lostPetAlertsActive} alertas activas`} />
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Gestion de usuarios</h2>
                <p className="text-sm text-slate-600">Filtros, verificacion y activacion segura.</p>
              </div>
              <form
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  void runAction("users-filter", async () => {
                    await loadUsers();
                  });
                }}
                className="flex flex-wrap gap-2"
              >
                <input value={userQuery} onChange={(event) => setUserQuery(event.target.value)} placeholder="Buscar usuario" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                <select value={userRole} onChange={(event) => setUserRole(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Todos los roles</option>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <select value={userStatus} onChange={(event) => setUserStatus(event.target.value as typeof userStatus)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  <option value="active">Activos</option>
                  <option value="deleted">Eliminados</option>
                  <option value="unverified">Sin verificar</option>
                  <option value="all">Todos</option>
                </select>
                <button type="submit" disabled={workingId === "users-filter"} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
                  Filtrar
                </button>
              </form>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="pb-2 pr-3">Usuario</th>
                    <th className="pb-2 pr-3">Rol</th>
                    <th className="pb-2 pr-3">Estado</th>
                    <th className="pb-2 pr-3">Actividad</th>
                    <th className="pb-2 pr-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-slate-100 align-top">
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-slate-900">{user.fullName}</p>
                        <p className="text-xs text-slate-600">{user.email}</p>
                        <p className="text-xs text-slate-500">
                          Pets {user.stats.petsCount} · Posts {user.stats.postsCount}
                        </p>
                      </td>
                      <td className="py-3 pr-3 text-xs font-semibold text-slate-700">{user.role}</td>
                      <td className="py-3 pr-3 text-xs text-slate-600">
                        <p>{user.flags.isDeleted ? "Desactivado" : "Activo"}</p>
                        <p>{user.flags.isVerified ? "Verificado" : "Pendiente"}</p>
                      </td>
                      <td className="py-3 pr-3 text-xs text-slate-600">
                        <p>Creado: {formatDate(user.createdAt)}</p>
                        <p>Login: {formatDate(user.lastLoginAt)}</p>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {!user.flags.isVerified && (
                            <button
                              type="button"
                              disabled={workingId === `user-verify-${user.id}`}
                              onClick={() => {
                                void handleVerifyUser(user);
                              }}
                              className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700"
                            >
                              Verificar
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={workingId === `user-delete-${user.id}`}
                            onClick={() => {
                              void handleToggleUserDeleted(user);
                            }}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                          >
                            {user.flags.isDeleted ? "Restaurar" : "Desactivar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Gestion de mascotas</h2>
                <p className="text-sm text-slate-600">Visibilidad, archivado y acceso al perfil.</p>
              </div>
              <form
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  void runAction("pets-filter", async () => {
                    await loadPets();
                  });
                }}
                className="flex flex-wrap gap-2"
              >
                <input value={petQuery} onChange={(event) => setPetQuery(event.target.value)} placeholder="Buscar mascota" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                <input value={petSpecies} onChange={(event) => setPetSpecies(event.target.value)} placeholder="Especie" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                <select value={petVisibility} onChange={(event) => setPetVisibility(event.target.value as typeof petVisibility)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  <option value="all">Todas</option>
                  <option value="public">Publicas</option>
                  <option value="private">Privadas</option>
                </select>
                <select value={petStatus} onChange={(event) => setPetStatus(event.target.value as typeof petStatus)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  <option value="active">Activas</option>
                  <option value="deleted">Eliminadas</option>
                  <option value="all">Todas</option>
                </select>
                <button type="submit" disabled={workingId === "pets-filter"} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
                  Filtrar
                </button>
              </form>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="pb-2 pr-3">Mascota</th>
                    <th className="pb-2 pr-3">Tutor</th>
                    <th className="pb-2 pr-3">Estado</th>
                    <th className="pb-2 pr-3">Metricas</th>
                    <th className="pb-2 pr-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pets.map((pet) => (
                    <tr key={pet.id} className="border-t border-slate-100 align-top">
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-slate-900">{pet.name}</p>
                        <p className="text-xs text-slate-600">
                          {pet.species} · {pet.breed}
                        </p>
                      </td>
                      <td className="py-3 pr-3">
                        <p className="text-xs font-semibold text-slate-800">{pet.owner.fullName}</p>
                        <p className="text-xs text-slate-500">{pet.owner.email}</p>
                      </td>
                      <td className="py-3 pr-3 text-xs text-slate-600">
                        <p>{pet.flags.isDeleted ? "Archivada" : "Activa"}</p>
                        <p>{pet.isPublic ? "Publica" : "Privada"}</p>
                      </td>
                      <td className="py-3 pr-3 text-xs text-slate-600">
                        <p>Vacunas: {pet.stats.vaccinesCount}</p>
                        <p>Reservas: {pet.stats.appointmentsCount}</p>
                        <p>Alertas: {pet.stats.lostAlertsCount}</p>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link href={`/pets/${pet.id}`} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
                            Ver
                          </Link>
                          <button
                            type="button"
                            disabled={workingId === `pet-visibility-${pet.id}`}
                            onClick={() => {
                              void handleTogglePetVisibility(pet);
                            }}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                          >
                            {pet.isPublic ? "Privar" : "Publicar"}
                          </button>
                          <button
                            type="button"
                            disabled={workingId === `pet-delete-${pet.id}`}
                            onClick={() => {
                              void handleTogglePetDeleted(pet);
                            }}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                          >
                            {pet.flags.isDeleted ? "Restaurar" : "Archivar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Reservas</h2>
                <p className="text-sm text-slate-600">Revision global de agenda y estados.</p>
              </div>
              <form
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  void runAction("appointments-filter", async () => {
                    await loadAppointments();
                  });
                }}
                className="flex flex-wrap gap-2"
              >
                <select value={appointmentStatus} onChange={(event) => setAppointmentStatus(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Todos los estados</option>
                  {appointmentStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <select value={appointmentProviderType} onChange={(event) => setAppointmentProviderType(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Todos los proveedores</option>
                  {providerTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <button type="submit" disabled={workingId === "appointments-filter"} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
                  Filtrar
                </button>
              </form>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="pb-2 pr-3">Mascota</th>
                    <th className="pb-2 pr-3">Servicio</th>
                    <th className="pb-2 pr-3">Proveedor</th>
                    <th className="pb-2 pr-3">Fecha</th>
                    <th className="pb-2 pr-3">Estado</th>
                    <th className="pb-2 pr-3 text-right">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment.id} className="border-t border-slate-100">
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-slate-900">{appointment.pet.name}</p>
                        <p className="text-xs text-slate-500">{appointment.owner.fullName}</p>
                      </td>
                      <td className="py-3 pr-3 text-xs text-slate-700">
                        <p>{appointment.serviceTypeLabel}</p>
                        {appointment.appointmentService && <p>{appointment.appointmentService.title}</p>}
                      </td>
                      <td className="py-3 pr-3 text-xs text-slate-700">{appointment.provider.providerName}</td>
                      <td className="py-3 pr-3 text-xs text-slate-700">{formatDate(appointment.scheduledAt)}</td>
                      <td className="py-3 pr-3 text-xs font-semibold text-slate-700">{appointment.status}</td>
                      <td className="py-3 text-right">
                        <Link href={`/appointments/${appointment.id}`} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-900">Moderacion comunidad</h2>
                <button type="button" onClick={() => { void loadCommunityReports(); }} className="text-xs font-semibold text-brand-700 underline">
                  Recargar
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {communityReports.length === 0 ? (
                  <EmptyState
                    eyebrow="Moderacion"
                    title="Sin reportes abiertos"
                    description="No hay publicaciones comunitarias pendientes de revision."
                  />
                ) : (
                  communityReports.map((report) => (
                    <article key={report.id} className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs font-semibold text-slate-800">
                        {report.targetType} · {report.reporter.fullName}
                      </p>
                      <p className="mt-1 text-sm text-slate-700">{report.reason}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{report.target.excerpt ?? "Sin extracto"}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {report.target.postId && (
                          <button type="button" disabled={workingId === `community-delete-${report.id}`} onClick={() => { void handleCommunityDeletePost(report); }} className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700">
                            Eliminar post
                          </button>
                        )}
                        <button type="button" disabled={workingId === `community-review-${report.id}`} onClick={() => { void handleCommunityReview(report.id, "REVIEWED"); }} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700">
                          Revisado
                        </button>
                        <button type="button" disabled={workingId === `community-review-${report.id}`} onClick={() => { void handleCommunityReview(report.id, "DISMISSED"); }} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
                          Descartar
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-900">Moderacion foro</h2>
                <button type="button" onClick={() => { void loadForumReports(); }} className="text-xs font-semibold text-brand-700 underline">
                  Recargar
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {forumReports.length === 0 ? (
                  <EmptyState
                    eyebrow="Moderacion"
                    title="Sin reportes abiertos"
                    description="No hay temas ni respuestas del foro pendientes de revision."
                  />
                ) : (
                  forumReports.map((report) => (
                    <article key={report.id} className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs font-semibold text-slate-800">
                        {report.targetType} · {report.reporter.fullName}
                      </p>
                      <p className="mt-1 text-sm text-slate-700">{report.reason}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {report.target.topicTitle ?? report.target.replyExcerpt ?? "Sin contexto"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {report.target.topicId && (
                          <button type="button" disabled={workingId === `forum-topic-${report.id}`} onClick={() => { void handleForumHideTopic(report); }} className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700">
                            Ocultar tema
                          </button>
                        )}
                        {report.target.replyId && (
                          <button type="button" disabled={workingId === `forum-reply-${report.id}`} onClick={() => { void handleForumHideReply(report); }} className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700">
                            Ocultar respuesta
                          </button>
                        )}
                        <button type="button" disabled={workingId === `forum-review-${report.id}`} onClick={() => { void handleForumReview(report.id, "REVIEWED"); }} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700">
                          Revisado
                        </button>
                        <button type="button" disabled={workingId === `forum-review-${report.id}`} onClick={() => { void handleForumReview(report.id, "DISMISSED"); }} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
                          Descartar
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-900">Alertas perdidas</h2>
                <form
                  onSubmit={(event: FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    void runAction("lost-filter", async () => {
                      await loadLostAlerts();
                    });
                  }}
                  className="flex gap-2"
                >
                  <select value={lostStatus} onChange={(event) => setLostStatus(event.target.value as LostPetAlertStatus | "")} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    <option value="">Todas</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="FOUND">FOUND</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                  <button type="submit" disabled={workingId === "lost-filter"} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
                    Filtrar
                  </button>
                </form>
              </div>
              <div className="mt-3 space-y-2">
                {lostAlerts.map((alert) => (
                  <article key={alert.id} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">{alert.pet.name}</p>
                    <p className="text-xs text-slate-600">
                      {alert.status} · {formatDate(alert.lastSeenAt)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{alert.lastSeenAddress ?? "Sin direccion"}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link href={`/lost-pets/${alert.id}`} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
                        Abrir
                      </Link>
                      {alert.status !== "FOUND" && (
                        <button type="button" disabled={workingId === `lost-alert-${alert.id}-FOUND`} onClick={() => { void handleLostAlertStatus(alert, "FOUND"); }} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700">
                          Marcar found
                        </button>
                      )}
                      {alert.status !== "CLOSED" && (
                        <button type="button" disabled={workingId === `lost-alert-${alert.id}-CLOSED`} onClick={() => { void handleLostAlertStatus(alert, "CLOSED"); }} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
                          Cerrar
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-bold text-slate-900">Beneficios</h2>
              <div className="mt-3 space-y-2">
                {benefits.map((benefit) => (
                  <article key={benefit.id} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">{benefit.title}</p>
                    <p className="text-xs text-slate-600">
                      {benefit.provider.type} · {benefit.flags.isActive ? "Activo" : "Inactivo"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" disabled={workingId === `benefit-active-${benefit.id}`} onClick={() => { void handleToggleBenefitActive(benefit); }} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
                        {benefit.flags.isActive ? "Desactivar" : "Activar"}
                      </button>
                      <button type="button" disabled={workingId === `benefit-featured-${benefit.id}`} onClick={() => { void handleToggleBenefitFeatured(benefit); }} className="rounded-lg border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-700">
                        {benefit.flags.isFeatured ? "Quitar destacado" : "Destacar"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-bold text-slate-900">Noticias</h2>
              <div className="mt-3 space-y-2">
                {news.map((article) => (
                  <article key={article.id} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">{article.title}</p>
                    <p className="text-xs text-slate-600">
                      {article.category.label} · {article.flags.isPublished ? "Publicada" : "Borrador"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" disabled={workingId === `news-published-${article.id}`} onClick={() => { void handleToggleNewsPublished(article); }} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
                        {article.flags.isPublished ? "Despublicar" : "Publicar"}
                      </button>
                      <button type="button" disabled={workingId === `news-featured-${article.id}`} onClick={() => { void handleToggleNewsFeatured(article); }} className="rounded-lg border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-700">
                        {article.flags.isFeatured ? "Quitar destacada" : "Destacar"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>
        </div>
      )}
    </AuthGate>
  );
}

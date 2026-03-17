"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/features/auth/auth-context";
import {
  followCommunityProfile,
  getCommunityProfile,
  listCommunityProfilePosts,
  unfollowCommunityProfile
} from "@/features/community/community-api";
import type { CommunityPost, CommunityProfile } from "@/features/community/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

export default function CommunityUserProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = typeof params.userId === "string" ? params.userId : "";
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;

  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!accessToken || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const [profileData, postsData] = await Promise.all([
        getCommunityProfile(accessToken, userId),
        listCommunityProfilePosts(accessToken, userId, 40)
      ]);
      setProfile(profileData);
      setPosts(postsData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el perfil.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, userId]);

  const handleToggleFollow = async () => {
    if (!accessToken || !profile || !profile.viewer.canFollow) return;
    setWorking(true);
    setError(null);
    try {
      const updated = profile.viewer.isFollowing
        ? await unfollowCommunityProfile(accessToken, profile.user.id)
        : await followCommunityProfile(accessToken, profile.user.id);
      setProfile(updated);
    } catch (followError) {
      setError(followError instanceof Error ? followError.message : "No se pudo actualizar follow.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <AuthGate>
      <div className="space-y-4">
        <header className="rounded-2xl border border-slate-200 bg-white p-4">
          <Link href="/community" className="text-xs font-semibold text-brand-700 underline">
            Volver a comunidad
          </Link>
          <h1 className="text-2xl font-black text-slate-900">Perfil social</h1>
        </header>

        {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

        {loading || !profile ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Cargando perfil...
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{profile.profile.displayName}</h2>
                  <p className="text-xs text-slate-500">@{profile.profile.handle ?? "sin-handle"}</p>
                  {profile.profile.bio && (
                    <p className="mt-2 text-sm text-slate-700">{profile.profile.bio}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    {profile.stats.posts} posts | {profile.stats.followers} seguidores |{" "}
                    {profile.stats.following} siguiendo
                  </p>
                </div>
                {profile.viewer.canFollow && (
                  <button
                    type="button"
                    disabled={working}
                    onClick={() => {
                      void handleToggleFollow();
                    }}
                    className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {profile.viewer.isFollowing ? "Dejar de seguir" : "Seguir"}
                  </button>
                )}
              </div>
            </section>

            <section className="space-y-3">
              {posts.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                  Este perfil aun no tiene publicaciones visibles.
                </div>
              ) : (
                posts.map((post) => (
                  <article key={post.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs text-slate-500">{formatDate(post.createdAt)}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{post.body}</p>
                    {post.imageUrl && (
                      <a
                        href={post.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-xs font-semibold text-brand-700 underline"
                      >
                        Ver imagen
                      </a>
                    )}
                  </article>
                ))
              )}
            </section>
          </>
        )}
      </div>
    </AuthGate>
  );
}

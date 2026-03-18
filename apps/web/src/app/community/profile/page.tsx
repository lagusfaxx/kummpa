"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { InlineBanner } from "@/components/feedback/inline-banner";
import { useAuth } from "@/features/auth/auth-context";
import {
  getMyCommunityProfile,
  likeCommunityPost,
  listCommunityFeed,
  listMyPetSocialProfiles,
  saveCommunityPost,
  unlikeCommunityPost,
  unsaveCommunityPost
} from "@/features/community/community-api";
import type {
  CommunityPost,
  CommunityProfile,
  PetSocialProfileItem
} from "@/features/community/types";

/* ─── helpers ─────────────────────────────────────────────── */
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

/* ─── Avatar ──────────────────────────────────────────────── */
function Avatar({
  src, name, size = "md",
}: {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const dim =
    size === "sm"  ? "h-8  w-8  text-[10px]" :
    size === "lg"  ? "h-16 w-16 text-lg"      :
    size === "xl"  ? "h-24 w-24 text-2xl"     :
                     "h-10 w-10 text-xs";

  if (src) return <img src={src} alt={name ?? ""} className={cls(dim, "rounded-full object-cover shrink-0 ring-4 ring-white")} />;
  return (
    <div className={cls(dim, "flex shrink-0 items-center justify-center rounded-full bg-[hsl(155_48%_42%/0.15)] font-black text-[hsl(155_48%_28%)] ring-4 ring-white")}>
      {initials(name)}
    </div>
  );
}

/* ─── Mini post card (for profile grid) ──────────────────── */
function MiniPostCard({
  post, onLike, onSave,
}: {
  post: CommunityPost;
  onLike: (p: CommunityPost) => void;
  onSave: (p: CommunityPost) => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-white/85 shadow-sm p-4">
      {post.imageUrl && (
        <div className="mb-3 overflow-hidden rounded-xl">
          <img src={post.imageUrl} alt="" className="w-full h-36 object-cover" />
        </div>
      )}
      <p className="text-xs leading-relaxed text-[hsl(var(--foreground))] line-clamp-3">{post.body}</p>
      {post.pet && (
        <Link href={`/pets/${post.pet.id}`}
          className="mt-2 inline-flex items-center gap-1 rounded-full bg-[hsl(155_48%_42%/0.1)] px-2.5 py-0.5 text-[10px] font-semibold text-[hsl(155_48%_28%)] hover:bg-[hsl(155_48%_42%/0.18)] transition">
          🐾 {post.pet.name}
        </Link>
      )}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{relativeTime(post.createdAt)}</span>
        <div className="flex gap-3">
          <button type="button" onClick={() => onLike(post)}
            className={cls("text-xs font-semibold transition", post.viewer.liked ? "text-red-500" : "text-[hsl(var(--muted-foreground))] hover:text-red-400")}>
            {post.viewer.liked ? "❤️" : "🤍"} {post.metrics.likesCount}
          </button>
          <button type="button" onClick={() => onSave(post)}
            className={cls("text-xs font-semibold transition", post.viewer.saved ? "text-amber-500" : "text-[hsl(var(--muted-foreground))] hover:text-amber-400")}>
            {post.viewer.saved ? "🔖" : "🏷️"} {post.metrics.savesCount}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ─── Skeleton ────────────────────────────────────────────── */
function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-36 animate-pulse rounded-3xl bg-[hsl(var(--muted))]" />
      <div className="px-4 space-y-3">
        <div className="h-4 w-1/3 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */
type Tab = "posts" | "pets" | "saved";

export default function CommunityProfilePage() {
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;

  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [pets, setPets] = useState<PetSocialProfileItem[]>([]);
  const [myPosts, setMyPosts] = useState<CommunityPost[]>([]);
  const [savedPosts, setSavedPosts] = useState<CommunityPost[]>([]);
  const [tab, setTab] = useState<Tab>("posts");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    setIsLoading(true);
    Promise.all([
      getMyCommunityProfile(accessToken),
      listMyPetSocialProfiles(accessToken),
      listCommunityFeed(accessToken, { mode: "mine", limit: 30 }),
      listCommunityFeed(accessToken, { mode: "saved", limit: 30 }),
    ])
      .then(([profileRow, petRows, myRows, savedRows]) => {
        setProfile(profileRow);
        setPets(petRows);
        setMyPosts(myRows);
        setSavedPosts(savedRows);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el perfil."))
      .finally(() => setIsLoading(false));
  }, [accessToken]);

  const handleLike = async (post: CommunityPost, list: CommunityPost[], setter: (p: CommunityPost[]) => void) => {
    if (!accessToken) return;
    try {
      const snap = post.viewer.liked
        ? await unlikeCommunityPost(accessToken, post.id)
        : await likeCommunityPost(accessToken, post.id);
      setter(list.map((p) =>
        p.id === post.id
          ? { ...p, metrics: { ...p.metrics, likesCount: snap.likesCount }, viewer: { ...p.viewer, liked: snap.liked } }
          : p
      ));
    } catch { setError("No se pudo actualizar me gusta."); }
  };

  const handleSave = async (post: CommunityPost, list: CommunityPost[], setter: (p: CommunityPost[]) => void) => {
    if (!accessToken) return;
    try {
      const snap = post.viewer.saved
        ? await unsaveCommunityPost(accessToken, post.id)
        : await saveCommunityPost(accessToken, post.id);
      setter(list.map((p) =>
        p.id === post.id
          ? { ...p, metrics: { ...p.metrics, savesCount: snap.savesCount }, viewer: { ...p.viewer, saved: snap.saved } }
          : p
      ));
    } catch { setError("No se pudo guardar."); }
  };

  const displayName = profile?.profile.displayName ?? session?.user.firstName ?? "Mi perfil";
  const city        = profile?.profile.city;
  const bio         = profile?.profile.bio;
  const coverUrl    = profile?.profile.coverUrl;
  const avatarUrl   = profile?.profile.avatarUrl;

  return (
    <AuthGate>
      <div className="pb-16">
        {error && <div className="mb-4"><InlineBanner tone="error">{error}</InlineBanner></div>}

        {isLoading ? (
          <ProfileSkeleton />
        ) : (
          <>
            {/* ── cover + avatar ── */}
            <div className="relative">
              <div
                className="h-36 w-full rounded-3xl"
                style={{
                  background: coverUrl
                    ? `url(${coverUrl}) center/cover no-repeat`
                    : "linear-gradient(135deg, hsl(164 30% 18%), hsl(155 48% 28%), hsl(22 92% 48%))"
                }}
              />
              <div className="absolute -bottom-12 left-5">
                <Avatar src={avatarUrl} name={displayName} size="xl" />
              </div>
            </div>

            {/* ── profile info ── */}
            <div className="mt-14 px-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black text-[hsl(var(--foreground))]">{displayName}</h1>
                  {city && <p className="mt-0.5 text-sm text-[hsl(var(--muted-foreground))]">📍 {city}</p>}
                  {bio  && <p className="mt-2 text-sm text-[hsl(var(--foreground)/0.8)] leading-relaxed max-w-md">{bio}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href="/account"
                    className="rounded-full border border-[hsl(var(--border))] px-4 py-2 text-xs font-bold text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--muted)/0.5)]"
                  >
                    Editar perfil
                  </Link>
                </div>
              </div>

              {/* ── stats row ── */}
              {profile && (
                <div className="mt-5 flex gap-6">
                  {[
                    { val: profile.stats.posts,     label: "publicaciones" },
                    { val: profile.stats.followers,  label: "seguidores" },
                    { val: profile.stats.following,  label: "siguiendo" },
                  ].map(({ val, label }) => (
                    <div key={label} className="text-center">
                      <p className="text-xl font-black text-[hsl(var(--foreground))]">{val}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── tabs ── */}
            <div className="mt-6 flex gap-1 border-b border-[hsl(var(--border)/0.5)] pb-0">
              {([ ["posts", "Publicaciones"], ["pets", "Mascotas"], ["saved", "Guardados"] ] as [Tab, string][]).map(([t, label]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cls(
                    "rounded-t-xl px-5 py-2.5 text-xs font-bold transition",
                    tab === t
                      ? "border border-b-0 border-[hsl(var(--border)/0.5)] bg-white/80 text-[hsl(var(--foreground))]"
                      : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  )}
                >
                  {label}
                  {t === "posts"  && profile ? <span className="ml-1.5 rounded-full bg-[hsl(var(--muted))] px-1.5 py-0.5 text-[10px]">{profile.stats.posts}</span> : null}
                  {t === "pets"              ? <span className="ml-1.5 rounded-full bg-[hsl(var(--muted))] px-1.5 py-0.5 text-[10px]">{pets.length}</span> : null}
                </button>
              ))}
            </div>

            {/* ── tab content ── */}
            <div className="mt-4">

              {/* Publicaciones tab */}
              {tab === "posts" && (
                myPosts.length === 0 ? (
                  <div className="rounded-3xl border border-[hsl(var(--border))] bg-white/70 p-8 text-center">
                    <p className="text-4xl">📝</p>
                    <p className="mt-3 font-bold text-[hsl(var(--foreground))]">Aún no has publicado nada</p>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Comparte un momento, tip o recomendación desde el feed.</p>
                    <Link href="/community" className="mt-4 inline-block rounded-full bg-[hsl(var(--secondary))] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90">
                      Ir al feed
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {myPosts.map((post) => (
                      <MiniPostCard
                        key={post.id}
                        post={post}
                        onLike={(p) => void handleLike(p, myPosts, setMyPosts)}
                        onSave={(p) => void handleSave(p, myPosts, setMyPosts)}
                      />
                    ))}
                  </div>
                )
              )}

              {/* Mascotas tab */}
              {tab === "pets" && (
                pets.length === 0 ? (
                  <div className="rounded-3xl border border-[hsl(var(--border))] bg-white/70 p-8 text-center">
                    <p className="text-4xl">🐾</p>
                    <p className="mt-3 font-bold text-[hsl(var(--foreground))]">Aún no tienes mascotas registradas</p>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Agrega a tus compañeros para mostrarlos en tu perfil.</p>
                    <Link href="/pets/new" className="mt-4 inline-block rounded-full bg-[hsl(var(--secondary))] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90">
                      Agregar mascota
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {pets.map((item) => (
                      <Link
                        key={item.pet.id}
                        href={`/pets/${item.pet.id}`}
                        className="group overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white/85 shadow-sm p-5 transition hover:shadow-md hover:border-[hsl(var(--secondary)/0.4)]"
                      >
                        {/* avatar / emoji */}
                        <div className={cls(
                          "flex h-16 w-16 items-center justify-center rounded-2xl text-3xl mb-4",
                          item.pet.species === "Perro" ? "bg-emerald-50" :
                          item.pet.species === "Gato"  ? "bg-purple-50"  : "bg-orange-50"
                        )}>
                          {item.pet.species === "Perro" ? "🐕" : item.pet.species === "Gato" ? "🐈" : "🐾"}
                        </div>

                        <p className="font-bold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--secondary))] transition">{item.pet.name}</p>
                        <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{item.pet.species} · {item.pet.breed}</p>

                        {item.profile.bio && (
                          <p className="mt-2 text-xs text-[hsl(var(--foreground)/0.7)] leading-relaxed line-clamp-2">{item.profile.bio}</p>
                        )}

                        <div className="mt-3 flex items-center gap-2">
                          <span className={cls(
                            "rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                            item.profile.isPublic
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-[hsl(var(--muted)/0.6)] text-[hsl(var(--muted-foreground))]"
                          )}>
                            {item.profile.isPublic ? "Público" : "Privado"}
                          </span>
                          <span className="text-[10px] font-bold text-[hsl(var(--secondary))] opacity-0 group-hover:opacity-100 transition">
                            Ver perfil →
                          </span>
                        </div>
                      </Link>
                    ))}

                    {/* add pet card */}
                    <Link
                      href="/pets/new"
                      className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-[hsl(var(--border))] bg-transparent p-5 text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--secondary))] hover:text-[hsl(var(--secondary))]"
                    >
                      <span className="text-3xl">+</span>
                      <span className="text-xs font-semibold">Agregar mascota</span>
                    </Link>
                  </div>
                )
              )}

              {/* Guardados tab */}
              {tab === "saved" && (
                savedPosts.length === 0 ? (
                  <div className="rounded-3xl border border-[hsl(var(--border))] bg-white/70 p-8 text-center">
                    <p className="text-4xl">🔖</p>
                    <p className="mt-3 font-bold text-[hsl(var(--foreground))]">Aún no guardaste nada</p>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Usa el botón 🏷️ en cualquier publicación del feed para guardarla aquí.</p>
                    <Link href="/community" className="mt-4 inline-block rounded-full bg-[hsl(var(--secondary))] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90">
                      Ir al feed
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {savedPosts.map((post) => (
                      <MiniPostCard
                        key={post.id}
                        post={post}
                        onLike={(p) => void handleLike(p, savedPosts, setSavedPosts)}
                        onSave={(p) => void handleSave(p, savedPosts, setSavedPosts)}
                      />
                    ))}
                  </div>
                )
              )}

            </div>
          </>
        )}

        {/* ── back link ── */}
        <div className="mt-10">
          <Link href="/community" className="text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition">
            ← Volver al feed
          </Link>
        </div>
      </div>
    </AuthGate>
  );
}

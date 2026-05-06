import { useCallback, useEffect, useState } from "react";
import { getProfile, toggleFollow } from "../../api/authApi";
import { getPostsByUser } from "../../api/postsApi";
import type { ProfileUser } from "../../types/auth";
import type { Post } from "../../types/post";
import { getErrorMessage } from "../../utils/errorMessages";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";

type UserPublicProfileModalProps = {
  userId: string | null;
  currentUserId: string | undefined;
  initialFollowingIds: string[];
  onClose: () => void;
  onFollowingChanged?: () => void;
};

export function UserPublicProfileModal({
  userId,
  currentUserId,
  initialFollowingIds,
  onClose,
  onFollowingChanged,
}: UserPublicProfileModalProps) {
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [following, setFollowing] = useState(() =>
    Boolean(userId && initialFollowingIds.includes(userId)),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [followBusy, setFollowBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userId || userId === currentUserId) return;
    setLoading(true);
    setError("");
    try {
      const [profRes, postsRes] = await Promise.all([
        getProfile(userId),
        getPostsByUser(userId),
      ]);
      setProfile(profRes.user);
      setPosts(postsRes);
    } catch (e) {
      setError(getErrorMessage(e, "No se pudo cargar el perfil"));
      setProfile(null);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [userId, currentUserId]);

  useEffect(() => {
    if (!userId || userId === currentUserId) {
      setProfile(null);
      setPosts([]);
      return;
    }
    void load();
  }, [userId, currentUserId, load]);

  useEffect(() => {
    if (!userId) setFollowing(false);
    else setFollowing(initialFollowingIds.includes(userId));
  }, [userId, initialFollowingIds]);

  useEffect(() => {
    if (!userId) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [userId, onClose]);

  async function handleToggleFollow() {
    if (!userId || userId === currentUserId) return;
    setFollowBusy(true);
    setError("");
    try {
      const res = await toggleFollow(userId);
      setFollowing(res.following);
      onFollowingChanged?.();
    } catch (e) {
      setError(getErrorMessage(e, "No se pudo actualizar seguimiento"));
    } finally {
      setFollowBusy(false);
    }
  }

  if (!userId || userId === currentUserId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="max-h-[min(90vh,600px)] w-full max-w-lg overflow-hidden rounded-xl border border-neutral-800 bg-zinc-950 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="public-profile-heading"
      >
        <header className="flex items-start justify-between gap-3 border-b border-neutral-800 px-4 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <Avatar src={profile?.avatarUrl ?? ""} alt={profile?.username ?? ""} size={48} />
            <div className="min-w-0">
              <h2 id="public-profile-heading" className="truncate text-lg font-semibold text-neutral-100">
                {loading ? "Cargando…" : `@${profile?.username ?? ""}`}
              </h2>
              {profile?.bio ? (
                <p className="mt-1 text-sm leading-relaxed text-neutral-400">{profile.bio}</p>
              ) : null}
              <p className="mt-2 text-xs text-neutral-600">
                {posts.length} publicación{posts.length === 1 ? "" : "es"} visible{posts.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={followBusy}
              onClick={() => void handleToggleFollow()}
            >
              {following ? "Dejar de seguir" : "Seguir"}
            </Button>
          </div>
        </header>

        <div className="max-h-[calc(min(90vh,600px)-8rem)] overflow-y-auto px-4 pb-4 pt-3">
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {!loading && !error && posts.length === 0 ? (
            <p className="text-sm text-neutral-500">No hay publicaciones visibles aquí.</p>
          ) : null}
          <ul className="mt-2 grid list-none gap-2 p-0">
            {posts.map((p) => (
              <li key={p.id} className="rounded-lg border border-neutral-800/80 bg-black/40 px-3 py-2">
                <p className="text-xs text-neutral-500">
                  {(p.visibility ?? "public") === "public"
                    ? "Público"
                    : (p.visibility ?? "public") === "followers"
                      ? "Seguidores"
                      : "Solo yo"}
                </p>
                <p className="mt-1 line-clamp-4 text-sm text-neutral-200">{p.content}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

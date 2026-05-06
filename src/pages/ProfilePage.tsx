import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getProfile, updateProfile } from "../api/authApi";
import { deletePost, getPostsByUser, updatePost as updatePostApi } from "../api/postsApi";
import { getWorkoutSessions } from "../api/workoutSessionsApi";
import { getWorkouts } from "../api/workoutsApi";
import { PostMediaGallery } from "../components/feed/PostMediaGallery";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ProfileAvatarPanel } from "../components/profile/ProfileAvatarPanel";
import { ProfileForm } from "../components/profile/ProfileForm";
import { WorkoutSessionsHistory } from "../components/workouts/WorkoutSessionsHistory";
import { useAuth } from "../context/AuthContext";
import type { SafeUser } from "../types/auth";
import type { Post } from "../types/post";
import type { Workout } from "../types/workout";
import type { WorkoutSessionWithTitle } from "../types/workoutSession";
import { getErrorMessage } from "../utils/errorMessages";

type ProfilePageProps = {
  onOpenPostInFeed?: (postId: string) => void;
};

export function ProfilePage({ onOpenPostInFeed }: ProfilePageProps) {
  const { user, updateUser } = useAuth();
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [goal, setGoal] = useState(user?.goal ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [accountEmail, setAccountEmail] = useState(user?.email ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<WorkoutSessionWithTitle[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingVisibility, setEditingVisibility] = useState<"public" | "followers" | "private">("public");
  const [myWorkouts, setMyWorkouts] = useState<Workout[]>([]);
  const [avatarPanelOpen, setAvatarPanelOpen] = useState(false);

  const userId = user?.id;

  const loadMyPosts = useCallback(async () => {
    if (!userId) return;
    setPostsLoading(true);
    setPostsError("");
    try {
      const [list, workoutsRes] = await Promise.all([getPostsByUser(userId), getWorkouts()]);
      setMyPosts(list);
      setMyWorkouts(workoutsRes.filter((w) => w.userId === userId));
    } catch (loadError) {
      setPostsError(getErrorMessage(loadError, "No se pudieron cargar tus publicaciones"));
    } finally {
      setPostsLoading(false);
    }
  }, [userId]);

  const loadProfile = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError("");
    try {
      const response = await getProfile(userId);
      const u = response.user;
      setUsername(u.username);
      setBio(u.bio);
      setGoal(u.goal);
      setAvatarUrl(u.avatarUrl);
      const email = u.email ?? user?.email ?? "";
      setAccountEmail(email);
      const next: SafeUser = {
        id: u.id,
        username: u.username,
        email,
        bio: u.bio,
        goal: u.goal,
        avatarUrl: u.avatarUrl,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      };
      updateUser(next);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "No se pudo cargar el perfil"));
    } finally {
      setLoading(false);
    }
  }, [userId, user?.email, updateUser]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    void loadMyPosts();
  }, [loadMyPosts]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function loadSessions() {
      setSessionsLoading(true);
      setSessionsError("");
      try {
        const list = await getWorkoutSessions();
        if (!cancelled) setSessions(list);
      } catch (loadError) {
        if (!cancelled) {
          setSessionsError(getErrorMessage(loadError, "No se pudieron cargar las sesiones"));
        }
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    }

    void loadSessions();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function handleDeletePost(postId: string) {
    if (!window.confirm("¿Eliminar esta publicación?")) return;
    setPostsError("");
    try {
      await deletePost(postId);
      await loadMyPosts();
    } catch (deleteErr) {
      setPostsError(getErrorMessage(deleteErr, "No se pudo eliminar la publicación"));
    }
  }

  function startEditingPost(post: Post) {
    setEditingPostId(post.id);
    setEditingContent(post.content);
    setEditingVisibility(post.visibility ?? "public");
    setPostsError("");
  }

  async function handleSavePostEdit() {
    if (!editingPostId) return;
    const trimmed = editingContent.trim();
    const edited = myPosts.find((p) => p.id === editingPostId);
    const hasPhotos = (edited?.media?.length ?? 0) > 0;
    if (trimmed.length > 280 || (!hasPhotos && trimmed.length < 4)) {
      setPostsError(
        "Sin fotos el texto debe tener entre 4 y 280 caracteres; con fotos, opcional hasta 280.",
      );
      return;
    }
    try {
      await updatePostApi(editingPostId, { content: trimmed, visibility: editingVisibility });
      setEditingPostId(null);
      setEditingContent("");
      await loadMyPosts();
    } catch (editErr) {
      setPostsError(getErrorMessage(editErr, "No se pudo actualizar la publicación"));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage("");
    setError("");

    if (username.trim().length < 3) {
      setLoading(false);
      setError("El usuario debe tener al menos 3 caracteres");
      return;
    }
    if (goal.length > 60) {
      setLoading(false);
      setError("El objetivo no puede superar 60 caracteres");
      return;
    }
    if (bio.length > 200) {
      setLoading(false);
      setError("La bio no puede superar 200 caracteres");
      return;
    }
    const avatarOk =
      !avatarUrl ||
      /^https?:\/\//i.test(avatarUrl) ||
      /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(avatarUrl);
    if (!avatarOk) {
      setLoading(false);
      setError("La foto debe ser un enlace https o una imagen subida desde tu equipo.");
      return;
    }

    try {
      const response = await updateProfile(user.id, {
        username: username.trim(),
        bio,
        goal,
        avatarUrl,
      });
      updateUser(response.user);
      setAccountEmail(response.user.email);
      setMessage("Perfil actualizado correctamente");
      await loadMyPosts();
    } catch (submitError) {
      setError(getErrorMessage(submitError, "No se pudo actualizar el perfil"));
    } finally {
      setLoading(false);
    }
  }

  function visibilityLabel(post: Post) {
    const v = post.visibility ?? "public";
    if (v === "public") return "Público";
    if (v === "followers") return "Seguidores";
    return "Solo yo";
  }

  function getWorkoutTitle(workoutId: string | null) {
    if (!workoutId) return null;
    const workout = myWorkouts.find((w) => w.id === workoutId);
    return workout?.title ?? "Rutina vinculada";
  }

  return (
    <section className="profile-page grid w-full max-w-3xl gap-4 lg:gap-6">
      <header className="rounded-lg border border-neutral-800 bg-zinc-950/90 px-4 py-4 shadow-[inset_0_1px_0_0_rgba(212,175,55,0.07)] sm:px-5 sm:py-5">
        <p className="text-xs font-medium uppercase tracking-wider text-goi-gold-dim">Tu cuenta</p>
        <div className="mt-3 flex flex-wrap items-start gap-4">
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setAvatarPanelOpen((open) => !open)}
              className="group rounded-full outline-none ring-offset-2 ring-offset-black transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-goi-gold"
              aria-expanded={avatarPanelOpen}
              aria-haspopup="dialog"
              aria-label={avatarUrl ? "Cambiar foto de perfil" : "Añadir foto de perfil"}
            >
              {avatarUrl ? (
                <Avatar
                  src={avatarUrl}
                  alt={username || "Foto de perfil"}
                  size={80}
                  className="ring-goi-gold/25 group-hover:ring-goi-gold/55"
                />
              ) : (
                <span className="flex size-20 items-center justify-center rounded-full border-2 border-dashed border-goi-gold/40 bg-black/55 px-1 text-center text-[11px] font-semibold leading-tight text-goi-gold/90 shadow-inner shadow-black/60">
                  + Añadir foto
                </span>
              )}
            </button>
            {userId ? (
              <ProfileAvatarPanel
                open={avatarPanelOpen}
                onClose={() => setAvatarPanelOpen(false)}
                userId={userId}
                avatarUrl={avatarUrl}
                usernameTrimmed={username.trim()}
                usernameAlt={username.trim() ? `@${username.trim()}` : "Tu foto de perfil"}
                bio={bio}
                goal={goal}
                onSaved={(next) => {
                  updateUser(next);
                  setAvatarUrl(next.avatarUrl ?? "");
                  setUsername(next.username ?? username);
                  setBio(next.bio ?? bio);
                  setGoal(next.goal ?? goal);
                  setAccountEmail(next.email ?? accountEmail);
                  setMessage("Foto actualizada.");
                  void loadMyPosts();
                }}
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-100 sm:text-2xl">
              @{username || "usuario"}
            </h1>
            {goal.trim() ? <p className="mt-1 text-sm text-goi-gold/90">{goal}</p> : null}
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              {bio.trim() ? bio : "Sin biografía todavía. Edítala más abajo."}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
              <span>
                Publicaciones: {postsLoading ? "…" : myPosts.length}
              </span>
              <span>
                Entrenos registrados: {sessionsLoading ? "…" : sessions.length}
              </span>
            </div>
          </div>
        </div>
      </header>

      <Card tone="dark">
        <h2 className="mt-0 text-lg font-semibold text-neutral-100">Datos públicos</h2>
        <p className="mb-3 text-sm text-neutral-500">
          Tu nombre de usuario y bio aparecen en el feed y en el perfil que ven otros cuando te siguen. La foto la
          cambias pulsando tu imagen arriba.
        </p>
        <ProfileForm
          username={username}
          goal={goal}
          bio={bio}
          accountEmail={accountEmail}
          loading={loading}
          error={error}
          message={message}
          onChangeUsername={setUsername}
          onChangeGoal={setGoal}
          onChangeBio={setBio}
          onSubmit={handleSubmit}
        />
      </Card>

      <Card tone="dark">
        <h2 className="mt-0 text-lg font-semibold text-neutral-100">Mis publicaciones</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Publicaciones donde eres autor, ordenadas desde la más reciente. Quién pueda verlas depende del nivel de privacidad.
        </p>
        {postsError ? <p className="mt-2 text-sm text-red-400">{postsError}</p> : null}
        {postsLoading ? (
          <p className="mt-3 text-sm text-neutral-500">Cargando…</p>
        ) : myPosts.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">Aún no tienes publicaciones. Crea una desde Inicio.</p>
        ) : (
          <ul className="mt-3 grid list-none gap-2.5 p-0">
            {myPosts.map((post) => (
              <li
                key={post.id}
                className="flex flex-col gap-2 rounded-lg border border-neutral-800/90 bg-black/45 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <span className="inline-block rounded-full border border-neutral-600 bg-neutral-900/70 px-2 py-0.5 text-[10px] font-medium text-neutral-400">
                    {visibilityLabel(post)}
                  </span>
                  {editingPostId === post.id ? (
                    <div className="mt-2 grid gap-2">
                      <textarea
                        className="goi-field min-h-[88px]"
                        maxLength={280}
                        value={editingContent}
                        onChange={(event) => setEditingContent(event.target.value)}
                        placeholder="Texto opcional si la publicación tiene fotos."
                      />
                      {post.media && post.media.length > 0 ? <PostMediaGallery media={post.media} /> : null}
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          className="goi-field max-w-[170px]"
                          value={editingVisibility}
                          onChange={(event) =>
                            setEditingVisibility(event.target.value as "public" | "followers" | "private")
                          }
                        >
                          <option value="public">Público</option>
                          <option value="followers">Seguidores</option>
                          <option value="private">Solo yo</option>
                        </select>
                        <Button
                          type="button"
                          variant="secondary"
                          className="!py-1.5 !text-xs"
                          onClick={() => void handleSavePostEdit()}
                        >
                          Guardar
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="!py-1.5 !text-xs"
                          onClick={() => setEditingPostId(null)}
                        >
                          Cancelar
                        </Button>
                        <span className="text-xs text-neutral-500">{editingContent.trim().length}/280</span>
                      </div>
                      {post.workoutId ? (
                        <small className="text-neutral-400">Rutina: {getWorkoutTitle(post.workoutId)}</small>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      {post.content.trim() ? (
                        <p className="mt-1.5 whitespace-pre-wrap text-sm text-neutral-200">{post.content}</p>
                      ) : null}
                      <PostMediaGallery media={post.media ?? []} />
                      {post.workoutId ? (
                        <small className="mt-1 block text-neutral-400">Rutina: {getWorkoutTitle(post.workoutId)}</small>
                      ) : null}
                    </>
                  )}
                  <p className="mt-1 text-xs text-neutral-600">{post.comments.length} comentarios · {post.likesCount} likes</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {onOpenPostInFeed && editingPostId !== post.id ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="shrink-0 self-start !py-1.5 !text-xs sm:self-auto"
                      onClick={() => onOpenPostInFeed(post.id)}
                    >
                      Ver en Inicio
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0 self-start !py-1.5 !text-xs sm:self-auto"
                    onClick={() => startEditingPost(post)}
                  >
                    Editar
                  </Button>
                  <Button type="button" variant="danger" className="shrink-0 self-start !py-1.5 !text-xs sm:self-auto" onClick={() => void handleDeletePost(post.id)}>
                    Eliminar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {sessionsError ? <p className="m-0 text-sm text-red-400">{sessionsError}</p> : null}

      <WorkoutSessionsHistory
        title="Entrenamientos registrados"
        description="Lo que anotas en Rutinas aparece aqui. Para registrar nuevos entrenamientos o quitarlos del historial, usa la pestaña Rutinas."
        sessions={sessions}
        loading={sessionsLoading}
        emptyMessage="Aun no hay entrenamientos. Registralos en la pestaña Rutinas."
        showDelete={false}
      />
    </section>
  );
}

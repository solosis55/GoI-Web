import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { getFollowing, getUsers, toggleFollow } from "../api/authApi";
import { getStories } from "../api/storiesApi";
import {
  createComment,
  createPost,
  deletePost,
  getNotifications,
  getPosts,
  toggleLike,
  updatePost,
} from "../api/postsApi";
import { getWorkouts } from "../api/workoutsApi";
import { CreateStoryModal } from "../components/feed/CreateStoryModal";
import { CreatePostForm, type PendingPostImage } from "../components/feed/CreatePostForm";
import { FeedNotificationsBell } from "../components/feed/FeedNotificationsBell";
import { FeedModeTabs } from "../components/feed/FeedModeTabs";
import { FollowSuggestionItem } from "../components/feed/FollowSuggestionItem";
import { PostItem } from "../components/feed/PostItem";
import { UserPublicProfileModal } from "../components/feed/UserPublicProfileModal";
import { StoriesRow } from "../components/feed/StoriesRow";
import { StoryViewerModal } from "../components/feed/StoryViewerModal";
import { UserSummaryCard } from "../components/feed/UserSummaryCard";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { StatusMessage } from "../components/ui/StatusMessage";
import { useAuth } from "../context/AuthContext";
import type { DiscoverUser } from "../types/auth";
import type { FeedStoryAuthor } from "../types/story";
import type { FeedNotification, NotificationsResponse, Post } from "../types/post";
import type { Workout } from "../types/workout";
import { getErrorMessage } from "../utils/errorMessages";
import type { MentionPickUser } from "../utils/mentionAutocomplete";
import { buildMentionDirectory } from "../utils/mentionText";
import { compressManyImageFiles, POST_IMAGE_MAX_FILES } from "../utils/postImages";

const FEED_MODE_STORAGE_KEY = "fitsocial:feedMode";

function readStoredFeedMode(): "all" | "following" {
  try {
    const raw = sessionStorage.getItem(FEED_MODE_STORAGE_KEY);
    if (raw === "following" || raw === "all") return raw;
  } catch {
    /* ignore */
  }
  return "all";
}

function FeedTimelineSkeleton() {
  const bar = "rounded-md bg-neutral-800";
  const block = (
    <div className="animate-pulse rounded-lg border border-neutral-800/90 bg-black/50 p-4">
      <div className="flex gap-3">
        <div className={`size-11 shrink-0 rounded-full ${bar}`} />
        <div className="min-w-0 flex-1 space-y-3 pt-0.5">
          <div className={`h-2.5 w-36 max-w-[50%] ${bar}`} />
          <div className={`h-2 w-full ${bar}`} />
          <div className={`h-2 w-11/12 max-w-full ${bar}`} />
          <div className={`h-2 w-2/3 max-w-[70%] ${bar}`} />
        </div>
      </div>
    </div>
  );
  return (
    <div className="mt-2 space-y-3" aria-busy="true" aria-label="Cargando publicaciones">
      {block}
      {block}
    </div>
  );
}

type FeedPageProps = {
  /** Desde Perfil: centrar esta publicación en el timeline cuando el feed cargue (el `<li>` usa `feed-post-{id}`). */
  focusPostId?: string | null;
  onFocusPostHandled?: () => void;
};

export function FeedPage({ focusPostId = null, onFocusPostHandled }: FeedPageProps = {}) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [content, setContent] = useState("");
  const [selectedWorkoutId, setSelectedWorkoutId] = useState("");
  const [postVisibility, setPostVisibility] = useState<"public" | "followers" | "private">("public");
  const [draftImages, setDraftImages] = useState<PendingPostImage[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [storyAuthorsFromApi, setStoryAuthorsFromApi] = useState<FeedStoryAuthor[]>([]);
  const [storySeenRevision, setStorySeenRevision] = useState(0);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyViewerAuthorIdx, setStoryViewerAuthorIdx] = useState(0);
  const [storyViewerSlideIdx, setStoryViewerSlideIdx] = useState(0);
  const [createStoryOpen, setCreateStoryOpen] = useState(false);
  const [notifications, setNotifications] = useState<FeedNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifRefreshing, setNotifRefreshing] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [commentByPostId, setCommentByPostId] = useState<Record<string, string>>({});
  const [discoverUsers, setDiscoverUsers] = useState<DiscoverUser[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [feedMode, setFeedModeInternal] = useState<"all" | "following">(() => readStoredFeedMode());
  const setFeedMode = useCallback((mode: "all" | "following") => {
    try {
      sessionStorage.setItem(FEED_MODE_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
    setFeedModeInternal(mode);
  }, []);
  const [pulsePostId, setPulsePostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const myPostsCount = useMemo(
    () => (user ? posts.filter((post) => post.userId === user.id).length : 0),
    [posts, user]
  );
  const suggestedUsers = useMemo(() => {
    return discoverUsers.slice(0, 6);
  }, [discoverUsers]);

  const mentionPickList = useMemo((): MentionPickUser[] => {
    const out: MentionPickUser[] = [];
    const seen = new Set<string>();
    if (user) {
      out.push({ id: user.id, username: user.username });
      seen.add(user.username.toLowerCase());
    }
    for (const d of discoverUsers) {
      const k = d.username.toLowerCase();
      if (!seen.has(k)) {
        out.push({ id: d.id, username: d.username });
        seen.add(k);
      }
    }
    for (const p of posts) {
      const pk = p.authorUsername.toLowerCase();
      if (!seen.has(pk)) {
        out.push({ id: p.userId, username: p.authorUsername });
        seen.add(pk);
      }
      for (const c of p.comments) {
        const ck = c.authorUsername.toLowerCase();
        if (!seen.has(ck)) {
          out.push({ id: c.userId, username: c.authorUsername });
          seen.add(ck);
        }
      }
    }
    return out.sort((a, b) => a.username.localeCompare(b.username));
  }, [user, discoverUsers, posts]);

  const mentionDirectory = useMemo(() => buildMentionDirectory(mentionPickList), [mentionPickList]);

  const storyStripAuthors = useMemo((): FeedStoryAuthor[] => {
    if (!user) return [];
    const withoutSelf = storyAuthorsFromApi.filter((a) => a.userId !== user.id);
    const mine = storyAuthorsFromApi.find((a) => a.userId === user.id);
    const selfRow: FeedStoryAuthor =
      mine ?? {
        userId: user.id,
        authorUsername: user.username,
        authorAvatarUrl: user.avatarUrl ?? "",
        slides: [],
      };
    return [selfRow, ...withoutSelf];
  }, [storyAuthorsFromApi, user]);

  const storyViewerAuthors = useMemo(
    () => storyStripAuthors.filter((a) => a.slides.length > 0),
    [storyStripAuthors],
  );

  const refreshStoriesOnly = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getStories();
      setStoryAuthorsFromApi(data.authors);
    } catch {
      /* no bloquea el feed */
    }
  }, [user]);

  const handleStoryCellClick = useCallback(
    (clickedUserId: string) => {
      if (!user) return;
      const row = storyStripAuthors.find((a) => a.userId === clickedUserId);
      if (!row) return;
      if (clickedUserId === user.id && row.slides.length === 0) {
        setCreateStoryOpen(true);
        return;
      }
      const idx = storyViewerAuthors.findIndex((a) => a.userId === clickedUserId);
      if (idx === -1) return;
      setStoryViewerAuthorIdx(idx);
      setStoryViewerSlideIdx(0);
      setStoryViewerOpen(true);
    },
    [storyStripAuthors, storyViewerAuthors, user],
  );
  const visiblePosts = useMemo(() => {
    if (feedMode === "all") return posts;
    return posts.filter((post) => followingIds.includes(post.userId) || post.userId === user?.id);
  }, [feedMode, followingIds, posts, user?.id]);

  useEffect(() => {
    if (!focusPostId) return;
    if (loading) return;

    const inFeed = posts.some((p) => p.id === focusPostId);
    if (!inFeed) {
      onFocusPostHandled?.();
      return;
    }

    const inTimeline = visiblePosts.some((p) => p.id === focusPostId);
    if (!inTimeline) {
      setFeedMode("all");
      return;
    }

    let highlightTimer = 0;
    const rid = window.requestAnimationFrame(() => {
      document.getElementById(`feed-post-${focusPostId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      setPulsePostId(focusPostId);
      highlightTimer = window.setTimeout(() => setPulsePostId(null), 2600);
      onFocusPostHandled?.();
    });
    return () => {
      window.cancelAnimationFrame(rid);
      window.clearTimeout(highlightTimer);
    };
  }, [focusPostId, loading, posts, visiblePosts, onFocusPostHandled]);

  const refreshNotifications = useCallback(async (): Promise<NotificationsResponse | null> => {
    if (!user) return null;
    setNotifRefreshing(true);
    try {
      const res = await getNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
      return res;
    } catch {
      /* no bloquea el feed */
      return null;
    } finally {
      setNotifRefreshing(false);
    }
  }, [user]);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      if (!user) return;
      const [postsResponse, workoutsResponse, usersResponse, followingResponse, notifResponse, storiesRes] =
        await Promise.all([
          getPosts(),
          getWorkouts(),
          getUsers(),
          getFollowing(user.id),
          getNotifications().catch(() => ({ notifications: [] as FeedNotification[], unreadCount: 0 })),
          getStories().catch(() => ({ authors: [] as FeedStoryAuthor[] })),
        ]);
      setPosts(postsResponse);
      setStoryAuthorsFromApi(storiesRes.authors ?? []);
      setNotifications(notifResponse.notifications ?? []);
      setUnreadCount(notifResponse.unreadCount ?? 0);
      const mine = workoutsResponse.filter((workout) => workout.userId === user.id);
      setWorkouts(mine);
      setDiscoverUsers(usersResponse.users);
      setFollowingIds(followingResponse.followingIds);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "No se pudo cargar el feed"));
    } finally {
      setLoading(false);
    }
  }, [user]);

  async function handleToggleFollow(targetUserId: string) {
    if (!user) return;
    setError("");
    try {
      await toggleFollow(targetUserId);
      await loadFeed();
    } catch (followError) {
      setError(getErrorMessage(followError, "No se pudo actualizar seguimiento"));
    }
  }

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  async function handleDraftAddPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setPhotoBusy(true);
    try {
      const compressed = await compressManyImageFiles(files, draftImages.length);
      setDraftImages((curr) =>
        [
          ...curr,
          ...compressed.map((img) => ({
            ...img,
            id:
              typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto
                ? globalThis.crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          })),
        ].slice(0, POST_IMAGE_MAX_FILES),
      );
    } catch {
      setError("No se pudieron procesar algunas imágenes. Prueba otros archivos JPG, PNG o WebP.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setError("");
    setMessage("");

    const trimmed = content.trim();
    const hasMedia = draftImages.length > 0;
    if (!hasMedia && trimmed.length < 4) {
      setError("Sin fotos hace falta al menos 4 caracteres.");
      return;
    }
    if (trimmed.length > 280) {
      setError("El texto no puede superar 280 caracteres.");
      return;
    }

    try {
      await createPost({
        content: trimmed,
        workoutId: selectedWorkoutId || null,
        visibility: postVisibility,
        ...(hasMedia ? { media: draftImages.map((img) => ({ type: "image" as const, url: img.dataUrl })) } : {}),
      });
      setContent("");
      setSelectedWorkoutId("");
      setPostVisibility("public");
      setDraftImages([]);
      await loadFeed();
      setMessage("Publicación creada.");
    } catch (createError) {
      setError(getErrorMessage(createError, "No se pudo crear la publicación"));
    }
  }

  async function handleDeletePost(id: string) {
    if (!window.confirm("¿Seguro que quieres eliminar esta publicación?")) return;
    setError("");
    setMessage("");
    try {
      await deletePost(id);
      await loadFeed();
      setMessage("Publicación eliminada.");
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "No se pudo eliminar la publicación"));
    }
  }

  async function handleToggleLike(postId: string) {
    if (!user) return;
    setError("");
    setMessage("");
    try {
      await toggleLike(postId);
      await loadFeed();
    } catch (likeError) {
      setError(getErrorMessage(likeError, "No se pudo actualizar el like"));
    }
  }

  async function handleUpdatePost(
    postId: string,
    input: { content: string; visibility: "public" | "followers" | "private" },
  ) {
    if (!user) return;
    setError("");
    setMessage("");
    const target = posts.find((p) => p.id === postId);
    const hasPhotos = (target?.media?.length ?? 0) > 0;
    if (input.content.length > 280 || (!hasPhotos && input.content.trim().length < 4)) {
      setError("Revisa el texto: máximo 280 caracteres; sin fotos, al menos 4.");
      return;
    }
    try {
      await updatePost(postId, input);
      await loadFeed();
      setMessage("Publicación actualizada.");
    } catch (updateError) {
      setError(getErrorMessage(updateError, "No se pudo actualizar la publicación"));
    }
  }

  async function handleCreateComment(postId: string) {
    if (!user) return;
    setError("");
    setMessage("");
    const contentValue = commentByPostId[postId]?.trim();
    if (!contentValue) return;
    if (contentValue.length > 180) {
      setError("El comentario no puede superar 180 caracteres");
      return;
    }

    try {
      await createComment(postId, {
        content: contentValue,
      });
      setCommentByPostId((current) => ({ ...current, [postId]: "" }));
      await loadFeed();
      setMessage("Comentario publicado");
    } catch (commentError) {
      setError(getErrorMessage(commentError, "No se pudo comentar"));
    }
  }

  function getWorkoutTitle(workoutId: string | null) {
    if (!workoutId) return null;
    const workout = workouts.find((item) => item.id === workoutId);
    return workout?.title ?? "Rutina vinculada";
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }

  return (
    <section className="feed-layout grid w-full min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:gap-6">
      <section className="feed-main grid w-full min-w-0 gap-3.5 lg:gap-4">
        <header className="feed-page-header rounded-lg border border-neutral-800 bg-zinc-950/90 px-4 py-4 shadow-[inset_0_1px_0_0_rgba(212,175,55,0.07)] sm:px-5 sm:py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-goi-gold-dim">FitSocial</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-neutral-100 sm:text-2xl">
                Inicio
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500">
                Tu feed: historias (24 h, quien sigues), publicaciones y conversación con otros usuarios.
                {user?.username ? (
                  <span className="text-neutral-400"> Conectado como @{user.username}.</span>
                ) : null}
              </p>
            </div>
            {user ? (
              <FeedNotificationsBell
                notifications={notifications}
                unreadCount={unreadCount}
                loading={notifRefreshing}
                onRefresh={refreshNotifications}
              />
            ) : null}
          </div>
        </header>

        <div aria-hidden className="h-px w-full bg-linear-to-r from-transparent via-neutral-800 to-transparent opacity-95" />

        <div className="w-full min-w-0">
          <Card tone="dark" className="!p-2 rounded-lg">
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-sm font-semibold tracking-tight text-neutral-200">Historias del gym</h2>
              <div className="flex w-full justify-center">
                <FeedModeTabs mode={feedMode} onChangeMode={setFeedMode} compact />
              </div>
              {user ? (
                <StoriesRow
                  authors={storyStripAuthors}
                  currentUserId={user.id}
                  seenRevision={storySeenRevision}
                  onSelectAuthor={handleStoryCellClick}
                />
              ) : (
                <p className="max-w-xs px-2 text-center text-[11px] text-neutral-500">
                  Inicia sesión para crear historias tipo Instagram (~24 h) y ver las de quien sigues.
                </p>
              )}
            </div>
          </Card>
        </div>

        <div aria-hidden className="h-px w-full bg-linear-to-r from-transparent via-neutral-800 to-transparent opacity-95" />

        <Card tone="dark">
          <h2 className="mt-0">Crear publicación</h2>
          {photoBusy ? <p className="mb-2 text-xs text-neutral-500">Optimizando imágenes…</p> : null}
          <CreatePostForm
            content={content}
            selectedWorkoutId={selectedWorkoutId}
            visibility={postVisibility}
            workouts={workouts}
            pendingImages={draftImages}
            onChangeContent={setContent}
            onChangeWorkoutId={setSelectedWorkoutId}
            onChangeVisibility={setPostVisibility}
            onAddImages={(files) => void handleDraftAddPhotos(files)}
            onRemoveImage={(id) => setDraftImages((list) => list.filter((img) => img.id !== id))}
            submitDisabled={photoBusy}
            onSubmit={handleCreatePost}
            mentionCandidates={mentionPickList}
          />
        </Card>

        <StatusMessage tone="dark" loading={loading && visiblePosts.length > 0} error={error} success={message} />
        {loading && visiblePosts.length === 0 ? <FeedTimelineSkeleton /> : null}
        {!loading && visiblePosts.length === 0 && (
          <EmptyState
            showIcon
            message={
              feedMode === "following"
                ? "Aún no hay publicaciones de personas que sigues. Prueba con «Todos» o sigue a alguien en el panel derecho."
                : "Aún no hay publicaciones en la comunidad. ¡Sé el primero en publicar algo!"
            }
          />
        )}

        <ul className="workouts-list mt-3 grid list-none gap-2.5 p-0">
          {visiblePosts.map((post) => (
            <PostItem
              key={post.id}
              post={post}
              emphasized={pulsePostId === post.id}
              isOwner={post.userId === user?.id}
              currentUserId={user?.id}
              commentValue={commentByPostId[post.id] ?? ""}
              onChangeComment={(value) =>
                setCommentByPostId((current) => ({
                  ...current,
                  [post.id]: value,
                }))
              }
              onLike={() => handleToggleLike(post.id)}
              onDelete={() => handleDeletePost(post.id)}
              onUpdate={handleUpdatePost}
              onComment={() => handleCreateComment(post.id)}
              getWorkoutTitle={getWorkoutTitle}
              formatDate={formatDate}
              onOpenUserProfile={(uid) => setProfileUserId(uid)}
              mentionCandidates={mentionPickList}
              mentionDirectory={mentionDirectory}
              onPostLinkCopied={() =>
                setMessage("Enlace de la publicación copiado. Pégalo donde quieras compartirlo.")
              }
            />
          ))}
        </ul>
      </section>

      <Card as="aside" tone="dark" className="feed-right min-w-0 w-full sticky top-4 max-lg:static">
        <UserSummaryCard username={user?.username} myPostsCount={myPostsCount} />
        <h3>Sugerencias para ti</h3>
        {suggestedUsers.length === 0 && (
          <EmptyState message="Aún no hay sugerencias para mostrar aquí." className="mt-2" />
        )}
        <ul className="suggestions-list mt-2 grid list-none gap-2.5 p-0">
          {suggestedUsers.map((suggested) => (
            <FollowSuggestionItem
              key={suggested.id}
              user={suggested}
              isFollowing={followingIds.includes(suggested.id)}
              onToggleFollow={handleToggleFollow}
              onViewProfile={(uid) => setProfileUserId(uid)}
            />
          ))}
        </ul>
      </Card>

      <UserPublicProfileModal
        userId={profileUserId}
        currentUserId={user?.id}
        initialFollowingIds={followingIds}
        onClose={() => setProfileUserId(null)}
        onFollowingChanged={() => void loadFeed()}
      />

      <StoryViewerModal
        open={storyViewerOpen}
        authors={storyViewerAuthors}
        startAuthorIdx={storyViewerAuthorIdx}
        startSlideIdx={storyViewerSlideIdx}
        onClose={() => setStoryViewerOpen(false)}
        onStoriesUiRefresh={() => setStorySeenRevision((n) => n + 1)}
      />
      <CreateStoryModal
        open={createStoryOpen}
        onClose={() => setCreateStoryOpen(false)}
        onCreated={() => {
          void refreshStoriesOnly();
          setMessage("Historia publicada. Visible unas ~24 horas.");
        }}
      />
    </section>
  );
}

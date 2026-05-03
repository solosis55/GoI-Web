import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { getFollowing, getUsers, toggleFollow } from "../api/authApi";
import { createComment, createPost, deletePost, getPosts, toggleLike } from "../api/postsApi";
import { getWorkouts } from "../api/workoutsApi";
import { CreatePostForm } from "../components/feed/CreatePostForm";
import { FeedModeTabs } from "../components/feed/FeedModeTabs";
import { FollowSuggestionItem } from "../components/feed/FollowSuggestionItem";
import { PostItem } from "../components/feed/PostItem";
import { StoriesRow } from "../components/feed/StoriesRow";
import { UserSummaryCard } from "../components/feed/UserSummaryCard";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { StatusMessage } from "../components/ui/StatusMessage";
import { useAuth } from "../context/AuthContext";
import type { DiscoverUser } from "../types/auth";
import type { Post } from "../types/post";
import type { Workout } from "../types/workout";
import { getErrorMessage } from "../utils/errorMessages";

export function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [content, setContent] = useState("");
  const [selectedWorkoutId, setSelectedWorkoutId] = useState("");
  const [commentByPostId, setCommentByPostId] = useState<Record<string, string>>({});
  const [discoverUsers, setDiscoverUsers] = useState<DiscoverUser[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [feedMode, setFeedMode] = useState<"all" | "following">("all");
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
  const visiblePosts = useMemo(() => {
    if (feedMode === "all") return posts;
    return posts.filter((post) => followingIds.includes(post.userId) || post.userId === user?.id);
  }, [feedMode, followingIds, posts, user?.id]);

  async function loadFeed() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      if (!user) return;
      const [postsResponse, workoutsResponse, usersResponse, followingResponse] = await Promise.all([
        getPosts(),
        getWorkouts(),
        getUsers(),
        getFollowing(user.id),
      ]);
      setPosts(postsResponse);
      const mine = user ? workoutsResponse.filter((workout) => workout.userId === user.id) : [];
      setWorkouts(mine);
      setDiscoverUsers(usersResponse.users);
      setFollowingIds(followingResponse.followingIds);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "No se pudo cargar el feed"));
    } finally {
      setLoading(false);
    }
  }

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
  }, [user?.id]);

  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setError("");
    setMessage("");

    const trimmed = content.trim();
    if (trimmed.length < 4) {
      setError("La publicacion debe tener al menos 4 caracteres");
      return;
    }
    if (trimmed.length > 280) {
      setError("La publicacion no puede superar 280 caracteres");
      return;
    }

    try {
      await createPost({
        content: trimmed,
        workoutId: selectedWorkoutId || null,
      });
      setContent("");
      setSelectedWorkoutId("");
      await loadFeed();
      setMessage("Publicacion creada");
    } catch (createError) {
      setError(getErrorMessage(createError, "No se pudo crear la publicación"));
    }
  }

  async function handleDeletePost(id: string) {
    if (!window.confirm("Seguro que quieres eliminar esta publicacion?")) return;
    setError("");
    setMessage("");
    try {
      await deletePost(id);
      await loadFeed();
      setMessage("Publicacion eliminada");
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
    return workout?.title ?? "Entrenamiento vinculado";
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
          <p className="text-xs font-medium uppercase tracking-wider text-goi-gold-dim">FitSocial</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-neutral-100 sm:text-2xl">Inicio</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500">
            Tu feed de la comunidad: historias, publicaciones y conversación con otros usuarios.
            {user?.username ? (
              <span className="text-neutral-400"> Conectado como @{user.username}.</span>
            ) : null}
          </p>
        </header>

        <div className="mx-auto w-full max-w-sm">
          <Card tone="dark" className="!p-2 max-w-full rounded-lg">
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-sm font-semibold tracking-tight text-neutral-200">Historias del gym</h2>
              <div className="flex w-full justify-center">
                <FeedModeTabs mode={feedMode} onChangeMode={setFeedMode} compact />
              </div>
              <StoriesRow posts={posts} compact />
            </div>
          </Card>
        </div>

        <Card tone="dark">
          <h2>Crear publicacion</h2>
          <CreatePostForm
            content={content}
            selectedWorkoutId={selectedWorkoutId}
            workouts={workouts}
            onChangeContent={setContent}
            onChangeWorkoutId={setSelectedWorkoutId}
            onSubmit={handleCreatePost}
          />
        </Card>

        <StatusMessage tone="dark" loading={loading} error={error} success={message} />
        {!loading && visiblePosts.length === 0 && (
          <EmptyState
            message={
              feedMode === "following"
                ? "Aun no hay publicaciones de usuarios seguidos."
                : "Aun no hay publicaciones en la comunidad."
            }
          />
        )}

        <ul className="workouts-list mt-3 grid list-none gap-2.5 p-0">
          {visiblePosts.map((post) => (
            <PostItem
              key={post.id}
              post={post}
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
              onComment={() => handleCreateComment(post.id)}
              getWorkoutTitle={getWorkoutTitle}
              formatDate={formatDate}
            />
          ))}
        </ul>
      </section>

      <Card as="aside" tone="dark" className="feed-right min-w-0 w-full sticky top-4 max-lg:static">
        <UserSummaryCard username={user?.username} myPostsCount={myPostsCount} />
        <h3>Sugerencias para ti</h3>
        {suggestedUsers.length === 0 && <EmptyState message="Aun no hay sugerencias." className="mt-2" />}
        <ul className="suggestions-list mt-2 grid list-none gap-2.5 p-0">
          {suggestedUsers.map((suggested) => (
            <FollowSuggestionItem
              key={suggested.id}
              user={suggested}
              isFollowing={followingIds.includes(suggested.id)}
              onToggleFollow={handleToggleFollow}
            />
          ))}
        </ul>
      </Card>
    </section>
  );
}

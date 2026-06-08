import { ApiError, apiFetch } from "./client";
import type {
  CreateCommentInput,
  CreatePostInput,
  NotificationsResponse,
  Post,
  PostComment,
} from "../types/post";
import { normalizePost } from "../utils/normalizePost";

/** Neon puede ir lento; el feed no incluye media en listado. */
const POSTS_FETCH_TIMEOUT_MS = 25_000;

export type FeedPageResponse = {
  items: { kind: "post"; post: Post }[];
  nextCursor: string | null;
  hasMore: boolean;
};

/** Feed paginado (ligero: sin media en listado). */
export async function getFeedPage(scope: "all" | "following" = "all", limit = 30) {
  const sp = new URLSearchParams({ scope, limit: String(limit) });
  const page = await apiFetch<FeedPageResponse>(`/posts/feed?${sp.toString()}`, {
    timeoutMs: POSTS_FETCH_TIMEOUT_MS,
  });
  return {
    ...page,
    items: page.items.map((item) =>
      item.kind === "post" ? { ...item, post: normalizePost(item.post) } : item,
    ),
  };
}

export async function createPost(input: CreatePostInput) {
  const sessionId =
    input.sessionId ??
    (input.workoutId && /^[0-9a-f-]{36}$/i.test(input.workoutId) ? input.workoutId : null);

  return apiFetch<Post>("/posts", {
    method: "POST",
    body: JSON.stringify({
      content: input.content,
      format: input.format ?? "standard",
      visibility: input.visibility ?? "public",
      sessionId,
    }),
  }).then(normalizePost);
}

export function deletePost(id: string) {
  return apiFetch<{ message: string }>(`/posts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function updatePost(
  id: string,
  input: { content: string; visibility: "public" | "followers" | "private" },
) {
  return apiFetch<Post>(`/posts/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  }).then(normalizePost);
}

export function toggleLike(postId: string) {
  return apiFetch<{ liked: boolean }>(`/posts/${encodeURIComponent(postId)}/likes`, {
    method: "POST",
  });
}

export async function createComment(postId: string, input: CreateCommentInput) {
  return apiFetch<PostComment>(`/posts/${encodeURIComponent(postId)}/comments`, {
    method: "POST",
    body: JSON.stringify({ content: input.content }),
  });
}

export function getNotifications() {
  return apiFetch<NotificationsResponse>("/posts/notifications");
}

export function markNotificationsRead(body: { keys?: string[]; all?: boolean }) {
  return apiFetch<{ ok?: boolean; marked?: number }>("/posts/notifications/read", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export const PROFILE_POSTS_PAGE_SIZE = 24;

export type PostsByUserPageResponse = {
  posts: Post[];
  nextCursor: string | null;
  total: number;
};

export async function getPostsByIds(ids: string[]): Promise<Post[]> {
  if (ids.length === 0) return [];
  const sp = new URLSearchParams();
  sp.set("ids", ids.slice(0, 50).join(","));
  const res = await apiFetch<{ posts: Post[] }>(`/posts/by-ids?${sp.toString()}`, {
    timeoutMs: POSTS_FETCH_TIMEOUT_MS,
  });
  return Array.isArray(res.posts) ? res.posts.map(normalizePost) : [];
}

export async function getPostById(postId: string): Promise<Post | null> {
  try {
    return await apiFetch<Post>(`/posts/${encodeURIComponent(postId)}`).then(normalizePost);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export function getPostsByUserPage(userId: string, opts: { limit: number; cursor?: string | null }) {
  const sp = new URLSearchParams();
  sp.set("limit", String(opts.limit));
  if (opts.cursor) sp.set("cursor", opts.cursor);
  return apiFetch<PostsByUserPageResponse>(
    `/posts/by-user/${encodeURIComponent(userId)}?${sp.toString()}`,
    { timeoutMs: POSTS_FETCH_TIMEOUT_MS },
  ).then((page) => ({
    ...page,
    posts: page.posts.map(normalizePost),
  }));
}

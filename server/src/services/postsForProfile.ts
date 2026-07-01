import { Buffer } from "node:buffer";
import { store, type Post } from "./store.js";

function canUserViewPost(post: Post, viewerUserId: string): boolean {
  if (post.userId === viewerUserId) return true;
  if (post.visibility === "public") return true;
  if (post.visibility === "followers") {
    return store.follows.some(
      (f) =>
        f.followerId === viewerUserId &&
        f.followingId === post.userId &&
        f.status !== "pending",
    );
  }
  return false;
}

function sortPostsNewestFirst(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });
}

function encodePostCursor(post: Post): string {
  return Buffer.from(JSON.stringify({ c: post.createdAt, i: post.id }), "utf8").toString("base64url");
}

function decodePostCursor(raw: string): { createdAt: string; id: string } | null {
  try {
    const s = String(raw).trim();
    if (!s) return null;
    const json = Buffer.from(s, "base64url").toString("utf8");
    const o = JSON.parse(json) as { c?: unknown; i?: unknown };
    if (typeof o.c === "string" && typeof o.i === "string") return { createdAt: o.c, id: o.i };
  } catch {
    /* ignore */
  }
  return null;
}

export function mapPostWithInteractions(post: Post, viewerUserId: string) {
  const author = store.users.find((user) => user.id === post.userId);
  const likes = store.likes.filter((like) => like.postId === post.id);
  const comments = store.comments
    .filter((comment) => comment.postId === post.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    .map((comment) => {
      const commentAuthor = store.users.find((user) => user.id === comment.userId);
      return {
        ...comment,
        authorUsername: commentAuthor?.username ?? "Usuario",
        authorAvatarUrl: commentAuthor?.avatarUrl ?? "",
      };
    });

  return {
    ...post,
    hasMedia: !!(post.media && post.media.length > 0),
    authorUsername: author?.username ?? "Usuario",
    authorAvatarUrl: author?.avatarUrl ?? "",
    likesCount: likes.length,
    likedByMe: likes.some((l) => l.userId === viewerUserId),
    comments,
  };
}

export function getUserPostsPage(
  viewerUserId: string,
  targetUserId: string,
  limit: number,
  cursor?: string | null,
) {
  const filtered = store.posts.filter((p) => p.userId === targetUserId && canUserViewPost(p, viewerUserId));
  const sorted = sortPostsNewestFirst(filtered);

  let start = 0;
  if (cursor) {
    const decoded = decodePostCursor(cursor);
    if (decoded) {
      const idx = sorted.findIndex((p) => p.createdAt === decoded.createdAt && p.id === decoded.id);
      start = idx === -1 ? sorted.length : idx + 1;
    }
  }

  const slice = sorted.slice(start, start + limit);
  const mapped = slice.map((p) => mapPostWithInteractions(p, viewerUserId));
  const hasMore = start + slice.length < sorted.length;
  const nextCursor = hasMore && slice.length > 0 ? encodePostCursor(slice[slice.length - 1]!) : null;

  return { posts: mapped, nextCursor, total: sorted.length };
}

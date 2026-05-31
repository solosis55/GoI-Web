import { Buffer } from "node:buffer";
import { Request, Response } from "express";
import { createId, saveStore, store, Post } from "../services/store.js";
import { buildFeedPage, type FeedScopeParam } from "../services/feedTimeline.js";
import { sendError } from "../services/http.js";
import { normalizePostMediaFromRequest } from "../services/postMedia.js";
import { isBlockedBetween } from "../services/profileVisibility.js";
import { resolvePostSessionMeta } from "../services/postsSessionMeta.js";
import { isLengthBetween, sanitizeText } from "../services/validation.js";

type PostPayload = {
  content?: string;
  format?: string;
  sessionId?: string | null;
  /** @deprecated Usar sessionId; se mantiene para clientes web antiguos. */
  workoutId?: string | null;
  visibility?: string;
  /** Imágenes en data URL JPEG/PNG/WebP. */
  media?: unknown;
};

function normalizePostFormat(raw: unknown): Post["format"] {
  const t = sanitizeText(raw);
  if (t === "training") return "training";
  return "standard";
}

type CommentPayload = {
  content?: string;
};

type FeedNotification = {
  id: string;
  type: "like" | "comment" | "follow";
  actorUserId: string;
  actorUsername: string;
  actorAvatarUrl: string;
  postId?: string;
  postPreview?: string;
  commentPreview?: string;
  commentId?: string;
  createdAt: string;
};

function buildNotificationsForRecipient(recipientId: string): FeedNotification[] {
  const postsById = new Map(store.posts.map((p) => [p.id, p]));

  const notifLikes: FeedNotification[] = store.likes
    .filter((l) => l.userId !== recipientId)
    .map((l) => ({ like: l, post: postsById.get(l.postId) }))
    .filter((x): x is { like: (typeof store.likes)[number]; post: Post } =>
      Boolean(x.post && x.post.userId === recipientId),
    )
    .map(({ like, post }) => {
      const actor = store.users.find((u) => u.id === like.userId);
      return {
        id: `like:${like.id}`,
        type: "like" as const,
        actorUserId: like.userId,
        actorUsername: actor?.username ?? "Usuario",
        actorAvatarUrl: actor?.avatarUrl ?? "",
        postId: post.id,
        postPreview: postSnippetForNotify(post),
        createdAt: like.createdAt,
      };
    });

  const notifComments: FeedNotification[] = store.comments
    .filter((c) => c.userId !== recipientId)
    .map((c) => ({ comment: c, post: postsById.get(c.postId) }))
    .filter(
      (x): x is { comment: (typeof store.comments)[number]; post: Post } =>
        Boolean(x.post && x.post.userId === recipientId),
    )
    .map(({ comment, post }) => {
      const actor = store.users.find((u) => u.id === comment.userId);
      return {
        id: `comment:${comment.id}`,
        type: "comment" as const,
        actorUserId: comment.userId,
        actorUsername: actor?.username ?? "Usuario",
        actorAvatarUrl: actor?.avatarUrl ?? "",
        postId: post.id,
        postPreview: postSnippetForNotify(post),
        commentPreview: comment.content.slice(0, 120),
        commentId: comment.id,
        createdAt: comment.createdAt,
      };
    });

  const notifFollows: FeedNotification[] = store.follows
    .filter((f) => f.followingId === recipientId && f.followerId !== recipientId)
    .map((f) => {
      const actor = store.users.find((u) => u.id === f.followerId);
      return {
        id: `follow:${f.id}`,
        type: "follow" as const,
        actorUserId: f.followerId,
        actorUsername: actor?.username ?? "Usuario",
        actorAvatarUrl: actor?.avatarUrl ?? "",
        createdAt: f.createdAt,
      };
    });

  return [...notifLikes, ...notifComments, ...notifFollows]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 50);
}

const POST_VISIBILITIES = new Set(["public", "followers", "private"]);

function postSnippetForNotify(post: Pick<Post, "content" | "media">) {
  const text = sanitizeText(post.content).slice(0, 96);
  if (text) return text;
  if (post.media && post.media.length > 0) return "Publicación con foto";
  return "";
}

function normalizeVisibility(raw: unknown): Post["visibility"] | null {
  const t = sanitizeText(raw);
  if (!t) return "public";
  if (!POST_VISIBILITIES.has(t)) return null;
  return t as Post["visibility"];
}

function canUserViewPost(post: Post, viewerUserId: string): boolean {
  if (post.userId === viewerUserId) return true;
  if (post.visibility === "public") return true;
  if (post.visibility === "followers") {
    return store.follows.some(
      (f) =>
        f.followerId === viewerUserId && f.followingId === post.userId && f.status !== "pending",
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

function mapPostWithInteractions(post: Post, viewerUserId: string) {
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
    ...resolvePostSessionMeta(post),
    authorUsername: author?.username ?? "Usuario",
    authorAvatarUrl: author?.avatarUrl ?? "",
    likesCount: likes.length,
    likedByMe: likes.some((l) => l.userId === viewerUserId),
    comments,
  };
}

export function listPosts(_req: Request, res: Response) {
  const authUserId = String(res.locals.authUserId ?? "");
  if (!authUserId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }
  const posts = [...store.posts]
    .filter((p) => canUserViewPost(p, authUserId))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  res.json(posts.map((p) => mapPostWithInteractions(p, authUserId)));
}

export function listFeed(req: Request, res: Response) {
  const authUserId = String(res.locals.authUserId ?? "");
  if (!authUserId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }

  const scopeRaw = typeof req.query.scope === "string" ? req.query.scope : "following";
  const scope: FeedScopeParam = scopeRaw === "all" ? "all" : "following";

  const limitRaw = Number(req.query.limit);
  const limit = Number.isFinite(limitRaw) ? limitRaw : 20;

  const cursor =
    typeof req.query.cursor === "string"
      ? req.query.cursor.trim()
      : "";

  const page = buildFeedPage(authUserId, scope, limit, cursor || undefined);

  res.json({
    items: page.items.map((item) =>
      item.kind === "post"
        ? { kind: "post", post: mapPostWithInteractions(item.post, authUserId) }
        : item
    ),
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  });
}

export function listNotifications(_req: Request, res: Response) {
  const authUserId = String(res.locals.authUserId ?? "");
  if (!authUserId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }

  const built = buildNotificationsForRecipient(authUserId);
  const readSet = new Set(
    store.notificationReads.filter((r) => r.userId === authUserId).map((r) => r.key),
  );
  const notifications = built.map((n) => ({ ...n, read: readSet.has(n.id) }));
  const unreadCount = notifications.filter((n) => !n.read).length;
  res.json({ notifications, unreadCount });
}

type MarkReadsBody = {
  keys?: unknown;
  all?: unknown;
};

export function markNotificationsRead(req: Request, res: Response) {
  const authUserId = String(res.locals.authUserId ?? "");
  if (!authUserId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }

  const { keys, all } = req.body as MarkReadsBody;
  const validKeys = new Set(buildNotificationsForRecipient(authUserId).map((n) => n.id));

  let toMark: string[];
  if (all === true) {
    toMark = [...validKeys];
  } else if (Array.isArray(keys)) {
    toMark = keys.filter((k): k is string => typeof k === "string" && validKeys.has(k));
  } else {
    sendError(res, 400, "NOTIFICATION_READ_INVALID_INPUT", "keys or all is required");
    return;
  }

  if (toMark.length === 0) {
    res.json({ marked: 0 });
    return;
  }

  const now = new Date().toISOString();
  for (const key of toMark) {
    const exists = store.notificationReads.some((r) => r.userId === authUserId && r.key === key);
    if (!exists) {
      store.notificationReads.push({ userId: authUserId, key, readAt: now });
    }
  }
  saveStore();
  res.json({ marked: toMark.length });
}

export function listPostsByUser(req: Request, res: Response) {
  const authUserId = String(res.locals.authUserId ?? "");
  if (!authUserId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }

  const targetUserId = String(req.params.targetUserId ?? "").trim();
  if (!targetUserId) {
    sendError(res, 400, "POST_INVALID_INPUT", "user id is required");
    return;
  }

  const targetUser = store.users.find((u) => u.id === targetUserId);
  if (!targetUser) {
    sendError(res, 404, "AUTH_USER_NOT_FOUND", "user not found");
    return;
  }

  const limitRaw = req.query.limit;
  const limitFirst = Array.isArray(limitRaw) ? limitRaw[0] : limitRaw;
  const wantPagination = limitFirst !== undefined && String(limitFirst).trim() !== "";

  const cursorRaw =
    typeof req.query.cursor === "string"
      ? req.query.cursor.trim()
      : Array.isArray(req.query.cursor) && typeof req.query.cursor[0] === "string"
        ? req.query.cursor[0].trim()
        : "";

  if (
    targetUserId !== authUserId &&
    targetUser.profileVisibility === "followers" &&
    !store.follows.some((f) => f.followerId === authUserId && f.followingId === targetUserId)
  ) {
    if (wantPagination) {
      res.json({ posts: [], nextCursor: null, total: 0 });
    } else {
      res.json([]);
    }
    return;
  }

  const filtered = store.posts.filter((p) => p.userId === targetUserId && canUserViewPost(p, authUserId));
  const sorted = sortPostsNewestFirst(filtered);

  if (!wantPagination) {
    res.json(sorted.map((p) => mapPostWithInteractions(p, authUserId)));
    return;
  }

  let limitNum = parseInt(String(limitFirst), 10);
  if (!Number.isFinite(limitNum)) {
    sendError(res, 400, "POST_INVALID_INPUT", "invalid limit");
    return;
  }
  limitNum = Math.min(50, Math.max(1, Math.floor(limitNum)));

  let start = 0;
  if (cursorRaw) {
    const decoded = decodePostCursor(cursorRaw);
    if (!decoded) {
      sendError(res, 400, "POST_INVALID_INPUT", "invalid cursor");
      return;
    }
    const idx = sorted.findIndex((p) => p.createdAt === decoded.createdAt && p.id === decoded.id);
    start = idx === -1 ? sorted.length : idx + 1;
  }

  const slice = sorted.slice(start, start + limitNum);
  const mapped = slice.map((p) => mapPostWithInteractions(p, authUserId));
  const hasMore = start + slice.length < sorted.length;
  const nextCursor = hasMore && slice.length > 0 ? encodePostCursor(slice[slice.length - 1]!) : null;

  res.json({
    posts: mapped,
    nextCursor,
    total: sorted.length,
  });
}

export function createPost(req: Request, res: Response) {
  const authUserId = String(res.locals.authUserId ?? "");
  const {
    content,
    format: rawFormat,
    sessionId: rawSessionId = null,
    workoutId: rawWorkoutId = null,
    visibility,
    media: mediaRaw,
  } = req.body as PostPayload;
  const postFormat = normalizePostFormat(rawFormat);
  const normalizedContent = sanitizeText(content);
  const normalizedVisibility = normalizeVisibility(visibility);

  const normalizedAttach = normalizePostMediaFromRequest(mediaRaw);
  if (normalizedAttach === null) {
    sendError(res, 400, "POST_MEDIA_INVALID", "invalid image attachments");
    return;
  }
  const attachments = normalizedAttach ?? [];
  const hasMedia = attachments.length > 0;

  if (!hasMedia && !isLengthBetween(normalizedContent, 4, 280)) {
    sendError(res, 400, "POST_INVALID_INPUT", "content is required");
    return;
  }
  if (normalizedContent.length > 280) {
    sendError(res, 400, "POST_INVALID_INPUT", "content exceeds max length");
    return;
  }
  if (!normalizedVisibility) {
    sendError(res, 400, "POST_INVALID_VISIBILITY", "invalid visibility");
    return;
  }

  const userExists = store.users.some((user) => user.id === authUserId);
  if (!userExists) {
    sendError(res, 401, "AUTH_SESSION_STALE", "jwt user id missing from store");
    return;
  }

  let sessionId: string | null = rawSessionId ? sanitizeText(rawSessionId) || null : null;
  let workoutId: string | null = rawWorkoutId ? sanitizeText(rawWorkoutId) || null : null;

  if (sessionId) {
    const session = store.workoutSessions.find((s) => s.id === sessionId);
    if (!session) {
      sendError(res, 404, "POST_SESSION_NOT_FOUND", "session not found");
      return;
    }
    if (session.userId !== authUserId) {
      sendError(res, 403, "POST_SESSION_FORBIDDEN", "forbidden");
      return;
    }
    const alreadyLinked = store.posts.some((p) => p.sessionId === sessionId);
    if (alreadyLinked) {
      sendError(res, 409, "POST_SESSION_ALREADY_LINKED", "session already linked to a post");
      return;
    }
    workoutId = session.workoutId;
  } else if (workoutId) {
    const workoutExists = store.workouts.some((workout) => workout.id === workoutId);
    if (!workoutExists) {
      sendError(res, 404, "POST_WORKOUT_NOT_FOUND", "workout not found");
      return;
    }
  }

  const post: Post = {
    id: createId(),
    userId: authUserId,
    content: normalizedContent,
    ...(hasMedia ? { media: attachments } : {}),
    format: postFormat,
    sessionId,
    workoutId,
    visibility: normalizedVisibility,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.posts.push(post);
  saveStore();
  res.status(201).json(mapPostWithInteractions(post, authUserId));
}

export function deletePost(req: Request, res: Response) {
  const authUserId = String(res.locals.authUserId ?? "");
  const { id } = req.params;
  const index = store.posts.findIndex((post) => post.id === id);

  if (index === -1) {
    sendError(res, 404, "POST_NOT_FOUND", "post not found");
    return;
  }

  if (store.posts[index].userId !== authUserId) {
    sendError(res, 403, "POST_FORBIDDEN", "forbidden");
    return;
  }

  const postId = store.posts[index].id;
  const [removed] = store.posts.splice(index, 1);
  store.likes = store.likes.filter((like) => like.postId !== postId);
  store.comments = store.comments.filter((comment) => comment.postId !== postId);
  saveStore();
  res.json({ message: "post deleted", post: removed });
}

export function updatePost(req: Request, res: Response) {
  const authUserId = String(res.locals.authUserId ?? "");
  const { id } = req.params;
  const body = req.body as PostPayload;
  const { content, visibility } = body;
  const normalizedContent = sanitizeText(content);
  const normalizedVisibility = normalizeVisibility(visibility);

  const post = store.posts.find((item) => item.id === id);
  if (!post) {
    sendError(res, 404, "POST_NOT_FOUND", "post not found");
    return;
  }
  if (post.userId !== authUserId) {
    sendError(res, 403, "POST_FORBIDDEN", "forbidden");
    return;
  }

  let nextMedia: Post["media"] = post.media;
  if (Object.prototype.hasOwnProperty.call(body, "media")) {
    const parsed = normalizePostMediaFromRequest(body.media);
    if (parsed === null) {
      sendError(res, 400, "POST_MEDIA_INVALID", "invalid image attachments");
      return;
    }
    if (parsed !== undefined) {
      nextMedia = parsed.length > 0 ? parsed : undefined;
    }
  }

  const hasMedia = !!(nextMedia && nextMedia.length > 0);
  if (!hasMedia && !isLengthBetween(normalizedContent, 4, 280)) {
    sendError(res, 400, "POST_INVALID_INPUT", "content is required");
    return;
  }
  if (normalizedContent.length > 280) {
    sendError(res, 400, "POST_INVALID_INPUT", "content exceeds max length");
    return;
  }
  if (!authUserId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }
  if (!normalizedVisibility) {
    sendError(res, 400, "POST_INVALID_VISIBILITY", "invalid visibility");
    return;
  }

  post.content = normalizedContent;
  post.visibility = normalizedVisibility;
  post.media = nextMedia;
  post.updatedAt = new Date().toISOString();
  saveStore();
  res.json(mapPostWithInteractions(post, authUserId));
}

export function toggleLike(req: Request, res: Response) {
  const postId = String(req.params.id);
  const userId = String(res.locals.authUserId ?? "");
  if (!userId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }

  const post = store.posts.find((item) => item.id === postId);
  if (!post) {
    sendError(res, 404, "POST_NOT_FOUND", "post not found");
    return;
  }
  if (!canUserViewPost(post, userId)) {
    sendError(res, 403, "POST_FORBIDDEN", "forbidden");
    return;
  }

  const userExists = store.users.some((user) => user.id === userId);
  if (!userExists) {
    sendError(res, 401, "AUTH_SESSION_STALE", "jwt user id missing from store");
    return;
  }

  const existingLikeIndex = store.likes.findIndex((like) => like.postId === postId && like.userId === userId);

  if (existingLikeIndex >= 0) {
    store.likes.splice(existingLikeIndex, 1);
    saveStore();
    res.json({ liked: false });
    return;
  }

  store.likes.push({
    id: createId(),
    postId,
    userId,
    createdAt: new Date().toISOString(),
  });
  saveStore();
  res.json({ liked: true });
}

export function listPostLikes(req: Request, res: Response) {
  const postId = String(req.params.id);
  const viewerId = String(res.locals.authUserId ?? "");
  if (!viewerId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }

  const post = store.posts.find((item) => item.id === postId);
  if (!post) {
    sendError(res, 404, "POST_NOT_FOUND", "post not found");
    return;
  }
  if (!canUserViewPost(post, viewerId)) {
    sendError(res, 403, "POST_FORBIDDEN", "forbidden");
    return;
  }

  const likes = store.likes
    .filter((like) => like.postId === postId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .flatMap((like) => {
      if (isBlockedBetween(viewerId, like.userId)) return [];
      const user = store.users.find((u) => u.id === like.userId);
      if (!user) return [];
      return [
        {
          id: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl ?? "",
          likedAt: like.createdAt,
        },
      ];
    });

  res.json({ likes, total: likes.length });
}

export function createComment(req: Request, res: Response) {
  const postId = String(req.params.id);
  const userId = String(res.locals.authUserId ?? "");
  const { content } = req.body as CommentPayload;
  const normalizedContent = sanitizeText(content);

  if (!userId || !isLengthBetween(normalizedContent, 1, 180)) {
    sendError(res, 400, "COMMENT_INVALID_INPUT", "content is required");
    return;
  }

  const post = store.posts.find((item) => item.id === postId);
  if (!post) {
    sendError(res, 404, "POST_NOT_FOUND", "post not found");
    return;
  }
  if (!canUserViewPost(post, userId)) {
    sendError(res, 403, "POST_FORBIDDEN", "forbidden");
    return;
  }

  const userExists = store.users.some((user) => user.id === userId);
  if (!userExists) {
    sendError(res, 401, "AUTH_SESSION_STALE", "jwt user id missing from store");
    return;
  }

  const comment = {
    id: createId(),
    postId,
    userId,
    content: normalizedContent,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.comments.push(comment);
  saveStore();

  const commentAuthor = store.users.find((user) => user.id === userId);
  res.status(201).json({
    ...comment,
    authorUsername: commentAuthor?.username ?? "Usuario",
    authorAvatarUrl: commentAuthor?.avatarUrl ?? "",
  });
}

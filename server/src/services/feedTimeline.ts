import { store, type Post, type WorkoutSession } from "./store.js";

export type FeedScopeParam = "all" | "following";

export type FeedWorkoutEventDto = {
  id: string;
  userId: string;
  authorUsername: string;
  authorAvatarUrl: string;
  workoutId: string;
  workoutTitle: string;
  performedAt: string;
};

export type FeedTimelineItemDto =
  | { kind: "post"; post: Post }
  | { kind: "workout"; event: FeedWorkoutEventDto };

export type FeedTimelineSlice = {
  items: FeedTimelineItemDto[];
  nextCursor: string | null;
  hasMore: boolean;
};

type TimelineEntry =
  | { kind: "post"; at: string; id: string; post: Post }
  | { kind: "workout"; at: string; id: string; event: FeedWorkoutEventDto };

const WEEK_MS = 14 * 24 * 60 * 60 * 1000;

function followingIdsFor(viewerId: string): Set<string> {
  const ids = store.follows
    .filter((f) => f.followerId === viewerId && f.status !== "pending")
    .map((f) => f.followingId);
  return new Set([viewerId, ...ids]);
}

function canUserViewPost(post: Post, viewerUserId: string): boolean {
  if (post.userId === viewerUserId) return true;
  if (post.visibility === "public") return true;
  if (post.visibility === "followers") {
    return store.follows.some(
      (f) =>
        f.followerId === viewerUserId &&
        f.followingId === post.userId &&
        f.status !== "pending"
    );
  }
  return false;
}

function viewerFollowsUser(viewerId: string, targetId: string): boolean {
  return store.follows.some(
    (f) => f.followerId === viewerId && f.followingId === targetId && f.status !== "pending"
  );
}

function canViewerSeeSession(viewerId: string, targetUserId: string): boolean {
  if (viewerId === targetUserId) return true;
  if (!viewerFollowsUser(viewerId, targetUserId)) return false;
  const target = store.users.find((u) => u.id === targetUserId);
  if (!target) return false;
  const vis = target.profileSections?.sessions ?? "public";
  if (vis === "private") return false;
  if (vis === "followers") return viewerFollowsUser(viewerId, targetUserId);
  return true;
}

function sessionCoveredByPost(session: WorkoutSession): boolean {
  const t = new Date(session.performedAt).getTime();
  return store.posts.some((p) => {
    if (p.userId !== session.userId) return false;
    if (p.sessionId === session.id) return true;
    return (
      p.workoutId === session.workoutId &&
      Math.abs(new Date(p.createdAt).getTime() - t) < 24 * 60 * 60 * 1000
    );
  });
}

function postRankBoost(post: Post, nowMs: number): number {
  let boost = 0;
  const age = nowMs - new Date(post.createdAt).getTime();
  if (age >= 0 && age < 24 * 60 * 60 * 1000) boost += 1000;
  if (post.sessionId || post.workoutId) boost += 120;
  if (post.media && post.media.length > 0) boost += 80;
  return boost;
}

function buildEntries(viewerId: string, scope: FeedScopeParam): TimelineEntry[] {
  const nowMs = Date.now();
  const cutoff = nowMs - WEEK_MS;
  const allowed = scope === "following" ? followingIdsFor(viewerId) : null;

  const posts = store.posts
    .filter((p) => canUserViewPost(p, viewerId))
    .filter((p) => !allowed || allowed.has(p.userId));

  const postEntries: TimelineEntry[] = posts.map((post) => ({
    kind: "post",
    at: post.createdAt,
    id: post.id,
    post,
  }));

  const workoutById = new Map(store.workouts.map((w) => [w.id, w]));
  const workoutEntries: TimelineEntry[] = [];

  for (const session of store.workoutSessions) {
    if (new Date(session.performedAt).getTime() < cutoff) continue;
    if (allowed && !allowed.has(session.userId)) continue;
    if (!canViewerSeeSession(viewerId, session.userId)) continue;
    if (sessionCoveredByPost(session)) continue;

    const author = store.users.find((u) => u.id === session.userId);
    if (!author) continue;
    const w = workoutById.get(session.workoutId);

    workoutEntries.push({
      kind: "workout",
      at: session.performedAt,
      id: `workout:${session.id}`,
      event: {
        id: session.id,
        userId: session.userId,
        authorUsername: author.username,
        authorAvatarUrl: author.avatarUrl ?? "",
        workoutId: session.workoutId,
        workoutTitle: w?.title ?? "Rutina",
        performedAt: session.performedAt,
      },
    });
  }

  const merged = [...postEntries, ...workoutEntries];

  merged.sort((a, b) => {
    const ta = new Date(a.at).getTime();
    const tb = new Date(b.at).getTime();
    let scoreA = ta;
    let scoreB = tb;
    if (scope === "following") {
      if (a.kind === "post") scoreA += postRankBoost(a.post, nowMs);
      if (b.kind === "post") scoreB += postRankBoost(b.post, nowMs);
      if (a.kind === "workout") scoreA += 60;
      if (b.kind === "workout") scoreB += 60;
    }
    if (scoreB !== scoreA) return scoreB - scoreA;
    return b.id.localeCompare(a.id);
  });

  return merged;
}

export function buildFeedPage(
  viewerId: string,
  scope: FeedScopeParam,
  limit: number,
  cursorRaw?: string
): FeedTimelineSlice {
  const limitClamped = Math.min(Math.max(1, limit), 40);
  const entries = buildEntries(viewerId, scope);

  let startIdx = 0;
  if (cursorRaw) {
    const idx = entries.findIndex((e) => e.id === cursorRaw);
    startIdx = idx >= 0 ? idx + 1 : 0;
  }

  const slice = entries.slice(startIdx, startIdx + limitClamped + 1);
  const hasMore = slice.length > limitClamped;
  const page = hasMore ? slice.slice(0, limitClamped) : slice;

  const items: FeedTimelineItemDto[] = page.map((e) =>
    e.kind === "post" ? { kind: "post", post: e.post } : { kind: "workout", event: e.event }
  );

  const last = page[page.length - 1];
  return {
    items,
    nextCursor: hasMore && last ? last.id : null,
    hasMore,
  };
}

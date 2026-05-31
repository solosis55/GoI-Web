import { store } from "./store.js";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function sessionsThisWeek(userId: string, nowMs: number): number {
  const cutoff = nowMs - WEEK_MS;
  return store.workoutSessions.filter(
    (s) => s.userId === userId && new Date(s.performedAt).getTime() >= cutoff
  ).length;
}

function isActiveThisWeek(userId: string, nowMs: number): boolean {
  const cutoff = nowMs - WEEK_MS;
  const hasPost = store.posts.some(
    (p) => p.userId === userId && new Date(p.createdAt).getTime() >= cutoff
  );
  if (hasPost) return true;
  return store.workoutSessions.some(
    (s) => s.userId === userId && new Date(s.performedAt).getTime() >= cutoff
  );
}

export type WeeklyLeaderDto = {
  userId: string;
  username: string;
  avatarUrl: string;
  sessionsThisWeek: number;
};

export type SocialWeeklySummary = {
  mySessionsWeek: number;
  followingActiveWeek: number;
  leaders: WeeklyLeaderDto[];
};

export function buildSocialWeeklySummary(viewerId: string): SocialWeeklySummary {
  const nowMs = Date.now();
  const mySessionsWeek = sessionsThisWeek(viewerId, nowMs);

  const followingIds = store.follows
    .filter((f) => f.followerId === viewerId && f.status !== "pending")
    .map((f) => f.followingId);

  let followingActiveWeek = 0;
  const leaders: WeeklyLeaderDto[] = [];

  for (const fid of followingIds) {
    if (isActiveThisWeek(fid, nowMs)) followingActiveWeek += 1;
    const count = sessionsThisWeek(fid, nowMs);
    if (count <= 0) continue;
    const u = store.users.find((x) => x.id === fid);
    if (!u) continue;
    leaders.push({
      userId: u.id,
      username: u.username,
      avatarUrl: u.avatarUrl ?? "",
      sessionsThisWeek: count,
    });
  }

  leaders.sort((a, b) => b.sessionsThisWeek - a.sessionsThisWeek);

  return {
    mySessionsWeek,
    followingActiveWeek,
    leaders: leaders.slice(0, 8),
  };
}

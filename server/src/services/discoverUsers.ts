import { isProfileDiscoverable } from "./profileVisibility.js";
import { store } from "./store.js";
import type { User } from "./store.js";

export type DiscoverMutualPreview = {
  id: string;
  username: string;
  avatarUrl: string;
};

export type RankedDiscoverUser = {
  user: User;
  score: number;
  mutualCount: number;
  mutualPreview: DiscoverMutualPreview[];
  reason: string;
  activeThisWeek: boolean;
  trainedThisWeek: boolean;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function norm(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function followingSet(viewerId: string): Set<string> {
  return new Set(
    store.follows.filter((f) => f.followerId === viewerId).map((f) => f.followingId)
  );
}

function viewerWorkoutIds(viewerId: string): Set<string> {
  return new Set(
    store.workoutSessions
      .filter((s) => s.userId === viewerId)
      .map((s) => s.workoutId)
  );
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

function trainedThisWeek(userId: string, nowMs: number): boolean {
  const cutoff = nowMs - WEEK_MS;
  return store.workoutSessions.some(
    (s) => s.userId === userId && new Date(s.performedAt).getTime() >= cutoff
  );
}

function sharedWorkoutCount(viewerId: string, candidateId: string): number {
  const viewerIds = viewerWorkoutIds(viewerId);
  if (viewerIds.size === 0) return 0;
  const candidateIds = new Set(
    store.workoutSessions.filter((s) => s.userId === candidateId).map((s) => s.workoutId)
  );
  let n = 0;
  for (const id of viewerIds) {
    if (candidateIds.has(id)) n += 1;
  }
  return n;
}

function mutualsForTarget(viewerFollowing: Set<string>, targetId: string): string[] {
  const ids: string[] = [];
  for (const follow of store.follows) {
    if (follow.followingId !== targetId) continue;
    if (viewerFollowing.has(follow.followerId)) ids.push(follow.followerId);
  }
  return ids;
}

function buildReason(input: {
  mutualCount: number;
  sameGoal: boolean;
  sameLocation: boolean;
  activeThisWeek: boolean;
  trainedThisWeek: boolean;
  sharedWorkouts: number;
  goal: string;
  bio: string;
}): string {
  if (input.mutualCount > 0) {
    return input.mutualCount === 1 ? "1 contacto en común" : `${input.mutualCount} contactos en común`;
  }
  if (input.sharedWorkouts > 0) {
    return input.sharedWorkouts === 1
      ? "Entrena la misma rutina que tú"
      : "Rutinas en común contigo";
  }
  if (input.trainedThisWeek) return "Entrenó esta semana";
  if (input.sameGoal && input.goal) return input.goal;
  if (input.sameLocation) return "Cerca de ti";
  if (input.activeThisWeek) return "Activo esta semana";
  if (input.goal) return input.goal;
  if (input.bio) return input.bio;
  return "Perfil en GoI";
}

function rankOne(viewer: User, viewerFollowing: Set<string>, nowMs: number): RankedDiscoverUser[] {
  const viewerGoal = norm(viewer.goal);
  const viewerLocation = norm(viewer.location);
  const ranked: RankedDiscoverUser[] = [];

  for (const candidate of store.users) {
    if (candidate.id === viewer.id) continue;
    if (viewerFollowing.has(candidate.id)) continue;
    if (!isProfileDiscoverable(candidate)) continue;

    const mutualIds = mutualsForTarget(viewerFollowing, candidate.id);
    const mutualCount = mutualIds.length;
    const sameGoal = viewerGoal.length > 0 && viewerGoal === norm(candidate.goal);
    const sameLocation =
      viewerLocation.length > 0 && viewerLocation === norm(candidate.location);
    const active = isActiveThisWeek(candidate.id, nowMs);
    const trained = trainedThisWeek(candidate.id, nowMs);
    const sharedWorkouts = sharedWorkoutCount(viewer.id, candidate.id);

    let score = 0;
    score += mutualCount * 12;
    if (sharedWorkouts > 0) score += 10;
    if (trained) score += 7;
    if (sameGoal) score += 8;
    if (sameLocation) score += 5;
    if (active) score += 6;

    const mutualPreview: DiscoverMutualPreview[] = mutualIds.slice(0, 2).map((id) => {
      const u = store.users.find((item) => item.id === id)!;
      return { id: u.id, username: u.username, avatarUrl: u.avatarUrl ?? "" };
    });

    const goal = (candidate.goal ?? "").trim();
    const bio = (candidate.bio ?? "").trim();
    const reason = buildReason({
      mutualCount,
      sameGoal,
      sameLocation,
      activeThisWeek: active,
      trainedThisWeek: trained,
      sharedWorkouts,
      goal,
      bio,
    });

    ranked.push({
      user: candidate,
      score,
      mutualCount,
      mutualPreview,
      reason,
      activeThisWeek: active,
      trainedThisWeek: trained,
    });
  }

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.user.username.localeCompare(b.user.username);
  });

  return ranked;
}

export function rankDiscoverUsers(viewerId: string, limit = 24): RankedDiscoverUser[] {
  const viewer = store.users.find((u) => u.id === viewerId);
  if (!viewer) return [];
  return rankOne(viewer, followingSet(viewerId), Date.now()).slice(0, limit);
}

export function rankAllDiscoverUsers(viewerId: string): RankedDiscoverUser[] {
  const viewer = store.users.find((u) => u.id === viewerId);
  if (!viewer) return [];
  return rankOne(viewer, followingSet(viewerId), Date.now());
}

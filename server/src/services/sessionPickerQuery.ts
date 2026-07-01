import { store, type WorkoutSession } from "./store.js";
import { resolveSessionSnapshotForApi } from "./sessionSnapshotDerive.js";

export type SessionPickerRoutineOption = {
  workoutId: string;
  workoutTitle: string;
  sessionCount: number;
};

export type SessionPickerRow = WorkoutSession & {
  workoutTitle: string;
  snapshot?: ReturnType<typeof resolveSessionSnapshotForApi>;
  linkedPostId: string | null;
};

export type SessionPickerQueryInput = {
  userId: string;
  q?: string;
  workoutId?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
  includeLinked?: boolean;
};

export type SessionPickerQueryResult = {
  sessions: SessionPickerRow[];
  nextCursor: string | null;
  hasMore: boolean;
  routineOptions: SessionPickerRoutineOption[];
};

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;

function mapSessionWithTitle(session: WorkoutSession): Omit<SessionPickerRow, "linkedPostId"> {
  const w = store.workouts.find((x) => x.id === session.workoutId);
  const snapshot = resolveSessionSnapshotForApi(session);
  const workoutTitle = snapshot?.workoutTitle ?? w?.title ?? "(Entrenamiento eliminado)";
  return { ...session, workoutTitle, ...(snapshot ? { snapshot } : {}) };
}

function sessionHaystack(row: Omit<SessionPickerRow, "linkedPostId">): string {
  const parts = [row.workoutTitle, row.notes ?? ""];
  for (const block of row.snapshot?.blocks ?? []) {
    parts.push(block.exerciseName);
  }
  return parts.join(" ").toLowerCase();
}

function compareSessions(a: WorkoutSession, b: WorkoutSession): number {
  const ta = Date.parse(a.performedAt);
  const tb = Date.parse(b.performedAt);
  if (tb !== ta) return tb - ta;
  return b.id.localeCompare(a.id);
}

function encodeCursor(session: WorkoutSession): string {
  return `${session.performedAt}|${session.id}`;
}

function isBeforeCursor(session: WorkoutSession, cursor: string): boolean {
  const [performedAt, id] = cursor.split("|");
  if (!performedAt || !id) return true;
  const ta = Date.parse(session.performedAt);
  const tb = Date.parse(performedAt);
  if (ta < tb) return true;
  if (ta > tb) return false;
  return session.id < id;
}

function buildLinkedPostMap(userId: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const post of store.posts) {
    if (post.userId === userId && post.sessionId) {
      map.set(post.sessionId, post.id);
    }
  }
  return map;
}

function buildRoutineOptions(userId: string): SessionPickerRoutineOption[] {
  const counts = new Map<string, { workoutTitle: string; sessionCount: number }>();
  for (const session of store.workoutSessions) {
    if (session.userId !== userId) continue;
    const mapped = mapSessionWithTitle(session);
    const prev = counts.get(session.workoutId);
    if (prev) {
      prev.sessionCount += 1;
    } else {
      counts.set(session.workoutId, { workoutTitle: mapped.workoutTitle, sessionCount: 1 });
    }
  }
  return [...counts.entries()]
    .map(([workoutId, meta]) => ({ workoutId, ...meta }))
    .sort((a, b) => a.workoutTitle.localeCompare(b.workoutTitle, "es"));
}

export function querySessionsForPicker(input: SessionPickerQueryInput): SessionPickerQueryResult {
  const userId = input.userId;
  const q = (input.q ?? "").trim().toLowerCase();
  const workoutId = (input.workoutId ?? "").trim();
  const fromMs = input.from ? Date.parse(input.from) : NaN;
  const toMs = input.to ? Date.parse(input.to) : NaN;
  const includeLinked = input.includeLinked !== false;
  const limit = Math.min(MAX_LIMIT, Math.max(1, input.limit ?? DEFAULT_LIMIT));
  const linkedMap = buildLinkedPostMap(userId);

  let rows = store.workoutSessions
    .filter((s) => s.userId === userId)
    .map((session) => {
      const mapped = mapSessionWithTitle(session);
      const linkedPostId = linkedMap.get(session.id) ?? null;
      return { ...mapped, linkedPostId };
    });

  if (workoutId) {
    rows = rows.filter((s) => s.workoutId === workoutId);
  }

  if (Number.isFinite(fromMs)) {
    rows = rows.filter((s) => Date.parse(s.performedAt) >= fromMs);
  }
  if (Number.isFinite(toMs)) {
    rows = rows.filter((s) => Date.parse(s.performedAt) <= toMs);
  }

  if (q) {
    rows = rows.filter((s) => sessionHaystack(s).includes(q));
  }

  if (!includeLinked) {
    rows = rows.filter((s) => !s.linkedPostId);
  }

  rows.sort(compareSessions);

  if (input.cursor) {
    rows = rows.filter((s) => isBeforeCursor(s, input.cursor!));
  }

  const page = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const nextCursor = hasMore && page.length > 0 ? encodeCursor(page[page.length - 1]!) : null;

  return {
    sessions: page,
    nextCursor,
    hasMore,
    routineOptions: input.cursor ? [] : buildRoutineOptions(userId),
  };
}

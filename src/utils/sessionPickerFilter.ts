import type { WorkoutSessionWithTitle } from "../types/workoutSession";

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

function sessionHaystack(session: WorkoutSessionWithTitle): string {
  const parts = [session.workoutTitle, session.notes ?? ""];
  for (const block of session.snapshot?.blocks ?? []) {
    parts.push(block.exerciseName);
  }
  return parts.join(" ").toLowerCase();
}

/** Búsqueda local por rutina, notas o ejercicios del snapshot. */
export function filterSessionsByQuery(
  sessions: WorkoutSessionWithTitle[],
  query: string,
): WorkoutSessionWithTitle[] {
  const q = normalizeQuery(query);
  if (!q) return sessions;
  return sessions.filter((s) => sessionHaystack(s).includes(q));
}

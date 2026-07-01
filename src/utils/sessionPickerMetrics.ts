import type { WorkoutSessionWithTitle } from "../types/workoutSession";
import { buildSessionExercisePreviews } from "./sessionExercisePreview";

type MetricsSession = Pick<WorkoutSessionWithTitle, "notes" | "snapshot">;

/** Resumen compacto: series, ejercicios y primer movimiento. */
export function formatSessionPickerMetrics(session: MetricsSession): string {
  const snap = session.snapshot;
  const parts: string[] = [];
  if (snap && snap.totalSets > 0) {
    parts.push(`${snap.completedSets}/${snap.totalSets} series`);
  }
  if (snap && snap.totalExercises > 0) {
    parts.push(`${snap.completedExercises}/${snap.totalExercises} ejercicios`);
  }
  const previews = buildSessionExercisePreviews(snap, 1);
  if (previews[0]) {
    const ex = previews[0];
    parts.push(ex.summary ? `${ex.exerciseName} · ${ex.summary}` : ex.exerciseName);
  }
  if (parts.length === 0 && session.notes?.trim()) {
    return session.notes.trim().slice(0, 64);
  }
  return parts.join(" · ");
}

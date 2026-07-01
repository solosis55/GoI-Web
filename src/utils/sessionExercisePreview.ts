import type { SessionExercisePreview } from "../types/post";
import type { WorkoutSessionSnapshot, WorkoutSessionSnapshotBlock, WorkoutSessionSnapshotSet } from "../types/workoutSessionSnapshot";

function formatSetBrief(set: WorkoutSessionSnapshotSet): string {
  if (!set.done) return "";
  const w = set.actualWeight.trim().replace(",", ".");
  const r = set.actualReps.trim();
  if (w && r) return `${w} kg × ${r}`;
  if (r) return `${r} reps`;
  return "✓";
}

export function summarizeExerciseBlock(block: WorkoutSessionSnapshotBlock): string {
  const total = block.sets.length;
  const done = block.sets.filter((s) => s.done);
  if (total === 0) return "";
  if (done.length === 0) return `${total} series`;
  const lastDone = done[done.length - 1]!;
  const lastLabel = formatSetBrief(lastDone);
  if (done.length === 1 && lastLabel) return lastLabel;
  if (lastLabel) return `${done.length}/${total} ser. · ${lastLabel}`;
  return `${done.length}/${total} series`;
}

export function buildSessionExercisePreviews(
  snapshot?: WorkoutSessionSnapshot | null,
  maxExercises = 3,
): SessionExercisePreview[] {
  if (!snapshot?.blocks?.length) return [];
  return snapshot.blocks.slice(0, maxExercises).map((block) => ({
    exerciseName: block.exerciseName,
    summary: summarizeExerciseBlock(block),
  }));
}

export function countRemainingExercises(snapshot: WorkoutSessionSnapshot | null | undefined, shown: number): number {
  const total = snapshot?.blocks?.length ?? 0;
  return Math.max(0, total - shown);
}

export function resolveSessionExercisePreviews(input: {
  snapshot?: WorkoutSessionSnapshot | null;
  previews?: SessionExercisePreview[] | null;
  maxExercises?: number;
}): SessionExercisePreview[] {
  const max = input.maxExercises ?? 3;
  const fromSnapshot = buildSessionExercisePreviews(input.snapshot, max);
  if (fromSnapshot.length > 0) return fromSnapshot;
  if (input.previews?.length) return input.previews.slice(0, max);
  return [];
}

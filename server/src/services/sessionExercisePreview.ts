import type { WorkoutSessionSnapshot } from "../workoutSessionSnapshotTypes.js";

export type SessionExercisePreviewDto = {
  exerciseName: string;
  summary: string;
};

function formatSetBrief(set: {
  done: boolean;
  actualReps: string;
  actualWeight: string;
}): string {
  if (!set.done) return "";
  const w = String(set.actualWeight ?? "").trim();
  const r = String(set.actualReps ?? "").trim();
  if (w && r) return `${w} kg × ${r}`;
  if (r) return `${r} reps`;
  return "✓";
}

function summarizeBlock(block: WorkoutSessionSnapshot["blocks"][number]): string {
  const total = block.sets.length;
  const done = block.sets.filter((s) => s.done);
  if (total === 0) return "";
  if (done.length === 0) return `${total} series`;
  const lastDone = done[done.length - 1];
  const lastLabel = formatSetBrief(lastDone);
  if (done.length === 1 && lastLabel) return lastLabel;
  if (lastLabel) return `${done.length}/${total} ser. · ${lastLabel}`;
  return `${done.length}/${total} series`;
}

export function buildSessionExercisePreviews(
  snapshot?: WorkoutSessionSnapshot | null,
  maxExercises = 3
): SessionExercisePreviewDto[] {
  if (!snapshot?.blocks?.length) return [];
  return snapshot.blocks.slice(0, maxExercises).map((block) => ({
    exerciseName: block.exerciseName,
    summary: summarizeBlock(block),
  }));
}

export function countRemainingExercisePreviews(snapshot?: WorkoutSessionSnapshot | null, shown: number): number {
  const total = snapshot?.blocks?.length ?? 0;
  return Math.max(0, total - shown);
}

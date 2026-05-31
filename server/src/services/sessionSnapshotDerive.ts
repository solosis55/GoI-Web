import { store, type WorkoutSession } from "./store.js";
import type { WorkoutSessionSnapshot } from "../workoutSessionSnapshotTypes.js";

function parseSeriesFromNotes(notes: string): { completed: number; total: number } | null {
  const first = notes.trim().split("\n")[0]?.trim() ?? "";
  const m = first.match(/^(\d+)\/(\d+)\s+series completadas$/i);
  if (!m) return null;
  const completed = Number(m[1]);
  const total = Number(m[2]);
  if (!Number.isFinite(completed) || !Number.isFinite(total) || total <= 0) return null;
  return { completed, total };
}

/**
 * Snapshot sintético para sesiones antiguas sin snapshot persistido:
 * nombres y series desde la rutina vinculada + totales en notes.
 */
export function deriveSessionSnapshotForDisplay(
  session: WorkoutSession
): WorkoutSessionSnapshot | null {
  if (session.snapshot?.blocks?.length) return session.snapshot;

  const workout = store.workouts.find((w) => w.id === session.workoutId);
  if (!workout) return null;

  const blocksFromWorkout = workout.exerciseBlocks ?? [];
  const idsFromWorkout = workout.exerciseIds ?? [];
  if (blocksFromWorkout.length === 0 && idsFromWorkout.length === 0) return null;

  const series = parseSeriesFromNotes(session.notes);

  const blocks =
    blocksFromWorkout.length > 0
      ? blocksFromWorkout.map((block) => {
          const exercise = store.exercises.find((e) => e.id === block.exerciseId);
          const setCount = block.sets?.length ?? 0;
          return {
            exerciseId: block.exerciseId,
            exerciseName: exercise?.name?.trim() || "Ejercicio",
            sets: Array.from({ length: setCount }, () => ({
              done: true,
              plannedReps: "",
              plannedWeight: "",
              actualReps: "",
              actualWeight: "",
            })),
          };
        })
      : idsFromWorkout.map((exerciseId) => {
          const exercise = store.exercises.find((e) => e.id === exerciseId);
          return {
            exerciseId,
            exerciseName: exercise?.name?.trim() || "Ejercicio",
            sets: [] as WorkoutSessionSnapshot["blocks"][number]["sets"],
          };
        });

  const totalSetsFromBlocks = blocks.reduce((sum, b) => sum + b.sets.length, 0);
  const totalSets = series?.total ?? totalSetsFromBlocks;
  const completedSets = series?.completed ?? totalSets;
  const totalExercises = blocks.length;
  const completedExercises = totalExercises;

  return {
    workoutTitle: workout.title,
    completedSets,
    totalSets,
    completedExercises,
    totalExercises,
    blocks,
  };
}

export function resolveSessionSnapshotForApi(session: WorkoutSession): WorkoutSessionSnapshot | undefined {
  return session.snapshot ?? deriveSessionSnapshotForDisplay(session) ?? undefined;
}

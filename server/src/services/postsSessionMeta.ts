import { store, type Post, type WorkoutSession } from "./store.js";
import {
  buildSessionExercisePreviews,
  countRemainingExercisePreviews,
  type SessionExercisePreviewDto,
} from "./sessionExercisePreview.js";
import { deriveSessionSnapshotForDisplay } from "./sessionSnapshotDerive.js";

export type PostSessionMeta = {
  sessionWorkoutTitle: string | null;
  sessionPerformedAt: string | null;
  sessionCompletedSets: number | null;
  sessionTotalSets: number | null;
  sessionCompletedExercises: number | null;
  sessionTotalExercises: number | null;
  sessionExercisePreviews: SessionExercisePreviewDto[];
  sessionMoreExercisesCount: number;
};

function metaFromSession(session: WorkoutSession, workoutTitle: string): PostSessionMeta {
  const snap = session.snapshot ?? deriveSessionSnapshotForDisplay(session);
  const previews = buildSessionExercisePreviews(snap);
  return {
    sessionWorkoutTitle: workoutTitle,
    sessionPerformedAt: session.performedAt,
    sessionCompletedSets: snap?.completedSets ?? null,
    sessionTotalSets: snap?.totalSets ?? null,
    sessionCompletedExercises: snap?.completedExercises ?? null,
    sessionTotalExercises: snap?.totalExercises ?? null,
    sessionExercisePreviews: previews,
    sessionMoreExercisesCount: countRemainingExercisePreviews(snap, previews.length),
  };
}

const emptyMeta: PostSessionMeta = {
  sessionWorkoutTitle: null,
  sessionPerformedAt: null,
  sessionCompletedSets: null,
  sessionTotalSets: null,
  sessionCompletedExercises: null,
  sessionTotalExercises: null,
  sessionExercisePreviews: [],
  sessionMoreExercisesCount: 0,
};

/** Datos de sesión vinculada para mostrar en posts Training del feed. */
export function resolvePostSessionMeta(post: Post): PostSessionMeta {
  if (!post.sessionId) return emptyMeta;
  const session = store.workoutSessions.find((s) => s.id === post.sessionId);
  if (!session) return emptyMeta;
  const workout = store.workouts.find((w) => w.id === session.workoutId);
  const workoutTitle =
    session.snapshot?.workoutTitle ?? workout?.title ?? "Entrenamiento";
  return metaFromSession(session, workoutTitle);
}

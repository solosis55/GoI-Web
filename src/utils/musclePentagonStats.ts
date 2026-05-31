import type { Exercise } from "../types/exercise";
import type { Workout } from "../types/workout";
import type { WorkoutSessionWithTitle } from "../types/workoutSession";

/** Ejes del diagrama (orden visual: desde arriba en sentido horario). */
export type MusclePentagonAxis = "brazo" | "pierna" | "pecho" | "espalda" | "core";

export const MUSCLE_PENTAGON_AXES: MusclePentagonAxis[] = ["brazo", "pierna", "pecho", "espalda", "core"];

export const MUSCLE_PENTAGON_LABELS: Record<MusclePentagonAxis, string> = {
  brazo: "Brazo",
  pierna: "Pierna",
  pecho: "Pecho",
  espalda: "Espalda",
  core: "Core",
};

/** Respaldo por si un ejercicio antiguo en store.json aún no tiene slug `pecho`. */
export const CHEST_EXERCISE_IDS = new Set<string>([
  "b2955b8a-6c26-498c-8623-40e85fe01b24",
  "518c7ced-16c8-49e7-8e9c-78b778a29762",
  "33d02938-22b2-41ed-a106-aec6a0482635",
  "798021a8-8c67-440b-babb-4e901776bb3d",
]);

const SLUG_TO_AXES: Record<string, MusclePentagonAxis[]> = {
  pecho: ["pecho"],
  biceps: ["brazo"],
  triceps: ["brazo"],
  antebrazos: ["brazo"],
  hombro: ["brazo"],
  cuadriceps: ["pierna"],
  gluteo: ["pierna"],
  isquiotibiales: ["pierna"],
  gemelos: ["pierna"],
  dorsal: ["espalda"],
  espalda_alta: ["espalda"],
  abdomen: ["core"],
  lumbar: ["core"],
};

export function emptyMuscleHits(): Record<MusclePentagonAxis, number> {
  return { brazo: 0, pierna: 0, pecho: 0, espalda: 0, core: 0 };
}

export function startOfWeekMonday(ref = new Date()): Date {
  const d = new Date(ref);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function workoutExerciseIds(w: Workout): string[] {
  if (w.exerciseBlocks?.length) return w.exerciseBlocks.map((b) => b.exerciseId);
  return w.exerciseIds ?? [];
}

function axesForExercise(exerciseId: string, ex: Exercise | undefined): Set<MusclePentagonAxis> {
  const out = new Set<MusclePentagonAxis>();
  if (CHEST_EXERCISE_IDS.has(exerciseId)) out.add("pecho");
  for (const slug of ex?.muscles ?? []) {
    const mapped = SLUG_TO_AXES[slug];
    if (mapped) for (const a of mapped) out.add(a);
  }
  return out;
}

/** Suma impactos por aparición de ejercicio en sesiones (plantilla del entreno en esa fecha). */
export function aggregateMuscleHitsFromSessions(
  sessions: WorkoutSessionWithTitle[],
  workoutsById: Map<string, Workout>,
  exerciseById: Map<string, Exercise>,
): Record<MusclePentagonAxis, number> {
  const hits = emptyMuscleHits();
  for (const s of sessions) {
    const w = workoutsById.get(s.workoutId);
    if (!w) continue;
    for (const exId of workoutExerciseIds(w)) {
      const axes = axesForExercise(exId, exerciseById.get(exId));
      for (const ax of axes) hits[ax] += 1;
    }
  }
  return hits;
}

export function countSessionsThisWeek(sessions: WorkoutSessionWithTitle[], now = new Date()): number {
  const start = startOfWeekMonday(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  let n = 0;
  for (const s of sessions) {
    const t = new Date(s.performedAt).getTime();
    if (t >= start.getTime() && t < end.getTime()) n += 1;
  }
  return n;
}

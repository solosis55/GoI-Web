import type { Exercise } from "../types/exercise";
import type { Workout } from "../types/workout";
import type { WorkoutSessionWithTitle } from "../types/workoutSession";
import { CHEST_EXERCISE_IDS, workoutExerciseIds } from "./musclePentagonStats";

export type MuscleOctagonAxis =
  | "brazos"
  | "hombros"
  | "pecho"
  | "espalda"
  | "core"
  | "cuadriceps"
  | "posterior"
  | "gemelos";

export const MUSCLE_OCTAGON_AXES: MuscleOctagonAxis[] = [
  "brazos",
  "hombros",
  "pecho",
  "espalda",
  "core",
  "cuadriceps",
  "posterior",
  "gemelos",
];

export const MUSCLE_OCTAGON_LABELS: Record<MuscleOctagonAxis, string> = {
  brazos: "Brazos",
  hombros: "Hombros",
  pecho: "Pecho",
  espalda: "Espalda",
  core: "Core",
  cuadriceps: "Cuádriceps",
  posterior: "Isquio–glúteo",
  gemelos: "Gemelos",
};

const SLUG_TO_OCT: Record<string, MuscleOctagonAxis[]> = {
  pecho: ["pecho"],
  biceps: ["brazos"],
  triceps: ["brazos"],
  antebrazos: ["brazos"],
  hombro: ["hombros"],
  dorsal: ["espalda"],
  espalda_alta: ["espalda"],
  abdomen: ["core"],
  lumbar: ["core"],
  cuadriceps: ["cuadriceps"],
  gluteo: ["posterior"],
  isquiotibiales: ["posterior"],
  gemelos: ["gemelos"],
};

export function emptyOctagonHits(): Record<MuscleOctagonAxis, number> {
  return {
    brazos: 0,
    hombros: 0,
    pecho: 0,
    espalda: 0,
    core: 0,
    cuadriceps: 0,
    posterior: 0,
    gemelos: 0,
  };
}

function axesForExerciseOctagon(exerciseId: string, ex: Exercise | undefined): Set<MuscleOctagonAxis> {
  const out = new Set<MuscleOctagonAxis>();
  if (CHEST_EXERCISE_IDS.has(exerciseId)) out.add("pecho");
  for (const slug of ex?.muscles ?? []) {
    const mapped = SLUG_TO_OCT[slug];
    if (mapped) for (const a of mapped) out.add(a);
  }
  return out;
}

/** Impactos por aparición de ejercicio en sesiones (plantilla del entreno). */
export function aggregateMuscleHitsOctagon(
  sessions: WorkoutSessionWithTitle[],
  workoutsById: Map<string, Workout>,
  exerciseById: Map<string, Exercise>,
): Record<MuscleOctagonAxis, number> {
  const hits = emptyOctagonHits();
  for (const s of sessions) {
    const w = workoutsById.get(s.workoutId);
    if (!w) continue;
    for (const exId of workoutExerciseIds(w)) {
      const axes = axesForExerciseOctagon(exId, exerciseById.get(exId));
      for (const ax of axes) hits[ax] += 1;
    }
  }
  return hits;
}

/** Ventana temporal para el mapa corporal / mismas reglas de agregación que el radar. */
export type OctagonMapPeriod = "7d" | "30d" | "90d" | "all";

export function filterSessionsForOctagonMap(
  sessions: WorkoutSessionWithTitle[],
  period: OctagonMapPeriod,
): WorkoutSessionWithTitle[] {
  if (period === "all") return sessions;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const cutoff = Date.now() - days * 86400000;
  return sessions.filter((s) => {
    const t = Date.parse(s.performedAt);
    return Number.isFinite(t) && t >= cutoff;
  });
}

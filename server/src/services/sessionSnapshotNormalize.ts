import type {
  WorkoutSessionSnapshot,
  WorkoutSessionSnapshotBlock,
  WorkoutSessionSnapshotSet,
} from "../workoutSessionSnapshotTypes.js";
import { sanitizeText } from "./validation.js";

const MAX_BLOCKS = 80;
const MAX_SETS_PER_BLOCK = 40;
const NAME_MAX = 120;
const TEXT_MAX = 80;

function normalizeSubSteps(raw: unknown): WorkoutSessionSnapshotSet["subSteps"] {
  if (!Array.isArray(raw)) return undefined;
  const steps = raw
    .slice(0, 12)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const s = item as Record<string, unknown>;
      const weight = sanitizeText(s.weight).slice(0, TEXT_MAX);
      const reps = sanitizeText(s.reps).slice(0, TEXT_MAX);
      if (!weight && !reps) return null;
      return { weight, reps };
    })
    .filter((s): s is NonNullable<typeof s> => s != null);
  return steps.length > 0 ? steps : undefined;
}

function normalizeSet(raw: unknown): WorkoutSessionSnapshotSet | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const setType = sanitizeText(o.setType).slice(0, 24) || undefined;
  return {
    done: o.done === true,
    plannedReps: sanitizeText(o.plannedReps).slice(0, TEXT_MAX),
    plannedWeight: sanitizeText(o.plannedWeight).slice(0, TEXT_MAX),
    actualReps: sanitizeText(o.actualReps).slice(0, TEXT_MAX),
    actualWeight: sanitizeText(o.actualWeight).slice(0, TEXT_MAX),
    rpe: sanitizeText(o.rpe).slice(0, 8) || undefined,
    setType,
    workDurationSec: sanitizeText(o.workDurationSec).slice(0, 8) || undefined,
    miniRestSec: sanitizeText(o.miniRestSec).slice(0, 8) || undefined,
    subSteps: normalizeSubSteps(o.subSteps),
  };
}

function normalizeBlock(raw: unknown): WorkoutSessionSnapshotBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const exerciseId = sanitizeText(o.exerciseId);
  const exerciseName = sanitizeText(o.exerciseName).slice(0, NAME_MAX);
  if (!exerciseId || !exerciseName) return null;
  const setsRaw = Array.isArray(o.sets) ? o.sets : [];
  const sets = setsRaw
    .slice(0, MAX_SETS_PER_BLOCK)
    .map(normalizeSet)
    .filter((s): s is WorkoutSessionSnapshotSet => s != null);
  const notes = sanitizeText(o.notes).slice(0, 500);
  return {
    exerciseId,
    exerciseName,
    notes: notes || undefined,
    sets,
  };
}

function clampInt(raw: unknown, fallback = 0): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

function clampOptionalNumber(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

/** Valida y recorta snapshot enviado por el cliente al crear sesión. */
export function normalizeWorkoutSessionSnapshot(raw: unknown): WorkoutSessionSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const workoutTitle = sanitizeText(o.workoutTitle).slice(0, NAME_MAX);
  if (!workoutTitle) return null;
  const blocksRaw = Array.isArray(o.blocks) ? o.blocks : [];
  const blocks = blocksRaw
    .slice(0, MAX_BLOCKS)
    .map(normalizeBlock)
    .filter((b): b is WorkoutSessionSnapshotBlock => b != null);
  return {
    workoutTitle,
    completedSets: clampInt(o.completedSets),
    totalSets: clampInt(o.totalSets),
    completedExercises: clampInt(o.completedExercises),
    totalExercises: clampInt(o.totalExercises),
    durationSec: clampOptionalNumber(o.durationSec),
    volumeKg: clampOptionalNumber(o.volumeKg),
    blocks,
  };
}

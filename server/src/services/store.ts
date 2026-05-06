import { randomUUID } from "node:crypto";
import { EXERCISE_DETAILS_BY_ID } from "../data/exerciseDetails.js";
import { DEFAULT_EXERCISE_SEED } from "../data/defaultExercises.js";
import { sanitizePersistedMedia } from "./postMedia.js";
import { sanitizeText, sanitizeWorkoutTags } from "./validation.js";
import {
  blocksFromExerciseIdsOnly,
  sanitizeExerciseBlocksPayload,
} from "./workoutExerciseSanitize.js";
import type { WorkoutExerciseBlock } from "../workoutExerciseTypes.js";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type User = {
  id: string;
  username: string;
  email: string;
  password: string;
  bio: string;
  goal: string;
  avatarUrl: string;
  createdAt: string;
  updatedAt: string;
  /** SHA-256 hex del token de un solo uso; no se expone por API. */
  passwordResetTokenHash?: string;
  /** ISO 8601; caducidad del token de restablecimiento. */
  passwordResetExpires?: string;
};

/** Ejercicio del catálogo global (semilla + creados al migrar textos libres). */
export type Exercise = {
  id: string;
  name: string;
  /** Slugs de grupo muscular para filtros en el cliente. */
  muscles?: string[];
  /** Slugs de tipo de material (maquina, cable, barra, peso_libre, …). */
  equipmentTags?: string[];
  /** Equipamiento habitual (texto libre breve). */
  equipment?: string;
  /** Resumen del movimiento y objetivo. */
  description?: string;
  /** Cómo ejecutarlo (puede ser varias frases o líneas). */
  instructions?: string;
};

export type Workout = {
  id: string;
  userId: string;
  title: string;
  description: string;
  /** IDs del catálogo `store.exercises`, orden = orden en la rutina. */
  exerciseIds: string[];
  /** Material y series por ejercicio (rutinas nuevas o migradas). */
  exerciseBlocks: WorkoutExerciseBlock[];
  /** Etiquetas libres (p. ej. "pecho", "tiron") para filtrar y organizar. */
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type { WorkoutExerciseBlock, WorkoutSetRow } from "../workoutExerciseTypes.js";

/** Registro de que el usuario realizo un entrenamiento (plantilla) en una fecha. */
export type WorkoutSession = {
  id: string;
  userId: string;
  workoutId: string;
  /** ISO 8601 (instante aproximado de la sesion). */
  performedAt: string;
  notes: string;
  createdAt: string;
};

export type Post = {
  id: string;
  userId: string;
  content: string;
  /** Imágenes en data URL (`data:image/jpeg;base64,...`). */
  media?: { type: "image"; url: string }[];
  workoutId: string | null;
  visibility: "public" | "followers" | "private";
  createdAt: string;
  updatedAt: string;
};

export type Like = {
  id: string;
  postId: string;
  userId: string;
  createdAt: string;
};

export type Comment = {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type Follow = {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
};

/** Diapositiva dentro de una historia (caduca con el reel). */
export type StorySlide = {
  id: string;
  mediaUrl: string;
};

/** Un envío de historia; caduca a las ~24 h de `createdAt`. */
export type StoryReel = {
  id: string;
  userId: string;
  slides: StorySlide[];
  createdAt: string;
  expiresAt: string;
};

/** Marca notificaciones del feed como vistas (por usuario receptor). */
export type NotificationReadRecord = {
  userId: string;
  key: string;
  readAt: string;
};

export const store = {
  users: [] as User[],
  exercises: [] as Exercise[],
  workouts: [] as Workout[],
  workoutSessions: [] as WorkoutSession[],
  posts: [] as Post[],
  likes: [] as Like[],
  comments: [] as Comment[],
  follows: [] as Follow[],
  notificationReads: [] as NotificationReadRecord[],
  storyReels: [] as StoryReel[],
};

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
/** JSON versionado en repo (`server/data/store.json`). */
const defaultRepoStorePath = resolve(currentDir, "../../data/store.json");
/** Tras el build, copia del seed dentro de `server/dist/data/` (para Vercel + `includeFiles`). */
const distBundledSeedPath = resolve(currentDir, "../data/store.json");

/** Ruta del JSON persistido. En Vercel las funciones solo escriben bien en `/tmp` (ver `docs/deploy.md`). */
function getDataFilePath(): string {
  const fromEnv = process.env.FITSOCIAL_STORE_PATH?.trim();
  if (fromEnv) return resolve(fromEnv);
  if (process.env.VERCEL) return join("/tmp", "fitsocial-store.json");
  return defaultRepoStorePath;
}

/** Ruta del JSON que usa el proceso (útil en `/api/health` en desarrollo). */
export function getPersistedStorePath() {
  return getDataFilePath();
}

export function createId() {
  return randomUUID();
}

type PersistedStore = {
  users: User[];
  exercises?: Exercise[];
  workouts: unknown[];
  workoutSessions?: WorkoutSession[];
  posts: Post[];
  likes: Like[];
  comments: Comment[];
  follows: Follow[];
  notificationReads?: NotificationReadRecord[];
  storyReels?: StoryReel[];
};

const EXERCISE_EQUIPMENT_MAX = 160;
const EXERCISE_DESCRIPTION_MAX = 900;
const EXERCISE_INSTRUCTIONS_MAX = 2800;

function mergeExerciseCatalog(parsedExercises: unknown): Exercise[] {
  const byId = new Map<string, Exercise>();
  for (const s of DEFAULT_EXERCISE_SEED) {
    const extra = EXERCISE_DETAILS_BY_ID[s.id];
    const base: Exercise = {
      id: s.id,
      name: s.name,
      muscles: [...s.muscles],
      equipmentTags: [...s.equipmentTags],
    };
    if (extra) {
      base.equipment = extra.equipment;
      base.description = extra.description;
      base.instructions = extra.instructions;
    }
    byId.set(s.id, base);
  }
  if (Array.isArray(parsedExercises)) {
    for (const e of parsedExercises) {
      const row = e as Partial<Exercise> & { muscles?: unknown; equipmentTags?: unknown };
      if (row && typeof row.id === "string" && typeof row.name === "string") {
        const prev = byId.get(row.id);
        const seedEntry = DEFAULT_EXERCISE_SEED.find((x) => x.id === row.id);

        const eqRaw = typeof row.equipment === "string" ? sanitizeText(row.equipment) : "";
        const descRaw = typeof row.description === "string" ? sanitizeText(row.description) : "";
        const instRaw = typeof row.instructions === "string" ? sanitizeText(row.instructions) : "";

        const nameSanitized = sanitizeText(row.name);

        if (prev && seedEntry) {
          const equipment = eqRaw ? eqRaw.slice(0, EXERCISE_EQUIPMENT_MAX) : prev.equipment;
          const description = descRaw ? descRaw.slice(0, EXERCISE_DESCRIPTION_MAX) : prev.description;
          const instructions = instRaw ? instRaw.slice(0, EXERCISE_INSTRUCTIONS_MAX) : prev.instructions;

          const merged: Exercise = {
            id: seedEntry.id,
            name: seedEntry.name,
            muscles: [...seedEntry.muscles],
            equipmentTags: [...seedEntry.equipmentTags],
          };
          if (equipment) merged.equipment = equipment;
          if (description) merged.description = description;
          if (instructions) merged.instructions = instructions;
          byId.set(row.id, merged);
          continue;
        }

        if (!nameSanitized) continue;

        const fromFileM = Array.isArray(row.muscles)
          ? row.muscles.filter((m): m is string => typeof m === "string")
          : null;
        const fromFileEt = Array.isArray(row.equipmentTags)
          ? row.equipmentTags.filter((t): t is string => typeof t === "string")
          : null;

        if (prev && !seedEntry) {
          const muscles =
            fromFileM && fromFileM.length > 0 ? fromFileM : prev.muscles?.length ? [...prev.muscles] : [];
          const equipmentTags =
            fromFileEt && fromFileEt.length > 0
              ? fromFileEt
              : prev.equipmentTags?.length
                ? [...prev.equipmentTags]
                : [];

          const equipment = eqRaw ? eqRaw.slice(0, EXERCISE_EQUIPMENT_MAX) : prev.equipment;
          const description = descRaw ? descRaw.slice(0, EXERCISE_DESCRIPTION_MAX) : prev.description;
          const instructions = instRaw ? instRaw.slice(0, EXERCISE_INSTRUCTIONS_MAX) : prev.instructions;

          const merged: Exercise = { id: row.id, name: nameSanitized, muscles, equipmentTags };
          if (equipment) merged.equipment = equipment;
          if (description) merged.description = description;
          if (instructions) merged.instructions = instructions;
          byId.set(row.id, merged);
          continue;
        }

        if (!prev) {
          const muscles = fromFileM ?? [];
          const equipmentTags = fromFileEt ?? [];
          const nu: Exercise = { id: row.id, name: nameSanitized, muscles, equipmentTags };
          const equipment = eqRaw ? eqRaw.slice(0, EXERCISE_EQUIPMENT_MAX) : undefined;
          const description = descRaw ? descRaw.slice(0, EXERCISE_DESCRIPTION_MAX) : undefined;
          const instructions = instRaw ? instRaw.slice(0, EXERCISE_INSTRUCTIONS_MAX) : undefined;
          if (equipment) nu.equipment = equipment;
          if (description) nu.description = description;
          if (instructions) nu.instructions = instructions;
          byId.set(row.id, nu);
        }
      }
    }
  }
  return [...byId.values()];
}

function findOrCreateExerciseIdByName(raw: string, dirty: { value: boolean }): string | null {
  const name = sanitizeText(raw);
  if (!name) return null;
  const lower = name.toLowerCase();
  const existing = store.exercises.find((ex) => ex.name.toLowerCase() === lower);
  if (existing) return existing.id;
  const nu: Exercise = { id: createId(), name, muscles: [], equipmentTags: [] };
  store.exercises.push(nu);
  dirty.value = true;
  return nu.id;
}

function migrateWorkoutFromDisk(w: Record<string, unknown>, dirty: { value: boolean }): Workout {
  const tags = sanitizeWorkoutTags(Array.isArray(w.tags) ? w.tags : []);
  let exerciseIds: string[] = [];

  const rawIds = w.exerciseIds;
  if (Array.isArray(rawIds) && rawIds.length > 0) {
    exerciseIds = rawIds
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((id) => id.trim());
  } else if (Array.isArray(w.exercises)) {
    dirty.value = true;
    for (const line of w.exercises as unknown[]) {
      const id = findOrCreateExerciseIdByName(String(line ?? ""), dirty);
      if (id) exerciseIds.push(id);
    }
  }

  const fromPayload = sanitizeExerciseBlocksPayload(w.exerciseBlocks);
  let exerciseBlocks: WorkoutExerciseBlock[];
  if (fromPayload && fromPayload.length > 0) {
    exerciseBlocks = fromPayload;
    exerciseIds = exerciseBlocks.map((b) => b.exerciseId);
  } else {
    exerciseBlocks = blocksFromExerciseIdsOnly(exerciseIds);
  }

  return {
    id: String(w.id ?? ""),
    userId: String(w.userId ?? ""),
    title: String(w.title ?? ""),
    description: String(w.description ?? ""),
    exerciseIds,
    exerciseBlocks,
    tags,
    createdAt: String(w.createdAt ?? ""),
    updatedAt: String(w.updatedAt ?? ""),
  };
}

export function initializeStore() {
  const dataFilePath = getDataFilePath();
  if (!existsSync(dataFilePath)) {
    mkdirSync(dirname(dataFilePath), { recursive: true });
    if (process.env.VERCEL && existsSync(distBundledSeedPath)) {
      copyFileSync(distBundledSeedPath, dataFilePath);
    } else if (process.env.VERCEL && existsSync(defaultRepoStorePath)) {
      copyFileSync(defaultRepoStorePath, dataFilePath);
    } else {
      writeFileSync(dataFilePath, JSON.stringify(store, null, 2), "utf-8");
    }
  }

  const raw = readFileSync(dataFilePath, "utf-8");
  const parsed = JSON.parse(raw) as Partial<PersistedStore>;

  store.exercises = mergeExerciseCatalog(parsed.exercises);

  const migrationDirty = { value: false };

  store.users = Array.isArray(parsed.users)
    ? parsed.users.map((user) => ({
        ...user,
        bio: user.bio ?? "",
        goal: user.goal ?? "",
        avatarUrl: user.avatarUrl ?? "",
        updatedAt: user.updatedAt ?? user.createdAt ?? new Date().toISOString(),
      }))
    : [];

  store.workouts = Array.isArray(parsed.workouts)
    ? parsed.workouts.map((w) => migrateWorkoutFromDisk(w as Record<string, unknown>, migrationDirty))
    : [];

  store.workoutSessions = Array.isArray(parsed.workoutSessions) ? parsed.workoutSessions : [];
  store.notificationReads = Array.isArray(parsed.notificationReads)
    ? parsed.notificationReads
        .filter(
          (r): r is NotificationReadRecord =>
            Boolean(r && typeof r === "object" && typeof (r as NotificationReadRecord).userId === "string"),
        )
        .map((r) => ({
          userId: String((r as NotificationReadRecord).userId ?? ""),
          key: String((r as NotificationReadRecord).key ?? ""),
          readAt: String((r as NotificationReadRecord).readAt ?? ""),
        }))
        .filter((r) => r.userId && r.key && r.readAt)
    : [];

  store.posts = Array.isArray(parsed.posts)
    ? parsed.posts
        .filter((p): p is Partial<Post> => Boolean(p && typeof p === "object"))
        .map((p) => {
          const m = sanitizePersistedMedia((p as { media?: unknown }).media);
          return {
            id: String(p.id ?? ""),
            userId: String(p.userId ?? ""),
            content: String(p.content ?? ""),
            ...(m && m.length > 0 ? { media: m } : {}),
            workoutId: p.workoutId === null ? null : String(p.workoutId ?? ""),
            visibility:
              p.visibility === "followers" || p.visibility === "private" || p.visibility === "public"
                ? p.visibility
                : "public",
            createdAt: String(p.createdAt ?? ""),
            updatedAt: String(p.updatedAt ?? ""),
          };
        })
        .filter((p) => p.id && p.userId)
    : [];
  store.likes = Array.isArray(parsed.likes) ? parsed.likes : [];
  store.comments = Array.isArray(parsed.comments) ? parsed.comments : [];
  store.follows = Array.isArray(parsed.follows) ? parsed.follows : [];

  store.storyReels = Array.isArray(parsed.storyReels)
    ? parsed.storyReels
        .filter((r): r is Partial<StoryReel> => Boolean(r && typeof r === "object"))
        .map((r) => ({
          id: String((r as StoryReel).id ?? ""),
          userId: String((r as StoryReel).userId ?? ""),
          slides: Array.isArray((r as StoryReel).slides)
            ? (r as StoryReel).slides
                .filter((s): s is Partial<StorySlide> => Boolean(s && typeof s === "object"))
                .map((s) => ({
                  id: String((s as StorySlide).id ?? ""),
                  mediaUrl: String((s as StorySlide).mediaUrl ?? ""),
                }))
                .filter((s) => s.id && s.mediaUrl)
            : [],
          createdAt: String((r as StoryReel).createdAt ?? ""),
          expiresAt: String((r as StoryReel).expiresAt ?? ""),
        }))
        .filter((r) => r.id && r.userId && r.slides.length > 0 && r.expiresAt)
    : [];

  if (migrationDirty.value) {
    saveStore();
  }

  if (
    process.env.NODE_ENV !== "production" &&
    process.env.NODE_ENV !== "test" &&
    !process.env.VERCEL &&
    !process.env.VITEST
  ) {
    console.log(`[store] ${store.users.length} user(s) loaded from ${dataFilePath}`);
  }
}

export function saveStore() {
  if (process.env.VITEST === "true" || process.env.NODE_ENV === "test") {
    return;
  }
  const dataFilePath = getDataFilePath();
  mkdirSync(dirname(dataFilePath), { recursive: true });
  writeFileSync(dataFilePath, JSON.stringify(store, null, 2), "utf-8");
}

import type { Request, Response } from "express";
import { createId, saveStore, store, type WorkoutSession } from "../services/store.js";
import { sendError } from "../services/http.js";
import { isLengthBetween, sanitizeText } from "../services/validation.js";

const NOTES_MAX = 500;

type CreateBody = {
  workoutId?: string;
  performedAt?: string;
  notes?: string;
};

function resolvePerformedAt(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") {
    return new Date().toISOString();
  }
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return new Date().toISOString();
  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

export function listWorkoutSessions(_req: Request, res: Response) {
  const authUserId = String(res.locals.authUserId ?? "");
  if (!authUserId) {
    sendError(res, 401, "AUTH_HEADER_INVALID", "missing auth");
    return;
  }

  const workoutById = new Map(store.workouts.map((w) => [w.id, w]));

  const sessions = store.workoutSessions
    .filter((s) => s.userId === authUserId)
    .sort((a, b) => Date.parse(b.performedAt) - Date.parse(a.performedAt))
    .map((s) => {
      const w = workoutById.get(s.workoutId);
      const workoutTitle = w?.title ?? "(Entrenamiento eliminado)";
      return { ...s, workoutTitle };
    });

  res.json(sessions);
}

export function createWorkoutSession(req: Request, res: Response) {
  const authUserId = String(res.locals.authUserId ?? "");
  if (!authUserId) {
    sendError(res, 401, "AUTH_HEADER_INVALID", "missing auth");
    return;
  }

  const { workoutId: rawWorkoutId, performedAt: rawPerformedAt, notes: rawNotes } = req.body as CreateBody;
  const workoutId = sanitizeText(rawWorkoutId);
  if (!workoutId) {
    sendError(res, 400, "WORKOUT_SESSION_INVALID_INPUT", "workoutId is required");
    return;
  }

  const workout = store.workouts.find((w) => w.id === workoutId);
  if (!workout) {
    sendError(res, 404, "WORKOUT_NOT_FOUND", "workout not found");
    return;
  }
  if (workout.userId !== authUserId) {
    sendError(res, 403, "WORKOUT_FORBIDDEN", "forbidden");
    return;
  }

  const performedAt = resolvePerformedAt(rawPerformedAt);
  if (!performedAt) {
    sendError(res, 400, "WORKOUT_SESSION_INVALID_INPUT", "invalid performedAt");
    return;
  }

  const notes = sanitizeText(rawNotes);
  if (!isLengthBetween(notes, 0, NOTES_MAX)) {
    sendError(res, 400, "WORKOUT_SESSION_INVALID_INPUT", "notes too long");
    return;
  }

  const now = new Date().toISOString();
  const session: WorkoutSession = {
    id: createId(),
    userId: authUserId,
    workoutId,
    performedAt,
    notes,
    createdAt: now,
  };

  store.workoutSessions.push(session);
  saveStore();
  res.status(201).json(session);
}

export function deleteWorkoutSession(req: Request, res: Response) {
  const authUserId = String(res.locals.authUserId ?? "");
  if (!authUserId) {
    sendError(res, 401, "AUTH_HEADER_INVALID", "missing auth");
    return;
  }

  const { id } = req.params;
  const index = store.workoutSessions.findIndex((s) => s.id === id);
  if (index === -1) {
    sendError(res, 404, "WORKOUT_SESSION_NOT_FOUND", "session not found");
    return;
  }
  if (store.workoutSessions[index].userId !== authUserId) {
    sendError(res, 403, "WORKOUT_SESSION_FORBIDDEN", "forbidden");
    return;
  }

  const [removed] = store.workoutSessions.splice(index, 1);
  saveStore();
  res.json({ message: "session deleted", session: removed });
}

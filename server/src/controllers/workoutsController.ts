import { Request, Response } from "express";
import { createId, saveStore, store, Workout } from "../services/store.js";
import { sendError } from "../services/http.js";
import {
  isLengthBetween,
  sanitizeStringArray,
  sanitizeText,
  sanitizeWorkoutTags,
} from "../services/validation.js";

type WorkoutPayload = {
  title?: string;
  description?: string;
  exercises?: string[];
  tags?: string[];
};

export function listWorkouts(_req: Request, res: Response) {
  res.json(store.workouts);
}

export function createWorkout(req: Request, res: Response) {
  const authUserId = String(res.locals.authUserId ?? "");
  const { title, description = "", exercises = [], tags: rawTags } = req.body as WorkoutPayload;
  const normalizedTitle = sanitizeText(title);
  const normalizedDescription = sanitizeText(description);
  const normalizedExercises = sanitizeStringArray(exercises);
  const normalizedTags = sanitizeWorkoutTags(rawTags ?? []);

  if (!authUserId || !isLengthBetween(normalizedTitle, 3, 80)) {
    sendError(res, 400, "WORKOUT_INVALID_INPUT", "title is required");
    return;
  }
  if (normalizedDescription.length > 280) {
    sendError(res, 400, "WORKOUT_INVALID_INPUT", "description is too long");
    return;
  }
  if (normalizedExercises.length > 30) {
    sendError(res, 400, "WORKOUT_INVALID_INPUT", "too many exercises");
    return;
  }

  const workout: Workout = {
    id: createId(),
    userId: authUserId,
    title: normalizedTitle,
    description: normalizedDescription,
    exercises: normalizedExercises,
    tags: normalizedTags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.workouts.push(workout);
  saveStore();
  res.status(201).json(workout);
}

export function updateWorkout(req: Request, res: Response) {
  const authUserId = String(res.locals.authUserId ?? "");
  const { id } = req.params;
  const payload = req.body as WorkoutPayload;
  const workout = store.workouts.find((item) => item.id === id);

  if (!workout) {
    sendError(res, 404, "WORKOUT_NOT_FOUND", "workout not found");
    return;
  }
  if (workout.userId !== authUserId) {
    sendError(res, 403, "WORKOUT_FORBIDDEN", "forbidden");
    return;
  }

  if (payload.title !== undefined) {
    const normalizedTitle = sanitizeText(payload.title);
    if (!isLengthBetween(normalizedTitle, 3, 80)) {
      sendError(res, 400, "WORKOUT_INVALID_INPUT", "title is required");
      return;
    }
    workout.title = normalizedTitle;
  }

  if (payload.description !== undefined) {
    const normalizedDescription = sanitizeText(payload.description);
    if (normalizedDescription.length > 280) {
      sendError(res, 400, "WORKOUT_INVALID_INPUT", "description is too long");
      return;
    }
    workout.description = normalizedDescription;
  }

  if (payload.exercises !== undefined) {
    const normalizedExercises = sanitizeStringArray(payload.exercises);
    if (normalizedExercises.length > 30) {
      sendError(res, 400, "WORKOUT_INVALID_INPUT", "too many exercises");
      return;
    }
    workout.exercises = normalizedExercises;
  }

  if (payload.tags !== undefined) {
    workout.tags = sanitizeWorkoutTags(payload.tags);
  }

  workout.updatedAt = new Date().toISOString();

  saveStore();
  res.json(workout);
}

export function deleteWorkout(req: Request, res: Response) {
  const authUserId = String(res.locals.authUserId ?? "");
  const { id } = req.params;
  const index = store.workouts.findIndex((item) => item.id === id);

  if (index === -1) {
    sendError(res, 404, "WORKOUT_NOT_FOUND", "workout not found");
    return;
  }
  if (store.workouts[index].userId !== authUserId) {
    sendError(res, 403, "WORKOUT_FORBIDDEN", "forbidden");
    return;
  }

  const [removed] = store.workouts.splice(index, 1);
  saveStore();
  res.json({ message: "workout deleted", workout: removed });
}

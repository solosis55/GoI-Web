import { apiFetch } from "./client";
import type { CreateWorkoutSessionInput, WorkoutSession, WorkoutSessionWithTitle } from "../types/workoutSession";

export function getWorkoutSessions() {
  return apiFetch<WorkoutSessionWithTitle[]>("/workout-sessions");
}

export function createWorkoutSession(input: CreateWorkoutSessionInput) {
  return apiFetch<WorkoutSession>("/workout-sessions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteWorkoutSession(id: string) {
  return apiFetch<{ message: string }>(`/workout-sessions/${id}`, {
    method: "DELETE",
  });
}

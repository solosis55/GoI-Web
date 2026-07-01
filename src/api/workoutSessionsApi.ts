import { apiFetch } from "./client";
import type { CreateWorkoutSessionInput, WorkoutSession, WorkoutSessionWithTitle } from "../types/workoutSession";
import type { SessionPickerPageResponse, SessionPickerQueryParams } from "../types/sessionPicker";

export function getWorkoutSessions() {
  return apiFetch<WorkoutSessionWithTitle[]>("/workout-sessions");
}

export function getWorkoutSessionsPicker(params: SessionPickerQueryParams = {}) {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.workoutId) sp.set("workoutId", params.workoutId);
  if (params.from) sp.set("from", params.from);
  if (params.to) sp.set("to", params.to);
  if (params.cursor) sp.set("cursor", params.cursor);
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.includeLinked === false) sp.set("includeLinked", "false");
  const qs = sp.toString();
  return apiFetch<SessionPickerPageResponse>(`/workout-sessions/picker${qs ? `?${qs}` : ""}`);
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

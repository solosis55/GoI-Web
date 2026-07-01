import type { WorkoutSessionSnapshot } from "./workoutSessionSnapshot";

export type WorkoutSession = {
  id: string;
  userId: string;
  workoutId: string;
  performedAt: string;
  notes: string;
  createdAt: string;
};

export type WorkoutSessionWithTitle = WorkoutSession & {
  workoutTitle: string;
  snapshot?: WorkoutSessionSnapshot;
};

export type CreateWorkoutSessionInput = {
  workoutId: string;
  performedAt?: string;
  notes?: string;
};

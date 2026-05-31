export type WorkoutSessionSnapshotSubStep = {
  weight: string;
  reps: string;
};

/** Snapshot estructurado de una sesión realizada (guardado al completar el entreno). */
export type WorkoutSessionSnapshotSet = {
  done: boolean;
  plannedReps: string;
  plannedWeight: string;
  actualReps: string;
  actualWeight: string;
  rpe?: string;
  setType?: string;
  workDurationSec?: string;
  miniRestSec?: string;
  subSteps?: WorkoutSessionSnapshotSubStep[];
};

export type WorkoutSessionSnapshotBlock = {
  exerciseId: string;
  exerciseName: string;
  notes?: string;
  sets: WorkoutSessionSnapshotSet[];
};

export type WorkoutSessionSnapshot = {
  workoutTitle: string;
  completedSets: number;
  totalSets: number;
  completedExercises: number;
  totalExercises: number;
  durationSec?: number;
  volumeKg?: number;
  blocks: WorkoutSessionSnapshotBlock[];
};

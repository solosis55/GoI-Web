export type WorkoutSessionSnapshotSet = {
  done: boolean;
  plannedReps: string;
  plannedWeight: string;
  actualReps: string;
  actualWeight: string;
};

export type WorkoutSessionSnapshotBlock = {
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutSessionSnapshotSet[];
};

export type WorkoutSessionSnapshot = {
  workoutTitle: string;
  completedSets: number;
  totalSets: number;
  completedExercises: number;
  totalExercises: number;
  blocks: WorkoutSessionSnapshotBlock[];
};

export type SessionPickerDatePreset = "all" | "today" | "yesterday" | "week" | "month";

export type SessionPickerRoutineOption = {
  workoutId: string;
  workoutTitle: string;
  sessionCount: number;
};

export type SessionPickerItem = {
  id: string;
  userId: string;
  workoutId: string;
  performedAt: string;
  notes: string;
  createdAt: string;
  workoutTitle: string;
  snapshot?: import("./workoutSessionSnapshot").WorkoutSessionSnapshot;
  linkedPostId?: string | null;
};

export type SessionPickerPageResponse = {
  sessions: SessionPickerItem[];
  nextCursor: string | null;
  hasMore: boolean;
  routineOptions: SessionPickerRoutineOption[];
};

export type SessionPickerQueryParams = {
  q?: string;
  workoutId?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
  includeLinked?: boolean;
};

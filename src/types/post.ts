export type PostFormat = "standard" | "training";

export type PostMediaItem = { type: "image"; url: string };

export type SessionExercisePreview = {
  exerciseName: string;
  summary: string;
};

export type Post = {
  id: string;
  userId: string;
  authorUsername: string;
  authorAvatarUrl: string;
  content: string;
  format?: PostFormat;
  media?: PostMediaItem[];
  hasMedia?: boolean;
  sessionId: string | null;
  workoutId: string | null;
  visibility: "public" | "followers" | "private";
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  likedByMe?: boolean;
  comments: PostComment[];
  /** Enriquecido por API cuando hay sessionId (posts Training). */
  sessionWorkoutTitle?: string | null;
  sessionPerformedAt?: string | null;
  sessionCompletedSets?: number | null;
  sessionTotalSets?: number | null;
  sessionCompletedExercises?: number | null;
  sessionTotalExercises?: number | null;
  sessionExercisePreviews?: SessionExercisePreview[];
  sessionMoreExercisesCount?: number;
};

export type PostComment = {
  id: string;
  postId: string;
  userId: string;
  authorUsername: string;
  /** Relleno en servidor al listar posts (misma lógica que el autor del post). */
  authorAvatarUrl?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type CreatePostInput = {
  content: string;
  format?: PostFormat;
  sessionId?: string | null;
  /** @deprecated Preferir sessionId */
  workoutId?: string | null;
  visibility?: "public" | "followers" | "private";
  /** Max 4; JPEG/PNG/WebP en base64 tras comprimir en el cliente. */
  media?: PostMediaItem[];
};

export type FeedNotification = {
  id: string;
  type: "like" | "comment" | "follow";
  actorUserId: string;
  actorUsername: string;
  actorAvatarUrl: string;
  postId?: string;
  postPreview?: string;
  commentPreview?: string;
  createdAt: string;
  read?: boolean;
};

export type NotificationsResponse = {
  notifications: FeedNotification[];
  unreadCount: number;
};

export type CreateCommentInput = {
  content: string;
};

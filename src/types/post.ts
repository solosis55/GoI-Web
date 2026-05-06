export type PostMediaItem = { type: "image"; url: string };

export type Post = {
  id: string;
  userId: string;
  authorUsername: string;
  authorAvatarUrl: string;
  content: string;
  media?: PostMediaItem[];
  workoutId: string | null;
  visibility: "public" | "followers" | "private";
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  likedByMe?: boolean;
  comments: PostComment[];
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
  workoutId: string | null;
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

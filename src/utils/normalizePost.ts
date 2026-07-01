import type { Post, PostComment } from "../types/post";
import { resolvePostMedia } from "./postMedia";

function readSessionMeta(raw: Post) {
  return {
    sessionWorkoutTitle: raw.sessionWorkoutTitle ?? null,
    sessionPerformedAt: raw.sessionPerformedAt ?? null,
    sessionCompletedSets: raw.sessionCompletedSets ?? null,
    sessionTotalSets: raw.sessionTotalSets ?? null,
    sessionCompletedExercises: raw.sessionCompletedExercises ?? null,
    sessionTotalExercises: raw.sessionTotalExercises ?? null,
    sessionExercisePreviews: Array.isArray(raw.sessionExercisePreviews) ? raw.sessionExercisePreviews : [],
    sessionMoreExercisesCount:
      typeof raw.sessionMoreExercisesCount === "number" ? raw.sessionMoreExercisesCount : 0,
  };
}

/** Asegura campos que la UI del feed exige (respuesta de Goi Server). */
export function normalizePost(raw: Post): Post {
  const media = Array.isArray(raw.media) ? resolvePostMedia(raw.media) : undefined;
  const sessionId = raw.sessionId ?? null;
  const format = raw.format ?? "standard";
  return {
    ...raw,
    ...readSessionMeta(raw),
    authorUsername: raw.authorUsername?.trim() || "Usuario",
    authorAvatarUrl: raw.authorAvatarUrl?.trim() || "",
    workoutId: raw.workoutId ?? null,
    sessionId,
    visibility: raw.visibility ?? "public",
    format,
    likesCount: typeof raw.likesCount === "number" ? raw.likesCount : 0,
    likedByMe: raw.likedByMe ?? false,
    comments: Array.isArray(raw.comments) ? raw.comments.map(normalizeComment) : [],
    media: media?.length ? media : undefined,
    hasMedia:
      raw.hasMedia === true ||
      (raw as { has_media?: boolean }).has_media === true ||
      (media?.length ?? 0) > 0,
  };
}

function normalizeComment(raw: PostComment): PostComment {
  return {
    ...raw,
    authorUsername: raw.authorUsername?.trim() || "Usuario",
    authorAvatarUrl: raw.authorAvatarUrl?.trim() || "",
  };
}

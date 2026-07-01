import type { Post, PostComment } from "../types/post";
import { resolvePostMedia } from "./postMedia";

/** Asegura campos que la UI del feed exige (respuesta de Goi Server). */
export function normalizePost(raw: Post): Post {
  const media = Array.isArray(raw.media) ? resolvePostMedia(raw.media) : undefined;
  return {
    ...raw,
    authorUsername: raw.authorUsername?.trim() || "Usuario",
    authorAvatarUrl: raw.authorAvatarUrl?.trim() || "",
    workoutId: raw.workoutId ?? null,
    sessionId: raw.sessionId ?? null,
    visibility: raw.visibility ?? "public",
    format: raw.format ?? "standard",
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

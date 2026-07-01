import type { Post, PostMediaItem } from "../types/post";
import { resolveMediaUrl } from "../api/client";

export function resolvePostMediaItem(item: PostMediaItem): PostMediaItem | null {
  if (item.type !== "image") return null;
  const url = resolveMediaUrl(item.url);
  return url.trim() ? { ...item, url } : null;
}

export function resolvePostMedia(media: PostMediaItem[] | undefined): PostMediaItem[] {
  if (!media?.length) return [];
  return media
    .map(resolvePostMediaItem)
    .filter((m): m is PostMediaItem => m !== null);
}

export function hasDisplayableMedia(post: Pick<Post, "media">): boolean {
  return resolvePostMedia(post.media).length > 0;
}

/** Post con fotos en servidor pero sin URL usable en el payload del feed. */
export function needsLazyPostMedia(post: Pick<Post, "hasMedia" | "media">): boolean {
  if (hasDisplayableMedia(post)) return false;
  if (post.hasMedia === true) return true;
  return (post.media ?? []).some((m) => typeof m?.url === "string" && m.url.trim().length > 0);
}

export function sanitizePostForFeed(post: Post): Post {
  const media = resolvePostMedia(post.media);
  return media.length > 0 ? { ...post, media } : { ...post, media: undefined };
}

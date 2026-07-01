import type { Post } from "../types/post";
import { encodePostCursor } from "./postCursor";

export type FeedPageLike = {
  items: Array<{ kind: "post"; post: Post } | { kind: string; post?: Post }>;
  nextCursor: string | null;
  hasMore: boolean;
};

/**
 * Si la API devuelve una página llena sin `hasMore`/`nextCursor` (Render sin desplegar),
 * infiere cursor desde el último post para que el cliente pueda pedir la página siguiente.
 */
export function resolveFeedPagePagination<T extends FeedPageLike>(page: T, limit: number): T {
  if (page.hasMore && page.nextCursor) return page;

  const postItems = page.items.filter(
    (item): item is { kind: "post"; post: Post } => item.kind === "post" && Boolean(item.post),
  );
  const lastPost = postItems[postItems.length - 1]?.post;
  if (!lastPost || postItems.length < limit) return page;

  return {
    ...page,
    hasMore: true,
    nextCursor: encodePostCursor(lastPost),
  };
}

import { useEffect, useRef, useState } from "react";
import { getPostById, getPostMedia } from "../api/postsApi";
import type { Post } from "../types/post";
import { hasDisplayableMedia, needsLazyPostMedia, sanitizePostForFeed } from "../utils/postMedia";

function mergeLazyMedia(base: Post, media: Post["media"]): Post {
  return sanitizePostForFeed({
    ...base,
    media,
    hasMedia: (media?.length ?? 0) > 0 || base.hasMedia === true,
  });
}

/**
 * Hidrata media del feed (ligero sin URLs) y resuelve `/uploads/...` contra la API.
 */
export function usePostMediaHydration(post: Post): Post {
  const [hydrated, setHydrated] = useState(() => sanitizePostForFeed(post));
  const lazyMediaAttemptedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setHydrated(sanitizePostForFeed(post));
  }, [post]);

  useEffect(() => {
    lazyMediaAttemptedRef.current.delete(post.id);
  }, [post.id]);

  useEffect(() => {
    if (hasDisplayableMedia(post)) return;

    if (!needsLazyPostMedia(post)) return;
    if (lazyMediaAttemptedRef.current.has(post.id)) return;
    lazyMediaAttemptedRef.current.add(post.id);

    let cancelled = false;

    void (async () => {
      try {
        const media = await getPostMedia(post.id);
        if (cancelled || !media?.length) return;
        setHydrated((prev) => (prev.id === post.id ? mergeLazyMedia(prev, media) : prev));
      } catch {
        /* red / timeout */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [post]);

  useEffect(() => {
    if (hasDisplayableMedia(post) || needsLazyPostMedia(post)) return;

    let cancelled = false;
    getPostById(post.id)
      .then((full) => {
        if (cancelled || !full?.media?.length) return;
        setHydrated((prev) =>
          prev.id === post.id ? mergeLazyMedia(prev, full.media) : prev,
        );
      })
      .catch(() => {
        /* sin media o error de red */
      });

    return () => {
      cancelled = true;
    };
  }, [post]);

  return hydrated;
}

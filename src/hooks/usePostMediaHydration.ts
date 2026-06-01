import { useEffect, useState } from "react";
import { getPostById } from "../api/postsApi";
import type { Post } from "../types/post";

/**
 * Si el listado viene sin media (p. ej. respuesta parcial), carga el detalle una vez.
 */
export function usePostMediaHydration(post: Post): Post {
  const [hydrated, setHydrated] = useState(post);

  useEffect(() => {
    setHydrated(post);
  }, [post]);

  useEffect(() => {
    if ((post.media?.length ?? 0) > 0) return;

    let cancelled = false;
    getPostById(post.id)
      .then((full) => {
        if (cancelled || !full?.media?.length) return;
        setHydrated((prev) =>
          prev.id === post.id ? { ...prev, media: full.media } : prev,
        );
      })
      .catch(() => {
        /* sin media o error de red */
      });

    return () => {
      cancelled = true;
    };
  }, [post.id, post.media]);

  return hydrated;
}

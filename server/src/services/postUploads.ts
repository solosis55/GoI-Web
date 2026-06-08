import { rmSync } from "node:fs";
import { join } from "node:path";
import { getPostMediaDir } from "./uploadPaths.js";

/** Ruta HTTP relativa servida por `express.static` en `/uploads`. */
export function buildPostMediaPathname(postId: string, filename: string): string {
  const safeName = filename.replace(/[/\\]/g, "");
  return `/uploads/posts/${postId}/${safeName}`;
}

export function tryRemovePostUploadDir(postId: string): void {
  if (!postId.trim()) return;
  try {
    rmSync(getPostMediaDir(postId), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

export function tryRemoveUploadedPostFiles(postId: string, filenames: string[]): void {
  for (const name of filenames) {
    if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) continue;
    try {
      rmSync(join(getPostMediaDir(postId), name), { force: true });
    } catch {
      /* ignore */
    }
  }
}

import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { getPersistedStorePath } from "./store.js";

export function getUploadsRoot(): string {
  if (process.env.GOI_UPLOADS_PATH?.trim()) {
    return resolve(process.env.GOI_UPLOADS_PATH.trim());
  }
  if (process.env.VITEST === "true" || process.env.NODE_ENV === "test") {
    return join(tmpdir(), "goi-vitest-uploads");
  }
  if (process.env.VERCEL) {
    return join(tmpdir(), "goi-vercel-uploads");
  }
  return join(dirname(getPersistedStorePath()), "uploads");
}

export function getAvatarsDir(): string {
  return join(getUploadsRoot(), "avatars");
}

export function getBannersDir(): string {
  return join(getUploadsRoot(), "banners");
}

export function getPostsUploadRoot(): string {
  return join(getUploadsRoot(), "posts");
}

export function getPostMediaDir(postId: string): string {
  const safeId = postId.replace(/[/\\]/g, "");
  return join(getPostsUploadRoot(), safeId);
}

export function ensureProfileUploadDirs(): void {
  mkdirSync(getAvatarsDir(), { recursive: true });
  mkdirSync(getBannersDir(), { recursive: true });
  mkdirSync(getPostsUploadRoot(), { recursive: true });
}

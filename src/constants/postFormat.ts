import type { PostFormat } from "../types/post";

export type { PostFormat };

export function parsePostFormat(raw: unknown, fallback: PostFormat = "standard"): PostFormat {
  return raw === "training" ? "training" : raw === "standard" ? "standard" : fallback;
}

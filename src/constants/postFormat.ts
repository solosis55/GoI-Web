import type { PostFormat } from "../types/post";

export type { PostFormat };

export const POST_FORMAT_LABELS: Record<PostFormat, string> = {
  standard: "Publicación",
  training: "Training",
};

export function parsePostFormat(raw: unknown, fallback: PostFormat = "standard"): PostFormat {
  return raw === "training" ? "training" : raw === "standard" ? "standard" : fallback;
}

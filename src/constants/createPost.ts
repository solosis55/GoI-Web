import type { CreatePostInput } from "../types/post";

/** Alineado con Goi App / servidor. */
export const POST_IMAGE_MAX_FILES = 4;
export const POST_BODY_MIN = 4;
export const POST_BODY_MAX = 280;

export type PostVisibility = NonNullable<CreatePostInput["visibility"]>;

export const POST_VISIBILITY_OPTIONS: { value: PostVisibility; label: string; hint: string }[] = [
  { value: "public", label: "Todo el mundo", hint: "Visible para cualquier usuario con sesión iniciada." },
  { value: "followers", label: "Solo seguidores", hint: "Solo quien te sigue (y tú al ver tus propios posts)." },
  { value: "private", label: "Solo yo", hint: "No aparece en el feed público ni para seguidores." },
];

export function resolveDefaultPostVisibility(
  raw: string | undefined | null,
): PostVisibility {
  if (raw === "followers" || raw === "private") return raw;
  return "public";
}

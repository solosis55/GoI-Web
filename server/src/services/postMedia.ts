/** Adjuntos permitidos en publicaciones del feed (MVP = imágenes en data URL). */

export const POST_MEDIA_MAX_ITEMS = 4;
/** Por slide / imagen (~260 KB en base64). */
export const POST_MEDIA_MAX_CHARS_PER_IMAGE = 360_000;
/** Tope aproximado del payload combinado (~700 KB tras decodificar). */
export const POST_MEDIA_MAX_TOTAL_CHARS = 1_050_000;

/** Historias: más diapositivas por reel, mismo tipo de fichero que el feed. */
export const STORY_SLIDES_MAX = 15;
export const STORY_MEDIA_MAX_TOTAL_CHARS = 2_400_000;

export type PersistedPostImage = { type: "image"; url: string };

const DATA_IMAGE_RE = /^data:image\/(jpeg|jpg|png|webp);base64,/i;

/** Avatar de perfil: misma familia que adjuntos de post (data URL o enlace http(s)). */
export function isValidProfileAvatarUrlCandidate(value: string): boolean {
  if (!value.trim()) return true;
  if (/^https?:\/\//i.test(value)) return true;
  if (!DATA_IMAGE_RE.test(value)) return false;
  return value.length <= POST_MEDIA_MAX_CHARS_PER_IMAGE;
}

function parseMediaItems(
  raw: unknown,
  maxItems: number,
  maxTotalChars: number,
): PersistedPostImage[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length > maxItems) return null;
  const out: PersistedPostImage[] = [];
  let totalChars = 0;
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const t = (item as { type?: unknown }).type;
    const url = (item as { url?: unknown }).url;
    if (t !== "image" || typeof url !== "string") return null;
    if (!DATA_IMAGE_RE.test(url)) return null;
    if (url.length > POST_MEDIA_MAX_CHARS_PER_IMAGE) return null;
    totalChars += url.length;
    if (totalChars > maxTotalChars) return null;
    out.push({ type: "image", url });
  }
  return out;
}

function parseMediaArray(raw: unknown): PersistedPostImage[] | null {
  return parseMediaItems(raw, POST_MEDIA_MAX_ITEMS, POST_MEDIA_MAX_TOTAL_CHARS);
}

/** Slides nuevas desde `POST /stories`; 1–N imágenes. */
export function parseStorySlidesFromRequest(raw: unknown): PersistedPostImage[] | null {
  const items = parseMediaItems(raw, STORY_SLIDES_MAX, STORY_MEDIA_MAX_TOTAL_CHARS);
  if (!items?.length) return null;
  return items;
}

/** Carga desde disco: inválido u omitido ⇒ sin array (legacy). */
export function sanitizePersistedMedia(raw: unknown): PersistedPostImage[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  const parsed = parseMediaArray(raw);
  return parsed === null ? undefined : parsed;
}

/** 
 * Cuerpo de API:
 * - `undefined` ⇒ campo ausente (p. ej. PUT sin tocar fotos).
 * - `[]` ⇒ quitar todas las fotos.
 * - con ítems ⇒ reemplazar.
 * - formato inválido ⇒ `null`.
 */
export function normalizePostMediaFromRequest(raw: unknown): PersistedPostImage[] | undefined | null {
  if (raw === undefined) return undefined;
  if (raw === null) return [];
  return parseMediaArray(raw);
}

export function sanitizeText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function normalizeEmail(value: unknown) {
  return sanitizeText(value).toLowerCase();
}

export function isLengthBetween(value: string, min: number, max: number) {
  return value.length >= min && value.length <= max;
}

export function sanitizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => sanitizeText(item)).filter(Boolean);
}

const WORKOUT_TAG_MAX_LEN = 20;
const WORKOUT_TAGS_MAX_COUNT = 12;

/** Etiquetas de entreno: sin duplicados (ignorando mayusculas), longitud y tope de cantidad. */
export function sanitizeWorkoutTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const t = sanitizeText(item);
    if (!t || t.length > WORKOUT_TAG_MAX_LEN) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= WORKOUT_TAGS_MAX_COUNT) break;
  }
  return out;
}

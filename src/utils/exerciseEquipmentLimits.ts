import { CATALOG_EQUIPMENT_OPTIONS } from "../data/exerciseEquipmentFilters";
import type { Exercise } from "../types/exercise";

const EQUIPMENT_LABEL: Record<string, string> = Object.fromEntries(
  CATALOG_EQUIPMENT_OPTIONS.map((o) => [o.slug, o.label])
);

export type EquipmentOption = { slug: string; label: string };

export function allowedEquipmentSlugs(exercise?: Exercise): string[] | null {
  const tags = exercise?.equipmentTags?.filter(Boolean) ?? [];
  if (tags.length === 0) return null;
  return tags;
}

export function exerciseHasEquipmentRestrictions(exercise?: Exercise): boolean {
  return allowedEquipmentSlugs(exercise) !== null;
}

export function equipmentOptionsForExercise(exercise?: Exercise): EquipmentOption[] {
  const allowed = allowedEquipmentSlugs(exercise);
  if (!allowed) return [...CATALOG_EQUIPMENT_OPTIONS];

  const set = new Set(allowed);
  const fromCatalog = CATALOG_EQUIPMENT_OPTIONS.filter((o) => set.has(o.slug));
  const known = new Set<string>(fromCatalog.map((o) => o.slug));
  const extras = allowed
    .filter((slug) => !known.has(slug))
    .map((slug) => ({ slug, label: EQUIPMENT_LABEL[slug] ?? slug }));

  return [...fromCatalog, ...extras];
}

export function defaultEquipmentSlugForExercise(exercise?: Exercise): string {
  const allowed = allowedEquipmentSlugs(exercise);
  const preferred = exercise?.defaultEquipmentSlug?.trim();
  if (preferred && (!allowed || allowed.includes(preferred))) return preferred;
  if (allowed?.length) return allowed[0]!;
  return "";
}

export function sanitizeEquipmentSlug(current: string | undefined, exercise?: Exercise): string {
  const slug = (current ?? "").trim();
  const allowed = allowedEquipmentSlugs(exercise);
  if (!allowed) return slug;
  if (slug && allowed.includes(slug)) return slug;
  return defaultEquipmentSlugForExercise(exercise);
}

export function isEquipmentSlugAllowed(slug: string, exercise?: Exercise): boolean {
  const allowed = allowedEquipmentSlugs(exercise);
  if (!allowed) return true;
  return allowed.includes(slug);
}

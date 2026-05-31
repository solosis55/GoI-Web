import { CATALOG_EQUIPMENT_OPTIONS } from "../data/exerciseEquipmentFilters";
import {
  LATERALITIES_BOTH,
  LATERALITY_BILATERAL_ONLY,
  allowsUnilateralWithEquipment,
  lateralitiesForEquipment,
  type LateralitySlug,
} from "../data/equipmentLaterality";

const EQUIPMENT_LABEL = Object.fromEntries(
  CATALOG_EQUIPMENT_OPTIONS.map((o) => [o.slug, o.label] as const),
) as Record<string, string>;
import type { Exercise } from "../types/exercise";

export function allowedLateralitiesForBlock(
  equipmentSlug: string | undefined,
  exercise?: Exercise
): LateralitySlug[] {
  const slug = (equipmentSlug ?? "").trim();
  if (slug) return lateralitiesForEquipment(slug);

  const tags = exercise?.equipmentTags?.filter(Boolean) ?? [];
  if (tags.length === 0) return LATERALITIES_BOTH;

  const union = new Set<LateralitySlug>();
  for (const tag of tags) {
    for (const lat of lateralitiesForEquipment(tag)) union.add(lat);
  }
  return union.has("unilateral") ? LATERALITIES_BOTH : LATERALITY_BILATERAL_ONLY;
}

export function isLateralityAllowed(
  laterality: string | undefined,
  equipmentSlug: string | undefined,
  exercise?: Exercise
): boolean {
  const lat = (laterality ?? "bilateral") === "unilateral" ? "unilateral" : "bilateral";
  return allowedLateralitiesForBlock(equipmentSlug, exercise).includes(lat);
}

export function sanitizeLaterality(
  laterality: string | undefined,
  equipmentSlug: string | undefined,
  exercise?: Exercise
): LateralitySlug {
  const lat = (laterality ?? "bilateral") === "unilateral" ? "unilateral" : "bilateral";
  if (isLateralityAllowed(lat, equipmentSlug, exercise)) return lat;
  return "bilateral";
}

export function lateralityRestrictionHint(equipmentSlug?: string): string | null {
  if (allowsUnilateralWithEquipment(equipmentSlug)) return null;
  const label = equipmentSlug ? EQUIPMENT_LABEL[equipmentSlug] : "";
  return label ? `Solo bilateral con ${label.toLowerCase()}` : "Solo bilateral con este material";
}

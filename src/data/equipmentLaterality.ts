/** Lateralidad permitida según el tipo de material (no el ejercicio concreto). */
export type LateralitySlug = "bilateral" | "unilateral";

export const LATERALITIES_BOTH: LateralitySlug[] = ["bilateral", "unilateral"];
export const LATERALITY_BILATERAL_ONLY: LateralitySlug[] = ["bilateral"];

export const EQUIPMENT_LATERALITY: Record<string, LateralitySlug[]> = {
  barra: LATERALITY_BILATERAL_ONLY,
  maquina: LATERALITIES_BOTH,
  maquina_palanca: LATERALITIES_BOTH,
  cable: LATERALITIES_BOTH,
  peso_libre: LATERALITIES_BOTH,
  bandas: LATERALITIES_BOTH,
};

export function lateralitiesForEquipment(equipmentSlug?: string): LateralitySlug[] {
  const slug = (equipmentSlug ?? "").trim();
  if (!slug) return LATERALITIES_BOTH;
  return EQUIPMENT_LATERALITY[slug] ?? LATERALITIES_BOTH;
}

export function allowsUnilateralWithEquipment(equipmentSlug?: string): boolean {
  return lateralitiesForEquipment(equipmentSlug).includes("unilateral");
}

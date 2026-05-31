export type Exercise = {
  id: string;
  name: string;
  /** Slugs de grupo muscular (coinciden con semilla / API). */
  muscles?: string[];
  /** Variantes de material del movimiento (barra, cable, maquina, peso_libre, …). */
  equipmentTags?: string[];
  /** Material preseleccionado al añadir; debe estar en `equipmentTags`. */
  defaultEquipmentSlug?: string;
  /** Equipamiento habitual (texto del catalogo). */
  equipment?: string;
  /** Resumen: que es y que trabaja. */
  description?: string;
  /** Ejecucion y claves tecnicas (puede ser multilinea). */
  instructions?: string;
};

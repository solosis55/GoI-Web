/**
 * Claves alineadas con `muscles` en el catálogo (API + semilla del servidor).
 * Pueden filtrarse varias a la vez: se muestran ejercicios que tocan **cualquiera** de los grupos elegidos.
 */
export const CATALOG_MUSCLE_OPTIONS = [
  { slug: "pecho", label: "Pecho" },
  { slug: "biceps", label: "Biceps" },
  { slug: "triceps", label: "Triceps" },
  { slug: "hombro", label: "Hombro" },
  { slug: "espalda_alta", label: "Espalda alta" },
  { slug: "dorsal", label: "Dorsal" },
  { slug: "lumbar", label: "Lumbar" },
  { slug: "abdomen", label: "Abdomen" },
  { slug: "cuadriceps", label: "Cuadriceps" },
  { slug: "gluteo", label: "Gluteo" },
  { slug: "isquiotibiales", label: "Isquiotibiales" },
  { slug: "gemelos", label: "Gemelos" },
  { slug: "antebrazos", label: "Antebrazos" },
] as const;

export type CatalogMuscleSlug = (typeof CATALOG_MUSCLE_OPTIONS)[number]["slug"];

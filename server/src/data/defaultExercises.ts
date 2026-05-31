/**
 * Catálogo inicial: **movimientos** (no implementaciones fijas).
 * `equipmentTags` = variantes de material con las que se puede hacer el movimiento.
 * La lateralidad en rutina depende del material elegido (p. ej. barra → solo bilateral).
 * Fichas: `exerciseDetails.ts` (`EXERCISE_DETAILS_BY_ID`).
 */
export type ExerciseSeed = {
  id: string;
  name: string;
  muscles: string[];
  equipmentTags: string[];
};

/** Empuje horizontal de pecho. */
const PECHO_PRESS = ["barra", "peso_libre", "maquina", "maquina_palanca", "cable"] as const;
/** Empuje inclinado de pecho. */
const PECHO_PRESS_INCLINE = ["barra", "peso_libre", "maquina", "cable"] as const;
/** Aislamiento de pecho. */
const PECHO_FLY = ["peso_libre", "cable", "bandas"] as const;
/** Remo horizontal / tirón al torso. */
const REMO = ["barra", "peso_libre", "cable", "maquina", "maquina_palanca"] as const;
/** Curl de bíceps. */
const CURL_BICEPS = ["barra", "peso_libre", "cable"] as const;
/** Press de hombros. */
const HOMBRO_PRESS = ["barra", "peso_libre", "maquina", "cable"] as const;

export const DEFAULT_EXERCISE_SEED: ExerciseSeed[] = [
  {
    id: "b2955b8a-6c26-498c-8623-40e85fe01b24",
    name: "Press de pecho",
    muscles: ["pecho", "triceps", "hombro"],
    equipmentTags: [...PECHO_PRESS],
  },
  {
    id: "518c7ced-16c8-49e7-8e9c-78b778a29762",
    name: "Press de pecho inclinado",
    muscles: ["pecho", "triceps", "hombro"],
    equipmentTags: [...PECHO_PRESS_INCLINE],
  },
  {
    id: "33d02938-22b2-41ed-a106-aec6a0482635",
    name: "Aperturas de pecho",
    muscles: ["pecho", "hombro"],
    equipmentTags: [...PECHO_FLY],
  },
  {
    id: "798021a8-8c67-440b-babb-4e901776bb3d",
    name: "Fondos en paralelas",
    muscles: ["pecho", "triceps", "hombro"],
    equipmentTags: ["peso_libre", "maquina"],
  },
  {
    id: "71678324-a58a-4421-bfbb-e6dfc8fa11d1",
    name: "Jalón al pecho",
    muscles: ["dorsal", "espalda_alta"],
    equipmentTags: ["cable", "maquina"],
  },
  {
    id: "161b32d3-4067-4ab4-9a9d-b1d9e356c903",
    name: "Remo horizontal",
    muscles: ["dorsal", "espalda_alta", "biceps"],
    equipmentTags: [...REMO],
  },
  {
    id: "a80b0874-8893-4f6b-ba92-d6a33be87d15",
    name: "Peso muerto",
    muscles: ["lumbar", "gluteo", "isquiotibiales", "espalda_alta"],
    equipmentTags: ["barra", "peso_libre"],
  },
  {
    id: "16ab0cf4-f645-4f86-8800-c6aa2b179d62",
    name: "Peso muerto rumano",
    muscles: ["isquiotibiales", "gluteo", "lumbar"],
    equipmentTags: ["barra", "peso_libre"],
  },
  {
    id: "b91becfa-0032-45b2-b60b-eb7f034c46db",
    name: "Sentadilla",
    muscles: ["cuadriceps", "gluteo", "lumbar"],
    equipmentTags: ["barra", "peso_libre", "maquina"],
  },
  {
    id: "5f83eb67-85bc-4d2a-bb62-777914a34043",
    name: "Prensa de piernas",
    muscles: ["cuadriceps"],
    equipmentTags: ["maquina", "maquina_palanca"],
  },
  {
    id: "bd3f9487-2a3a-4c83-9286-5cf7b9c74225",
    name: "Zancadas",
    muscles: ["cuadriceps", "gluteo", "isquiotibiales"],
    equipmentTags: ["peso_libre", "barra"],
  },
  {
    id: "4f959bad-89e1-4bc9-b51c-bb61d598ad1c",
    name: "Extensión de cuádriceps",
    muscles: ["cuadriceps"],
    equipmentTags: ["maquina"],
  },
  {
    id: "6ea510ef-e994-43aa-a334-063ef28eda72",
    name: "Curl de bíceps",
    muscles: ["biceps"],
    equipmentTags: [...CURL_BICEPS],
  },
  {
    id: "6aa22dd9-8fc0-4505-a290-d5453279cb9c",
    name: "Press de hombros",
    muscles: ["hombro", "triceps"],
    equipmentTags: [...HOMBRO_PRESS],
  },
  {
    id: "e6d0b661-d7ae-4d6f-a5e9-aeefdbab1397",
    name: "Elevaciones laterales",
    muscles: ["hombro"],
    equipmentTags: ["peso_libre", "cable"],
  },
  {
    id: "72dc0454-a394-437a-99a9-3ee683272f35",
    name: "Face pull",
    muscles: ["espalda_alta", "hombro"],
    equipmentTags: ["cable"],
  },
  {
    id: "ecb0728e-7b82-4b38-8356-2097b98e1cea",
    name: "Hip thrust",
    muscles: ["gluteo", "isquiotibiales"],
    equipmentTags: ["barra", "peso_libre", "maquina"],
  },
  {
    id: "6c2bc1f2-0b32-48d5-a009-a29a2f6fc298",
    name: "Elevación de talones",
    muscles: ["gemelos"],
    equipmentTags: ["maquina", "peso_libre"],
  },
  {
    id: "f125a94c-52ef-438d-a14b-37964964b8d0",
    name: "Plancha",
    muscles: ["abdomen", "lumbar"],
    equipmentTags: ["peso_libre"],
  },
  {
    id: "92fc00db-1468-4ec9-980e-7e079e16ca9e",
    name: "Crunch",
    muscles: ["abdomen"],
    equipmentTags: ["peso_libre", "cable", "maquina"],
  },
  {
    id: "ddfad4ea-ba79-4a72-87cd-4b16476c2731",
    name: "Dominadas",
    muscles: ["dorsal", "biceps", "espalda_alta"],
    equipmentTags: ["peso_libre", "maquina", "bandas"],
  },
  {
    id: "d4bb29b4-c716-41fb-bfb9-96c9106ea252",
    name: "Press francés",
    muscles: ["triceps"],
    equipmentTags: ["barra", "peso_libre", "cable"],
  },
  {
    id: "41b23b40-fadb-4dcc-aa1a-cf1b2f3e9576",
    name: "Extensiones de tríceps",
    muscles: ["triceps"],
    equipmentTags: ["cable", "peso_libre"],
  },
  {
    id: "c0187cb8-ea17-4a16-bfd0-fbeac822c170",
    name: "Caminata de granjero",
    muscles: ["antebrazos", "lumbar", "isquiotibiales"],
    equipmentTags: ["peso_libre"],
  },
];

/**
 * Textos de ficha para el catálogo (semilla). Claves = `id` de `defaultExercises.ts`.
 * Se fusionan en `mergeExerciseCatalog` (store). Editar aquí o vía `store.json` en producción.
 */
export type ExerciseDetailFields = {
  equipment: string;
  description: string;
  instructions: string;
};

export const EXERCISE_DETAILS_BY_ID: Record<string, ExerciseDetailFields> = {
  "b2955b8a-6c26-498c-8623-40e85fe01b24": {
    equipment: "Barra, mancuernas, máquina, palanca o polea; banco plano",
    description:
      "Movimiento de empuje horizontal de pecho. Elige el material en la rutina: barra en banco, mancuernas, máquina guiada, convergente o poleas.",
    instructions:
      "Ajusta banco y material. Empuja en arco controlado; baja sin rebote. Con barra: agarre algo más ancho que hombros y omóplatos retraídos. Con mancuernas o polea: codos ~45° del torso.",
  },
  "518c7ced-16c8-49e7-8e9c-78b778a29762": {
    equipment: "Barra, mancuernas, máquina o polea; banco inclinado",
    description: "Empuje inclinado que enfatiza la parte superior del pecho y deltoides anterior.",
    instructions:
      "Inclina el banco ~30–45°. Misma lógica de press: trayectoria controlada, sin bloquear fuerte si molesta el hombro.",
  },
  "33d02938-22b2-41ed-a106-aec6a0482635": {
    equipment: "Mancuernas o poleas/cables",
    description: "Aperturas aisladas para pectoral con trayectoria amplia en el plano frontal.",
    instructions:
      "Ligera flexión de codos fija. Abre los brazos hasta sentir estiramiento sin dolor en hombro; cierra como si abrazaras un balón. Evita bloquear fuerte arriba si molesta la articulación.",
  },
  "798021a8-8c67-440b-babb-4e901776bb3d": {
    equipment: "Paralelas o barras de fondos",
    description: "Empuje vertical con peso corporal centrado en tríceps y pecho según la inclinación.",
    instructions:
      "Encaja escápulas, pecho algo inclinado hacia delante para más pecho o torso más vertical para más tríceps. Baja hasta ~90° de codo si tus hombros lo toleran; empuja sin rebotes.",
  },
  "71678324-a58a-4421-bfbb-e6dfc8fa11d1": {
    equipment: "Máquina de jalón o polea alta",
    description: "Tracción vertical que activa dorsales y ayuda de bíceps con torso fijo.",
    instructions:
      "Agarre prono o neutro según comodidad. Deprime escápulas antes de tirar. Lleva la barra/manija al pecho alto o clavícula sin balancear. Controla la fase excéntrica.",
  },
  "161b32d3-4067-4ab4-9a9d-b1d9e356c903": {
    equipment: "Barra, mancuernas, polea o máquina de remo",
    description: "Tirón horizontal al torso. Variante bilateral o unilateral según material (p. ej. remo con mancuerna a una mano).",
    instructions:
      "Espalda neutra, pecho abierto. Tira hacia el abdomen o bajo pecho; codos atrás. En máquina: ajusta asiento y apoyo torácico.",
  },
  "a80b0874-8893-4f6b-ba92-d6a33be87d15": {
    equipment: "Barra y discos o hex/trap bar",
    description: "Patrón de bisagra de cadera máxima; cadena posterior y espalda en tensión isométrica.",
    instructions:
      "Pies bajo la barra, agarre fuera de piernas o alternado. Eleva empujando el suelo, rodillas alineadas con pies. Bloquea cadera sin hiperlordosis final; baja pegado a las piernas.",
  },
  "16ab0cf4-f645-4f86-8800-c6aa2b179d62": {
    equipment: "Barra o mancuernas",
    description: "Variante con más flexión de cadera que sentadilla; prioriza isquios y glúteos.",
    instructions:
      "Barra cerca de piernas, espalda neutra. Baja la barra sin redondear; siente el tirón en isquios. Subida empujando cadera adelante; rodillas blandas pero no cuadriceps-dominante.",
  },
  "b91becfa-0032-45b2-b60b-eb7f034c46db": {
    equipment: "Barra, rack de sentadilla, discos",
    description: "Patrón fundamental de piernas y glúteos con alta transferencia a fuerza general.",
    instructions:
      "Barra alta o baja en trapecio según estilo. Descenso controlado; rodillas alineadas con pies. Profundidad según movilidad sin pérdida de neutra en lumbar. Subida empujando el suelo.",
  },
  "5f83eb67-85bc-4d2a-bb62-777914a34043": {
    equipment: "Máquina de prensa de piernas",
    description: "Empuje de piernas en máquina para aislar cuádriceps con soporte lumbar.",
    instructions:
      "pies a la altura del pecho en la plataforma; no despegar glúteos del asiento. Flexiona hasta buen rango sin levantar la zona lumbar del respaldo. Extiende sin bloquear rodillas bruscamente.",
  },
  "bd3f9487-2a3a-4c83-9286-5cf7b9c74225": {
    equipment: "Mancuernas o barra (zyper)",
    description: "Patrón unilateral que combina fuerza de pierna y estabilidad en frontal.",
    instructions:
      "Zancada largo paso; rodilla trasera baja casi al suelo. Torso alto, cadera neutra. Empuja con el pie delantero para volver; alterna piernas. Evita que la rodilla delantera colapse hacia dentro.",
  },
  "4f959bad-89e1-4bc9-b51c-bb61d598ad1c": {
    equipment: "Máquina de extensión de cuádriceps",
    description: "Aislamiento de cuádriceps en cadena abierta; útil como accesorio o volumen.",
    instructions:
      "Asiento para que la articulación de rodilla esté alineada con el eje. Extiende hasta recto sin golpe seco; baja controlando la excéntrica.",
  },
  "6ea510ef-e994-43aa-a334-063ef28eda72": {
    equipment: "Barra EZ o recta, discos",
    description: "Curl de bíceps con barra; permite cargar más que con mancuernas sueltas.",
    instructions:
      "Codos fijos al costado del torso. Flexiona sin balancear el tronco al final. Baja despacio; no hiperextender codos si molesta.",
  },
  "8c54968e-5171-4dd4-9a6f-3067e3cff237": {
    equipment: "Mancuernas",
    description: "Curls alternos o simultáneos con mayor libertad de muñeca que la barra.",
    instructions:
      "Palmas hacia delante o neutras según variante. Sin impulso de espalda; sube rotando (opcional) para máxima contracción arriba.",
  },
  "6aa22dd9-8fc0-4505-a290-d5453279cb9c": {
    equipment: "Barra o mancuernas, rack opcional",
    description: "Empuje vertical de hombros y tríceps; pie puede ser sentado o de pie.",
    instructions:
      "Core tenso, glúteos activos si vas de pie. Barra desde mentón o clavícula hacia arriba sin arquear lumbar excesivo. Codos no demasiado atrás para no pinzar hombro.",
  },
  "e6d0b661-d7ae-4d6f-a5e9-aeefdbab1397": {
    equipment: "Mancuernas o poleas laterales",
    description: "Elevación en el plano frontal/lateral para deltoides medio con poca carga.",
    instructions:
      "Ligera flexión de codos. Eleva hasta altura de hombros sin encoger trapecio primero; baja despacio. Evita sacar el cuello hacia delante.",
  },
  "72dc0454-a394-437a-99a9-3ee683272f35": {
    equipment: "Cuerda o barra en polea alta",
    description: "Tirón alto hacia la cara para trapecio medio/deltoides posteriores y rotadores externos.",
    instructions:
      "Tira hacia la frente/rostro separando la cuerda al final. Codos altos y abiertos. No uses peso que te haga balancear el torso.",
  },
  "ecb0728e-7b82-4b38-8356-2097b98e1cea": {
    equipment: "Banco, barra o mancuerna, colchoneta",
    description: "Puente de cadera cargado para glúteos con apoyo dorsal en banco.",
    instructions:
      "Escápulas en el banco, cadera sube hasta alinear rodillas-caderas-hombros. Aprieta glúteos arriba sin hiperextender lumbar. Baja controlando.",
  },
  "6c2bc1f2-0b32-48d5-a009-a29a2f6fc298": {
    equipment: "Máquina de gemelos, barra o mancuernas",
    description: "Extensión de tobillo para sóleo y gastrocnemio.",
    instructions:
      "Rango completo desde estiramiento hasta contracción arriba 1–2 s. No rebotes bruscos en el fondo.",
  },
  "f125a94c-52ef-438d-a14b-37964964b8d0": {
    equipment: "Colchoneta (opcional)",
    description: "Isometría anterior del core; anti-extensión y estabilidad de cadera.",
    instructions:
      "Antebrazos en el suelo, cuerpo recto cabeza-talón. Activa abdomen y glúteos; no hundir cadera ni elevar culo. Respira lateralmente manteniendo tensión.",
  },
  "92fc00db-1468-4ec9-980e-7e079e16ca9e": {
    equipment: "Colchoneta o banco",
    description: "Flexión de tronco corta para recto abdominal.",
    instructions:
      "Lumbar pegada al suelo si vas de espalda. Eleva escápulas del suelo sin tirar del cuello con las manos. Rango moderado; controla la bajada.",
  },
  "ddfad4ea-ba79-4a72-87cd-4b16476c2731": {
    equipment: "Barra fija o asistida",
    description: "Tracción vertical con peso corporal; muy demandante de dorsal y bíceps.",
    instructions:
      "Agarre prono o neutro. Deprime escápulas y tira el pecho hacia la barra. Evita balance kipping si buscas hipertrofia/control. Rango completo si salud articular lo permite.",
  },
  "482dc809-15c7-4aa8-af0b-0a7c535154a9": {
    equipment: "Mancuerna, banco",
    description: "Remo unilateral con apoyo; reduce demanda lumbar y permite buen rango.",
    instructions:
      "Rodilla y mano en el banco, espalda paralela al suelo. Tira la mancuerna al cadera sin rotar el tronco. Abajo estira el brazo sin redondear.",
  },
  "9ea166aa-7ae2-481c-8b0e-55726f48dc66": {
    equipment: "Paralelas o fondos en banco",
    description: "Empuje vertical con peso corporal enfocado en tríceps y pecho inferior.",
    instructions:
      "Similar a fondos en paralelas; controla profundidad según hombro. Mantén codos algo cerrados si priorizas tríceps.",
  },
  "d4bb29b4-c716-41fb-bfb9-96c9106ea252": {
    equipment: "Barra EZ o mancuerna, banco",
    description: "Extensión de codos sobre cabeza acostado; aislamiento de tríceps largo.",
    instructions:
      "Barra por detrás de la frente con codos fijos apuntando al techo. Extiende sin abrir codos hacia fuera. Rango cómodo en hombro.",
  },
  "41b23b40-fadb-4dcc-aa1a-cf1b2f3e9576": {
    equipment: "Cuerda o barra en polea alta",
    description: "Extensión de codos en polea para tríceps con tensión constante.",
    instructions:
      "Codos pegados al torso o leve flexión hacia delante en cuerda. Extinde codos al final sin desplazar hombros hacia delante.",
  },
  "c0187cb8-ea17-4a16-bfd0-fbeac822c170": {
    equipment: "Mancuernas o kettlebells pesadas",
    description: "Caminata con carga en los lados; agarre, core y cadera en isometría.",
    instructions:
      "Levanta las cargas, hombros abajo y atrás. Camina recto pasos cortos y rápidos sin inclinar el torso. Respira en bloque ligero sin soltar el brace.",
  },
};

export function sessionPostTemplate(title: string): string {
  return `Sesión: ${title} 💪`;
}

export const CAPTION_PROMPTS_STANDARD = [
  "Mi mejor serie del día 💪",
  "Nuevo PR, vamos…",
  "Día de pierna completado",
  "Entreno con la crew",
] as const;

export const CAPTION_PROMPTS_TRAINING = [
  "¡Buen entreno!",
  "Sesión completada",
  "Más fuerte que ayer",
  "Resumen del día",
] as const;

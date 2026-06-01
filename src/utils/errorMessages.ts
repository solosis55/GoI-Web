import { ApiError } from "../api/client";

const codeMessageMap: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: "Email o contraseña incorrectos.",
  AUTH_EMAIL_IN_USE: "Ese email ya está registrado.",
  AUTH_REGISTER_INVALID_INPUT: "Revisa usuario, email y contraseña (mínimo 6 caracteres).",
  AUTH_LOGIN_INVALID_INPUT: "Debes introducir email y contraseña.",
  AUTH_UNAUTHORIZED: "Tu sesión ha caducado. Vuelve a iniciar sesión.",
  AUTH_TOKEN_INVALID: "Tu sesión no es válida. Vuelve a iniciar sesión.",
  AUTH_SESSION_STALE:
    "Tu sesión ya no coincide con el servidor (los datos locales se reiniciaron o otro entorno). Cierra sesión e inicia sesión otra vez.",
  AUTH_FORBIDDEN: "No tienes permisos para realizar esta acción.",
  AUTH_PROFILE_INVALID_INPUT: "Revisa los datos del perfil y vuelve a intentarlo.",
  AUTH_RATE_LIMITED: "Demasiados intentos. Espera unos minutos antes de reintentar.",
  AUTH_JWT_NOT_CONFIGURED:
    "El servidor no tiene configurada la variable JWT_SECRET (en Vercel: Settings → Environment Variables). Añádela y vuelve a desplegar.",
  AUTH_FORGOT_PASSWORD_INVALID_INPUT: "Introduce un correo electrónico válido.",
  AUTH_RESET_INVALID_INPUT: "La contraseña debe tener al menos 6 caracteres y el enlace debe ser válido.",
  AUTH_RESET_TOKEN_INVALID: "El enlace de restablecimiento no es válido o ha caducado. Solicita uno nuevo.",
  AUTH_USER_NOT_FOUND: "El usuario no existe.",
  POST_FORBIDDEN: "No puedes modificar esta publicación.",
  STORY_INVALID_SLIDES: "La historia debe incluir entre 1 y 15 fotos válidas (JPG, PNG o WebP).",
  POST_MEDIA_INVALID:
    "Las imágenes no son válidas (formato, tamaño o cantidad). Reduce el número de fotos o prueba otra imagen.",
  POST_INVALID_INPUT:
    "Revisa el texto: sin fotos, entre 4 y 280 caracteres; con fotos, texto opcional hasta 280.",
  POST_INVALID_VISIBILITY: "La visibilidad de la publicación no es válida.",
  COMMENT_INVALID_INPUT: "El comentario debe tener entre 1 y 180 caracteres.",
  POST_WORKOUT_NOT_FOUND: "La rutina vinculada no existe.",
  POST_USER_NOT_FOUND: "No se encontró el usuario de la publicación.",
  WORKOUT_FORBIDDEN: "No puedes modificar esta rutina.",
  WORKOUT_INVALID_INPUT: "Revisa título, descripción o ejercicios de la rutina.",
  WORKOUT_INVALID_EXERCISE_IDS: "Uno o más ejercicios no existen en el catálogo. Recarga la página e inténtalo de nuevo.",
  POST_NOT_FOUND: "La publicación no existe o fue eliminada.",
  WORKOUT_NOT_FOUND: "La rutina no existe o fue eliminada.",
  WORKOUT_SESSION_INVALID_INPUT: "Revisa la fecha y las notas del entrenamiento (máximo 500 caracteres).",
  WORKOUT_SESSION_NOT_FOUND: "Ese entrenamiento ya no existe.",
  WORKOUT_SESSION_FORBIDDEN: "No puedes modificar este entrenamiento.",
  EXERCISE_NOT_FOUND: "Ese ejercicio no existe en el catálogo.",
  API_NETWORK_ERROR:
    "No se pudo conectar con la API. En local: arranca Goi Server (:4000), Express (:4001) y reinicia Vite (:5173). Si solo fallan posts, revisa Neon/internet.",
  API_INVALID_RESPONSE:
    "La API devolvió un formato inesperado. Si desplegaste solo el frontend, falta el servidor en /api o la variable VITE_API_URL (ver docs/deploy.md).",
};

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return codeMessageMap[error.code] ?? error.message ?? fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}


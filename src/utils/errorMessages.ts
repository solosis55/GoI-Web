import { ApiError } from "../api/client";

const codeMessageMap: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: "Email o contraseña incorrectos.",
  AUTH_EMAIL_IN_USE: "Ese email ya está registrado.",
  AUTH_REGISTER_INVALID_INPUT: "Revisa usuario, email y contraseña (mínimo 6 caracteres).",
  AUTH_LOGIN_INVALID_INPUT: "Debes introducir email y contraseña.",
  AUTH_UNAUTHORIZED: "Tu sesión ha caducado. Vuelve a iniciar sesión.",
  AUTH_TOKEN_INVALID: "Tu sesión no es válida. Vuelve a iniciar sesión.",
  AUTH_FORBIDDEN: "No tienes permisos para realizar esta acción.",
  AUTH_PROFILE_INVALID_INPUT: "Revisa los datos del perfil y vuelve a intentarlo.",
  AUTH_RATE_LIMITED: "Demasiados intentos. Espera unos minutos antes de reintentar.",
  AUTH_FORGOT_PASSWORD_INVALID_INPUT: "Introduce un correo electrónico válido.",
  AUTH_RESET_INVALID_INPUT: "La contraseña debe tener al menos 6 caracteres y el enlace debe ser válido.",
  AUTH_RESET_TOKEN_INVALID: "El enlace de restablecimiento no es válido o ha caducado. Solicita uno nuevo.",
  AUTH_USER_NOT_FOUND: "El usuario no existe.",
  POST_FORBIDDEN: "No puedes modificar esta publicación.",
  POST_INVALID_INPUT: "La publicación debe tener entre 4 y 280 caracteres.",
  COMMENT_INVALID_INPUT: "El comentario debe tener entre 1 y 180 caracteres.",
  POST_WORKOUT_NOT_FOUND: "El entrenamiento vinculado no existe.",
  POST_USER_NOT_FOUND: "No se encontró el usuario de la publicación.",
  WORKOUT_FORBIDDEN: "No puedes modificar este entrenamiento.",
  WORKOUT_INVALID_INPUT: "Revisa título, descripción o ejercicios del entrenamiento.",
  POST_NOT_FOUND: "La publicación no existe o fue eliminada.",
  WORKOUT_NOT_FOUND: "El entrenamiento no existe o fue eliminado.",
  WORKOUT_SESSION_INVALID_INPUT: "Revisa la fecha y las notas de la sesión (máximo 500 caracteres).",
  WORKOUT_SESSION_NOT_FOUND: "Esa sesión ya no existe.",
  WORKOUT_SESSION_FORBIDDEN: "No puedes modificar esta sesión.",
  API_NETWORK_ERROR:
    "No se pudo conectar con la API. Revisa la red o la URL del backend (en Vercel solo front hace falta VITE_API_URL o un proxy; ver docs/deploy.md).",
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


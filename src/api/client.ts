const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "/api" : "http://localhost:4000/api");
const AUTH_STORAGE_KEY = "fit-social-auth";
const AUTH_EXPIRED_EVENT = "auth:expired";

type ApiErrorBody = {
  code?: string;
  message?: string;
};

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, status: number, code = "API_ERROR") {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

function shouldExpireSession(status: number, code: string) {
  return (
    status === 401 ||
    code === "AUTH_UNAUTHORIZED" ||
    code === "AUTH_TOKEN_INVALID" ||
    code === "AUTH_SESSION_STALE"
  );
}

function fallbackMessageForFailedRequest(status: number): string {
  if (status === 404) {
    return "No se encontró la API en esta dirección (404). Si el sitio está solo en Vercel como estático, /api no existe ahí: despliega el backend en otro servicio y define VITE_API_URL al construir el front, o un único servidor Node que sirva SPA + API (docs/deploy.md).";
  }
  if (status >= 500) {
    return `Error en el servidor (${status}). Revisa los logs del backend; en producción hace falta JWT_SECRET y el proceso debe estar en marcha.`;
  }
  if (status === 401 || status === 403) {
    return `La petición no fue aceptada (${status}).`;
  }
  return `La API respondió con un error (${status}).`;
}

function getStoredToken() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token ?? null;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getStoredToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers ?? {}),
      },
      ...options,
    });
  } catch (err) {
    const hint =
      err instanceof TypeError
        ? "No se pudo conectar con la API (red, CORS o URL incorrecta). Si usas Vercel solo con el front, configura el backend y VITE_API_URL; ver docs/deploy.md."
        : "No se pudo conectar con la API.";
    throw new ApiError(hint, 0, "API_NETWORK_ERROR");
  }

  const rawText = await response.text();
  let parsed: unknown;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = undefined;
    }
  }

  const data = (parsed && typeof parsed === "object" ? parsed : {}) as T & ApiErrorBody;

  if (!response.ok) {
    const hasServerMessage = typeof data.message === "string" && data.message.trim().length > 0;
    const hasServerCode = typeof data.code === "string" && data.code.trim().length > 0;
    const message = hasServerMessage ? data.message! : fallbackMessageForFailedRequest(response.status);
    const code = hasServerCode ? data.code! : "API_ERROR";
    const apiError = new ApiError(message, response.status, code);
    if (shouldExpireSession(apiError.status, apiError.code)) {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    throw apiError;
  }

  if (parsed === undefined) {
    if (!rawText) return {} as T;
    throw new ApiError(
      "El servidor devolvió algo que no es JSON (a menudo HTML). En despliegues solo estáticos suele faltar el backend en /api; ver docs/deploy.md.",
      response.status,
      "API_INVALID_RESPONSE"
    );
  }

  return parsed as T;
}

export { AUTH_EXPIRED_EVENT };

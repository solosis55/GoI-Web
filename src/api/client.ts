import { AUTH_STORAGE_KEY } from "../constants/storageKeys";

const envPostsUrl = import.meta.env.VITE_API_URL?.trim();
const envLegacyUrl = import.meta.env.VITE_LEGACY_API_URL?.trim();

const POSTS_PORT = 4000;
const LEGACY_PORT = 4001;

function trimApiBase(url: string) {
  return url.replace(/\/$/, "");
}

function resolveDevPostsApiBase(): string {
  if (envPostsUrl && envPostsUrl.length > 0) return trimApiBase(envPostsUrl);
  // Mismo origen que Vite; vite.config.ts envía /api/posts → :4000
  return "/api";
}

function resolveDevLegacyApiBase(): string {
  if (envLegacyUrl && envLegacyUrl.length > 0) return trimApiBase(envLegacyUrl);
  const main = resolveDevPostsApiBase();
  if (main === "/api") return "/api";
  if (main.includes(`:${POSTS_PORT}/`)) {
    return main.replace(`:${POSTS_PORT}/`, `:${LEGACY_PORT}/`);
  }
  return main;
}

/** Goi Server — posts, feed, comentarios (Neon). */
export const API_BASE_URL = import.meta.env.PROD
  ? envPostsUrl && envPostsUrl.length > 0
    ? trimApiBase(envPostsUrl)
    : "/api"
  : resolveDevPostsApiBase();

/** Goi Web Express — auth, entrenos, social, uploads. */
export const LEGACY_API_BASE_URL = import.meta.env.PROD
  ? envLegacyUrl && envLegacyUrl.length > 0
    ? trimApiBase(envLegacyUrl)
    : API_BASE_URL
  : resolveDevLegacyApiBase();

if (import.meta.env.DEV) {
  console.log(`[Goi Web] API_BASE_URL → ${API_BASE_URL}`);
  if (LEGACY_API_BASE_URL !== API_BASE_URL) {
    console.log(`[Goi Web] LEGACY_API_BASE_URL → ${LEGACY_API_BASE_URL}`);
  }
}

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
    return "No se encontró la API en esta dirección (404). Comprueba VITE_API_URL (Goi Server :4000) y VITE_LEGACY_API_URL (Express :4001), o docs/deploy.md.";
  }
  if (status >= 500) {
    return `Error en el servidor (${status}). Revisa los logs del backend; en producción hace falta JWT_SECRET y el proceso debe estar en marcha.`;
  }
  if (status === 401 || status === 403) {
    return `La petición no fue aceptada (${status}).`;
  }
  return `La API respondió con un error (${status}).`;
}

export function getStoredToken() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token ?? null;
  } catch {
    return null;
  }
}

export type ApiFetchOptions = RequestInit & {
  baseUrl?: string;
  /** Por defecto 12s; posts/Neon pueden usar más en postsApi. */
  timeoutMs?: number;
};

/** Rutas del backend Express legacy (auth, workouts, stories…). */
export function legacyApiFetch<T>(path: string, options?: ApiFetchOptions): Promise<T> {
  return apiFetch<T>(path, { ...options, baseUrl: LEGACY_API_BASE_URL });
}

const API_TIMEOUT_MS = 12_000;

function mergeAbortSignal(
  userSignal: AbortSignal | null | undefined,
  timeoutMs: number
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  if (userSignal) {
    if (userSignal.aborted) controller.abort();
    else userSignal.addEventListener("abort", onAbort);
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      if (userSignal) userSignal.removeEventListener("abort", onAbort);
    },
  };
}

export async function apiFetch<T>(path: string, options?: ApiFetchOptions): Promise<T> {
  const { baseUrl, timeoutMs, ...fetchOptions } = options ?? {};
  const root = baseUrl ?? API_BASE_URL;
  const token = getStoredToken();
  const url = `${root}${path.startsWith("/") ? path : `/${path}`}`;

  let response: Response;
  const { signal, cleanup } = mergeAbortSignal(
    fetchOptions?.signal,
    timeoutMs ?? API_TIMEOUT_MS
  );
  try {
    response = await fetch(url, {
      ...fetchOptions,
      signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(fetchOptions?.headers ?? {}),
      },
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    const hint = aborted
      ? "La API tardó demasiado (timeout). Comprueba Goi Server (:4000) y Neon; en Goi Server: npm run db:setup y reinicia npm run dev."
      : err instanceof TypeError
        ? "No se pudo conectar con la API (red, CORS o URL incorrecta)."
        : "No se pudo conectar con la API.";
    throw new ApiError(hint, 0, "API_NETWORK_ERROR");
  } finally {
    cleanup();
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

  if (response.status === 204 || !rawText) {
    return {} as T;
  }

  if (parsed === undefined) {
    throw new ApiError(
      "El servidor devolvió algo que no es JSON (a menudo HTML). En despliegues solo estáticos suele faltar el backend en /api; ver docs/deploy.md.",
      response.status,
      "API_INVALID_RESPONSE"
    );
  }

  return parsed as T;
}

export { AUTH_EXPIRED_EVENT };

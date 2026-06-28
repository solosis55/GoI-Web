import {
  ApiError,
  AUTH_EXPIRED_EVENT,
  API_BASE_URL,
  apiFetch,
  getStoredToken,
} from "./client";
import type {
  AuthResponse,
  DiscoverUser,
  ForgotPasswordResponse,
  LoginInput,
  ProfileUser,
  RegisterInput,
  RegisterResponse,
  ResendVerificationResponse,
  ResetPasswordInput,
  SafeUser,
  UpdateProfileInput,
  VerifyEmailResponse,
} from "../types/auth";

export function register(input: RegisterInput) {
  return apiFetch<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: LoginInput) {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function requestPasswordReset(email: string) {
  return apiFetch<ForgotPasswordResponse>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPasswordWithToken(input: ResetPasswordInput) {
  return apiFetch<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function verifyEmailWithToken(token: string) {
  return apiFetch<VerifyEmailResponse>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export function resendVerificationEmail(email: string) {
  return apiFetch<ResendVerificationResponse>("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function getProfile(userId: string) {
  return apiFetch<{ user: ProfileUser }>(`/auth/profile/${encodeURIComponent(userId)}`);
}

export function updateProfile(userId: string, input: UpdateProfileInput) {
  return apiFetch<{ message: string; user: SafeUser }>(`/auth/profile/${encodeURIComponent(userId)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

async function postProfileImageUpload(path: string, file: File): Promise<string> {
  const token = getStoredToken();
  const form = new FormData();
  form.append("file", file);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
  } catch {
    throw new ApiError("No se pudo conectar con la API.", 0, "API_NETWORK_ERROR");
  }
  const rawText = await response.text();
  let parsed: { url?: string; message?: string; code?: string };
  try {
    parsed = rawText ? (JSON.parse(rawText) as typeof parsed) : {};
  } catch {
    throw new ApiError(
      "El servidor devolvió una respuesta no válida.",
      response.status,
      "API_INVALID_RESPONSE",
    );
  }
  if (!response.ok) {
    const message =
      typeof parsed.message === "string" && parsed.message.trim()
        ? parsed.message
        : `Error ${response.status}`;
    const code = typeof parsed.code === "string" && parsed.code.trim() ? parsed.code : "API_ERROR";
    const err = new ApiError(message, response.status, code);
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    throw err;
  }
  const url = typeof parsed.url === "string" ? parsed.url.trim() : "";
  if (!url) {
    throw new ApiError("El servidor no devolvió la URL de la imagen.", response.status, "API_ERROR");
  }
  return url;
}

/** Sube foto de perfil al servidor; devuelve URL absoluta (p. ej. `http://localhost:4000/uploads/avatars/…`). */
export function uploadProfileAvatarFile(userId: string, file: File) {
  return postProfileImageUpload(`/auth/profile/${encodeURIComponent(userId)}/avatar`, file);
}

/** Sube imagen de cabecera; devuelve URL pública. */
export function uploadProfileBannerFile(userId: string, file: File) {
  return postProfileImageUpload(`/auth/profile/${encodeURIComponent(userId)}/banner`, file);
}

export function getUsers() {
  return apiFetch<{ users: DiscoverUser[] }>("/auth/users");
}

export type ToggleFollowResponse = {
  following: boolean;
  pending?: boolean;
  status?: "none" | "pending" | "active";
};

export function getFollowing(userId: string) {
  return apiFetch<{ followingIds: string[] }>(`/auth/following/${encodeURIComponent(userId)}`);
}

export function getFollowers(userId: string) {
  return apiFetch<{ followerIds: string[] }>(`/auth/followers/${encodeURIComponent(userId)}`);
}

export function toggleFollow(targetUserId: string) {
  return apiFetch<ToggleFollowResponse>(`/auth/follow/${encodeURIComponent(targetUserId)}`, {
    method: "POST",
  });
}

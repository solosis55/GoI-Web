import { apiFetch } from "./client";
import type {
  AuthResponse,
  DiscoverUser,
  ForgotPasswordResponse,
  LoginInput,
  ProfileUser,
  RegisterInput,
  ResetPasswordInput,
  SafeUser,
  UpdateProfileInput,
} from "../types/auth";

export function register(input: RegisterInput) {
  return apiFetch<AuthResponse>("/auth/register", {
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

export function getProfile(userId: string) {
  return apiFetch<{ user: ProfileUser }>(`/auth/profile/${userId}`);
}

export function updateProfile(userId: string, input: UpdateProfileInput) {
  return apiFetch<{ message: string; user: SafeUser }>(`/auth/profile/${userId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function getUsers() {
  return apiFetch<{ users: DiscoverUser[] }>("/auth/users");
}

export function getFollowing(userId: string) {
  return apiFetch<{ followingIds: string[] }>(`/auth/following/${userId}`);
}

export function toggleFollow(targetUserId: string) {
  return apiFetch<{ following: boolean }>(`/auth/follow/${targetUserId}`, {
    method: "POST",
  });
}

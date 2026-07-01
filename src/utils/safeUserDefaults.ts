import type { SafeUser } from "../types/auth";

/** Completa campos nuevos del perfil en sesiones guardadas antes de migrar el servidor. */
export function mergeSafeUser(user: SafeUser): SafeUser {
  return {
    ...user,
    bannerUrl: user.bannerUrl ?? "",
    bannerShowInFeed: user.bannerShowInFeed !== false,
    websiteUrl: user.websiteUrl ?? "",
    instagramUrl: user.instagramUrl ?? "",
    stravaUrl: user.stravaUrl ?? "",
    location: user.location ?? "",
    profileVisibility: user.profileVisibility === "followers" ? "followers" : "public",
    defaultPostVisibility:
      user.defaultPostVisibility === "followers" || user.defaultPostVisibility === "private"
        ? user.defaultPostVisibility
        : "public",
    pinnedPostId: user.pinnedPostId ?? "",
  };
}

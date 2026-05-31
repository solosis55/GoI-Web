import { store } from "./store.js";
import {
  canViewFullProfile as canViewFullProfileImpl,
  getMutualFollowerPreviews as getMutualPreviews,
  mapSocialPreview as mapPreview,
  isFollowing as isFollowingImpl,
} from "./profileVisibility.js";

export {
  canViewBioSection,
  canViewProfilePreview,
  canViewProfileShell,
  canViewSessionsSection,
  canViewSocialLists,
  canViewStatsSection,
  getFollowStatus,
  getProfileRestrictionLevel,
  isProfileDiscoverable,
  shouldRequireFollowToInteract,
} from "./profileVisibility.js";

export type { SocialUserPreview } from "./profileVisibility.js";

export function isFollowing(viewerId: string, targetUserId: string): boolean {
  return isFollowingImpl(viewerId, targetUserId);
}

/** Contenido completo del perfil (posts, sesiones, etc.). */
export function canViewFullProfile(viewerId: string, targetUserId: string): boolean {
  return canViewFullProfileImpl(viewerId, targetUserId);
}

export function getFollowerIds(userId: string): string[] {
  return store.follows
    .filter((f) => f.followingId === userId && f.status !== "pending")
    .map((f) => f.followerId);
}

export function getFollowingIds(userId: string): string[] {
  return store.follows
    .filter((f) => f.followerId === userId && f.status !== "pending")
    .map((f) => f.followingId);
}

export function mapSocialPreview(userId: string, viewerId: string) {
  return mapPreview(userId, viewerId);
}

export function getMutualFollowerPreviews(viewerId: string, targetUserId: string, limit = 5) {
  return getMutualPreviews(viewerId, targetUserId, limit);
}

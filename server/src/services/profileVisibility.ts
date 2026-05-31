import { store, type Post, type User } from "./store.js";

export type ProfileVisibilityMode = "public" | "followers" | "private" | "request";
export type SectionVisibility = "public" | "followers" | "private";
export type StatsSectionVisibility = "public" | "followers" | "hidden";

export type ProfileSectionSettings = {
  bio: SectionVisibility;
  stats: StatsSectionVisibility;
  sessions: SectionVisibility;
  socialLists: StatsSectionVisibility;
};

export type FollowStatus = "none" | "pending" | "active";

export const DEFAULT_PROFILE_SECTIONS: ProfileSectionSettings = {
  bio: "public",
  stats: "public",
  sessions: "followers",
  socialLists: "followers",
};

export function normalizeProfileVisibility(raw: unknown): ProfileVisibilityMode {
  if (raw === "followers" || raw === "private" || raw === "request") return raw;
  return "public";
}

export function normalizeProfileSections(raw: unknown): ProfileSectionSettings {
  const base = { ...DEFAULT_PROFILE_SECTIONS };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const pickSection = (v: unknown, allowed: string[]): string =>
    typeof v === "string" && allowed.includes(v) ? v : "";

  const bio = pickSection(o.bio, ["public", "followers", "private"]);
  if (bio) base.bio = bio as SectionVisibility;

  const sessions = pickSection(o.sessions, ["public", "followers", "private"]);
  if (sessions) base.sessions = sessions as SectionVisibility;

  const stats = pickSection(o.stats, ["public", "followers", "hidden"]);
  if (stats) base.stats = stats as StatsSectionVisibility;

  const socialLists = pickSection(o.socialLists, ["public", "followers", "hidden"]);
  if (socialLists) base.socialLists = socialLists as StatsSectionVisibility;

  return base;
}

export function normalizeDefaultPostVisibility(raw: unknown): Post["visibility"] {
  if (raw === "followers" || raw === "private") return raw;
  return "public";
}

export function isBlockedBetween(a: string, b: string): boolean {
  if (!a || !b) return false;
  return store.userBlocks.some(
    (row) =>
      (row.blockerId === a && row.blockedId === b) || (row.blockerId === b && row.blockedId === a),
  );
}

export function getFollowRow(followerId: string, followingId: string) {
  return store.follows.find((f) => f.followerId === followerId && f.followingId === followingId);
}

export function getFollowStatus(viewerId: string, targetUserId: string): FollowStatus {
  const row = getFollowRow(viewerId, targetUserId);
  if (!row) return "none";
  return row.status === "pending" ? "pending" : "active";
}

export function hasActiveFollow(viewerId: string, targetUserId: string): boolean {
  return getFollowStatus(viewerId, targetUserId) === "active";
}

export function isFollowing(viewerId: string, targetUserId: string): boolean {
  return hasActiveFollow(viewerId, targetUserId);
}

export function isProfileDiscoverable(user: User): boolean {
  if (user.profileVisibility === "private") return false;
  if (user.discoverable === false) return false;
  return user.profileVisibility === "public" || user.profileVisibility === "followers" || user.profileVisibility === "request";
}

/** Perfil visible en absoluto (no bloqueado, no privado total para extraños). */
export function canViewProfileShell(viewerId: string, targetUserId: string): boolean {
  if (!viewerId || !targetUserId) return false;
  if (viewerId === targetUserId) return true;
  if (isBlockedBetween(viewerId, targetUserId)) return false;
  const target = store.users.find((u) => u.id === targetUserId);
  if (!target) return false;
  if (target.profileVisibility === "private") return false;
  return true;
}

export function canViewFullProfile(viewerId: string, targetUserId: string): boolean {
  if (!viewerId || !targetUserId) return false;
  if (viewerId === targetUserId) return true;
  if (!canViewProfileShell(viewerId, targetUserId)) return false;
  const target = store.users.find((u) => u.id === targetUserId);
  if (!target) return false;
  if (target.profileVisibility === "public") return true;
  return hasActiveFollow(viewerId, targetUserId);
}

export function canViewProfilePreview(viewerId: string, targetUserId: string): boolean {
  if (!canViewProfileShell(viewerId, targetUserId)) return false;
  if (viewerId === targetUserId) return false;
  return !canViewFullProfile(viewerId, targetUserId);
}

function sectionAllows(
  viewerId: string,
  target: User,
  level: SectionVisibility | StatsSectionVisibility,
): boolean {
  if (viewerId === target.id) return true;
  if (level === "public") return true;
  if (level === "hidden" || level === "private") return false;
  return hasActiveFollow(viewerId, target.id);
}

export function canViewBioSection(viewerId: string, targetUserId: string): boolean {
  const target = store.users.find((u) => u.id === targetUserId);
  if (!target) return false;
  if (!canViewProfileShell(viewerId, targetUserId) && viewerId !== targetUserId) return false;
  if (viewerId === targetUserId) return true;
  if (!canViewFullProfile(viewerId, targetUserId) && target.profileVisibility !== "public") {
    return canViewProfilePreview(viewerId, targetUserId) && target.profileSections.bio === "public";
  }
  return sectionAllows(viewerId, target, target.profileSections.bio);
}

export function canViewStatsSection(viewerId: string, targetUserId: string): boolean {
  const target = store.users.find((u) => u.id === targetUserId);
  if (!target) return false;
  if (viewerId === targetUserId) return true;
  if (!canViewFullProfile(viewerId, targetUserId)) return false;
  return sectionAllows(viewerId, target, target.profileSections.stats);
}

export function canViewSessionsSection(viewerId: string, targetUserId: string): boolean {
  const target = store.users.find((u) => u.id === targetUserId);
  if (!target) return false;
  if (viewerId === targetUserId) return true;
  if (!canViewFullProfile(viewerId, targetUserId)) return false;
  return sectionAllows(viewerId, target, target.profileSections.sessions);
}

export function canViewSocialLists(viewerId: string, targetUserId: string): boolean {
  const target = store.users.find((u) => u.id === targetUserId);
  if (!target) return false;
  if (viewerId === targetUserId) return true;
  if (!canViewFullProfile(viewerId, targetUserId)) return false;
  return sectionAllows(viewerId, target, target.profileSections.socialLists);
}

export type ProfileRestrictionLevel = "none" | "partial" | "unavailable";

export function getProfileRestrictionLevel(viewerId: string, targetUserId: string): ProfileRestrictionLevel {
  if (viewerId === targetUserId) return "none";
  if (!canViewProfileShell(viewerId, targetUserId)) return "unavailable";
  if (canViewFullProfile(viewerId, targetUserId)) return "none";
  if (canViewProfilePreview(viewerId, targetUserId)) return "partial";
  return "unavailable";
}

export function shouldRequireFollowToInteract(target: User, viewerId: string): boolean {
  if (viewerId === target.id) return false;
  if (target.profileVisibility === "request") return getFollowStatus(viewerId, target.id) !== "active";
  if (target.profileVisibility === "followers") return !hasActiveFollow(viewerId, target.id);
  return false;
}

export type SocialUserPreview = {
  id: string;
  username: string;
  avatarUrl: string;
  isFollowing: boolean;
  followsYou: boolean;
};

export function mapSocialPreview(userId: string, viewerId: string): SocialUserPreview | null {
  const user = store.users.find((u) => u.id === userId);
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl ?? "",
    isFollowing: hasActiveFollow(viewerId, userId),
    followsYou: hasActiveFollow(userId, viewerId),
  };
}

export function getMutualFollowerPreviews(viewerId: string, targetUserId: string, limit = 5): SocialUserPreview[] {
  const targetFollowers = new Set(
    store.follows.filter((f) => f.followingId === targetUserId && f.status !== "pending").map((f) => f.followerId),
  );
  const viewerFollowing = store.follows
    .filter((f) => f.followerId === viewerId && f.status !== "pending")
    .map((f) => f.followingId);
  const mutual: SocialUserPreview[] = [];
  for (const id of viewerFollowing) {
    if (id === targetUserId) continue;
    if (!targetFollowers.has(id)) continue;
    const preview = mapSocialPreview(id, viewerId);
    if (preview) mutual.push(preview);
    if (mutual.length >= limit) break;
  }
  return mutual;
}

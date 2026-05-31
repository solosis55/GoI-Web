import type { Request, Response } from "express";
import { sendError } from "../services/http.js";
import {
  canViewBioSection,
  canViewFullProfile,
  canViewSessionsSection,
  canViewSocialLists,
  canViewStatsSection,
  getFollowerIds,
  getFollowingIds,
  getMutualFollowerPreviews,
  isFollowing,
  mapSocialPreview,
} from "../services/profileAccess.js";
import {
  canViewProfilePreview,
  canViewProfileShell,
  getFollowStatus,
  getProfileRestrictionLevel,
  isBlockedBetween,
} from "../services/profileVisibility.js";
import { getUserPostsPage, mapPostWithInteractions } from "../services/postsForProfile.js";
import { store } from "../services/store.js";
import { sanitizeText } from "../services/validation.js";

const PROFILE_POSTS_PAGE = 24;
const SESSIONS_PAGE_MAX = 40;
const SOCIAL_PAGE_SIZE = 30;
const PREVIEW_POSTS_MAX = 3;

function sanitizeUserForViewer(user: (typeof store.users)[number], viewerUserId: string) {
  const safe = { ...user };
  delete (safe as { password?: string }).password;
  delete (safe as { passwordResetTokenHash?: string }).passwordResetTokenHash;
  delete (safe as { passwordResetExpires?: string }).passwordResetExpires;
  if (viewerUserId !== user.id) {
    delete (safe as { email?: string }).email;
  }
  return safe;
}

function applyBioVisibility(
  user: ReturnType<typeof sanitizeUserForViewer>,
  viewerId: string,
  target: (typeof store.users)[number],
) {
  if (canViewBioSection(viewerId, target.id)) return user;
  return Object.assign({}, user, {
    bio: "",
    goal: target.profileSections.bio === "public" ? target.goal : "",
    location: "",
    websiteUrl: "",
    instagramUrl: "",
    stravaUrl: "",
  });
}

function restrictedProfilePayload(user: (typeof store.users)[number], viewerUserId: string) {
  const base = sanitizeUserForViewer(user, viewerUserId);
  const showGoal = user.profileSections.bio === "public" && Boolean(user.goal?.trim());
  return Object.assign({}, base, {
    bio: "",
    goal: showGoal ? user.goal : "",
    location: "",
    websiteUrl: "",
    instagramUrl: "",
    stravaUrl: "",
    bannerUrl: "",
    pinnedPostId: "",
    restrictedToFollowers: true,
  });
}

function unavailableProfilePayload(user: (typeof store.users)[number], viewerUserId: string) {
  const base = sanitizeUserForViewer(user, viewerUserId);
  return Object.assign({}, base, {
    bio: "",
    goal: "",
    location: "",
    websiteUrl: "",
    instagramUrl: "",
    stravaUrl: "",
    bannerUrl: "",
    avatarUrl: user.avatarUrl ?? "",
    pinnedPostId: "",
    restrictedToFollowers: true,
    profileUnavailable: true,
  });
}

function sessionsForUser(targetUserId: string, limit: number) {
  const workoutById = new Map(store.workouts.map((w) => [w.id, w]));
  return store.workoutSessions
    .filter((s) => s.userId === targetUserId)
    .sort((a, b) => Date.parse(b.performedAt) - Date.parse(a.performedAt))
    .slice(0, limit)
    .map((s) => {
      const w = workoutById.get(s.workoutId);
      return {
        ...s,
        workoutTitle: w?.title ?? "Rutina",
      };
    });
}

function workoutTitlesForUser(targetUserId: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const w of store.workouts) {
    if (w.userId === targetUserId) map[w.id] = w.title;
  }
  return map;
}

function countPostsForViewer(viewerId: string, targetUserId: string) {
  const all = store.posts.filter((p) => p.userId === targetUserId);
  const visible = all.filter((p) => {
    if (p.userId === viewerId) return true;
    if (p.visibility === "public") return true;
    if (p.visibility === "followers") {
      return store.follows.some(
        (f) => f.followerId === viewerId && f.followingId === targetUserId && f.status !== "pending",
      );
    }
    return false;
  });
  return { total: all.length, visible: visible.length };
}

function previewPostsForViewer(viewerId: string, targetUserId: string) {
  const sorted = store.posts
    .filter((p) => p.userId === targetUserId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, PREVIEW_POSTS_MAX);

  return sorted.map((p) => {
    const mapped = mapPostWithInteractions(p, viewerId);
    return {
      id: mapped.id,
      userId: mapped.userId,
      visibility: mapped.visibility,
      createdAt: mapped.createdAt,
      media: mapped.media?.slice(0, 1) ?? [],
      content: "",
      authorUsername: mapped.authorUsername,
      authorAvatarUrl: mapped.authorAvatarUrl,
      previewOnly: true,
    };
  });
}

export function getPublicProfileOverview(req: Request, res: Response) {
  const viewerId = String(res.locals.authUserId ?? "");
  if (!viewerId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }

  const targetUserId = sanitizeText(req.params.userId);
  const target = store.users.find((u) => u.id === targetUserId);
  if (!target) {
    sendError(res, 404, "AUTH_USER_NOT_FOUND", "user not found");
    return;
  }

  const blocked = isBlockedBetween(viewerId, targetUserId);
  const restrictionLevel = blocked ? "unavailable" : getProfileRestrictionLevel(viewerId, targetUserId);
  const canView = !blocked && canViewFullProfile(viewerId, targetUserId);
  const canPreview = !blocked && canViewProfilePreview(viewerId, targetUserId);
  const restricted = restrictionLevel !== "none" && viewerId !== targetUserId;

  let user;
  if (blocked || restrictionLevel === "unavailable") {
    user = unavailableProfilePayload(target, viewerId);
  } else if (canView) {
    user = applyBioVisibility(sanitizeUserForViewer(target, viewerId), viewerId, target);
  } else if (canPreview) {
    user = restrictedProfilePayload(target, viewerId);
  } else {
    user = unavailableProfilePayload(target, viewerId);
  }

  const followStatus = getFollowStatus(viewerId, targetUserId);
  const following = followStatus === "active";
  const followPending = followStatus === "pending";
  const followsYou = isFollowing(targetUserId, viewerId);

  const postCounts = countPostsForViewer(viewerId, targetUserId);
  const postsHiddenByVisibility = postCounts.total > postCounts.visible;

  const posts = canView
    ? getUserPostsPage(viewerId, targetUserId, PROFILE_POSTS_PAGE, null)
    : { posts: [], nextCursor: null, total: postCounts.total };

  const previewPosts = canPreview ? previewPostsForViewer(viewerId, targetUserId) : [];

  const sessions = canView && canViewSessionsSection(viewerId, targetUserId)
    ? sessionsForUser(targetUserId, SESSIONS_PAGE_MAX)
    : [];
  const workoutTitles = canView ? workoutTitlesForUser(targetUserId) : {};

  const showFollowerCount = canViewSocialLists(viewerId, targetUserId);
  const followerCount = showFollowerCount ? getFollowerIds(targetUserId).length : 0;
  const followingCount = showFollowerCount ? getFollowingIds(targetUserId).length : 0;

  const mutualFollowers =
    canViewProfileShell(viewerId, targetUserId) && !blocked
      ? getMutualFollowerPreviews(viewerId, targetUserId, 5)
      : [];

  res.json({
    user,
    restricted,
    restrictionLevel: blocked ? "unavailable" : restrictionLevel,
    blocked,
    following,
    followPending,
    followsYou,
    followerCount,
    followingCount,
    mutualFollowers,
    posts,
    previewPosts,
    postCountVisible: postCounts.visible,
    postCountTotal: postCounts.total,
    postsHiddenByVisibility,
    sessions,
    workoutTitles,
    sectionAccess: {
      bio: canViewBioSection(viewerId, targetUserId),
      stats: canViewStatsSection(viewerId, targetUserId),
      sessions: canViewSessionsSection(viewerId, targetUserId),
      socialLists: canViewSocialLists(viewerId, targetUserId),
    },
  });
}

function paginateSocialIds(ids: string[], cursor: string | undefined, limit: number) {
  let start = 0;
  if (cursor) {
    const idx = ids.indexOf(cursor);
    start = idx === -1 ? ids.length : idx + 1;
  }
  const slice = ids.slice(start, start + limit);
  const nextCursor = start + slice.length < ids.length && slice.length > 0 ? slice[slice.length - 1]! : null;
  return { slice, nextCursor, total: ids.length };
}

export function listProfileSocial(req: Request, res: Response) {
  const viewerId = String(res.locals.authUserId ?? "");
  if (!viewerId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }

  const targetUserId = sanitizeText(req.params.userId);
  const kind = sanitizeText(req.params.kind);
  if (kind !== "followers" && kind !== "following") {
    sendError(res, 400, "PROFILE_INVALID_INPUT", "kind must be followers or following");
    return;
  }

  const target = store.users.find((u) => u.id === targetUserId);
  if (!target) {
    sendError(res, 404, "AUTH_USER_NOT_FOUND", "user not found");
    return;
  }

  if (!canViewSocialLists(viewerId, targetUserId)) {
    sendError(res, 403, "PROFILE_FORBIDDEN", "social list is restricted");
    return;
  }

  const limitRaw = req.query.limit;
  let limit = parseInt(String(Array.isArray(limitRaw) ? limitRaw[0] : limitRaw ?? SOCIAL_PAGE_SIZE), 10);
  if (!Number.isFinite(limit)) limit = SOCIAL_PAGE_SIZE;
  limit = Math.min(50, Math.max(1, limit));

  const cursor =
    typeof req.query.cursor === "string"
      ? req.query.cursor.trim()
      : Array.isArray(req.query.cursor) && typeof req.query.cursor[0] === "string"
        ? req.query.cursor[0].trim()
        : undefined;

  const allIds = kind === "followers" ? getFollowerIds(targetUserId) : getFollowingIds(targetUserId);
  const { slice, nextCursor, total } = paginateSocialIds(allIds, cursor || undefined, limit);

  const users = [];
  for (const id of slice) {
    const preview = mapSocialPreview(id, viewerId);
    if (preview) users.push(preview);
  }

  res.json({ users, nextCursor, total });
}

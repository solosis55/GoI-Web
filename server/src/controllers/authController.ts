import { createHash, randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { createId, saveStore, store, User } from "../services/store.js";
import { hashPassword, signAuthToken, verifyPassword } from "../services/auth.js";
import { sendError } from "../services/http.js";
import { buildPublicAssetUrl, tryRemoveOldProfileUpload } from "../services/profileUploads.js";
import { isValidProfileAvatarUrlCandidate } from "../services/postMedia.js";
import {
  isValidProfileBannerUrl,
  normalizeInstagramProfileUrl,
  normalizeProfileLocation,
  normalizeStravaProfileUrl,
  normalizeWebsiteProfileUrl,
} from "../services/profileFields.js";
import { isLengthBetween, normalizeEmail, sanitizeText } from "../services/validation.js";
import { createProfileImageUploader } from "../middleware/profileImageUpload.js";
import { canViewFullProfile } from "../services/profileAccess.js";
import { mapRankedToDiscoverDto } from "../services/discoverDto.js";
import { parseDiscoverFacet, rankDiscoverForViewer } from "./socialController.js";
import { checkFollowRateLimit } from "../services/followRateLimit.js";
import {
  DEFAULT_PROFILE_SECTIONS,
  isBlockedBetween,
  normalizeDefaultPostVisibility,
  normalizeProfileSections,
  normalizeProfileVisibility,
} from "../services/profileVisibility.js";

type AuthPayload = {
  email?: string;
  password?: string;
  username?: string;
};

type UpdateProfilePayload = {
  username?: string;
  bio?: string;
  goal?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bannerShowInFeed?: boolean;
  websiteUrl?: string;
  instagramUrl?: string;
  stravaUrl?: string;
  location?: string;
  profileVisibility?: string;
  profileSections?: unknown;
  discoverable?: boolean;
  requireAuthToView?: boolean;
  defaultPostVisibility?: string;
  pinnedPostId?: string | null;
};

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function sanitizeUser(user: User) {
  const safeUser = { ...user };
  delete (safeUser as Partial<User>).password;
  delete (safeUser as Partial<User>).passwordResetTokenHash;
  delete (safeUser as Partial<User>).passwordResetExpires;
  return safeUser;
}

/** Sin email cuando el observador no es el propio usuario. */
function sanitizeUserForViewer(user: User, viewerUserId: string) {
  const safe = sanitizeUser(user);
  if (viewerUserId === user.id) return safe;
  const publicFields = { ...safe };
  delete (publicFields as { email?: string }).email;
  return publicFields;
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function requestPasswordReset(req: Request, res: Response) {
  const { email } = req.body as { email?: string };
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    sendError(res, 400, "AUTH_FORGOT_PASSWORD_INVALID_INPUT", "email is required");
    return;
  }

  const user = store.users.find((item) => item.email.toLowerCase() === normalizedEmail);
  const message =
    "Si el correo está registrado, puedes completar el cambio de contraseña siguiendo las instrucciones enviadas (revisa también spam).";

  if (user) {
    const token = randomBytes(32).toString("hex");
    user.passwordResetTokenHash = hashResetToken(token);
    user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString();
    user.updatedAt = new Date().toISOString();
    saveStore();

    if (process.env.AUTH_RESET_RETURN_TOKEN === "true") {
      res.json({ message, devResetToken: token });
      return;
    }
  }

  res.json({ message });
}

export async function resetPasswordWithToken(req: Request, res: Response) {
  const { token, password } = req.body as { token?: string; password?: string };

  if (!token || typeof token !== "string" || !password || password.length < 6) {
    sendError(res, 400, "AUTH_RESET_INVALID_INPUT", "token and password (min 6 chars) are required");
    return;
  }

  const tokenHash = hashResetToken(token);
  const now = new Date();
  const user = store.users.find(
    (item) =>
      item.passwordResetTokenHash === tokenHash &&
      item.passwordResetExpires &&
      new Date(item.passwordResetExpires) > now
  );

  if (!user) {
    sendError(res, 400, "AUTH_RESET_TOKEN_INVALID", "invalid or expired reset link");
    return;
  }

  user.password = await hashPassword(password);
  delete user.passwordResetTokenHash;
  delete user.passwordResetExpires;
  user.updatedAt = new Date().toISOString();
  saveStore();

  res.json({ message: "password updated" });
}

export async function register(req: Request, res: Response) {
  const { email, password, username } = req.body as AuthPayload;
  const normalizedEmail = normalizeEmail(email);
  const normalizedUsername = sanitizeText(username);

  if (!normalizedEmail || !password || !isLengthBetween(normalizedUsername, 3, 24) || password.length < 6) {
    sendError(res, 400, "AUTH_REGISTER_INVALID_INPUT", "username, email and password are required");
    return;
  }

  const exists = store.users.some((user) => user.email.toLowerCase() === normalizedEmail);
  if (exists) {
    sendError(res, 409, "AUTH_EMAIL_IN_USE", "email already in use");
    return;
  }

  const passwordHash = await hashPassword(password);
  const user: User = {
    id: createId(),
    username: normalizedUsername,
    email: normalizedEmail,
    password: passwordHash,
    bio: "",
    goal: "",
    avatarUrl: "",
    bannerUrl: "",
    bannerShowInFeed: true,
    websiteUrl: "",
    instagramUrl: "",
    stravaUrl: "",
    location: "",
    profileVisibility: "public",
    profileSections: { ...DEFAULT_PROFILE_SECTIONS },
    discoverable: true,
    requireAuthToView: false,
    defaultPostVisibility: "public",
    pinnedPostId: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.users.push(user);
  saveStore();
  const safe = sanitizeUser(user);
  res.status(201).json({
    message: "user registered",
    user: safe,
    token: signAuthToken(user.id),
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as AuthPayload;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    sendError(res, 400, "AUTH_LOGIN_INVALID_INPUT", "email and password are required");
    return;
  }

  const user = store.users.find((item) => item.email.toLowerCase() === normalizedEmail);
  if (!user) {
    sendError(res, 401, "AUTH_INVALID_CREDENTIALS", "invalid credentials");
    return;
  }

  let isValid = await verifyPassword(password, user.password);
  // Backward compatibility for users created before hashing migration.
  if (!isValid && user.password === password) {
    user.password = await hashPassword(password);
    saveStore();
    isValid = true;
  }
  if (!isValid) {
    sendError(res, 401, "AUTH_INVALID_CREDENTIALS", "invalid credentials");
    return;
  }

  res.json({
    message: "login successful",
    user: sanitizeUser(user),
    token: signAuthToken(user.id),
  });
}

export function getProfile(req: Request, res: Response) {
  const authUserId = String(res.locals.authUserId ?? "");
  if (!authUserId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }

  const { userId } = req.params;
  const user = store.users.find((item) => item.id === userId);

  if (!user) {
    sendError(res, 404, "AUTH_USER_NOT_FOUND", "user not found");
    return;
  }

  const isOwner = authUserId === user.id;
  const payload = sanitizeUserForViewer(user, authUserId);

  if (!isOwner && user.profileVisibility === "followers") {
    const canSee = store.follows.some((f) => f.followerId === authUserId && f.followingId === user.id);
    if (!canSee) {
      res.json({
        user: Object.assign({}, payload, {
          bio: "",
          goal: "",
          location: "",
          websiteUrl: "",
          instagramUrl: "",
          stravaUrl: "",
          bannerUrl: "",
          pinnedPostId: "",
          restrictedToFollowers: true,
        }),
      });
      return;
    }
  }

  res.json({ user: payload });
}

export function updateProfile(req: Request, res: Response) {
  const { userId } = req.params;
  const authUserId = String(res.locals.authUserId ?? "");
  if (!authUserId || authUserId !== userId) {
    sendError(res, 403, "AUTH_FORBIDDEN", "forbidden");
    return;
  }
  const {
    username,
    bio,
    goal,
    avatarUrl,
    bannerUrl,
    bannerShowInFeed,
    websiteUrl,
    instagramUrl,
    stravaUrl,
    location,
    profileVisibility,
    profileSections,
    discoverable,
    requireAuthToView,
    defaultPostVisibility,
    pinnedPostId,
  } = req.body as UpdateProfilePayload;
  const user = store.users.find((item) => item.id === userId);

  if (!user) {
    sendError(res, 404, "AUTH_USER_NOT_FOUND", "user not found");
    return;
  }

  if (username !== undefined) {
    const normalizedUsername = sanitizeText(username);
    if (!isLengthBetween(normalizedUsername, 3, 24)) {
      sendError(res, 400, "AUTH_PROFILE_INVALID_INPUT", "username must have 3 to 24 characters");
      return;
    }
    user.username = normalizedUsername;
  }

  if (bio !== undefined) {
    const normalizedBio = sanitizeText(bio);
    if (normalizedBio.length > 200) {
      sendError(res, 400, "AUTH_PROFILE_INVALID_INPUT", "bio is too long");
      return;
    }
    user.bio = normalizedBio;
  }

  if (goal !== undefined) {
    const normalizedGoal = sanitizeText(goal);
    if (normalizedGoal.length > 60) {
      sendError(res, 400, "AUTH_PROFILE_INVALID_INPUT", "goal is too long");
      return;
    }
    user.goal = normalizedGoal;
  }

  if (avatarUrl !== undefined) {
    const normalizedAvatarUrl = sanitizeText(avatarUrl);
    if (normalizedAvatarUrl && !isValidProfileAvatarUrlCandidate(normalizedAvatarUrl)) {
      sendError(
        res,
        400,
        "AUTH_PROFILE_INVALID_INPUT",
        "avatar must be http(s) URL or image data URL (jpeg/png/webp)",
      );
      return;
    }
    const prevAvatar = user.avatarUrl;
    if (prevAvatar !== normalizedAvatarUrl) {
      tryRemoveOldProfileUpload(prevAvatar, userId, "avatars");
    }
    user.avatarUrl = normalizedAvatarUrl;
  }

  if (bannerUrl !== undefined) {
    const b = sanitizeText(bannerUrl);
    if (b && !isValidProfileBannerUrl(b)) {
      sendError(res, 400, "AUTH_PROFILE_INVALID_INPUT", "banner must be https URL or image data URL (jpeg/png/webp)");
      return;
    }
    const prevBanner = user.bannerUrl;
    if (prevBanner !== b) {
      tryRemoveOldProfileUpload(prevBanner, userId, "banners");
    }
    user.bannerUrl = b;
  }

  if (bannerShowInFeed !== undefined) {
    user.bannerShowInFeed = Boolean(bannerShowInFeed);
  }

  if (websiteUrl !== undefined) {
    const w = normalizeWebsiteProfileUrl(websiteUrl);
    if (w === null) {
      sendError(res, 400, "AUTH_PROFILE_INVALID_INPUT", "website must be empty or a valid https URL");
      return;
    }
    user.websiteUrl = w;
  }

  if (instagramUrl !== undefined) {
    const ig = normalizeInstagramProfileUrl(instagramUrl);
    if (ig === null) {
      sendError(res, 400, "AUTH_PROFILE_INVALID_INPUT", "instagram must be empty, @usuario, or https on instagram.com");
      return;
    }
    user.instagramUrl = ig;
  }

  if (stravaUrl !== undefined) {
    const st = normalizeStravaProfileUrl(stravaUrl);
    if (st === null) {
      sendError(res, 400, "AUTH_PROFILE_INVALID_INPUT", "strava must be empty or a valid https URL on strava.com");
      return;
    }
    user.stravaUrl = st;
  }

  if (location !== undefined) {
    user.location = normalizeProfileLocation(location);
  }

  if (profileVisibility !== undefined) {
    user.profileVisibility = normalizeProfileVisibility(sanitizeText(profileVisibility));
  }

  if (profileSections !== undefined) {
    user.profileSections = normalizeProfileSections(profileSections);
  }

  if (discoverable !== undefined) {
    user.discoverable = Boolean(discoverable);
  }

  if (requireAuthToView !== undefined) {
    user.requireAuthToView = Boolean(requireAuthToView);
  }

  if (defaultPostVisibility !== undefined) {
    user.defaultPostVisibility = normalizeDefaultPostVisibility(sanitizeText(defaultPostVisibility));
  }

  if (pinnedPostId !== undefined) {
    const pin = pinnedPostId === null || pinnedPostId === "" ? "" : sanitizeText(String(pinnedPostId));
    if (pin) {
      const post = store.posts.find((p) => p.id === pin);
      if (!post || post.userId !== userId) {
        sendError(res, 400, "AUTH_PROFILE_INVALID_INPUT", "pinned post must be one of your posts");
        return;
      }
    }
    user.pinnedPostId = pin;
  }

  user.updatedAt = new Date().toISOString();

  saveStore();
  res.json({
    message: "profile updated",
    user: sanitizeUser(user),
  });
}

export function handleProfileImageMulter(upload: ReturnType<typeof createProfileImageUploader>) {
  return (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, (err: unknown) => {
      if (!err) {
        next();
        return;
      }
      if (err instanceof MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          sendError(res, 413, "PROFILE_IMAGE_TOO_LARGE", "max size is 2 MB");
          return;
        }
        sendError(res, 400, "PROFILE_IMAGE_INVALID", err.message);
        return;
      }
      const msg = err instanceof Error ? err.message : "invalid file";
      sendError(res, 400, "PROFILE_IMAGE_INVALID", msg);
    });
  };
}

export function uploadProfileAvatarFile(req: Request, res: Response) {
  const authUserId = String(res.locals.authUserId ?? "");
  const { userId } = req.params;
  if (!authUserId || authUserId !== userId) {
    sendError(res, 403, "AUTH_FORBIDDEN", "forbidden");
    return;
  }
  const file = (req as Request & { file?: { filename: string } }).file;
  if (!file) {
    sendError(res, 400, "PROFILE_IMAGE_MISSING", 'expected multipart field "file"');
    return;
  }
  const pathname = `/uploads/avatars/${file.filename}`;
  res.json({ url: buildPublicAssetUrl(req, pathname) });
}

export function uploadProfileBannerFile(req: Request, res: Response) {
  const authUserId = String(res.locals.authUserId ?? "");
  const { userId } = req.params;
  if (!authUserId || authUserId !== userId) {
    sendError(res, 403, "AUTH_FORBIDDEN", "forbidden");
    return;
  }
  const file = (req as Request & { file?: { filename: string } }).file;
  if (!file) {
    sendError(res, 400, "PROFILE_IMAGE_MISSING", 'expected multipart field "file"');
    return;
  }
  const pathname = `/uploads/banners/${file.filename}`;
  res.json({ url: buildPublicAssetUrl(req, pathname) });
}

export function listUsers(req: Request, res: Response) {
  const currentUserId = String(res.locals.authUserId ?? "");
  if (!currentUserId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }
  const users = store.users
    .filter((user) => user.id !== currentUserId)
    .map((user) => {
      const isFollowing = store.follows.some(
        (follow) => follow.followerId === currentUserId && follow.followingId === user.id
      );
      return {
        ...sanitizeUserForViewer(user, currentUserId),
        isFollowing,
      };
    });

  res.json({ users });
}

export function discoverUsers(req: Request, res: Response) {
  const currentUserId = String(res.locals.authUserId ?? "");
  if (!currentUserId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }

  const limitRaw = Number(req.query.limit);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 48) : 24;
  const offsetRaw = Number(req.query.offset);
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;

  const facetRaw = typeof req.query.facet === "string" ? req.query.facet : "all";
  const facet = parseDiscoverFacet(facetRaw);

  const ranked = rankDiscoverForViewer(currentUserId, facet);
  const page = ranked.slice(offset, offset + limit);
  const nextOffset = offset + limit < ranked.length ? offset + limit : null;

  const users = page.map((row) => mapRankedToDiscoverDto(row, currentUserId));

  res.json({ users, nextOffset, total: ranked.length, facet });
}

export function getFollowing(req: Request, res: Response) {
  const { userId } = req.params;
  const authUserId = String(res.locals.authUserId ?? "");
  if (!authUserId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }
  if (authUserId !== userId && !canViewFullProfile(authUserId, userId)) {
    sendError(res, 403, "AUTH_FORBIDDEN", "forbidden");
    return;
  }
  const followingIds = store.follows
    .filter((follow) => follow.followerId === userId)
    .map((follow) => follow.followingId);
  res.json({ followingIds });
}

/** Usuarios que siguen a `userId` (son `followerId` con `followingId === userId`). */
export function getFollowers(req: Request, res: Response) {
  const { userId } = req.params;
  const authUserId = String(res.locals.authUserId ?? "");
  if (!authUserId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }
  if (authUserId !== userId && !canViewFullProfile(authUserId, userId)) {
    sendError(res, 403, "AUTH_FORBIDDEN", "forbidden");
    return;
  }
  const followerIds = store.follows
    .filter((follow) => follow.followingId === userId && follow.status !== "pending")
    .map((follow) => follow.followerId);
  res.json({ followerIds });
}

export function toggleFollow(req: Request, res: Response) {
  const targetUserId = String(req.params.targetUserId);
  const followerId = String(res.locals.authUserId ?? "");
  if (!followerId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }
  if (followerId === targetUserId) {
    sendError(res, 400, "AUTH_CANNOT_FOLLOW_SELF", "cannot follow yourself");
    return;
  }

  const followerExists = store.users.some((user) => user.id === followerId);
  const targetExists = store.users.some((user) => user.id === targetUserId);
  if (!followerExists || !targetExists) {
    sendError(res, 404, "AUTH_USER_NOT_FOUND", "user not found");
    return;
  }

  if (isBlockedBetween(followerId, targetUserId)) {
    sendError(res, 403, "AUTH_FORBIDDEN", "cannot follow this user");
    return;
  }

  const target = store.users.find((u) => u.id === targetUserId)!;
  if (target.profileVisibility === "private") {
    sendError(res, 403, "AUTH_CANNOT_FOLLOW_PRIVATE", "profile is private");
    return;
  }

  const existingIndex = store.follows.findIndex(
    (follow) => follow.followerId === followerId && follow.followingId === targetUserId,
  );
  if (existingIndex >= 0) {
    store.follows.splice(existingIndex, 1);
    saveStore();
    res.json({ following: false, pending: false, status: "none" });
    return;
  }

  if (!checkFollowRateLimit(followerId)) {
    sendError(res, 429, "AUTH_RATE_LIMIT", "too many follow actions, try later");
    return;
  }

  const needsApproval = target.profileVisibility === "request";
  store.follows.push({
    id: createId(),
    followerId,
    followingId: targetUserId,
    createdAt: new Date().toISOString(),
    status: needsApproval ? "pending" : "active",
  });
  saveStore();
  if (needsApproval) {
    res.json({ following: false, pending: true, status: "pending" });
    return;
  }
  res.json({ following: true, pending: false, status: "active" });
}

export function respondFollowRequest(req: Request, res: Response) {
  const ownerId = String(res.locals.authUserId ?? "");
  const requesterId = String(req.params.requesterId ?? "");
  const action = sanitizeText((req.body as { action?: string }).action);

  if (!ownerId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }
  if (action !== "accept" && action !== "reject") {
    sendError(res, 400, "AUTH_INVALID_INPUT", "action must be accept or reject");
    return;
  }

  const idx = store.follows.findIndex(
    (f) => f.followerId === requesterId && f.followingId === ownerId && f.status === "pending",
  );
  if (idx < 0) {
    sendError(res, 404, "AUTH_FOLLOW_REQUEST_NOT_FOUND", "request not found");
    return;
  }

  if (action === "reject") {
    store.follows.splice(idx, 1);
  } else {
    store.follows[idx]!.status = "active";
  }
  saveStore();
  res.json({ ok: true, action });
}

export function toggleBlockUser(req: Request, res: Response) {
  const blockerId = String(res.locals.authUserId ?? "");
  const blockedId = String(req.params.targetUserId ?? "");
  if (!blockerId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }
  if (blockerId === blockedId) {
    sendError(res, 400, "AUTH_INVALID_INPUT", "cannot block yourself");
    return;
  }
  if (!store.users.some((u) => u.id === blockedId)) {
    sendError(res, 404, "AUTH_USER_NOT_FOUND", "user not found");
    return;
  }

  const idx = store.userBlocks.findIndex((b) => b.blockerId === blockerId && b.blockedId === blockedId);
  if (idx >= 0) {
    store.userBlocks.splice(idx, 1);
    saveStore();
    res.json({ blocked: false });
    return;
  }

  store.follows = store.follows.filter(
    (f) =>
      !(
        (f.followerId === blockerId && f.followingId === blockedId) ||
        (f.followerId === blockedId && f.followingId === blockerId)
      ),
  );

  store.userBlocks.push({
    id: createId(),
    blockerId,
    blockedId,
    createdAt: new Date().toISOString(),
  });
  saveStore();
  res.json({ blocked: true });
}

export function listPendingFollowRequests(req: Request, res: Response) {
  const userId = String(res.locals.authUserId ?? "");
  if (!userId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }
  const requests = store.follows
    .filter((f) => f.followingId === userId && f.status === "pending")
    .map((f) => {
      const u = store.users.find((user) => user.id === f.followerId);
      return {
        requesterId: f.followerId,
        username: u?.username ?? "Usuario",
        avatarUrl: u?.avatarUrl ?? "",
        createdAt: f.createdAt,
      };
    });
  res.json({ requests });
}

export function listSentFollowRequests(req: Request, res: Response) {
  const userId = String(res.locals.authUserId ?? "");
  if (!userId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }
  const requests = store.follows
    .filter((f) => f.followerId === userId && f.status === "pending")
    .map((f) => {
      const u = store.users.find((user) => user.id === f.followingId);
      return {
        targetUserId: f.followingId,
        username: u?.username ?? "Usuario",
        avatarUrl: u?.avatarUrl ?? "",
        createdAt: f.createdAt,
      };
    });
  res.json({ requests });
}

export function listBlockedUsers(req: Request, res: Response) {
  const userId = String(res.locals.authUserId ?? "");
  if (!userId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }
  const blockedIds = store.userBlocks.filter((b) => b.blockerId === userId).map((b) => b.blockedId);
  res.json({ blockedIds });
}

export function listBlockedUsersPreviews(req: Request, res: Response) {
  const userId = String(res.locals.authUserId ?? "");
  if (!userId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }
  const users = store.userBlocks
    .filter((b) => b.blockerId === userId)
    .map((b) => {
      const u = store.users.find((user) => user.id === b.blockedId);
      return {
        id: b.blockedId,
        username: u?.username ?? "Usuario",
        avatarUrl: u?.avatarUrl ?? "",
      };
    });
  res.json({ users });
}

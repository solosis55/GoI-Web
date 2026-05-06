import { createHash, randomBytes } from "node:crypto";
import { Request, Response } from "express";
import { createId, saveStore, store, User } from "../services/store.js";
import { hashPassword, signAuthToken, verifyPassword } from "../services/auth.js";
import { sendError } from "../services/http.js";
import { isValidProfileAvatarUrlCandidate } from "../services/postMedia.js";
import { isLengthBetween, normalizeEmail, sanitizeText } from "../services/validation.js";

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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.users.push(user);
  saveStore();
  res.status(201).json({
    message: "user registered",
    user: sanitizeUser(user),
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

  res.json({
    user: sanitizeUserForViewer(user, authUserId),
  });
}

export function updateProfile(req: Request, res: Response) {
  const { userId } = req.params;
  const authUserId = String(res.locals.authUserId ?? "");
  if (!authUserId || authUserId !== userId) {
    sendError(res, 403, "AUTH_FORBIDDEN", "forbidden");
    return;
  }
  const { username, bio, goal, avatarUrl } = req.body as UpdateProfilePayload;
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
    user.avatarUrl = normalizedAvatarUrl;
  }
  user.updatedAt = new Date().toISOString();

  saveStore();
  res.json({
    message: "profile updated",
    user: sanitizeUser(user),
  });
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

export function getFollowing(req: Request, res: Response) {
  const { userId } = req.params;
  const authUserId = String(res.locals.authUserId ?? "");
  if (!authUserId || authUserId !== userId) {
    sendError(res, 403, "AUTH_FORBIDDEN", "forbidden");
    return;
  }
  const followingIds = store.follows
    .filter((follow) => follow.followerId === userId)
    .map((follow) => follow.followingId);
  res.json({ followingIds });
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

  const existingIndex = store.follows.findIndex(
    (follow) => follow.followerId === followerId && follow.followingId === targetUserId
  );
  if (existingIndex >= 0) {
    store.follows.splice(existingIndex, 1);
    saveStore();
    res.json({ following: false });
    return;
  }

  store.follows.push({
    id: createId(),
    followerId,
    followingId: targetUserId,
    createdAt: new Date().toISOString(),
  });
  saveStore();
  res.json({ following: true });
}

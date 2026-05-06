import { Request, Response } from "express";
import { parseStorySlidesFromRequest } from "../services/postMedia.js";
import { sendError } from "../services/http.js";
import { createId, saveStore, store, type StorySlide, type StoryReel } from "../services/store.js";

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

function pruneExpiredStoryReels() {
  const now = Date.now();
  const before = store.storyReels.length;
  store.storyReels = store.storyReels.filter((reel) => new Date(reel.expiresAt).getTime() > now);
  if (store.storyReels.length !== before) saveStore();
}

function followerVisibleUserIds(viewerUserId: string): Set<string> {
  const ids = new Set<string>([viewerUserId]);
  for (const f of store.follows) {
    if (f.followerId === viewerUserId) ids.add(f.followingId);
  }
  return ids;
}

export function createStory(req: Request, res: Response) {
  pruneExpiredStoryReels();
  const authUserId = String(res.locals.authUserId ?? "");
  if (!authUserId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }

  const parsed = parseStorySlidesFromRequest((req.body as { slides?: unknown }).slides);
  if (!parsed) {
    sendError(res, 400, "STORY_INVALID_SLIDES", "invalid slides (1–15 images, jpeg/png/webp)");
    return;
  }

  const userExists = store.users.some((u) => u.id === authUserId);
  if (!userExists) {
    sendError(res, 401, "AUTH_SESSION_STALE", "jwt user id missing from store");
    return;
  }

  const started = Date.now();
  const slides: StorySlide[] = parsed.map((item) => ({
    id: createId(),
    mediaUrl: item.url,
  }));

  const reel: StoryReel = {
    id: createId(),
    userId: authUserId,
    slides,
    createdAt: new Date(started).toISOString(),
    expiresAt: new Date(started + STORY_TTL_MS).toISOString(),
  };

  store.storyReels.push(reel);
  saveStore();
  res.status(201).json({
    reel: {
      id: reel.id,
      userId: reel.userId,
      slides,
      expiresAt: reel.expiresAt,
      createdAt: reel.createdAt,
    },
  });
}

export function listStories(req: Request, res: Response) {
  pruneExpiredStoryReels();
  const authUserId = String(res.locals.authUserId ?? "");
  if (!authUserId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }

  const nowISO = new Date().toISOString();
  const allowedUserIds = followerVisibleUserIds(authUserId);

  const active = store.storyReels.filter((r) => allowedUserIds.has(r.userId) && r.expiresAt > nowISO);

  const byUser = new Map<string, StoryReel[]>();
  for (const reel of active) {
    const list = byUser.get(reel.userId) ?? [];
    list.push(reel);
    byUser.set(reel.userId, list);
  }

  type SlideOut = { id: string; mediaUrl: string; reelId: string };

  const authors = [...byUser.entries()].map(([userId, reels]) => {
    const author = store.users.find((u) => u.id === userId);
    const sortedReels = [...reels].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    const slidesMerged: SlideOut[] = [];
    for (const reel of sortedReels) {
      for (const s of reel.slides) {
        slidesMerged.push({ id: s.id, mediaUrl: s.mediaUrl, reelId: reel.id });
      }
    }
    return {
      userId,
      authorUsername: author?.username ?? "Usuario",
      authorAvatarUrl: author?.avatarUrl ?? "",
      reels: sortedReels.map((r) => ({ createdAt: r.createdAt })),
      slides: slidesMerged,
    };
  });

  authors.sort((a, b) => {
    if (a.userId === authUserId) return -1;
    if (b.userId === authUserId) return 1;
    const ta = Math.max(...a.reels.map((r) => new Date(r.createdAt).getTime()), 0);
    const tb = Math.max(...b.reels.map((r) => new Date(r.createdAt).getTime()), 0);
    return tb - ta;
  });

  const payload = authors.map(({ userId, authorUsername, authorAvatarUrl, slides }) => ({
    userId,
    authorUsername,
    authorAvatarUrl,
    slides: slides.map((s) => ({ id: s.id, mediaUrl: s.mediaUrl, reelId: s.reelId })),
  }));

  res.json({ authors: payload });
}

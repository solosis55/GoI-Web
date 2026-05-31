import type { Request, Response } from "express";
import { sendError } from "../services/http.js";
import { mapRankedToDiscoverDto, mapUserToDiscoverDto } from "../services/discoverDto.js";
import { filterRankedByFacet, type DiscoverFacetParam } from "../services/discoverFacet.js";
import { rankAllDiscoverUsers } from "../services/discoverUsers.js";
import { buildSocialHubPayload } from "../services/socialHub.js";
import { saveStore, store } from "../services/store.js";
import { searchDiscoverableUsers } from "../services/userSearch.js";

const VALID_FACETS = new Set<DiscoverFacetParam>([
  "all",
  "active",
  "trained",
  "sameGoal",
  "nearby",
]);

const VALID_MUTED = new Set(["like", "comment", "follow"]);

export function getSocialHub(req: Request, res: Response) {
  const viewerId = String(res.locals.authUserId ?? "");
  if (!viewerId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }
  const lite = req.query.lite === "1" || req.query.lite === "true";
  res.json(buildSocialHubPayload(viewerId, { lite }));
}

export function listUserPreviews(req: Request, res: Response) {
  const viewerId = String(res.locals.authUserId ?? "");
  if (!viewerId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }
  const raw = typeof req.query.ids === "string" ? req.query.ids : "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 64);
  const users = ids.map((id) => {
    const u = store.users.find((user) => user.id === id);
    return {
      id,
      username: u?.username ?? "Usuario",
      avatarUrl: u?.avatarUrl ?? "",
    };
  });
  res.json({ users });
}

export function searchUsers(req: Request, res: Response) {
  const viewerId = String(res.locals.authUserId ?? "");
  if (!viewerId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }

  const q = typeof req.query.q === "string" ? req.query.q : "";
  const limitRaw = Number(req.query.limit);
  const limit = Number.isFinite(limitRaw) ? limitRaw : 24;

  const matches = searchDiscoverableUsers(viewerId, q, limit);
  res.json({
    users: matches.map((u) => mapUserToDiscoverDto(u, viewerId)),
  });
}

export function getNotificationPrefs(req: Request, res: Response) {
  const userId = String(res.locals.authUserId ?? "");
  if (!userId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }
  const user = store.users.find((u) => u.id === userId);
  if (!user) {
    sendError(res, 404, "AUTH_USER_NOT_FOUND", "user not found");
    return;
  }
  res.json({ prefs: user.notificationPrefs ?? { mutedTypes: [] } });
}

export function putNotificationPrefs(req: Request, res: Response) {
  const userId = String(res.locals.authUserId ?? "");
  if (!userId) {
    sendError(res, 401, "AUTH_UNAUTHORIZED", "unauthorized");
    return;
  }
  const user = store.users.find((u) => u.id === userId);
  if (!user) {
    sendError(res, 404, "AUTH_USER_NOT_FOUND", "user not found");
    return;
  }

  const mutedRaw = (req.body as { mutedTypes?: unknown })?.mutedTypes;
  const mutedTypes = Array.isArray(mutedRaw)
    ? mutedRaw.filter((t): t is "like" | "comment" | "follow" => VALID_MUTED.has(String(t)))
    : [];

  user.notificationPrefs = { mutedTypes };
  user.updatedAt = new Date().toISOString();
  saveStore();
  res.json({ prefs: user.notificationPrefs });
}

export function parseDiscoverFacet(raw: string | undefined): DiscoverFacetParam {
  if (raw && VALID_FACETS.has(raw as DiscoverFacetParam)) {
    return raw as DiscoverFacetParam;
  }
  return "all";
}

export function rankDiscoverForViewer(viewerId: string, facet: DiscoverFacetParam) {
  const viewer = store.users.find((u) => u.id === viewerId);
  if (!viewer) return [];
  const ranked = rankAllDiscoverUsers(viewerId);
  return filterRankedByFacet(ranked, facet, viewer);
}

import { isProfileDiscoverable } from "./profileVisibility.js";
import { store } from "./store.js";

export function searchDiscoverableUsers(
  viewerId: string,
  queryRaw: string,
  limit = 24
): Array<(typeof store.users)[number]> {
  const q = queryRaw.trim().toLowerCase().replace(/^@/, "");
  if (!q) return [];

  const limitClamped = Math.min(Math.max(1, limit), 40);
  const matches: Array<(typeof store.users)[number]> = [];

  for (const user of store.users) {
    if (user.id === viewerId) continue;
    if (!isProfileDiscoverable(user)) continue;
    const username = user.username.toLowerCase();
    if (!username.includes(q)) continue;
    matches.push(user);
    if (matches.length >= limitClamped) break;
  }

  matches.sort((a, b) => {
    const au = a.username.toLowerCase();
    const bu = b.username.toLowerCase();
    const aExact = au === q ? 0 : 1;
    const bExact = bu === q ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    const aStarts = au.startsWith(q) ? 0 : 1;
    const bStarts = bu.startsWith(q) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return au.localeCompare(bu);
  });

  return matches;
}

import type { User } from "./store.js";
import type { RankedDiscoverUser } from "./discoverUsers.js";

export type DiscoverFacetParam = "all" | "active" | "trained" | "sameGoal" | "nearby";

function norm(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isNearby(viewerLocation: string, candidate: User): boolean {
  const a = norm(viewerLocation);
  const b = norm(candidate.location);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function filterRankedByFacet(
  ranked: RankedDiscoverUser[],
  facet: DiscoverFacetParam,
  viewer: User
): RankedDiscoverUser[] {
  if (facet === "all") return ranked;

  const viewerGoal = norm(viewer.goal);

  return ranked.filter((row) => {
    switch (facet) {
      case "active":
        return row.activeThisWeek;
      case "trained":
        return row.trainedThisWeek;
      case "sameGoal":
        return viewerGoal.length > 0 && viewerGoal === norm(row.user.goal);
      case "nearby":
        return isNearby(viewer.location ?? "", row.user);
      default:
        return true;
    }
  });
}

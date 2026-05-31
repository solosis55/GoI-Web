import { rankDiscoverUsers } from "./discoverUsers.js";
import { mapRankedToDiscoverDto } from "./discoverDto.js";
import { getFollowerIds, getFollowingIds, mapSocialPreview } from "./profileAccess.js";
import { buildSocialWeeklySummary } from "./socialWeekly.js";
import { store } from "./store.js";

const DISCOVER_PREVIEW_FULL = 48;
const DISCOVER_PREVIEW_LITE = 12;
const FOLLOWING_PREVIEW = 8;
const FOLLOW_BACK_PREVIEW = 8;

export function buildSocialHubPayload(viewerId: string, opts?: { lite?: boolean }) {
  const discoverLimit = opts?.lite ? DISCOVER_PREVIEW_LITE : DISCOVER_PREVIEW_FULL;
  const ranked = rankDiscoverUsers(viewerId, discoverLimit);
  const discoverUsers = ranked.map((row) => mapRankedToDiscoverDto(row, viewerId));

  const followingIds = getFollowingIds(viewerId);
  const followerIds = getFollowerIds(viewerId);

  const followRequests = store.follows
    .filter((f) => f.followingId === viewerId && f.status === "pending")
    .map((f) => {
      const u = store.users.find((user) => user.id === f.followerId);
      return {
        requesterId: f.followerId,
        username: u?.username ?? "Usuario",
        avatarUrl: u?.avatarUrl ?? "",
        createdAt: f.createdAt,
      };
    });

  const sentRequests = store.follows
    .filter((f) => f.followerId === viewerId && f.status === "pending")
    .map((f) => {
      const u = store.users.find((user) => user.id === f.followingId);
      return {
        targetUserId: f.followingId,
        username: u?.username ?? "Usuario",
        avatarUrl: u?.avatarUrl ?? "",
        createdAt: f.createdAt,
      };
    });

  const followingPreviews = followingIds
    .slice(0, FOLLOWING_PREVIEW)
    .map((id) => mapSocialPreview(id, viewerId))
    .filter((p): p is NonNullable<typeof p> => p != null);

  const followerPreviews = followerIds
    .slice(0, FOLLOW_BACK_PREVIEW)
    .map((id) => mapSocialPreview(id, viewerId))
    .filter((p): p is NonNullable<typeof p> => p != null);

  const followBackPreviews = followerPreviews.filter((p) => !p.isFollowing);

  const blockedIds = store.userBlocks
    .filter((b) => b.blockerId === viewerId)
    .map((b) => b.blockedId);

  const weekly = buildSocialWeeklySummary(viewerId);

  const weeklyLeaders = weekly.leaders.map((l) => ({
    id: l.userId,
    username: l.username,
    avatarUrl: l.avatarUrl,
    sessionsThisWeek: l.sessionsThisWeek,
  }));

  return {
    discoverUsers,
    followingIds,
    followerIds,
    followRequests,
    sentRequests,
    followingPreviews,
    followersTotal: followerIds.length,
    followingTotal: followingIds.length,
    blockedIds,
    followBackPreviews,
    weekly: {
      mySessionsWeek: weekly.mySessionsWeek,
      followingActiveWeek: weekly.followingActiveWeek,
      leaders: weeklyLeaders,
    },
  };
}

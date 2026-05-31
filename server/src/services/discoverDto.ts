import { store } from "./store.js";
import type { RankedDiscoverUser } from "./discoverUsers.js";
import type { User } from "./store.js";

function sanitizeUserForViewer(user: User, currentUserId: string) {
  const safe = { ...user };
  delete (safe as { password?: string }).password;
  delete (safe as { passwordResetTokenHash?: string }).passwordResetTokenHash;
  delete (safe as { passwordResetExpires?: string }).passwordResetExpires;
  if (currentUserId !== user.id) {
    delete (safe as { email?: string }).email;
  }
  return safe;
}

export function mapRankedToDiscoverDto(row: RankedDiscoverUser, currentUserId: string) {
  const isFollowing = store.follows.some(
    (follow) =>
      follow.followerId === currentUserId &&
      follow.followingId === row.user.id &&
      follow.status !== "pending"
  );
  const followPending = store.follows.some(
    (follow) =>
      follow.followerId === currentUserId &&
      follow.followingId === row.user.id &&
      follow.status === "pending"
  );
  return {
    ...sanitizeUserForViewer(row.user, currentUserId),
    isFollowing,
    followPending,
    mutualCount: row.mutualCount,
    mutualPreview: row.mutualPreview,
    reason: row.reason,
    activeThisWeek: row.activeThisWeek,
    trainedThisWeek: row.trainedThisWeek,
  };
}

export function mapUserToDiscoverDto(user: User, currentUserId: string) {
  const isFollowing = store.follows.some(
    (follow) =>
      follow.followerId === currentUserId &&
      follow.followingId === user.id &&
      follow.status !== "pending"
  );
  const followPending = store.follows.some(
    (follow) =>
      follow.followerId === currentUserId &&
      follow.followingId === user.id &&
      follow.status === "pending"
  );
  return {
    ...sanitizeUserForViewer(user, currentUserId),
    isFollowing,
    followPending,
    mutualCount: 0,
    mutualPreview: [],
    reason: "Perfil en GoI",
    activeThisWeek: false,
    trainedThisWeek: false,
  };
}

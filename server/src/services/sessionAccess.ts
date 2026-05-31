import { store, type Post, type WorkoutSession } from "./store.js";

function viewerFollowsUser(viewerId: string, targetId: string): boolean {
  return store.follows.some(
    (f) => f.followerId === viewerId && f.followingId === targetId && f.status !== "pending"
  );
}

function canUserViewPost(post: Post, viewerUserId: string): boolean {
  if (post.userId === viewerUserId) return true;
  if (post.visibility === "public") return true;
  if (post.visibility === "followers") {
    return viewerFollowsUser(viewerUserId, post.userId);
  }
  return false;
}

/** Sesiones visibles en perfil según ajustes de privacidad del autor. */
export function canViewerSeeProfileSessions(viewerId: string, targetUserId: string): boolean {
  if (viewerId === targetUserId) return true;
  if (!viewerFollowsUser(viewerId, targetUserId)) return false;
  const target = store.users.find((u) => u.id === targetUserId);
  if (!target) return false;
  const vis = target.profileSections?.sessions ?? "public";
  if (vis === "private") return false;
  if (vis === "followers") return viewerFollowsUser(viewerId, targetUserId);
  return true;
}

function sessionLinkedToVisiblePost(sessionId: string, viewerId: string): boolean {
  return store.posts.some((p) => p.sessionId === sessionId && canUserViewPost(p, viewerId));
}

/** Quién puede abrir el detalle de una sesión (pantalla / sesion/:id). */
export function canViewWorkoutSession(session: WorkoutSession, viewerId: string): boolean {
  if (session.userId === viewerId) return true;
  if (sessionLinkedToVisiblePost(session.id, viewerId)) return true;
  return canViewerSeeProfileSessions(viewerId, session.userId);
}

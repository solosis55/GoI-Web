import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { getFollowers, getFollowing, getProfile, getUsers, updateProfile } from "../api/authApi";
import {
  deletePost,
  getPostsByIds,
  getPostsByUserPage,
  PROFILE_POSTS_PAGE_SIZE,
  updatePost as updatePostApi,
} from "../api/postsApi";
import { getWorkoutSessions } from "../api/workoutSessionsApi";
import { getWorkouts } from "../api/workoutsApi";
import { PostMediaGallery } from "../components/feed/PostMediaGallery";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ProfileAccountCard } from "../components/profile/ProfileAccountCard";
import { ProfileAvatarPanel } from "../components/profile/ProfileAvatarPanel";
import { ProfileForm } from "../components/profile/ProfileForm";
import { ProfilePostsMosaic } from "../components/profile/ProfilePostsMosaic";
import { ProfilePostsMosaicSkeleton } from "../components/profile/ProfilePostsMosaicSkeleton";
import { WorkoutSessionsHistory } from "../components/workouts/WorkoutSessionsHistory";
import { useAuth } from "../context/AuthContext";
import type { SafeUser } from "../types/auth";
import type { Post } from "../types/post";
import type { Workout } from "../types/workout";
import type { WorkoutSessionWithTitle } from "../types/workoutSession";
import { getErrorMessage } from "../utils/errorMessages";
import { countSessionsThisWeek } from "../utils/musclePentagonStats";
import {
  loadMutedUserIds,
  loadSavedPostIds,
  pruneSavedPostIdsToExisting,
  toggleSavedPost,
  unmuteUser,
} from "../utils/feedLocalPrefs";
import { loadFavoriteWorkoutIds, toggleFavoriteWorkoutId } from "../utils/profileLocalPrefs";
import {
  parseInstagramProfileUrl,
  parseStravaProfileUrl,
  parseWebsiteProfileUrl,
  validateProfileUrlFields,
} from "../utils/profileLinks";
import { exportPersonalDataCsv, loadBundle } from "../utils/personalBodyPrefs";
import { mergeSafeUser } from "../utils/safeUserDefaults";
import { useNearViewport } from "../hooks/useNearViewport";

type ProfileTab = "profile" | "posts" | "sessions" | "privacy";
type PostsSubTab = "mine" | "saved";

type ProfilePageProps = {
  onOpenPostInFeed?: (postId: string) => void;
  onGoToStatistics?: () => void;
  onGoToSettings?: () => void;
};

type PostsMineFilter = "all" | "photos" | "recent";

export function ProfilePage({
  onOpenPostInFeed,
  onGoToStatistics,
  onGoToSettings,
}: ProfilePageProps) {
  const { user, updateUser } = useAuth();
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [goal, setGoal] = useState(user?.goal ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [accountEmail, setAccountEmail] = useState(user?.email ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<WorkoutSessionWithTitle[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [myPostsTotal, setMyPostsTotal] = useState<number | null>(null);
  const [myPostsNextCursor, setMyPostsNextCursor] = useState<string | null>(null);
  const [myPostsLoadingMore, setMyPostsLoadingMore] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingVisibility, setEditingVisibility] = useState<"public" | "followers" | "private">("public");
  const [myWorkouts, setMyWorkouts] = useState<Workout[]>([]);
  const [avatarPanelOpen, setAvatarPanelOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [profileTab, setProfileTab] = useState<ProfileTab>("posts");
  const [postsSubTab, setPostsSubTab] = useState<PostsSubTab>("mine");
  const [timelinePosts, setTimelinePosts] = useState<Post[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState("");
  const [savedPostIdSet, setSavedPostIdSet] = useState<Set<string>>(() => new Set());
  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerShowInFeed, setBannerShowInFeed] = useState(true);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [stravaUrl, setStravaUrl] = useState("");
  const [location, setLocation] = useState("");
  const [profileVisibility, setProfileVisibility] = useState<"public" | "followers">("public");
  const [postsMineFilter, setPostsMineFilter] = useState<PostsMineFilter>("all");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [favoriteWorkoutIds, setFavoriteWorkoutIds] = useState<string[]>([]);
  const [mutedUserRows, setMutedUserRows] = useState<{ id: string; username: string }[]>([]);
  const [mutedSectionLoading, setMutedSectionLoading] = useState(false);
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [privacyMsg, setPrivacyMsg] = useState("");
  const [privacyErr, setPrivacyErr] = useState("");

  const userId = user?.id;
  const [followStats, setFollowStats] = useState<{ followers: number; following: number } | null>(null);
  const [followStatsLoading, setFollowStatsLoading] = useState(false);

  const sessionsThisWeek = useMemo(() => countSessionsThisWeek(sessions), [sessions]);

  useEffect(() => {
    if (!userId) {
      setFollowStats(null);
      setFollowStatsLoading(false);
      return;
    }
    let cancelled = false;
    setFollowStatsLoading(true);
    void (async () => {
      try {
        const [fr, fg] = await Promise.all([getFollowers(userId), getFollowing(userId)]);
        if (!cancelled) {
          setFollowStats({ followers: fr.followerIds.length, following: fg.followingIds.length });
        }
      } catch {
        if (!cancelled) setFollowStats(null);
      } finally {
        if (!cancelled) setFollowStatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const loadMyPosts = useCallback(async () => {
    if (!userId) return;
    setPostsLoading(true);
    setPostsError("");
    setMyPostsNextCursor(null);
    try {
      const [pageRes, workoutsRes] = await Promise.all([
        getPostsByUserPage(userId, { limit: PROFILE_POSTS_PAGE_SIZE }),
        getWorkouts(),
      ]);
      setMyPosts(pageRes.posts);
      setMyPostsNextCursor(pageRes.nextCursor);
      setMyPostsTotal(pageRes.total);
      setMyWorkouts(workoutsRes.filter((w) => w.userId === userId));
    } catch (loadError) {
      setPostsError(getErrorMessage(loadError, "No se pudieron cargar tus publicaciones"));
      setMyPosts([]);
      setMyPostsTotal(0);
      setMyPostsNextCursor(null);
    } finally {
      setPostsLoading(false);
    }
  }, [userId]);

  const loadMoreMyPosts = useCallback(async () => {
    if (!userId || !myPostsNextCursor || myPostsLoadingMore || postsLoading) return;
    setMyPostsLoadingMore(true);
    setPostsError("");
    try {
      const pageRes = await getPostsByUserPage(userId, {
        limit: PROFILE_POSTS_PAGE_SIZE,
        cursor: myPostsNextCursor,
      });
      setMyPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const merged = [...prev];
        for (const p of pageRes.posts) {
          if (!seen.has(p.id)) {
            seen.add(p.id);
            merged.push(p);
          }
        }
        return merged;
      });
      setMyPostsNextCursor(pageRes.nextCursor);
      setMyPostsTotal(pageRes.total);
    } catch (e) {
      setPostsError(getErrorMessage(e, "No se pudieron cargar más publicaciones"));
    } finally {
      setMyPostsLoadingMore(false);
    }
  }, [userId, myPostsNextCursor, myPostsLoadingMore, postsLoading]);

  const minePostsInfiniteEnabled =
    profileTab === "posts" &&
    postsSubTab === "mine" &&
    Boolean(myPostsNextCursor) &&
    !postsLoading &&
    !myPostsLoadingMore;
  const profilePostsLoadMoreRef = useNearViewport(() => void loadMoreMyPosts(), minePostsInfiniteEnabled);

  const loadSavedPosts = useCallback(async () => {
    if (!userId) return;
    setTimelineLoading(true);
    setTimelineError("");
    try {
      const ids = loadSavedPostIds(userId);
      if (ids.length === 0) {
        setTimelinePosts([]);
        return;
      }
      const posts = await getPostsByIds(ids);
      const byId = new Map(posts.map((p) => [p.id, p]));
      const ordered = ids.map((id) => byId.get(id)).filter((p): p is Post => Boolean(p));
      setTimelinePosts(ordered);
    } catch (e) {
      setTimelineError(getErrorMessage(e, "No se pudieron cargar los guardados"));
    } finally {
      setTimelineLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setSavedPostIdSet(new Set());
      return;
    }
    setSavedPostIdSet(new Set(loadSavedPostIds(userId)));
  }, [userId]);

  useEffect(() => {
    if (profileTab !== "posts" || postsSubTab !== "saved" || !userId) return;
    void loadSavedPosts();
  }, [profileTab, postsSubTab, userId, loadSavedPosts]);

  useEffect(() => {
    if (profileTab !== "posts" || postsSubTab !== "saved" || !userId) return;
    function onWinFocus() {
      void loadSavedPosts();
    }
    function onVisibility() {
      if (document.visibilityState === "visible") void loadSavedPosts();
    }
    window.addEventListener("focus", onWinFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onWinFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [profileTab, postsSubTab, userId, loadSavedPosts]);

  function refreshSavedLocal() {
    if (!userId) return;
    setSavedPostIdSet(new Set(loadSavedPostIds(userId)));
  }

  const savedPostsOrdered = useMemo(() => {
    if (!userId || timelinePosts.length === 0) return [];
    const byId = new Map(timelinePosts.map((p) => [p.id, p]));
    const ids = loadSavedPostIds(userId);
    const out: Post[] = [];
    for (const id of ids) {
      const p = byId.get(id);
      if (p) out.push(p);
    }
    return out;
  }, [userId, timelinePosts, savedPostIdSet]);

  const timelinePostIdSet = useMemo(() => new Set(timelinePosts.map((p) => p.id)), [timelinePosts]);

  const savedOrphansCount = useMemo(() => {
    if (!userId) return 0;
    const ids = loadSavedPostIds(userId);
    return ids.filter((id) => !timelinePostIdSet.has(id)).length;
  }, [userId, timelinePostIdSet, savedPostIdSet]);

  function handlePruneSavedOrphans() {
    if (!userId) return;
    pruneSavedPostIdsToExisting(userId, timelinePostIdSet);
    refreshSavedLocal();
    setSelectedPostId(null);
  }

  const profileBadges = useMemo(() => {
    const badges: { id: string; label: string }[] = [];
    if (sessionsThisWeek >= 3) badges.push({ id: "week", label: "Constancia semanal" });
    if (sessions.length >= 1) badges.push({ id: "first", label: "Entrenando" });
    if (myWorkouts.length >= 3) badges.push({ id: "routines", label: "Varias rutinas" });
    if (myPosts.length >= 1) badges.push({ id: "voice", label: "Publicando" });
    return badges;
  }, [sessionsThisWeek, sessions.length, myWorkouts.length, myPosts.length]);

  const recentRoutineChips = useMemo(() => {
    const byDate = [...sessions].sort((a, b) => (a.performedAt < b.performedAt ? 1 : -1));
    const seen = new Set<string>();
    const out: { id: string; title: string }[] = [];
    for (const s of byDate) {
      if (!s.workoutId || seen.has(s.workoutId)) continue;
      seen.add(s.workoutId);
      const t = myWorkouts.find((w) => w.id === s.workoutId)?.title ?? s.workoutTitle ?? "Rutina";
      out.push({ id: s.workoutId, title: t });
      if (out.length >= 4) break;
    }
    return out;
  }, [sessions, myWorkouts]);

  const personalTeaser = useMemo(() => {
    if (!userId) return "";
    const g = loadBundle(userId).goals;
    const parts: string[] = [];
    if (g.targetWeightKg != null) parts.push(`Peso objetivo ~${g.targetWeightKg} kg`);
    if (g.targetWaistCm != null) parts.push(`Cintura objetivo ${g.targetWaistCm} cm`);
    if (g.targetDate) parts.push(`Fecha meta ${g.targetDate}`);
    if (g.note?.trim()) parts.push(g.note.trim().slice(0, 140));
    return parts.join(" · ");
  }, [userId]);

  const browserTimeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    } catch {
      return "";
    }
  }, []);

  const filteredMyPosts = useMemo(() => {
    let list = [...myPosts];
    const pin = user?.pinnedPostId ?? "";
    if (postsMineFilter === "photos") {
      list = list.filter((p) => (p.media?.length ?? 0) > 0);
    }
    if (postsMineFilter === "recent") {
      list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    } else if (pin) {
      list.sort((a, b) => {
        if (a.id === pin) return -1;
        if (b.id === pin) return 1;
        return a.createdAt < b.createdAt ? 1 : -1;
      });
    } else {
      list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    }
    return list;
  }, [myPosts, postsMineFilter, user?.pinnedPostId]);

  const filteredSavedPosts = useMemo(() => {
    let list = [...savedPostsOrdered];
    if (postsMineFilter === "photos") {
      list = list.filter((p) => (p.media?.length ?? 0) > 0);
    }
    list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return list;
  }, [savedPostsOrdered, postsMineFilter]);

  const pinnedPost = useMemo(() => {
    const id = user?.pinnedPostId?.trim();
    if (!id) return null;
    return myPosts.find((p) => p.id === id) ?? null;
  }, [user?.pinnedPostId, myPosts]);

  const displayedPosts = postsSubTab === "mine" ? filteredMyPosts : filteredSavedPosts;
  const postsListLoading = postsSubTab === "mine" ? postsLoading : timelineLoading;

  const selectedPost =
    selectedPostId !== null ? (displayedPosts.find((p) => p.id === selectedPostId) ?? null) : null;
  const selectedPostIsMine = Boolean(userId && selectedPost && selectedPost.userId === userId);

  const reloadMutedSection = useCallback(async () => {
    if (!userId) return;
    setMutedSectionLoading(true);
    try {
      const ids = loadMutedUserIds(userId);
      const { users } = await getUsers();
      const map = new Map(users.map((u) => [u.id, u.username] as const));
      setMutedUserRows(ids.map((id) => ({ id, username: map.get(id) ?? `Usuario ${id.slice(0, 6)}` })));
    } catch {
      setMutedUserRows(loadMutedUserIds(userId).map((id) => ({ id, username: `Usuario ${id.slice(0, 6)}` })));
    } finally {
      setMutedSectionLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setFavoriteWorkoutIds([]);
      return;
    }
    setFavoriteWorkoutIds(loadFavoriteWorkoutIds(userId));
  }, [userId]);

  useEffect(() => {
    if (profileTab !== "privacy" || !userId) return;
    void reloadMutedSection();
  }, [profileTab, userId, reloadMutedSection]);

  useEffect(() => {
    if (!user) return;
    const m = mergeSafeUser(user);
    setBannerUrl(m.bannerUrl);
    setBannerShowInFeed(m.bannerShowInFeed !== false);
    setWebsiteUrl(m.websiteUrl);
    setInstagramUrl(m.instagramUrl);
    setStravaUrl(m.stravaUrl);
    setLocation(m.location);
    setProfileVisibility(m.profileVisibility === "followers" ? "followers" : "public");
  }, [user]);

  useEffect(() => {
    setSelectedPostId(null);
    setEditingPostId(null);
  }, [postsSubTab]);

  const loadProfile = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError("");
    try {
      const response = await getProfile(userId);
      const u = response.user;
      setUsername(u.username);
      setBio(u.bio);
      setGoal(u.goal);
      setAvatarUrl(u.avatarUrl);
      const email = u.email ?? user?.email ?? "";
      setAccountEmail(email);
      const next = mergeSafeUser({
        id: u.id,
        username: u.username,
        email,
        bio: u.bio,
        goal: u.goal,
        avatarUrl: u.avatarUrl,
        bannerUrl: u.bannerUrl ?? "",
        bannerShowInFeed: u.bannerShowInFeed !== false,
        websiteUrl: u.websiteUrl ?? "",
        instagramUrl: u.instagramUrl ?? "",
        stravaUrl: u.stravaUrl ?? "",
        location: u.location ?? "",
        profileVisibility: u.profileVisibility === "followers" ? "followers" : "public",
        pinnedPostId: u.pinnedPostId ?? "",
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      } as SafeUser);
      updateUser(next);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "No se pudo cargar el perfil"));
    } finally {
      setLoading(false);
    }
  }, [userId, user?.email, updateUser]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    void loadMyPosts();
  }, [loadMyPosts]);

  useEffect(() => {
    if (!selectedPostId) return;
    if (!displayedPosts.some((p) => p.id === selectedPostId)) setSelectedPostId(null);
  }, [displayedPosts, selectedPostId]);

  useEffect(() => {
    setEditingPostId(null);
  }, [selectedPostId]);

  useEffect(() => {
    if (profileTab !== "posts") {
      setSelectedPostId(null);
      setEditingPostId(null);
    }
  }, [profileTab]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function loadSessions() {
      setSessionsLoading(true);
      setSessionsError("");
      try {
        const list = await getWorkoutSessions();
        if (!cancelled) setSessions(list);
      } catch (loadError) {
        if (!cancelled) {
          setSessionsError(getErrorMessage(loadError, "No se pudieron cargar las sesiones"));
        }
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    }

    void loadSessions();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function handleDeletePost(postId: string) {
    if (!window.confirm("¿Eliminar esta publicación?")) return;
    setPostsError("");
    try {
      await deletePost(postId);
      await loadMyPosts();
    } catch (deleteErr) {
      setPostsError(getErrorMessage(deleteErr, "No se pudo eliminar la publicación"));
    }
  }

  function startEditingPost(post: Post) {
    setEditingPostId(post.id);
    setEditingContent(post.content);
    setEditingVisibility(post.visibility ?? "public");
    setPostsError("");
  }

  async function handleSavePostEdit() {
    if (!editingPostId) return;
    const trimmed = editingContent.trim();
    const edited = myPosts.find((p) => p.id === editingPostId);
    const hasPhotos = (edited?.media?.length ?? 0) > 0;
    if (trimmed.length > 280 || (!hasPhotos && trimmed.length < 4)) {
      setPostsError(
        "Sin fotos el texto debe tener entre 4 y 280 caracteres; con fotos, opcional hasta 280.",
      );
      return;
    }
    try {
      await updatePostApi(editingPostId, { content: trimmed, visibility: editingVisibility });
      setEditingPostId(null);
      setEditingContent("");
      await loadMyPosts();
    } catch (editErr) {
      setPostsError(getErrorMessage(editErr, "No se pudo actualizar la publicación"));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage("");
    setError("");

    if (username.trim().length < 3) {
      setLoading(false);
      setError("El usuario debe tener al menos 3 caracteres");
      return;
    }
    if (goal.length > 60) {
      setLoading(false);
      setError("El objetivo no puede superar 60 caracteres");
      return;
    }
    if (bio.length > 200) {
      setLoading(false);
      setError("La bio no puede superar 200 caracteres");
      return;
    }
    if (location.length > 80) {
      setLoading(false);
      setError("La ubicación no puede superar 80 caracteres");
      return;
    }
    const avatarOk =
      !avatarUrl ||
      /^https?:\/\//i.test(avatarUrl) ||
      /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(avatarUrl);
    if (!avatarOk) {
      setLoading(false);
      setError("La foto debe ser un enlace https o una imagen subida desde tu equipo.");
      return;
    }
    const bannerOk =
      !bannerUrl.trim() ||
      /^https?:\/\//i.test(bannerUrl) ||
      /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(bannerUrl);
    if (!bannerOk) {
      setLoading(false);
      setError("La cabecera debe ser un enlace https o una imagen (data URL) como el avatar.");
      return;
    }
    const urlErr = validateProfileUrlFields({ websiteUrl, instagramUrl, stravaUrl });
    if (urlErr) {
      setLoading(false);
      setError(urlErr);
      return;
    }
    const websiteNorm = parseWebsiteProfileUrl(websiteUrl) ?? "";
    const instagramNorm = parseInstagramProfileUrl(instagramUrl) ?? "";
    const stravaNorm = parseStravaProfileUrl(stravaUrl) ?? "";

    try {
      const response = await updateProfile(user.id, {
        username: username.trim(),
        bio,
        goal,
        avatarUrl,
        bannerUrl: bannerUrl.trim(),
        bannerShowInFeed,
        websiteUrl: websiteNorm,
        instagramUrl: instagramNorm,
        stravaUrl: stravaNorm,
        location: location.trim(),
        profileVisibility,
      });
      updateUser(response.user);
      setAccountEmail(response.user.email);
      setMessage("Perfil actualizado correctamente");
      await loadMyPosts();
    } catch (submitError) {
      setError(getErrorMessage(submitError, "No se pudo actualizar el perfil"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPinned(postId: string | null) {
    if (!user) return;
    setPostsError("");
    setMessage("");
    try {
      const res = await updateProfile(user.id, { pinnedPostId: postId });
      updateUser(res.user);
      setMessage(postId ? "Publicación destacada en tu cuadrícula." : "Destacado quitado.");
    } catch (e) {
      setPostsError(getErrorMessage(e, "No se pudo guardar el destacado"));
    }
  }

  function handleExportPersonalData() {
    if (!userId || !user) return;
    setError("");
    setMessage("");
    try {
      const bundle = {
        exportedAt: new Date().toISOString(),
        profile: { ...user },
        sessions: sessions.map((s) => ({
          id: s.id,
          workoutId: s.workoutId,
          performedAt: s.performedAt,
          notes: s.notes,
        })),
        postsMinePreview: myPosts.map((p) => ({
          id: p.id,
          createdAt: p.createdAt,
          contentPreview: p.content.slice(0, 500),
          visibility: p.visibility,
        })),
        personalHistoryCsv: exportPersonalDataCsv(userId),
      };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `goi-mis-datos-${user.username}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage(
        "Descarga lista: JSON con perfil, sesiones y vista previa de posts; el historial corporal va en personalHistoryCsv.",
      );
    } catch {
      setError("No se pudo generar la exportación.");
    }
  }

  async function handlePrivacySave() {
    if (!user) return;
    setPrivacyBusy(true);
    setPrivacyErr("");
    setPrivacyMsg("");
    try {
      const res = await updateProfile(user.id, {
        profileVisibility,
        bannerShowInFeed,
      });
      updateUser(res.user);
      setPrivacyMsg("Privacidad guardada.");
      window.setTimeout(() => setPrivacyMsg(""), 2800);
    } catch (e) {
      setPrivacyErr(getErrorMessage(e, "No se pudo guardar la privacidad"));
    } finally {
      setPrivacyBusy(false);
    }
  }

  function visibilityLabel(post: Post) {
    const v = post.visibility ?? "public";
    if (v === "public") return "Público";
    if (v === "followers") return "Seguidores";
    return "Solo yo";
  }

  function getWorkoutTitle(workoutId: string | null) {
    if (!workoutId) return null;
    const workout = myWorkouts.find((w) => w.id === workoutId);
    return workout?.title ?? "Rutina vinculada";
  }

  function handleRemoveFromSaved(postId: string) {
    if (!userId) return;
    toggleSavedPost(userId, postId);
    refreshSavedLocal();
    setSelectedPostId(null);
  }

  function tabClass(id: ProfileTab) {
    return [
      "rounded-t-lg px-3 py-2.5 text-sm font-medium transition",
      profileTab === id
        ? "border-b-2 border-goi-gold text-goi-gold healthy:border-goi-gold/38 healthy:text-goi-gold-dim"
        : "border-b-2 border-transparent text-neutral-500 hover:text-neutral-300 light:text-zinc-600 light:hover:text-zinc-900",
    ].join(" ");
  }

  const selectedPostPanel =
    selectedPost && profileTab === "posts" ? (
      <>
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/55 md:hidden"
          aria-label="Cerrar detalle de publicación"
          onClick={() => setSelectedPostId(null)}
        />
        <div
          className={[
            "fs-panel-row mt-4 flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between",
            "md:relative md:mt-4",
            "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-50 max-md:m-0 max-md:max-h-[min(70vh,560px)] max-md:overflow-y-auto max-md:rounded-t-2xl max-md:border max-md:border-neutral-800 max-md:bg-zinc-950 max-md:p-4 max-md:pb-[max(1rem,env(safe-area-inset-bottom))] max-md:shadow-[0_-12px_48px_rgba(0,0,0,0.55)] light:max-md:border-zinc-200 light:max-md:bg-white",
          ].join(" ")}
        >
          <div className="mb-1 flex items-center justify-between border-b border-neutral-800 pb-2 md:hidden light:border-zinc-200">
            <span className="text-sm font-semibold text-neutral-100 light:text-zinc-900">Publicación</span>
            <button
              type="button"
              className="text-xs font-medium text-neutral-400 hover:text-goi-gold light:text-zinc-600 encendido:hover:text-goi-gold-dim healthy:hover:text-goi-gold-dim"
              onClick={() => setSelectedPostId(null)}
            >
              Cerrar
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <span className="inline-block rounded-full border border-neutral-600 bg-neutral-900/70 px-2 py-0.5 text-[10px] font-medium text-neutral-400 light:border-zinc-300 light:bg-zinc-200 light:text-zinc-700">
                {visibilityLabel(selectedPost)}
              </span>
              {user?.pinnedPostId === selectedPost.id ? (
                <span className="inline-block rounded-full border border-goi-gold/40 bg-goi-gold/15 px-2 py-0.5 text-[10px] font-medium text-goi-gold healthy:text-goi-gold-dim">
                  Destacada
                </span>
              ) : null}
            </span>
            {!selectedPostIsMine ? (
              <div className="mt-2 flex items-center gap-2">
                <div className="relative size-9 shrink-0 overflow-hidden rounded-full ring-1 ring-neutral-600 light:ring-zinc-300">
                  <Avatar src={selectedPost.authorAvatarUrl} alt="" fill className="ring-0" />
                </div>
                <p className="text-xs font-medium text-neutral-300 light:text-zinc-800">@{selectedPost.authorUsername}</p>
              </div>
            ) : null}
            {selectedPostIsMine && editingPostId === selectedPost.id ? (
              <div className="mt-2 grid gap-2">
                <textarea
                  className="goi-field min-h-[88px]"
                  maxLength={280}
                  value={editingContent}
                  onChange={(event) => setEditingContent(event.target.value)}
                  placeholder="Texto opcional si la publicación tiene fotos."
                />
                {selectedPost.media && selectedPost.media.length > 0 ? (
                  <PostMediaGallery media={selectedPost.media} />
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="goi-field max-w-[170px]"
                    value={editingVisibility}
                    onChange={(event) =>
                      setEditingVisibility(event.target.value as "public" | "followers" | "private")
                    }
                  >
                    <option value="public">Público</option>
                    <option value="followers">Seguidores</option>
                    <option value="private">Solo yo</option>
                  </select>
                  <Button
                    type="button"
                    variant="secondary"
                    className="!py-1.5 !text-xs"
                    onClick={() => void handleSavePostEdit()}
                  >
                    Guardar
                  </Button>
                  <Button type="button" variant="secondary" className="!py-1.5 !text-xs" onClick={() => setEditingPostId(null)}>
                    Cancelar
                  </Button>
                  <span className="text-xs text-neutral-500">{editingContent.trim().length}/280</span>
                </div>
                {selectedPost.workoutId ? (
                  <small className="text-neutral-400">Rutina: {getWorkoutTitle(selectedPost.workoutId)}</small>
                ) : null}
              </div>
            ) : (
              <>
                {selectedPost.content.trim() ? (
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-neutral-200 light:text-zinc-900">
                    {selectedPost.content}
                  </p>
                ) : null}
                <PostMediaGallery media={selectedPost.media ?? []} />
                {selectedPost.workoutId ? (
                  <small className="mt-1 block text-neutral-400">
                    Rutina: {getWorkoutTitle(selectedPost.workoutId)}
                  </small>
                ) : null}
              </>
            )}
            <p className="mt-1 text-xs text-neutral-600 light:text-zinc-600">
              {selectedPost.comments.length} comentarios · {selectedPost.likesCount} likes
            </p>
          </div>
          <div className="flex flex-wrap gap-2 max-[479px]:w-full">
            {onOpenPostInFeed && editingPostId !== selectedPost.id ? (
              <Button
                type="button"
                variant="secondary"
                className="shrink-0 self-start !py-1.5 !text-xs max-[479px]:w-full sm:self-auto"
                onClick={() => onOpenPostInFeed(selectedPost.id)}
              >
                Ver en Inicio
              </Button>
            ) : null}
            {userId && savedPostIdSet.has(selectedPost.id) ? (
              <Button
                type="button"
                variant="secondary"
                className="shrink-0 self-start !py-1.5 !text-xs max-[479px]:w-full sm:self-auto"
                onClick={() => handleRemoveFromSaved(selectedPost.id)}
              >
                Quitar de guardados
              </Button>
            ) : null}
            {selectedPostIsMine ? (
              <>
                {postsSubTab === "mine" && editingPostId !== selectedPost.id ? (
                  user?.pinnedPostId === selectedPost.id ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="shrink-0 self-start !py-1.5 !text-xs max-[479px]:w-full sm:self-auto"
                      onClick={() => void handleSetPinned(null)}
                    >
                      Quitar destacado
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      className="shrink-0 self-start !py-1.5 !text-xs max-[479px]:w-full sm:self-auto"
                      onClick={() => void handleSetPinned(selectedPost.id)}
                    >
                      Destacar en perfil
                    </Button>
                  )
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  className="shrink-0 self-start !py-1.5 !text-xs max-[479px]:w-full sm:self-auto"
                  onClick={() => startEditingPost(selectedPost)}
                >
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  className="shrink-0 self-start !py-1.5 !text-xs max-[479px]:w-full sm:self-auto"
                  onClick={() => void handleDeletePost(selectedPost.id)}
                >
                  Eliminar
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </>
    ) : null;

  return (
    <section className="profile-page mx-auto grid w-full max-w-5xl gap-5 px-4 sm:gap-6 sm:px-6">
      <header className="overflow-hidden rounded-3xl border border-neutral-800/80 bg-zinc-950/40 shadow-[0_20px_60px_rgba(0,0,0,0.35)] light:border-zinc-200 light:bg-white light:shadow-md">
        <div className="relative h-36 sm:h-44">
          {bannerUrl.trim() &&
          (/^https?:\/\//i.test(bannerUrl) || /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(bannerUrl)) ? (
            <img
              src={bannerUrl}
              alt=""
              className="absolute inset-0 size-full object-cover"
              decoding="async"
            />
          ) : (
            <div
              className="absolute inset-0 bg-gradient-to-br from-goi-gold/25 via-neutral-900 to-zinc-950 encendido:from-orange-200/55 healthy:from-goi-gold/20 light:via-zinc-100 light:to-white"
              aria-hidden
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/55 to-transparent light:from-white light:via-white/70 light:to-transparent" />
          <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-2 sm:right-4 sm:top-4">
            <Button
              type="button"
              variant="secondary"
              className="!border-white/15 !bg-black/35 !py-1.5 !text-[11px] text-neutral-100 backdrop-blur-sm light:!border-zinc-300 light:!bg-white/80 light:!text-zinc-900"
              onClick={() => setPreviewOpen(true)}
            >
              Vista previa pública
            </Button>
          </div>
          <p className="absolute left-4 top-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-goi-gold-dim sm:left-5">
            Tu cuenta
          </p>
        </div>

        <div className="relative -mt-11 px-4 pb-4 pt-0 sm:-mt-12 sm:px-6 sm:pb-5">
          <div className="flex flex-wrap items-end gap-4 sm:gap-6">
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => setAvatarPanelOpen((open) => !open)}
                className="group rounded-full outline-none ring-4 ring-zinc-950 ring-offset-0 transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-goi-gold light:ring-white"
                aria-expanded={avatarPanelOpen}
                aria-haspopup="dialog"
                aria-label={
                  avatarUrl
                    ? "Cambiar foto de perfil e imagen de cabecera"
                    : "Añadir foto de perfil e imagen de cabecera"
                }
              >
                <div className="relative size-[5.25rem] overflow-hidden rounded-full ring-2 ring-goi-gold/40 group-hover:ring-goi-gold/70 sm:size-28">
                  <Avatar src={avatarUrl} alt={username || "Foto de perfil"} fill className="ring-0" />
                </div>
              </button>
              {userId ? (
                <ProfileAvatarPanel
                  open={avatarPanelOpen}
                  onClose={() => setAvatarPanelOpen(false)}
                  userId={userId}
                  avatarUrl={avatarUrl}
                  bannerUrl={bannerUrl}
                  usernameTrimmed={username.trim()}
                  usernameAlt={username.trim() ? `@${username.trim()}` : "Tu foto de perfil"}
                  bio={bio}
                  goal={goal}
                  onSaved={(next) => {
                    const merged = mergeSafeUser(next);
                    updateUser(merged);
                    setAvatarUrl(merged.avatarUrl ?? "");
                    setBannerUrl(merged.bannerUrl ?? "");
                    setUsername(merged.username ?? username);
                    setBio(merged.bio ?? bio);
                    setGoal(merged.goal ?? goal);
                    setAccountEmail(merged.email ?? accountEmail);
                    setMessage("Foto y cabecera actualizadas.");
                    void loadMyPosts();
                  }}
                />
              ) : null}
            </div>

            <div className="min-w-0 flex-1 space-y-2.5 pb-0.5">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-neutral-50 light:text-zinc-900 sm:text-2xl">
                  @{username || "usuario"}
                </h1>
                {location.trim() ? (
                  <p className="mt-0.5 text-xs text-neutral-500 light:text-zinc-600">{location.trim()}</p>
                ) : null}
                {goal.trim() ? <p className="mt-1 text-sm text-goi-gold/95">{goal}</p> : null}
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-400 light:text-zinc-600">
                  {bio.trim() ? bio : "Sin biografía todavía. Edítala en la pestaña Perfil."}
                </p>
              </div>

              {(websiteUrl.trim() || instagramUrl.trim() || stravaUrl.trim()) && (
                <div className="flex flex-wrap gap-2">
                  {websiteUrl.trim() ? (
                    <a
                      href={parseWebsiteProfileUrl(websiteUrl) || websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-600/80 bg-black/35 px-2.5 py-1 text-[11px] font-medium text-neutral-200 backdrop-blur-sm hover:border-goi-gold/50 hover:text-goi-gold light:border-zinc-300 light:bg-zinc-100 light:text-zinc-800"
                    >
                      Web
                    </a>
                  ) : null}
                  {instagramUrl.trim() ? (
                    <a
                      href={parseInstagramProfileUrl(instagramUrl) || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-600/80 bg-black/35 px-2.5 py-1 text-[11px] font-medium text-neutral-200 backdrop-blur-sm hover:border-goi-gold/50 hover:text-goi-gold light:border-zinc-300 light:bg-zinc-100 light:text-zinc-800"
                    >
                      Instagram
                    </a>
                  ) : null}
                  {stravaUrl.trim() ? (
                    <a
                      href={parseStravaProfileUrl(stravaUrl) || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-600/80 bg-black/35 px-2.5 py-1 text-[11px] font-medium text-neutral-200 backdrop-blur-sm hover:border-goi-gold/50 hover:text-goi-gold light:border-zinc-300 light:bg-zinc-100 light:text-zinc-800"
                    >
                      Strava
                    </a>
                  ) : null}
                </div>
              )}

              {profileBadges.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {profileBadges.map((b) => (
                    <span
                      key={b.id}
                      className="rounded-full border border-goi-gold/30 bg-goi-gold/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-goi-gold light:border-goi-gold/35 light:bg-goi-gold/[0.1] healthy:border-goi-gold/30 healthy:bg-goi-gold/[0.09] light:text-goi-gold-dim healthy:text-goi-gold-dim"
                    >
                      {b.label}
                    </span>
                  ))}
                </div>
              ) : null}

              {personalTeaser ? (
                <p className="text-xs leading-relaxed text-neutral-500 light:text-zinc-600">
                  <span className="font-semibold text-neutral-400 light:text-zinc-700">Área personal: </span>
                  {personalTeaser}
                  {onGoToStatistics ? (
                    <>
                      {" "}
                      <button
                        type="button"
                        className="font-medium text-goi-gold underline-offset-2 hover:underline healthy:text-goi-gold-dim"
                        onClick={onGoToStatistics}
                      >
                        Ver estadísticas
                      </button>
                    </>
                  ) : null}
                </p>
              ) : null}

              {recentRoutineChips.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 light:text-zinc-500">
                    Recientes
                  </span>
                  {recentRoutineChips.map((r) => (
                    <span
                      key={r.id}
                      className="max-w-[10rem] truncate rounded-md border border-neutral-700/80 bg-neutral-900/50 px-2 py-0.5 text-[11px] text-neutral-300 light:border-zinc-200 light:bg-zinc-100 light:text-zinc-800"
                      title={r.title}
                    >
                      {r.title}
                    </span>
                  ))}
                </div>
              ) : null}

              {browserTimeZone ? (
                <p className="text-[10px] text-neutral-600 light:text-zinc-500">Zona horaria: {browserTimeZone}</p>
              ) : null}

              <p className="text-xs leading-relaxed text-neutral-600 light:text-zinc-600">
                Cada publicación tiene su visibilidad propia.{" "}
                <Link
                  to="/privacidad"
                  className="font-medium text-goi-gold underline-offset-2 hover:underline healthy:text-goi-gold-dim"
                >
                  Privacidad
                </Link>
                {onGoToSettings ? (
                  <>
                    {" · "}
                    <button
                      type="button"
                      className="font-medium text-goi-gold underline-offset-2 hover:underline healthy:text-goi-gold-dim"
                      onClick={onGoToSettings}
                    >
                      Ajustes
                    </button>
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <div className="mt-4 border-t border-neutral-800/80 pt-4 light:border-zinc-200">
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 sm:gap-x-10">
              <p className="m-0 flex min-w-0 items-baseline gap-1.5">
                <span className="text-lg font-semibold tabular-nums text-neutral-50 sm:text-xl light:text-zinc-900">
                  {followStatsLoading ? "…" : followStats !== null ? followStats.followers : "—"}
                </span>
                <span className="text-sm text-neutral-500 light:text-zinc-600">seguidores</span>
              </p>
              <p className="m-0 flex min-w-0 items-baseline gap-1.5">
                <span className="text-lg font-semibold tabular-nums text-neutral-50 sm:text-xl light:text-zinc-900">
                  {followStatsLoading ? "…" : followStats !== null ? followStats.following : "—"}
                </span>
                <span className="text-sm text-neutral-500 light:text-zinc-600">seguidos</span>
              </p>
              <p className="m-0 flex min-w-0 items-baseline gap-1.5">
                <span className="text-lg font-semibold tabular-nums text-neutral-50 sm:text-xl light:text-zinc-900">
                  {postsLoading ? "…" : myPostsTotal ?? myPosts.length}
                </span>
                <span className="text-sm text-neutral-500 light:text-zinc-600">publicaciones</span>
              </p>
            </div>

            <div className="mt-7 border-t border-neutral-800/60 pt-6 light:border-zinc-200">
              <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3 sm:gap-x-10">
                <p className="m-0 flex min-w-0 items-baseline gap-1.5">
                  <span className="text-base font-semibold tabular-nums text-neutral-100 sm:text-lg light:text-zinc-900">
                    {sessionsLoading ? "…" : sessions.length}
                  </span>
                  <span className="text-sm text-neutral-400 light:text-zinc-600">entrenos</span>
                </p>
                <p className="m-0 flex min-w-0 items-baseline gap-1.5">
                  <span className="text-base font-semibold tabular-nums text-goi-gold sm:text-lg healthy:text-goi-gold-dim">
                    {sessionsLoading ? "…" : sessionsThisWeek}
                  </span>
                  <span className="text-sm text-neutral-400 light:text-zinc-600">esta semana</span>
                </p>
                <p className="m-0 flex min-w-0 items-baseline gap-1.5">
                  <span className="text-base font-semibold tabular-nums text-neutral-100 sm:text-lg light:text-zinc-900">
                    {postsLoading ? "…" : myWorkouts.length}
                  </span>
                  <span className="text-sm text-neutral-400 light:text-zinc-600">rutinas</span>
                </p>
              </div>
            </div>
          </div>

        </div>
      </header>

      <div className="border-b border-neutral-800/80 light:border-zinc-200">
        <nav className="flex flex-wrap gap-1" role="tablist" aria-label="Secciones del perfil">
          <button
            type="button"
            role="tab"
            aria-selected={profileTab === "posts"}
            className={tabClass("posts")}
            onClick={() => setProfileTab("posts")}
          >
            Publicaciones
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={profileTab === "profile"}
            className={tabClass("profile")}
            onClick={() => setProfileTab("profile")}
          >
            Perfil
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={profileTab === "sessions"}
            className={tabClass("sessions")}
            onClick={() => setProfileTab("sessions")}
          >
            Entrenos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={profileTab === "privacy"}
            className={tabClass("privacy")}
            onClick={() => setProfileTab("privacy")}
          >
            Privacidad
          </button>
        </nav>
      </div>

      {profileTab === "profile" ? (
        <div className="grid gap-5 lg:grid-cols-3 lg:items-start lg:gap-6">
          <Card tone="dark" className="border-neutral-800/70 light:border-zinc-200 lg:col-span-2">
            <h2 className="mt-0 text-lg font-semibold text-neutral-100 light:text-zinc-900">Datos públicos</h2>
            <p className="mb-3 text-sm text-neutral-500 light:text-zinc-600">
              Usuario, objetivo, bio y enlaces. La foto de perfil y la cabecera las cambias pulsando tu avatar arriba.
              Correo, silenciados y quién ve tu perfil están en la pestaña Privacidad.
            </p>
            <ProfileForm
              username={username}
              goal={goal}
              bio={bio}
              loading={loading}
              error={error}
              message={message}
              onChangeUsername={setUsername}
              onChangeGoal={setGoal}
              onChangeBio={setBio}
              onSubmit={handleSubmit}
              extraSection={
                <>
                  <label className="grid gap-1.5 font-semibold">
                    Ubicación o gimnasio (opcional)
                    <input
                      className="goi-field"
                      value={location}
                      maxLength={80}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Madrid · Mi box"
                    />
                    <span className="text-xs font-normal text-neutral-500">{location.length}/80</span>
                  </label>
                  <label className="grid gap-1.5 font-semibold">
                    Sitio web (https)
                    <input
                      className="goi-field"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://tu-sitio.com"
                    />
                  </label>
                  <label className="grid gap-1.5 font-semibold">
                    Instagram (@usuario o URL)
                    <input
                      className="goi-field"
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                      placeholder="@tuusuario"
                    />
                  </label>
                  <label className="grid gap-1.5 font-semibold">
                    Strava (https en strava.com)
                    <input
                      className="goi-field"
                      value={stravaUrl}
                      onChange={(e) => setStravaUrl(e.target.value)}
                      placeholder="https://www.strava.com/athletes/…"
                    />
                  </label>
                </>
              }
            />
          </Card>
          <div className="grid gap-4">
            <Card tone="dark" className="border-neutral-800/70 light:border-zinc-200">
              <h3 className="mt-0 text-base font-semibold text-neutral-100 light:text-zinc-900">Rutinas favoritas</h3>
              <p className="text-xs text-neutral-500 light:text-zinc-600">
                Marcadores locales para accesos rápidos. Pulsa la estrella en una rutina tuya.
              </p>
              {myWorkouts.length === 0 ? (
                <p className="mt-2 text-xs text-neutral-500">Crea rutinas en la pestaña Rutinas.</p>
              ) : (
                <ul className="mt-2 max-h-48 list-none space-y-1 overflow-y-auto p-0 text-sm">
                  {myWorkouts.slice(0, 12).map((w) => {
                    const fav = favoriteWorkoutIds.includes(w.id);
                    return (
                      <li
                        key={w.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-neutral-800/60 px-2 py-1.5 light:border-zinc-200"
                      >
                        <span className="min-w-0 truncate text-neutral-200 light:text-zinc-900">{w.title}</span>
                        <button
                          type="button"
                          className="shrink-0 text-goi-gold hover:opacity-90 healthy:text-goi-gold-dim"
                          aria-label={fav ? "Quitar de favoritos" : "Añadir a favoritos"}
                          title={fav ? "Quitar" : "Favorito"}
                          onClick={() => {
                            if (!userId) return;
                            setFavoriteWorkoutIds(toggleFavoriteWorkoutId(userId, w.id));
                          }}
                        >
                          {fav ? "★" : "☆"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
            <Card tone="dark" className="border-neutral-800/70 light:border-zinc-200">
              <h3 className="mt-0 text-base font-semibold text-neutral-100 light:text-zinc-900">Tus datos</h3>
              <p className="text-xs text-neutral-500 light:text-zinc-600">
                Descarga un JSON con perfil, sesiones, vista previa de publicaciones y CSV de historial personal
                embebido.
              </p>
              <Button type="button" variant="secondary" className="mt-2 !py-1.5 !text-xs" onClick={handleExportPersonalData}>
                Exportar JSON
              </Button>
            </Card>
          </div>
        </div>
      ) : null}

      {profileTab === "privacy" ? (
        <div className="grid gap-5 lg:grid-cols-2 lg:items-start lg:gap-6">
          <ProfileAccountCard accountEmail={accountEmail} />
          <Card tone="dark" className="border-neutral-800/70 light:border-zinc-200">
            <h2 className="mt-0 text-lg font-semibold text-neutral-100 light:text-zinc-900">Visibilidad del perfil</h2>
            <p className="mb-3 text-sm text-neutral-500 light:text-zinc-600">
              Controla quién ve bio, enlaces y cabecera al abrir tu perfil. Las publicaciones siguen teniendo su propia
              visibilidad.
            </p>
            <fieldset className="grid gap-3">
              <legend className="sr-only">Quién ve tu perfil completo</legend>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-neutral-300 light:text-zinc-800">
                <input
                  type="radio"
                  name="pv_privacy"
                  className="mt-1 accent-goi-gold"
                  checked={profileVisibility === "public"}
                  onChange={() => setProfileVisibility("public")}
                />
                <span>
                  <span className="font-medium text-neutral-200 light:text-zinc-900">Público</span> — cualquier usuario
                  autenticado puede ver tu perfil completo (salvo restricciones por post).
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-neutral-300 light:text-zinc-800">
                <input
                  type="radio"
                  name="pv_privacy"
                  className="mt-1 accent-goi-gold"
                  checked={profileVisibility === "followers"}
                  onChange={() => setProfileVisibility("followers")}
                />
                <span>
                  <span className="font-medium text-neutral-200 light:text-zinc-900">Solo seguidores</span> — hasta que
                  te sigan solo ven avatar y nombre; el resto al seguirte.
                </span>
              </label>
            </fieldset>
            <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm font-medium text-neutral-300 light:text-zinc-800">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 rounded border-neutral-600 accent-goi-gold"
                checked={bannerShowInFeed}
                onChange={(e) => setBannerShowInFeed(e.target.checked)}
              />
              <span>Mostrar mi imagen de cabecera cuando otros vean mi perfil (por ejemplo en el modal desde el feed).</span>
            </label>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button type="button" variant="primary" className="!py-2 !text-sm" disabled={privacyBusy} onClick={() => void handlePrivacySave()}>
                {privacyBusy ? "Guardando…" : "Guardar privacidad"}
              </Button>
              {privacyMsg ? <span className="text-xs font-medium text-goi-gold healthy:text-goi-gold-dim">{privacyMsg}</span> : null}
            </div>
            {privacyErr ? <p className="mt-2 text-sm text-red-400 light:text-red-700">{privacyErr}</p> : null}
          </Card>

          <Card tone="dark" className="border-neutral-800/70 light:border-zinc-200 lg:col-span-2">
            <h2 className="mt-0 text-lg font-semibold text-neutral-100 light:text-zinc-900">Silenciados en Inicio</h2>
            <p className="mb-3 text-sm text-neutral-500 light:text-zinc-600">
              Cuentas que silenciaste desde el menú del feed (solo este dispositivo). No aparecen en tu timeline.
            </p>
            {mutedSectionLoading ? (
              <p className="text-xs text-neutral-500">Cargando…</p>
            ) : mutedUserRows.length === 0 ? (
              <p className="text-xs text-neutral-500">No hay silenciados.</p>
            ) : (
              <ul className="mt-2 grid list-none gap-2 p-0 sm:grid-cols-2">
                {mutedUserRows.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-neutral-800/60 px-3 py-2 text-sm light:border-zinc-200"
                  >
                    <span className="truncate text-neutral-200 light:text-zinc-900">@{row.username}</span>
                    <Button
                      type="button"
                      variant="secondary"
                      className="!py-1 !text-xs"
                      onClick={() => {
                        if (!userId) return;
                        unmuteUser(userId, row.id);
                        void reloadMutedSection();
                      }}
                    >
                      Dejar de silenciar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}

      {profileTab === "posts" ? (
        <div className="relative w-full">
          <h2 className="sr-only">Publicaciones</h2>
          <p className="sr-only">
            {postsSubTab === "mine"
              ? "Tus publicaciones en cuadrícula. Pulsa el icono de guardados para ver las guardadas en este dispositivo."
              : "Publicaciones guardadas desde el menú en Inicio."}
          </p>

          <div
            className="flex items-end justify-center gap-12 border-b border-neutral-800 pb-2 sm:gap-16 light:border-zinc-200"
            role="tablist"
            aria-label="Vista de publicaciones"
          >
            <button
              type="button"
              role="tab"
              aria-selected={postsSubTab === "mine"}
              aria-label="Mis publicaciones"
              title="Mis publicaciones"
              onClick={() => setPostsSubTab("mine")}
              className={[
                "inline-flex flex-col items-center rounded-lg px-3 pt-2 outline-none transition focus-visible:ring-2 focus-visible:ring-goi-gold/45 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 light:focus-visible:ring-offset-white",
                postsSubTab === "mine"
                  ? "border-t-2 border-goi-gold text-goi-gold healthy:border-goi-gold/38 healthy:text-goi-gold-dim"
                  : "border-t-2 border-transparent text-neutral-500 hover:text-neutral-300 light:text-zinc-500 light:hover:text-zinc-800",
              ].join(" ")}
            >
              <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden>
                <path
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                  d="M4 5h6v6H4V5zm10 0h6v6h-6V5zM4 13h6v6H4v-6zm10 0h6v6h-6v-6z"
                />
              </svg>
              <span
                className={[
                  "mt-1 text-[10px] font-semibold uppercase tracking-wide",
                  postsSubTab === "mine"
                    ? "text-goi-gold healthy:text-goi-gold-dim"
                    : "text-neutral-500 light:text-zinc-500",
                ].join(" ")}
              >
                Mías
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={postsSubTab === "saved"}
              aria-label="Guardados"
              title="Guardados"
              onClick={() => setPostsSubTab("saved")}
              className={[
                "inline-flex flex-col items-center rounded-lg px-3 pt-2 outline-none transition focus-visible:ring-2 focus-visible:ring-goi-gold/45 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 light:focus-visible:ring-offset-white",
                postsSubTab === "saved"
                  ? "border-t-2 border-goi-gold text-goi-gold healthy:border-goi-gold/38 healthy:text-goi-gold-dim"
                  : "border-t-2 border-transparent text-neutral-500 hover:text-neutral-300 light:text-zinc-500 light:hover:text-zinc-800",
              ].join(" ")}
            >
              <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden>
                <path
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 4h12v17l-6-4-6 4V4z"
                />
              </svg>
              <span
                className={[
                  "mt-1 text-[10px] font-semibold uppercase tracking-wide",
                  postsSubTab === "saved"
                    ? "text-goi-gold healthy:text-goi-gold-dim"
                    : "text-neutral-500 light:text-zinc-500",
                ].join(" ")}
              >
                Guardados
              </span>
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 light:text-zinc-500">
              Filtro
            </span>
            {(["all", "photos", "recent"] as const).map((fid) => (
              <button
                key={fid}
                type="button"
                className={[
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                  postsMineFilter === fid
                    ? "border-goi-gold/50 bg-goi-gold/15 text-goi-gold healthy:border-goi-gold/38 healthy:bg-goi-gold/[0.11] healthy:text-goi-gold-dim"
                    : "border-neutral-700/80 text-neutral-400 hover:border-neutral-500 light:border-zinc-300 light:text-zinc-600",
                ].join(" ")}
                onClick={() => setPostsMineFilter(fid)}
              >
                {fid === "all" ? "Todas" : fid === "photos" ? "Con foto" : "Recientes"}
              </button>
            ))}
          </div>

          {postsSubTab === "mine" && pinnedPost ? (
            <div className="mt-3 rounded-xl border border-goi-gold/35 bg-goi-gold/5 px-3 py-2 text-xs light:border-goi-gold/35 light:bg-goi-gold/[0.08] healthy:border-goi-gold/30 healthy:bg-goi-gold/[0.07]">
              <span className="font-semibold text-goi-gold healthy:text-goi-gold-dim">Destacada · </span>
              <span className="text-neutral-300 light:text-zinc-800">
                {pinnedPost.content.trim()
                  ? pinnedPost.content.slice(0, 120) + (pinnedPost.content.length > 120 ? "…" : "")
                  : "Publicación con medios"}
              </span>
            </div>
          ) : null}

          {postsError ? <p className="mt-2 text-sm text-red-400 light:text-red-700">{postsError}</p> : null}
          {timelineError ? <p className="mt-2 text-sm text-red-400 light:text-red-700">{timelineError}</p> : null}

          {postsSubTab === "saved" && !timelineLoading && !timelineError && savedOrphansCount > 0 ? (
            <div
              className="mt-3 flex flex-col gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between light:border-goi-gold/38 light:bg-goi-gold/[0.09] healthy:border-goi-gold/36 healthy:bg-goi-gold/[0.1]"
              role="status"
            >
              <p className="m-0 text-xs leading-relaxed text-amber-100/95 light:text-goi-gold-dim healthy:text-goi-gold-dim">
                Hay {savedOrphansCount} guardado{savedOrphansCount === 1 ? "" : "s"} que ya no aparecen en el Inicio
                (borrados o fuera de alcance). Puedes limpiar la lista local.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="shrink-0 self-start !py-1.5 !text-xs sm:self-auto"
                onClick={() => handlePruneSavedOrphans()}
              >
                Limpiar lista
              </Button>
            </div>
          ) : null}

          {postsListLoading ? (
            <div className="-mx-4 mt-4 w-[calc(100%+2rem)] sm:-mx-6 sm:w-[calc(100%+3rem)]">
              <ProfilePostsMosaicSkeleton layout="grid" />
            </div>
          ) : postsSubTab === "mine" && myPosts.length === 0 ? (
            <EmptyState
              showIcon
              className="mt-4"
              message="Aún no tienes publicaciones. Abre Inicio y crea tu primera publicación."
            />
          ) : postsSubTab === "mine" && myPosts.length > 0 && filteredMyPosts.length === 0 ? (
            <EmptyState
              showIcon
              className="mt-4"
              message="Ninguna publicación coincide con el filtro. Cambia a «Todas» o «Con foto»."
            />
          ) : postsSubTab === "saved" && savedPostsOrdered.length === 0 ? (
            <EmptyState
              showIcon
              className="mt-4"
              message="No tienes publicaciones guardadas. En Inicio, abre el menú ··· en una tarjeta y elige Guardar publicación."
            />
          ) : postsSubTab === "saved" && savedPostsOrdered.length > 0 && filteredSavedPosts.length === 0 ? (
            <EmptyState
              showIcon
              className="mt-4"
              message="Ningún guardado coincide con el filtro (p. ej. «Con foto»)."
            />
          ) : (
            <>
              <div className="-mx-4 mt-3 w-[calc(100%+2rem)] sm:-mx-6 sm:mt-4 sm:w-[calc(100%+3rem)]">
                <ProfilePostsMosaic
                  posts={displayedPosts}
                  selectedId={selectedPostId}
                  layout="grid"
                  pinnedPostId={postsSubTab === "mine" ? user?.pinnedPostId?.trim() || null : null}
                  onSelect={(id) => setSelectedPostId((current) => (current === id ? null : id))}
                />
              </div>

              {postsSubTab === "mine" && myPostsNextCursor ? (
                <div ref={profilePostsLoadMoreRef} className="h-10 w-full" aria-hidden />
              ) : null}
              {postsSubTab === "mine" && myPostsLoadingMore ? (
                <p className="mt-2 text-center text-[11px] text-neutral-500 light:text-zinc-500">
                  Cargando más publicaciones…
                </p>
              ) : null}

              {selectedPostPanel}

              {!selectedPost ? (
                <p className="mt-3 text-xs text-neutral-500 light:text-zinc-600">
                  Pulsa una miniatura para ver texto completo, estadísticas y acciones.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {profileTab === "sessions" ? (
        <>
          {sessionsError ? <p className="m-0 text-sm text-red-400 light:text-red-700">{sessionsError}</p> : null}
          <WorkoutSessionsHistory
            title="Entrenamientos registrados"
            description={
              <>
                Lo que anotas en Rutinas aparece aquí. Para registrar entrenos nuevos o gestionar el historial completo,
                usa la pestaña <strong className="font-semibold text-neutral-400 light:text-zinc-700">Rutinas</strong>.
              </>
            }
            sessions={sessions}
            loading={sessionsLoading}
            emptyMessage="Aún no hay entrenamientos. Regístralos desde la pestaña Rutinas."
            showDelete={false}
          />
        </>
      ) : null}

      {previewOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm light:bg-zinc-900/50"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setPreviewOpen(false);
              }}
            >
              <div
                className="max-h-[min(90vh,640px)] w-full max-w-md overflow-y-auto rounded-2xl border border-neutral-700 bg-zinc-950 p-5 shadow-2xl light:border-zinc-200 light:bg-white"
                role="dialog"
                aria-modal="true"
                aria-labelledby="profile-preview-title"
              >
                <h2 id="profile-preview-title" className="m-0 text-lg font-semibold text-neutral-50 light:text-zinc-900">
                  Vista previa pública
                </h2>
                <p className="mt-1 text-xs text-neutral-500 light:text-zinc-600">
                  Así se ve tu cabecera y datos públicos (sin email ni acciones de edición).
                </p>
                <div className="mt-4 overflow-hidden rounded-xl border border-neutral-800 light:border-zinc-200">
                  <div className="relative h-28">
                    {bannerUrl.trim() &&
                    (/^https?:\/\//i.test(bannerUrl) ||
                      /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(bannerUrl)) ? (
                      <img src={bannerUrl} alt="" className="absolute inset-0 size-full object-cover" />
                    ) : (
                      <div
                        className="absolute inset-0 bg-gradient-to-br from-goi-gold/20 via-neutral-900 to-zinc-950 encendido:from-orange-200/50 healthy:from-goi-gold/18 light:via-zinc-100 light:to-white"
                        aria-hidden
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 to-transparent light:from-white/95" />
                  </div>
                  <div className="relative -mt-10 flex gap-3 px-4 pb-4">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-full ring-2 ring-zinc-950 light:ring-white">
                      <Avatar src={avatarUrl} alt="" fill className="ring-0" />
                    </div>
                    <div className="min-w-0 pt-6">
                      <p className="truncate text-base font-semibold text-neutral-100 light:text-zinc-900">
                        @{username.trim() || "usuario"}
                      </p>
                      {location.trim() ? (
                        <p className="text-xs text-neutral-500 light:text-zinc-600">{location.trim()}</p>
                      ) : null}
                      {goal.trim() ? <p className="text-sm text-goi-gold/90">{goal}</p> : null}
                      <p className="mt-1 text-sm text-neutral-400 light:text-zinc-600">
                        {bio.trim() ? bio : "Sin biografía."}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setPreviewOpen(false)}>
                    Cerrar
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

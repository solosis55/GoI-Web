import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createPortal, flushSync } from "react-dom";
import { getFollowers, getFollowing, getUsers, toggleFollow } from "../api/authApi";
import { getStories } from "../api/storiesApi";
import {
  createComment,
  createPost,
  deletePost,
  getNotifications,
  getFeedPage,
  toggleLike,
  updatePost,
} from "../api/postsApi";
import { getExercises } from "../api/exercisesApi";
import { getWorkoutSessions } from "../api/workoutSessionsApi";
import { getWorkouts } from "../api/workoutsApi";
import { CreateStoryModal } from "../components/feed/CreateStoryModal";
import { FeedSidebar, type FeedSidebarPanel } from "../components/feed/FeedSidebar";
import {
  CreatePostForm,
  type ComposerTransferState,
  type PendingPostImage,
} from "../components/feed/CreatePostForm";
import { CreatePostTrainingForm } from "../components/feed/CreatePostTrainingForm";
import { CreatePostFormatChooser } from "../components/feed/CreatePostFormatChooser";
import { CreatePostFormatSegment } from "../components/feed/CreatePostFormatSegment";
import { FeedNotificationsBell } from "../components/feed/FeedNotificationsBell";
import { FeedModeTabs, type FeedScope } from "../components/feed/FeedModeTabs";
import { FeedReportModal } from "../components/feed/FeedReportModal";
import { PostItem } from "../components/feed/PostItem";
import { UserPublicProfileModal } from "../components/feed/UserPublicProfileModal";
import { StoriesRow } from "../components/feed/StoriesRow";
import { SquareImageCropEditor } from "../components/feed/SquareImageCropEditor";
import { StoryViewerModal } from "../components/feed/StoryViewerModal";
import { EmptyState } from "../components/ui/EmptyState";
import { StatusMessage } from "../components/ui/StatusMessage";
import { useAuth } from "../context/AuthContext";
import type { DiscoverUser } from "../types/auth";
import type { Exercise } from "../types/exercise";
import type { FeedStoryAuthor } from "../types/story";
import type { FeedNotification, NotificationsResponse, Post } from "../types/post";
import type { Workout } from "../types/workout";
import type { WorkoutSessionWithTitle } from "../types/workoutSession";
import { feedDayKey, formatFeedDayLabel } from "../utils/feedPostDate";
import { getErrorMessage } from "../utils/errorMessages";
import {
  aggregateMuscleHitsFromSessions,
  countSessionsThisWeek,
  emptyMuscleHits,
} from "../utils/musclePentagonStats";
import { readViewportScrollY, writeViewportScrollY } from "../utils/viewportScroll";
import type { MentionPickUser } from "../utils/mentionAutocomplete";
import { buildMentionDirectory } from "../utils/mentionText";
import { applyPostTemplate } from "../utils/postComposerTemplates";
import { resolveDefaultPostVisibility } from "../constants/createPost";
import type { PostFormat } from "../constants/postFormat";
import { validateCreatePost } from "../utils/createPostValidation";
import { compressManyImageFiles, POST_IMAGE_MAX_FILES } from "../utils/postImages";
import {
  clearPostCreateDraft,
  readPostCreateDraft,
  writePostCreateDraft,
} from "../utils/postCreateDraft";
import { useMentionRecents } from "../hooks/useMentionRecents";
import { useNearViewport } from "../hooks/useNearViewport";
import {
  appendLocalReport,
  clearMutedUsers,
  OPEN_FEED_COMPOSER_SESSION_KEY,
  loadMutedUserIds,
  loadSavedPostIds,
  muteUser,
  toggleSavedPost,
} from "../utils/feedLocalPrefs";

const FEED_SCOPE_STORAGE_KEY = "goi:feedScope";
const FEED_MODE_LEGACY_KEY = "goi:feedMode";
const FEED_SIDEBAR_PANEL_KEY = "goi:feedSidebarPanel";
const FEED_PAGE_SIZE = 20;

function readStoredFeedSidebarPanel(): FeedSidebarPanel {
  try {
    const raw = sessionStorage.getItem(FEED_SIDEBAR_PANEL_KEY);
    if (raw === "suggestions" || raw === "workouts" || raw === "social") return raw;
    /** Legacy: `stats` mezclaba métricas sociales → panel Comunidad. */
    if (raw === "stats") return "social";
  } catch {
    /* ignore */
  }
  return "suggestions";
}

function readStoredFeedScope(): FeedScope {
  try {
    const raw = sessionStorage.getItem(FEED_SCOPE_STORAGE_KEY);
    if (raw === "following" || raw === "all") return raw;
    if (raw === "saved") return "all";
    const leg = sessionStorage.getItem(FEED_MODE_LEGACY_KEY);
    if (leg === "following" || leg === "all") return leg;
    if (leg === "saved") return "all";
  } catch {
    /* ignore */
  }
  return "all";
}

function postMatchesQuery(post: Post, qRaw: string): boolean {
  const q = qRaw.trim().toLowerCase();
  if (!q) return true;
  if (post.content.toLowerCase().includes(q)) return true;
  const author = post.authorUsername.toLowerCase();
  if (author.includes(q)) return true;
  if (q.startsWith("@")) {
    const handle = q.slice(1);
    if (handle && author.includes(handle)) return true;
  }
  return false;
}

function FeedTimelineSkeleton() {
  const bar = "rounded-md bg-neutral-800 light:bg-zinc-200";
  const block = (
    <div className="animate-pulse rounded-lg border border-neutral-800/90 bg-black/50 p-4 light:border-zinc-200 light:bg-white/90">
      <div className="flex gap-3">
        <div className={`size-11 shrink-0 rounded-full ${bar}`} />
        <div className="min-w-0 flex-1 space-y-3 pt-0.5">
          <div className={`h-2.5 w-36 max-w-[50%] ${bar}`} />
          <div className={`h-2 w-full ${bar}`} />
          <div className={`h-2 w-11/12 max-w-full ${bar}`} />
          <div className={`h-2 w-2/3 max-w-[70%] ${bar}`} />
        </div>
      </div>
    </div>
  );
  return (
    <div className="mt-2 space-y-3" aria-busy="true" aria-label="Cargando publicaciones">
      {block}
      {block}
    </div>
  );
}

type FeedPageProps = {
  /** Desde Perfil: centrar esta publicación en el timeline cuando el feed cargue (el `<li>` usa `feed-post-{id}`). */
  focusPostId?: string | null;
  onFocusPostHandled?: () => void;
  /** Abre la pestaña Perfil con el perfil público de ese usuario (cierra el modal previo). */
  onNavigateToExternalProfile?: (userId: string, followingIds: string[]) => void;
  /** Sidebar «Ir al perfil»: va al perfil propio (el modal público no se usa para la cuenta actual). */
  onGoToOwnProfile?: () => void;
  /** Posts Training propios: ir al historial de entrenamientos (sesiones hechas en móvil). */
  onGoToWorkouts?: () => void;
};

function FeedHomeAccentIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3 4 9v11h16V9l-8-6Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
        className="text-goi-gold/50"
      />
      <path
        d="M9.5 21V12h5v9"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-goi-gold/85"
      />
    </svg>
  );
}

function GymStoriesBrandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.2" className="text-goi-gold/55" />
      <circle cx="12" cy="12" r="3" fill="currentColor" className="text-goi-gold" />
      <path
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        d="M12 5.5v2.5M12 16v2.5M5.5 12h2.5M16 12h2.5"
        className="text-goi-gold/75"
      />
    </svg>
  );
}

export function FeedPage({
  focusPostId = null,
  onFocusPostHandled,
  onNavigateToExternalProfile,
  onGoToOwnProfile,
  onGoToWorkouts,
}: FeedPageProps = {}) {
  const { user, logout } = useAuth();

  const handleSwitchAccount = useCallback(() => {
    if (
      window.confirm(
        "¿Cambiar de cuenta? Se cerrará la sesión actual y podrás iniciar sesión con otra cuenta.",
      )
    ) {
      logout();
    }
  }, [logout]);
  const userId = user?.id;
  const [posts, setPosts] = useState<Post[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [content, setContent] = useState("");
  const [composerFormat, setComposerFormat] = useState<PostFormat | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [postVisibility, setPostVisibility] = useState<"public" | "followers" | "private">("public");
  const [draftImages, setDraftImages] = useState<PendingPostImage[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [composerTransferState, setComposerTransferState] = useState<ComposerTransferState | null>(null);
  const [storyAuthorsFromApi, setStoryAuthorsFromApi] = useState<FeedStoryAuthor[]>([]);
  const [storySeenRevision, setStorySeenRevision] = useState(0);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyViewerAuthorIdx, setStoryViewerAuthorIdx] = useState(0);
  const [storyViewerSlideIdx, setStoryViewerSlideIdx] = useState(0);
  const [createStoryOpen, setCreateStoryOpen] = useState(false);
  const [notifications, setNotifications] = useState<FeedNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifRefreshing, setNotifRefreshing] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [commentByPostId, setCommentByPostId] = useState<Record<string, string>>({});
  const [discoverUsers, setDiscoverUsers] = useState<DiscoverUser[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followerIds, setFollowerIds] = useState<string[]>([]);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSessionWithTitle[]>([]);
  const [exercisesCatalog, setExercisesCatalog] = useState<Exercise[]>([]);
  const [savedPostIdSet, setSavedPostIdSet] = useState<Set<string>>(() => new Set());
  const [mutedUserIdSet, setMutedUserIdSet] = useState<Set<string>>(() => new Set());
  const [feedQuery, setFeedQuery] = useState("");
  const [reportTarget, setReportTarget] = useState<{
    postId: string;
    authorId: string;
    authorUsername: string;
  } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [feedScope, setFeedScopeInternal] = useState<FeedScope>(() => readStoredFeedScope());
  const setFeedScope = useCallback((scope: FeedScope) => {
    try {
      sessionStorage.setItem(FEED_SCOPE_STORAGE_KEY, scope);
    } catch {
      /* ignore */
    }
    setFeedScopeInternal(scope);
  }, []);
  const [feedSidebarPanel, setFeedSidebarPanel] = useState<FeedSidebarPanel>(() => readStoredFeedSidebarPanel());
  const [pulsePostId, setPulsePostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMoreFeed, setLoadingMoreFeed] = useState(false);
  const [feedHasMore, setFeedHasMore] = useState(false);
  const feedCursorRef = useRef<string | null>(null);
  const feedHasMoreRef = useRef(false);
  const loadingMoreFeedRef = useRef(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [composerHydrated, setComposerHydrated] = useState(false);
  const [mobileComposerOpen, setMobileComposerOpen] = useState(false);
  const [cropTarget, setCropTarget] = useState<{ imageId: string; sourceUrl: string; sourceName: string } | null>(
    null,
  );
  const { recentMentionIds, recordMentionPick: handleMentionPicked } = useMentionRecents(user?.id);

  useEffect(() => {
    if (!userId) return;
    try {
      if (sessionStorage.getItem(OPEN_FEED_COMPOSER_SESSION_KEY) === "1") {
        sessionStorage.removeItem(OPEN_FEED_COMPOSER_SESSION_KEY);
        setComposerFormat(null);
        setComposerHydrated(false);
        setMobileComposerOpen(true);
      }
    } catch {
      /* ignore */
    }
  }, [userId]);

  const myPostsCount = useMemo(
    () => (user ? posts.filter((post) => post.userId === user.id).length : 0),
    [posts, user]
  );
  const workoutSidebarMetrics = useMemo(() => {
    const workoutById = new Map(workouts.map((w) => [w.id, w]));
    const exerciseById = new Map(exercisesCatalog.map((e) => [e.id, e]));
    const muscleHits =
      workoutSessions.length && exercisesCatalog.length
        ? aggregateMuscleHitsFromSessions(workoutSessions, workoutById, exerciseById)
        : emptyMuscleHits();
    return {
      totalSessions: workoutSessions.length,
      sessionsThisWeek: countSessionsThisWeek(workoutSessions),
      routinesCreated: workouts.length,
      muscleHits,
    };
  }, [workoutSessions, workouts, exercisesCatalog]);
  const suggestedUsers = useMemo(() => {
    return discoverUsers.slice(0, 6);
  }, [discoverUsers]);

  const mentionPickList = useMemo((): MentionPickUser[] => {
    const out: MentionPickUser[] = [];
    const seenByUserId = new Set<string>();
    const recentIndexById = new Map(recentMentionIds.map((id, idx) => [id, idx] as const));
    const pushCandidate = (candidate: MentionPickUser) => {
      if (seenByUserId.has(candidate.id)) return;
      seenByUserId.add(candidate.id);
      out.push({
        ...candidate,
        isFollowing: candidate.id !== user?.id && followingIds.includes(candidate.id),
        recentRank: recentIndexById.get(candidate.id) ?? null,
      });
    };
    if (user) {
      pushCandidate({ id: user.id, username: user.username });
    }
    for (const d of discoverUsers) {
      pushCandidate({ id: d.id, username: d.username });
    }
    for (const p of posts) {
      pushCandidate({ id: p.userId, username: p.authorUsername });
      for (const c of p.comments) {
        pushCandidate({ id: c.userId, username: c.authorUsername });
      }
    }
    return out;
  }, [user, discoverUsers, posts, followingIds, recentMentionIds]);

  const mentionDirectory = useMemo(() => buildMentionDirectory(mentionPickList), [mentionPickList]);

  const handleApplyComposerTemplate = useCallback((templateText: string) => {
    setContent((current) => applyPostTemplate(current, templateText));
  }, []);

  const storyStripAuthors = useMemo((): FeedStoryAuthor[] => {
    if (!user) return [];
    const withoutSelf = storyAuthorsFromApi.filter((a) => a.userId !== user.id);
    const mine = storyAuthorsFromApi.find((a) => a.userId === user.id);
    const selfRow: FeedStoryAuthor =
      mine ?? {
        userId: user.id,
        authorUsername: user.username,
        authorAvatarUrl: user.avatarUrl ?? "",
        slides: [],
      };
    return [selfRow, ...withoutSelf];
  }, [storyAuthorsFromApi, user]);

  const storyViewerAuthors = useMemo(
    () => storyStripAuthors.filter((a) => a.slides.length > 0),
    [storyStripAuthors],
  );

  const gymStoriesActiveCount = useMemo(
    () => storyStripAuthors.filter((a) => a.slides.length > 0).length,
    [storyStripAuthors],
  );

  const refreshStoriesOnly = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getStories();
      setStoryAuthorsFromApi(data.authors);
    } catch {
      /* no bloquea el feed */
    }
  }, [user]);

  const handleStoryCellClick = useCallback(
    (clickedUserId: string) => {
      if (!user) return;
      const row = storyStripAuthors.find((a) => a.userId === clickedUserId);
      if (!row) return;
      if (clickedUserId === user.id && row.slides.length === 0) {
        setCreateStoryOpen(true);
        return;
      }
      const idx = storyViewerAuthors.findIndex((a) => a.userId === clickedUserId);
      if (idx === -1) return;
      setStoryViewerAuthorIdx(idx);
      setStoryViewerSlideIdx(0);
      setStoryViewerOpen(true);
    },
    [storyStripAuthors, storyViewerAuthors, user],
  );
  const followerIdSet = useMemo(() => new Set(followerIds), [followerIds]);

  const postsAfterMute = useMemo(
    () => posts.filter((p) => !mutedUserIdSet.has(p.userId)),
    [posts, mutedUserIdSet],
  );

  const postsFiltered = useMemo(
    () => (feedQuery.trim() ? postsAfterMute.filter((p) => postMatchesQuery(p, feedQuery)) : postsAfterMute),
    [postsAfterMute, feedQuery],
  );

  const todayFeedDayKey = useMemo(() => feedDayKey(new Date().toISOString()), []);
  const todayVisibleCount = useMemo(
    () => postsFiltered.filter((p) => feedDayKey(p.createdAt) === todayFeedDayKey).length,
    [postsFiltered, todayFeedDayKey],
  );

  const emptyFeedMessage = useMemo(() => {
    if (loading) return "";
    if (feedQuery.trim() && postsAfterMute.length > 0 && postsFiltered.length === 0) {
      return `Ninguna publicación coincide con «${feedQuery.trim()}». Prueba otras palabras o borra el filtro.`;
    }
    if (feedScope === "following") {
      return "Aún no hay publicaciones de personas que sigues. Prueba con «Todos» o sigue a alguien en el panel derecho.";
    }
    return "Aún no hay publicaciones en la comunidad. ¡Sé el primero en publicar algo!";
  }, [loading, feedScope, feedQuery, postsAfterMute.length, postsFiltered.length]);

  const scopeLabel = feedScope === "following" ? "Seguidos" : "Todos";
  const scopeDescription =
    feedScope === "following"
      ? "Solo cuentas que sigues (y tú)."
      : "Publicaciones de toda la comunidad.";

  type FeedTimelineEntry =
    | { kind: "day"; dayKey: string; label: string }
    | { kind: "post"; post: Post };

  const feedTimelineEntries = useMemo((): FeedTimelineEntry[] => {
    const out: FeedTimelineEntry[] = [];
    let prevDay = "";
    for (const post of postsFiltered) {
      const dayKey = feedDayKey(post.createdAt);
      if (dayKey && dayKey !== prevDay) {
        const label = formatFeedDayLabel(post.createdAt);
        if (label) out.push({ kind: "day", dayKey, label });
      }
      if (dayKey) prevDay = dayKey;
      out.push({ kind: "post", post });
    }
    return out;
  }, [postsFiltered]);

  /** Evita re-ejecutar el efecto de scroll al mutar posts (p. ej. like) mientras leemos el último array en el efecto. */
  const postsForFocusRef = useRef(posts);
  const postsFilteredForFocusRef = useRef(postsFiltered);
  postsForFocusRef.current = posts;
  postsFilteredForFocusRef.current = postsFiltered;

  const defaultPostVisibility = useMemo(
    () => resolveDefaultPostVisibility(user?.defaultPostVisibility),
    [user?.defaultPostVisibility],
  );

  const myWorkoutSessions = useMemo(
    () => (user ? workoutSessions.filter((s) => s.userId === user.id) : []),
    [workoutSessions, user],
  );

  const selectedSessionWorkoutTitle = useMemo(() => {
    const match = myWorkoutSessions.find((s) => s.id === selectedSessionId);
    return match?.workoutTitle ?? "";
  }, [myWorkoutSessions, selectedSessionId]);

  const composerValidation = useMemo(
    () => validateCreatePost(content, draftImages.length, composerFormat ?? "standard"),
    [content, draftImages.length, composerFormat],
  );

  const composerHasPendingChanges = useMemo(() => {
    if (!composerFormat) return false;
    return (
      content.trim().length > 0 ||
      draftImages.length > 0 ||
      postVisibility !== defaultPostVisibility ||
      selectedSessionId.length > 0
    );
  }, [
    composerFormat,
    content,
    draftImages.length,
    postVisibility,
    defaultPostVisibility,
    selectedSessionId,
  ]);

  const resetComposer = useCallback(() => {
    if (user?.id && composerFormat) {
      clearPostCreateDraft(user.id, composerFormat);
    }
    setContent("");
    setSelectedSessionId("");
    setPostVisibility(defaultPostVisibility);
    setDraftImages([]);
    setComposerFormat(null);
    setComposerHydrated(false);
  }, [defaultPostVisibility, composerFormat, user?.id]);

  const openComposer = useCallback(() => {
    setComposerFormat(null);
    setComposerHydrated(false);
    setMobileComposerOpen(true);
  }, []);

  const requestFormatChange = useCallback(
    (next: PostFormat) => {
      if (!user?.id || next === composerFormat) return;
      if (composerHasPendingChanges) {
        const ok = window.confirm(
          "Tienes un borrador en curso. Al cambiar de formato se cargará el borrador de ese tipo si existe.",
        );
        if (!ok) return;
        if (composerFormat) {
          writePostCreateDraft({
            userId: user.id,
            format: composerFormat,
            content,
            visibility: postVisibility,
            sessionId: selectedSessionId,
            sessionWorkoutTitle: selectedSessionWorkoutTitle,
          });
        }
      }
      setComposerHydrated(false);
      setComposerFormat(next);
    },
    [
      user?.id,
      composerFormat,
      composerHasPendingChanges,
      content,
      postVisibility,
      selectedSessionId,
      selectedSessionWorkoutTitle,
    ],
  );

  const handleSelectComposerFormat = useCallback((format: PostFormat) => {
    setComposerHydrated(false);
    setComposerFormat(format);
  }, []);

  const requestCloseComposer = useCallback(() => {
    if (composerHasPendingChanges) {
      const ok = window.confirm(
        "Tienes cambios sin publicar. ¿Cerrar igualmente? Tu borrador se mantiene guardado hasta descartarlo.",
      );
      if (!ok) return;
    }
    if (user?.id && composerFormat) {
      writePostCreateDraft({
        userId: user.id,
        format: composerFormat,
        content,
        visibility: postVisibility,
        sessionId: selectedSessionId,
        sessionWorkoutTitle: selectedSessionWorkoutTitle,
      });
    }
    setMobileComposerOpen(false);
    setComposerFormat(null);
    setComposerHydrated(false);
  }, [
    composerHasPendingChanges,
    user?.id,
    composerFormat,
    content,
    postVisibility,
    selectedSessionId,
    selectedSessionWorkoutTitle,
  ]);

  useEffect(() => {
    if (!mobileComposerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileComposerOpen]);

  useEffect(() => {
    if (!composerFormat || !user?.id || composerHydrated) return;
    const draft = readPostCreateDraft(user.id, composerFormat);
    if (draft) {
      setContent(draft.content);
      setPostVisibility(draft.visibility);
      setSelectedSessionId(draft.sessionId);
      setDraftImages([]);
      setMessage("Borrador recuperado.");
    } else {
      setContent("");
      setPostVisibility(defaultPostVisibility);
      setSelectedSessionId("");
      setDraftImages([]);
    }
    setComposerHydrated(true);
  }, [composerFormat, user?.id, composerHydrated, defaultPostVisibility]);

  useEffect(() => {
    if (!composerHydrated || !user?.id || !composerFormat) return;
    writePostCreateDraft({
      userId: user.id,
      format: composerFormat,
      content,
      visibility: postVisibility,
      sessionId: selectedSessionId,
      sessionWorkoutTitle: selectedSessionWorkoutTitle,
    });
  }, [
    composerHydrated,
    user?.id,
    composerFormat,
    content,
    postVisibility,
    selectedSessionId,
    selectedSessionWorkoutTitle,
  ]);

  useEffect(() => {
    try {
      sessionStorage.setItem(FEED_SIDEBAR_PANEL_KEY, feedSidebarPanel);
    } catch {
      /* ignore */
    }
  }, [feedSidebarPanel]);

  useEffect(() => {
    if (!userId) {
      setSavedPostIdSet(new Set());
      setMutedUserIdSet(new Set());
      return;
    }
    setSavedPostIdSet(new Set(loadSavedPostIds(userId)));
    setMutedUserIdSet(new Set(loadMutedUserIds(userId)));
  }, [userId]);

  useEffect(() => {
    function onDocKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.closest("input, textarea, select, [contenteditable=true]")) return;
      e.preventDefault();
      searchInputRef.current?.focus();
    }
    document.addEventListener("keydown", onDocKey);
    return () => document.removeEventListener("keydown", onDocKey);
  }, []);

  useEffect(() => {
    if (!focusPostId) return;
    if (loading) return;

    const postsSnap = postsForFocusRef.current;
    const filteredSnap = postsFilteredForFocusRef.current;

    const inFeed = postsSnap.some((p) => p.id === focusPostId);
    if (!inFeed) {
      onFocusPostHandled?.();
      return;
    }

    const inTimeline = filteredSnap.some((p) => p.id === focusPostId);
    if (!inTimeline) {
      setFeedScope("all");
      setFeedQuery("");
      return;
    }

    let highlightTimer = 0;
    const rid = window.requestAnimationFrame(() => {
      document.getElementById(`feed-post-${focusPostId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      setPulsePostId(focusPostId);
      highlightTimer = window.setTimeout(() => setPulsePostId(null), 2600);
      onFocusPostHandled?.();
    });
    return () => {
      window.cancelAnimationFrame(rid);
      window.clearTimeout(highlightTimer);
    };
  }, [focusPostId, loading, feedScope, feedQuery, onFocusPostHandled, setFeedScope]);

  const refreshNotifications = useCallback(async (): Promise<NotificationsResponse | null> => {
    if (!userId) return null;
    setNotifRefreshing(true);
    try {
      const res = await getNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
      return res;
    } catch {
      /* no bloquea el feed */
      return null;
    } finally {
      setNotifRefreshing(false);
    }
  }, [userId]);

  const fetchFeedPosts = useCallback(
    async (scope: FeedScope, mode: "reset" | "more") => {
      if (!userId) return;
      if (mode === "more") {
        if (!feedHasMoreRef.current || loadingMoreFeedRef.current || !feedCursorRef.current) return;
        loadingMoreFeedRef.current = true;
        setLoadingMoreFeed(true);
      } else {
        setLoading(true);
        feedCursorRef.current = null;
      }
      if (mode === "reset") setError("");
      try {
        const cursor = mode === "more" ? feedCursorRef.current : null;
        const page = await getFeedPage(scope, FEED_PAGE_SIZE, cursor);
        const newPosts = page.items
          .filter((item): item is { kind: "post"; post: Post } => item.kind === "post")
          .map((item) => item.post);
        setPosts((prev) => {
          if (mode !== "more") return newPosts;
          const seen = new Set(prev.map((p) => p.id));
          const fresh = newPosts.filter((p) => !seen.has(p.id));
          if (fresh.length === 0) {
            feedHasMoreRef.current = false;
            setFeedHasMore(false);
            feedCursorRef.current = null;
            return prev;
          }
          return [...prev, ...fresh];
        });
        if (mode === "more" && newPosts.length > 0) {
          feedCursorRef.current = page.nextCursor;
          feedHasMoreRef.current = page.hasMore;
          setFeedHasMore(page.hasMore);
        } else if (mode !== "more") {
          feedCursorRef.current = page.nextCursor;
          feedHasMoreRef.current = page.hasMore;
          setFeedHasMore(page.hasMore);
        }
      } catch (postsError) {
        if (mode === "reset") setPosts([]);
        setError(
          getErrorMessage(postsError, "No se pudieron cargar las publicaciones (Goi Server / Neon)."),
        );
      } finally {
        if (mode === "more") {
          loadingMoreFeedRef.current = false;
          setLoadingMoreFeed(false);
        } else {
          setLoading(false);
        }
      }
    },
    [userId],
  );

  const loadFeedAuxiliary = useCallback(async () => {
    if (!userId) return;
    setMessage("");
    try {
      const [
        workoutsResult,
        usersResult,
        followingResult,
        followersResult,
        sessionsResult,
        exercisesResult,
        notifResult,
        storiesResult,
      ] = await Promise.allSettled([
        getWorkouts(),
        getUsers(),
        getFollowing(userId),
        getFollowers(userId),
        getWorkoutSessions(),
        getExercises(),
        getNotifications(),
        getStories(),
      ]);

      if (workoutsResult.status === "fulfilled") {
        const mine = workoutsResult.value.filter((workout) => workout.userId === userId);
        setWorkouts(mine);
      }

      if (usersResult.status === "fulfilled") {
        setDiscoverUsers(usersResult.value.users);
      }

      if (followingResult.status === "fulfilled") {
        setFollowingIds(followingResult.value.followingIds);
      }

      if (followersResult.status === "fulfilled") {
        setFollowerIds(followersResult.value.followerIds ?? []);
      }

      if (sessionsResult.status === "fulfilled") {
        setWorkoutSessions(Array.isArray(sessionsResult.value) ? sessionsResult.value : []);
      }

      if (exercisesResult.status === "fulfilled") {
        setExercisesCatalog(Array.isArray(exercisesResult.value) ? exercisesResult.value : []);
      }

      if (notifResult.status === "fulfilled") {
        setNotifications(notifResult.value.notifications ?? []);
        setUnreadCount(notifResult.value.unreadCount ?? 0);
      }

      if (storiesResult.status === "fulfilled") {
        setStoryAuthorsFromApi(storiesResult.value.authors ?? []);
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError, "No se pudo cargar datos del feed"));
    }
  }, [userId]);

  const loadMoreFeed = useCallback(() => {
    void fetchFeedPosts(feedScope, "more");
  }, [fetchFeedPosts, feedScope]);

  const feedInfiniteEnabled = feedHasMore && postsFiltered.length > 0 && !loadingMoreFeed && !loading;
  const feedLoadMoreSentinelRef = useNearViewport(() => void loadMoreFeed(), feedInfiniteEnabled);

  async function handleToggleFollow(targetUserId: string) {
    if (!userId) return;
    setError("");
    try {
      const { following } = await toggleFollow(targetUserId);
      setFollowingIds((prev) =>
        following
          ? prev.includes(targetUserId)
            ? prev
            : [...prev, targetUserId]
          : prev.filter((id) => id !== targetUserId),
      );
    } catch (followError) {
      setError(getErrorMessage(followError, "No se pudo actualizar seguimiento"));
    }
  }

  const handleToggleSave = useCallback(
    (postId: string) => {
      if (!userId) return;
      const nowSaved = toggleSavedPost(userId, postId);
      setSavedPostIdSet((prev) => {
        const next = new Set(prev);
        if (nowSaved) next.add(postId);
        else next.delete(postId);
        return next;
      });
    },
    [userId],
  );

  const handleMuteAuthor = useCallback(
    (authorId: string) => {
      if (!userId) return;
      muteUser(userId, authorId);
      setMutedUserIdSet((prev) => new Set(prev).add(authorId));
    },
    [userId],
  );

  const handleUnmuteAll = useCallback(() => {
    if (!userId) return;
    clearMutedUsers(userId);
    setMutedUserIdSet(new Set());
  }, [userId]);

  const handleReportSubmit = useCallback(
    (reason: string) => {
      if (!userId || !reportTarget) return;
      appendLocalReport(userId, {
        postId: reportTarget.postId,
        authorId: reportTarget.authorId,
        reason,
      });
      setReportTarget(null);
      setMessage("Reporte guardado en este dispositivo.");
    },
    [userId, reportTarget],
  );

  useEffect(() => {
    if (!userId) return;
    void loadFeedAuxiliary();
  }, [userId, loadFeedAuxiliary]);

  useEffect(() => {
    if (!userId) return;
    void fetchFeedPosts(feedScope, "reset");
  }, [feedScope, userId, fetchFeedPosts]);

  async function handleDraftAddPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setComposerTransferState(null);
    setPhotoBusy(true);
    try {
      const compressed = await compressManyImageFiles(files, draftImages.length, (completed, total) => {
        if (!total) return;
        setComposerTransferState({
          phase: "processing",
          progress: (completed / total) * 100,
          message: `Comprimiendo imágenes (${completed}/${total})…`,
        });
      });
      setDraftImages((curr) =>
        [
          ...curr,
          ...compressed.map((img) => ({
            ...img,
            id:
              typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto
                ? globalThis.crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          })),
        ].slice(0, POST_IMAGE_MAX_FILES),
      );
      setComposerTransferState(null);
    } catch {
      setComposerTransferState({
        phase: "error",
        progress: 100,
        message: "No se pudieron procesar algunas imágenes. Prueba otros archivos JPG, PNG o WebP.",
      });
      setError("No se pudieron procesar algunas imágenes. Prueba otros archivos JPG, PNG o WebP.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || createBusy || !composerFormat) return;
    setError("");
    setMessage("");

    const validation = validateCreatePost(content, draftImages.length, composerFormat);
    if (!validation.canSubmit) {
      setError(validation.hint || "Revisa el contenido antes de publicar.");
      return;
    }

    const trimmed = content.trim();
    const sessionId = selectedSessionId.trim() || null;
    const publishingFormat = composerFormat;

    setCreateBusy(true);
    let uploadProgressTimer: number | null = null;
    try {
      setComposerTransferState({
        phase: "uploading",
        progress: draftImages.length > 0 ? 18 : 30,
        message:
          draftImages.length > 0
            ? "Subiendo publicación e imágenes…"
            : composerFormat === "training"
              ? "Publicando training…"
              : "Publicando…",
      });
      uploadProgressTimer = window.setInterval(() => {
        setComposerTransferState((current) => {
          if (!current || current.phase !== "uploading") return current;
          return {
            ...current,
            progress: Math.min(92, current.progress + 9),
          };
        });
      }, 180);
      const createdPost = await createPost({
        content: trimmed,
        format: publishingFormat,
        sessionId,
        visibility: postVisibility,
        ...(draftImages.length > 0 ? { uploadFiles: draftImages.map((img) => img.uploadFile) } : {}),
      });
      if (uploadProgressTimer) window.clearInterval(uploadProgressTimer);
      setComposerTransferState({
        phase: "uploading",
        progress: 100,
        message: publishingFormat === "training" ? "Training publicado." : "Publicación subida correctamente.",
      });
      clearPostCreateDraft(user.id, publishingFormat);
      setContent("");
      setSelectedSessionId("");
      setPostVisibility(defaultPostVisibility);
      setDraftImages([]);
      setComposerFormat(null);
      setComposerHydrated(false);
      setMobileComposerOpen(false);
      setComposerTransferState(null);
      setPosts((prev) => [createdPost, ...prev]);
      setMessage(publishingFormat === "training" ? "Training publicado." : "Publicación creada.");
    } catch (createError) {
      if (uploadProgressTimer) window.clearInterval(uploadProgressTimer);
      setComposerTransferState({
        phase: "error",
        progress: 100,
        message: "Falló la subida. Revisa tu conexión e inténtalo de nuevo.",
      });
      setError(getErrorMessage(createError, "No se pudo crear la publicación"));
    } finally {
      if (uploadProgressTimer) window.clearInterval(uploadProgressTimer);
      setCreateBusy(false);
    }
  }

  function reorderDraftImage(imageId: string, direction: "left" | "right") {
    setDraftImages((current) => {
      const index = current.findIndex((img) => img.id === imageId);
      if (index === -1) return current;
      const targetIndex = direction === "left" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = current.slice();
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  }

  function setDraftCoverImage(imageId: string) {
    setDraftImages((current) => {
      const index = current.findIndex((img) => img.id === imageId);
      if (index <= 0) return current;
      const next = current.slice();
      const [item] = next.splice(index, 1);
      next.unshift(item);
      return next;
    });
  }

  function openCropEditor(imageId: string) {
    if (photoBusy || createBusy) return;
    const target = draftImages.find((img) => img.id === imageId);
    if (!target) return;
    setCropTarget({ imageId, sourceUrl: target.dataUrl, sourceName: target.name });
  }

  useEffect(() => {
    if (!cropTarget) return;
    if (!draftImages.some((img) => img.id === cropTarget.imageId)) setCropTarget(null);
  }, [cropTarget, draftImages]);

  async function handleDeletePost(id: string) {
    if (!window.confirm("¿Seguro que quieres eliminar esta publicación?")) return;
    setError("");
    setMessage("");
    try {
      await deletePost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      setMessage("Publicación eliminada.");
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "No se pudo eliminar la publicación"));
    }
  }

  async function handleToggleLike(postId: string) {
    if (!userId) return;
    setError("");
    try {
      const { liked } = await toggleLike(postId);
      /** Antes de pintar: posición actual (tras await el usuario pudo desplazarse). */
      const scrollY = readViewportScrollY();
      flushSync(() => {
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id !== postId) return p;
            const was = !!p.likedByMe;
            let nextCount = p.likesCount;
            if (liked && !was) nextCount += 1;
            else if (!liked && was) nextCount = Math.max(0, nextCount - 1);
            return { ...p, likedByMe: liked, likesCount: nextCount };
          }),
        );
      });
      writeViewportScrollY(scrollY);
      requestAnimationFrame(() => writeViewportScrollY(scrollY));
    } catch (likeError) {
      setError(getErrorMessage(likeError, "No se pudo actualizar el like"));
    }
  }

  async function handleUpdatePost(
    postId: string,
    input: { content: string; visibility: "public" | "followers" | "private" },
  ) {
    if (!user) return;
    setError("");
    setMessage("");
    const target = posts.find((p) => p.id === postId);
    const hasPhotos = (target?.media?.length ?? 0) > 0;
    if (input.content.length > 280 || (!hasPhotos && input.content.trim().length < 4)) {
      setError("Revisa el texto: máximo 280 caracteres; sin fotos, al menos 4.");
      return;
    }
    try {
      const updatedPost = await updatePost(postId, input);
      setPosts((prev) => prev.map((p) => (p.id === postId ? updatedPost : p)));
      setMessage("Publicación actualizada.");
    } catch (updateError) {
      setError(getErrorMessage(updateError, "No se pudo actualizar la publicación"));
    }
  }

  async function handleCreateComment(postId: string) {
    if (!user) return;
    setError("");
    setMessage("");
    const contentValue = commentByPostId[postId]?.trim();
    if (!contentValue) return;
    if (contentValue.length > 180) {
      setError("El comentario no puede superar 180 caracteres");
      return;
    }

    try {
      const newComment = await createComment(postId, {
        content: contentValue,
      });
      setCommentByPostId((current) => ({ ...current, [postId]: "" }));
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const comments = [...p.comments, newComment].sort((a, b) =>
            a.createdAt < b.createdAt ? -1 : 1,
          );
          return { ...p, comments };
        }),
      );
      setMessage("Comentario publicado");
    } catch (commentError) {
      setError(getErrorMessage(commentError, "No se pudo comentar"));
    }
  }

  function getWorkoutTitle(workoutId: string | null) {
    if (!workoutId) return null;
    const workout = workouts.find((item) => item.id === workoutId);
    return workout?.title ?? "Rutina vinculada";
  }

  return (
    <section className="feed-layout grid w-full min-w-0 grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:gap-6">
      <section className="feed-main flex min-w-0 w-full flex-col gap-5 pb-20 lg:gap-6 lg:pb-0">
        <div className="mx-auto w-full max-w-xl sm:max-w-2xl">
        <header className="feed-page-header relative overflow-hidden rounded-2xl border border-neutral-800/75 bg-linear-to-b from-neutral-950 via-neutral-950 to-neutral-950/90 px-4 py-5 shadow-[0_14px_44px_-20px_rgba(0,0,0,0.65)] sm:px-6 sm:py-6 light:border-zinc-200/90 light:from-white light:via-white light:to-zinc-50 light:shadow-[0_14px_40px_-18px_rgba(24,24,27,0.12)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[2px] bg-linear-to-r from-goi-gold/85 via-goi-gold/40 to-transparent light:from-amber-500 healthy:from-goi-gold/88 light:via-amber-400/45 healthy:via-goi-gold/38"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-28 z-0 h-52 w-52 rounded-full bg-goi-gold/[0.07] blur-3xl encendido:bg-orange-400/16 healthy:bg-goi-gold/[0.11]"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
              <div className="hidden shrink-0 sm:grid sm:size-14 sm:place-items-center sm:rounded-2xl sm:border sm:border-goi-gold/30 sm:bg-goi-gold/[0.09] sm:shadow-inner sm:shadow-black/20 light:sm:bg-amber-50/90 healthy:sm:bg-goi-gold/[0.08]">
                <FeedHomeAccentIcon className="size-8" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-goi-gold-dim">GoI</p>
                  {user?.username ? (
                    <span className="rounded-full border border-neutral-700/85 bg-neutral-900/55 px-2.5 py-0.5 text-[10px] font-medium tabular-nums text-neutral-400 light:border-zinc-200 light:bg-zinc-100 light:text-zinc-600">
                      @{user.username}
                    </span>
                  ) : null}
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-neutral-50 sm:text-[1.7rem] light:text-zinc-900">
                  Inicio
                </h1>
                <p className="max-w-xl text-sm leading-relaxed text-neutral-400 light:text-zinc-600">
                  Historias efímeras, publicaciones y conversación con la comunidad en un solo lugar.
                </p>
              </div>
            </div>
            <div className="relative flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
              <button
                type="button"
                className="group relative hidden min-h-11 min-w-11 items-center justify-center rounded-xl border border-goi-gold/45 bg-goi-gold/12 px-3 text-sm font-semibold text-goi-gold shadow-sm shadow-goi-gold/10 transition hover:bg-goi-gold/22 hover:shadow-md hover:shadow-goi-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/45 sm:inline-flex"
                onClick={openComposer}
                aria-label="Crear publicación"
                title="Crear publicación"
              >
                <span aria-hidden className="text-lg font-light leading-none">
                  +
                </span>
                <span className="sr-only">Crear publicación</span>
                <span
                  role="tooltip"
                  className="pointer-events-none absolute right-0 top-full z-10 mt-2 hidden rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs font-medium text-neutral-200 shadow-lg group-hover:block group-focus-visible:block light:border-zinc-200 light:bg-white light:text-zinc-800"
                >
                  Nueva publicación
                </span>
              </button>
              {user ? (
                <FeedNotificationsBell
                  notifications={notifications}
                  unreadCount={unreadCount}
                  loading={notifRefreshing}
                  onRefresh={refreshNotifications}
                />
              ) : null}
            </div>
          </div>
        </header>
        </div>

        <section
          className="w-full min-w-0 border-b border-neutral-800/45 pb-6 light:border-zinc-200/85"
          aria-labelledby="feed-gym-stories-title"
        >
          {/* Mismo ancho útil que las publicaciones (columna central), como franja superior del feed */}
          <div className="mx-auto w-full min-w-0 max-w-xl sm:max-w-2xl px-4 sm:px-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span className="flex shrink-0 translate-y-[2px] items-center text-goi-gold healthy:text-goi-gold" aria-hidden>
                  <GymStoriesBrandIcon className="size-7 sm:size-8" />
                </span>
                <h2
                  id="feed-gym-stories-title"
                  className="text-base font-semibold tracking-tight text-neutral-100 sm:text-[1.05rem] light:text-zinc-900"
                >
                  GoI Daily
                </h2>
                {user && gymStoriesActiveCount > 0 ? (
                  <span className="inline-flex items-center rounded-full border border-goi-gold/25 bg-goi-gold/14 px-2 py-0.5 text-goi-gold light:border-goi-gold/40 light:bg-goi-gold/[0.11] healthy:border-goi-gold/32 healthy:bg-goi-gold/[0.11] light:text-goi-gold-dim healthy:text-goi-gold-dim">
                    <span className="inline tabular-nums text-[10px] font-semibold sm:hidden">{gymStoriesActiveCount}</span>
                    <span className="hidden text-[10px] font-semibold uppercase tracking-wide sm:inline">
                      {gymStoriesActiveCount} activa{gymStoriesActiveCount === 1 ? "" : "s"}
                    </span>
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-neutral-600/55 bg-neutral-900/25 text-[12px] font-semibold leading-none text-neutral-500 transition-colors hover:border-goi-gold/45 hover:text-goi-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/40 light:border-zinc-300 light:bg-white light:text-zinc-600 light:hover:border-amber-400/60 healthy:hover:border-goi-gold/34"
                title="Desliza horizontalmente. Anillo dorado: contenido nuevo para ti. Cada GoI Daily es visible unas ~24 h."
                aria-label="Ayuda sobre GoI Daily"
              >
                i
              </button>
            </div>

            <div className="mt-4 w-full min-w-0">
              {user ? (
                <StoriesRow
                  authors={storyStripAuthors}
                  currentUserId={user.id}
                  seenRevision={storySeenRevision}
                  onSelectAuthor={handleStoryCellClick}
                />
              ) : (
                <p className="text-center text-xs leading-relaxed text-neutral-500 light:text-zinc-600">
                  Inicia sesión para publicar historias (~24 h) y ver las de quien sigues.
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="mx-auto grid w-full min-w-0 max-w-xl gap-3 sm:max-w-2xl lg:gap-4">
        <FeedSidebar
          username={user?.username}
          avatarUrl={user?.avatarUrl}
          myPostsCount={myPostsCount}
          followingCount={followingIds.length}
          followersCount={followerIds.length}
          workoutTotalSessions={workoutSidebarMetrics.totalSessions}
          workoutSessionsThisWeek={workoutSidebarMetrics.sessionsThisWeek}
          workoutRoutinesCreated={workoutSidebarMetrics.routinesCreated}
          muscleHits={workoutSidebarMetrics.muscleHits}
          suggestedUsers={suggestedUsers}
          followingIds={followingIds}
          onToggleFollow={handleToggleFollow}
          onViewProfile={setProfileUserId}
          onGoToProfile={user?.id && onGoToOwnProfile ? onGoToOwnProfile : undefined}
          onSwitchAccount={handleSwitchAccount}
          panel={feedSidebarPanel}
          onPanelChange={setFeedSidebarPanel}
          className="lg:hidden"
        />

        <div
          className="mt-4 flex flex-col gap-3 pt-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4"
          aria-labelledby="feed-posts-heading"
        >
          <div className="min-w-0">
            <h2
              id="feed-posts-heading"
              className="text-lg font-semibold tracking-tight text-neutral-100 light:text-zinc-900 sm:text-xl"
            >
              Publicaciones
            </h2>
            <p className="mt-0.5 max-w-md text-xs leading-relaxed text-neutral-500 light:text-zinc-600">
              «Todos», «Seguidos» y «Guardados» filtran esta lista; las historias de arriba no cambian. Busca texto o @usuario
              con el campo de abajo (atajo <kbd className="rounded border border-neutral-600 px-1 font-mono text-[10px] light:border-zinc-300">/</kbd>
              ).
            </p>
          </div>
          <FeedModeTabs
            mode={feedScope}
            onChangeMode={setFeedScope}
            compact
            className="w-full shrink-0 sm:w-auto sm:min-w-[220px]"
          />
        </div>

        <div className="mt-3 w-full min-w-0">
          <label className="sr-only" htmlFor="feed-search-input">
            Buscar en la lista del feed
          </label>
          <input
            id="feed-search-input"
            ref={searchInputRef}
            type="search"
            value={feedQuery}
            onChange={(e) => setFeedQuery(e.target.value)}
            placeholder="Buscar texto o @usuario… ( / )"
            className="goi-field min-h-10 w-full text-sm"
            autoComplete="off"
          />
        </div>

        {mutedUserIdSet.size > 0 ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-800/80 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-400 light:border-zinc-200 light:bg-zinc-50 light:text-zinc-600">
            <span>
              Has silenciado{" "}
              <strong className="text-neutral-200 light:text-zinc-800">{mutedUserIdSet.size}</strong> cuenta
              {mutedUserIdSet.size === 1 ? "" : "s"} (solo este dispositivo).
            </span>
            <button
              type="button"
              className="shrink-0 rounded-md border border-neutral-600 px-2 py-1 text-[11px] font-medium text-goi-gold transition-colors hover:bg-neutral-800/80 light:border-zinc-300 light:hover:bg-zinc-100"
              onClick={handleUnmuteAll}
            >
              Restaurar todas
            </button>
          </div>
        ) : null}

        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[11px] text-neutral-500 light:text-zinc-600">
          <span className="inline-flex items-center rounded-full border border-neutral-800/55 bg-black/25 px-2.5 py-1 tabular-nums light:border-zinc-200 light:bg-zinc-100/95">
            Viendo <strong className="ml-1 text-neutral-300 light:text-zinc-800">{scopeLabel}</strong>
          </span>
          <span className="text-neutral-600 light:text-zinc-500">{scopeDescription}</span>
        </p>

        {postsFiltered.length > 0 ? (
          <p className="mt-1 text-center text-[11px] text-neutral-500 light:text-zinc-600">
            Hoy en esta vista:{" "}
            <strong className="tabular-nums text-neutral-300 light:text-zinc-800">{todayVisibleCount}</strong>{" "}
            publicación
            {todayVisibleCount === 1 ? "" : "es"} con fecha de hoy.
          </p>
        ) : null}

        {((loading && postsFiltered.length > 0) || Boolean(error?.trim()) || Boolean(message?.trim())) ? (
          <div
            className="pointer-events-none fixed left-0 right-0 top-14 z-[45] flex justify-center px-3 sm:top-[4.25rem]"
            role="status"
            aria-live="polite"
          >
            <div className="pointer-events-auto w-full max-w-lg rounded-xl border border-neutral-700/90 bg-neutral-950/95 px-4 py-2.5 shadow-xl backdrop-blur-md light:border-zinc-200 light:bg-white/95">
              <StatusMessage tone="dark" loading={loading && postsFiltered.length > 0} error={error} success={message} />
            </div>
          </div>
        ) : null}

        {loading && postsFiltered.length === 0 ? <FeedTimelineSkeleton /> : null}
        {!loading && postsFiltered.length === 0 && (
          <EmptyState showIcon message={emptyFeedMessage} />
        )}

        <ul className="workouts-list mt-3 grid list-none gap-4 p-0">
          {feedTimelineEntries.map((entry) =>
            entry.kind === "day" ? (
              <li key={`feed-day-${entry.dayKey}`} className="list-none">
                <div
                  role="separator"
                  aria-label={entry.label}
                  className="flex items-center gap-3 py-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 first:pt-0 light:text-zinc-500"
                >
                  <span className="h-px min-w-[2rem] flex-1 bg-neutral-800/90 light:bg-zinc-200" aria-hidden />
                  <span className="shrink-0">{entry.label}</span>
                  <span className="h-px min-w-[2rem] flex-1 bg-neutral-800/90 light:bg-zinc-200" aria-hidden />
                </div>
              </li>
            ) : (
              <PostItem
                key={entry.post.id}
                post={entry.post}
                emphasized={pulsePostId === entry.post.id}
                isOwner={entry.post.userId === user?.id}
                currentUserId={user?.id}
                commentValue={commentByPostId[entry.post.id] ?? ""}
                onChangeComment={(value) =>
                  setCommentByPostId((current) => ({
                    ...current,
                    [entry.post.id]: value,
                  }))
                }
                onLike={() => handleToggleLike(entry.post.id)}
                onDelete={() => handleDeletePost(entry.post.id)}
                onUpdate={handleUpdatePost}
                onComment={() => handleCreateComment(entry.post.id)}
                getWorkoutTitle={getWorkoutTitle}
                onOpenUserProfile={(uid) => setProfileUserId(uid)}
                mentionCandidates={mentionPickList}
                mentionDirectory={mentionDirectory}
                onMentionPick={handleMentionPicked}
                onPostLinkCopied={() =>
                  setMessage("Enlace de la publicación copiado. Pégalo donde quieras compartirlo.")
                }
                authorFollowsYou={
                  Boolean(userId && entry.post.userId !== userId && followerIdSet.has(entry.post.userId))
                }
                saved={savedPostIdSet.has(entry.post.id)}
                onToggleSave={userId ? () => handleToggleSave(entry.post.id) : undefined}
                onMuteAuthor={
                  userId && entry.post.userId !== userId
                    ? () => handleMuteAuthor(entry.post.userId)
                    : undefined
                }
                onReport={
                  userId && entry.post.userId !== userId
                    ? () =>
                        setReportTarget({
                          postId: entry.post.id,
                          authorId: entry.post.userId,
                          authorUsername: entry.post.authorUsername,
                        })
                    : undefined
                }
                onOpenSession={
                  userId && entry.post.userId === userId && onGoToWorkouts
                    ? () => {
                        onGoToWorkouts();
                        setMessage("Historial de entrenamientos en la pestaña Rutinas.");
                      }
                    : undefined
                }
              />
            ),
          )}
        </ul>

        {feedHasMore && postsFiltered.length > 0 ? (
          <>
            <div ref={feedLoadMoreSentinelRef} className="h-px w-full" aria-hidden />
            <div className="mt-4 flex justify-center">
            <button
              type="button"
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition hover:border-goi-gold-dim hover:text-goi-gold light:border-zinc-300 light:text-zinc-800"
              disabled={loadingMoreFeed}
              onClick={loadMoreFeed}
            >
              {loadingMoreFeed ? "Cargando…" : "Cargar más publicaciones"}
            </button>
            </div>
          </>
        ) : null}
        </div>
      </section>

      <FeedSidebar
        username={user?.username}
        avatarUrl={user?.avatarUrl}
        myPostsCount={myPostsCount}
        followingCount={followingIds.length}
        followersCount={followerIds.length}
        workoutTotalSessions={workoutSidebarMetrics.totalSessions}
        workoutSessionsThisWeek={workoutSidebarMetrics.sessionsThisWeek}
        workoutRoutinesCreated={workoutSidebarMetrics.routinesCreated}
        muscleHits={workoutSidebarMetrics.muscleHits}
        suggestedUsers={suggestedUsers}
        followingIds={followingIds}
        onToggleFollow={handleToggleFollow}
        onViewProfile={setProfileUserId}
        onGoToProfile={user?.id && onGoToOwnProfile ? onGoToOwnProfile : undefined}
        onSwitchAccount={handleSwitchAccount}
        panel={feedSidebarPanel}
        onPanelChange={setFeedSidebarPanel}
        className="hidden lg:block"
      />

      <FeedReportModal
        open={Boolean(reportTarget)}
        authorUsername={reportTarget?.authorUsername ?? ""}
        onClose={() => setReportTarget(null)}
        onSubmit={handleReportSubmit}
      />

      <UserPublicProfileModal
        userId={profileUserId}
        currentUserId={user?.id}
        initialFollowingIds={followingIds}
        onClose={() => setProfileUserId(null)}
        onFollowingChanged={(targetUserId, following) =>
          setFollowingIds((prev) =>
            following
              ? prev.includes(targetUserId)
                ? prev
                : [...prev, targetUserId]
              : prev.filter((uid) => uid !== targetUserId),
          )
        }
        onGoToFullProfile={
          profileUserId && onNavigateToExternalProfile
            ? () => {
                const uid = profileUserId;
                const ids = [...followingIds];
                setProfileUserId(null);
                onNavigateToExternalProfile(uid, ids);
              }
            : undefined
        }
      />

      <StoryViewerModal
        open={storyViewerOpen}
        authors={storyViewerAuthors}
        startAuthorIdx={storyViewerAuthorIdx}
        startSlideIdx={storyViewerSlideIdx}
        onClose={() => setStoryViewerOpen(false)}
        onStoriesUiRefresh={() => setStorySeenRevision((n) => n + 1)}
      />
      <CreateStoryModal
        open={createStoryOpen}
        onClose={() => setCreateStoryOpen(false)}
        onCreated={() => {
          void refreshStoriesOnly();
          setMessage("Historia publicada. Visible unas ~24 horas.");
        }}
      />
      <button
        type="button"
        className="fixed bottom-4 right-4 z-30 inline-flex min-h-12 min-w-12 items-center justify-center rounded-full border border-goi-gold/55 bg-goi-gold text-xl font-bold text-black shadow-[0_10px_26px_-10px_rgba(212,175,55,0.9)] sm:hidden"
        aria-label="Nueva publicación"
        onClick={openComposer}
      >
        +
      </button>
      {mobileComposerOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px] sm:p-6 light:bg-zinc-900/40"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) requestCloseComposer();
              }}
            >
              <section
                className="flex max-h-[min(92vh,900px)] min-h-0 w-full max-w-[min(96vw,980px)] flex-col overflow-hidden rounded-xl border border-neutral-800 bg-zinc-950 shadow-2xl light:border-zinc-200 light:bg-white"
                role="dialog"
                aria-modal="true"
                aria-label="Crear publicación"
              >
                <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-neutral-100 light:text-zinc-900">Nueva publicación</h3>
                    <div className="flex items-center gap-2">
                      {composerFormat ? (
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center rounded-lg border border-red-700/80 bg-red-950/40 px-3 text-sm font-medium text-red-300 hover:bg-red-950/60 light:border-red-600/80 light:bg-red-50 light:text-red-800"
                        onClick={() => {
                          if (
                            window.confirm(
                              "¿Descartar borrador de publicación? Se borrará texto, fotos y selección actual.",
                            )
                          ) {
                            resetComposer();
                            setMobileComposerOpen(false);
                          }
                        }}
                      >
                        Descartar borrador
                      </button>
                      ) : null}
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center rounded-lg border border-neutral-700 px-3 text-sm text-neutral-300 light:border-zinc-300 light:text-zinc-700"
                        onClick={requestCloseComposer}
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                  {composerFormat ? (
                    <div className="mb-3">
                      <CreatePostFormatSegment value={composerFormat} onChange={requestFormatChange} />
                    </div>
                  ) : null}
                  <div
                    className={[
                      "grid gap-3 transition-all duration-200 ease-out",
                      cropTarget && composerFormat ? "lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]" : "grid-cols-1",
                    ].join(" ")}
                  >
                    <div className="min-w-0">
                      {!composerFormat ? (
                        <CreatePostFormatChooser
                          username={user?.username ?? "tu"}
                          avatarUrl={user?.avatarUrl ?? ""}
                          onSelect={handleSelectComposerFormat}
                        />
                      ) : composerFormat === "standard" ? (
                        <CreatePostForm
                          content={content}
                          visibility={postVisibility}
                          pendingImages={draftImages}
                          onChangeContent={setContent}
                          onChangeVisibility={setPostVisibility}
                          onAddImages={(files) => void handleDraftAddPhotos(files)}
                          onRemoveImage={(id) => setDraftImages((list) => list.filter((img) => img.id !== id))}
                          onMoveImage={reorderDraftImage}
                          onSetCoverImage={setDraftCoverImage}
                          onCropImage={openCropEditor}
                          submitDisabled={photoBusy || createBusy}
                          submitHint={composerValidation.hint}
                          canSubmit={composerValidation.canSubmit}
                          onSubmit={handleCreatePost}
                          transferState={composerTransferState}
                          mediaBusy={photoBusy || createBusy}
                          onMentionPick={handleMentionPicked}
                          onApplyTemplate={handleApplyComposerTemplate}
                          mentionCandidates={mentionPickList}
                          previewAuthor={
                            user ? { username: user.username, avatarUrl: user.avatarUrl ?? "" } : undefined
                          }
                          mentionDirectory={mentionDirectory}
                          selectedSessionId={selectedSessionId}
                          sessions={myWorkoutSessions}
                          onChangeSessionId={setSelectedSessionId}
                        />
                      ) : (
                        <CreatePostTrainingForm
                          content={content}
                          visibility={postVisibility}
                          pendingImages={draftImages}
                          selectedSessionId={selectedSessionId}
                          sessions={myWorkoutSessions}
                          onChangeContent={setContent}
                          onChangeVisibility={setPostVisibility}
                          onChangeSessionId={setSelectedSessionId}
                          onAddImages={(files) => void handleDraftAddPhotos(files)}
                          onRemoveImage={(id) => setDraftImages((list) => list.filter((img) => img.id !== id))}
                          onMoveImage={reorderDraftImage}
                          onSetCoverImage={setDraftCoverImage}
                          onCropImage={openCropEditor}
                          submitDisabled={photoBusy || createBusy}
                          submitHint={composerValidation.hint}
                          canSubmit={composerValidation.canSubmit}
                          onSubmit={handleCreatePost}
                          transferState={composerTransferState}
                          mediaBusy={photoBusy || createBusy}
                          onMentionPick={handleMentionPicked}
                          onApplyTemplate={handleApplyComposerTemplate}
                          mentionCandidates={mentionPickList}
                          previewAuthor={
                            user ? { username: user.username, avatarUrl: user.avatarUrl ?? "" } : undefined
                          }
                          mentionDirectory={mentionDirectory}
                        />
                      )}
                    </div>
                    {cropTarget ? (
                      <SquareImageCropEditor
                        sourceUrl={cropTarget.sourceUrl}
                        sourceName={cropTarget.sourceName}
                        busy={photoBusy}
                        onCancel={() => setCropTarget(null)}
                        onApply={async (finalDataUrl) => {
                          const imageId = cropTarget.imageId;
                          setError("");
                          setPhotoBusy(true);
                          setComposerTransferState({
                            phase: "processing",
                            progress: 40,
                            message: "Aplicando recorte manual…",
                          });
                          try {
                            setDraftImages((current) =>
                              current.map((img) => (img.id === imageId ? { ...img, dataUrl: finalDataUrl } : img)),
                            );
                            setCropTarget(null);
                            setComposerTransferState({
                              phase: "processing",
                              progress: 100,
                              message: "Recorte aplicado.",
                            });
                            window.setTimeout(() => setComposerTransferState(null), 450);
                          } finally {
                            setPhotoBusy(false);
                          }
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

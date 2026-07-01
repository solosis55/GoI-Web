import "./App.css";
import { useCallback, useEffect, useState } from "react";
import { LoginHeroBrand } from "./components/branding/LoginHeroBrand";
import { PageContainer } from "./components/layout/PageContainer";
import { SidebarSessionBadge } from "./components/branding/SidebarSessionBadge";
import { SiteFooter } from "./components/layout/SiteFooter";
import {
  SidebarLogoutButton,
  SidebarNavigation,
  SidebarSettingsButton,
} from "./components/layout/SidebarNavigation";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AuthPage } from "./pages/AuthPage";
import { ExternalUserProfilePage } from "./components/feed/ExternalUserProfilePage";
import { FeedPage } from "./pages/FeedPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SettingsPage } from "./pages/SettingsPage";
import { StatisticsPage } from "./pages/StatisticsPage";
import { ExerciseCatalogPage } from "./pages/ExerciseCatalogPage";
import { ExerciseDetailPage } from "./pages/ExerciseDetailPage";
import { WorkoutEditorPage, type WorkoutEditorMode } from "./pages/WorkoutEditorPage";
import { WorkoutsPage } from "./pages/WorkoutsPage";
import type { Workout } from "./types/workout";
import { clearWorkoutCreateDraft } from "./utils/workoutCreateDraft";
import { SESSION_EXPIRED_STORAGE_KEY } from "./constants/storageKeys";

const TAB_STORAGE_KEY = "goi:activeTab";
type ActiveTab = "feed" | "profile" | "settings" | "statistics" | "workouts";
type WorkoutsView = "overview" | "catalog" | "exerciseDetail" | "editor";
/** Desde qué pantalla se abrió la ficha de ejercicio (determina «volver»). */
type ExerciseDetailReturnTarget = "editor" | "catalog";

function readStoredTab(): ActiveTab | null {
  try {
    const raw = sessionStorage.getItem(TAB_STORAGE_KEY);
    if (
      raw === "feed" ||
      raw === "profile" ||
      raw === "settings" ||
      raw === "statistics" ||
      raw === "workouts"
    )
      return raw;
  } catch {
    /* ignore */
  }
  return null;
}

function persistActiveTab(tab: ActiveTab) {
  try {
    sessionStorage.setItem(TAB_STORAGE_KEY, tab);
  } catch {
    /* ignore */
  }
}

/** Quita `post` del query para no dejar enlaces pegados después del scroll en el feed. */
function stripPostQueryFromUrl() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("post")) return;
    url.searchParams.delete("post");
    const q = url.searchParams.toString();
    window.history.replaceState(null, "", `${url.pathname}${q ? `?${q}` : ""}${url.hash}`);
  } catch {
    /* ignore */
  }
}

type AuthWelcomePhase = "splash" | "form";

function authDeepLinkInUrl(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    return Boolean(
      params.get("reset")?.trim() ||
        params.get("verify")?.trim() ||
        params.get("verified") === "1" ||
        params.get("verifyError") === "1",
    );
  } catch {
    return false;
  }
}

function sessionExpiredPending(): boolean {
  try {
    return Boolean(sessionStorage.getItem(SESSION_EXPIRED_STORAGE_KEY));
  } catch {
    return false;
  }
}

function readAuthWelcomePhaseInitial(): AuthWelcomePhase {
  return authDeepLinkInUrl() || sessionExpiredPending() ? "form" : "splash";
}

function AppContent() {
  const { isAuthenticated, logout, user } = useAuth();
  /** Invitado: primero solo logo centrado; tras clic aparece el formulario de acceso (salvo `?reset=` en URL). */
  const [authWelcomePhase, setAuthWelcomePhase] = useState<AuthWelcomePhase>(readAuthWelcomePhaseInitial);
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => readStoredTab() ?? "feed");
  const [workoutsView, setWorkoutsView] = useState<WorkoutsView>("overview");
  const [catalogExerciseId, setCatalogExerciseId] = useState<string | null>(null);
  const [catalogFromEditor, setCatalogFromEditor] = useState(false);
  /** Si la ficha se abrio desde el catalogo tras pasar por el editor (afecta la miga de pan). */
  const [exerciseDetailFromEditor, setExerciseDetailFromEditor] = useState(false);
  const [exerciseDetailReturnTarget, setExerciseDetailReturnTarget] = useState<ExerciseDetailReturnTarget>("catalog");
  const [workoutEditorMode, setWorkoutEditorMode] = useState<WorkoutEditorMode>(() => ({ mode: "create" }));

  const routineFormBreadcrumbLabel =
    workoutEditorMode.mode === "edit" ? "Editar rutina" : "Nueva rutina";
  /** Desde Perfil: abrir Inicio y centrar esa publicación en el timeline (ids de `Mis publicaciones`). */
  const [feedFocusPostId, setFeedFocusPostId] = useState<string | null>(null);
  /** Perfil de otro usuario a pantalla completa (desde Inicio → «Ver perfil»). */
  const [externalProfileVisit, setExternalProfileVisit] = useState<{
    userId: string;
    followingIds: string[];
  } | null>(null);

  const goTo = useCallback((tab: ActiveTab) => {
    persistActiveTab(tab);
    setActiveTab(tab);
  }, []);

  useEffect(() => {
    if (activeTab !== "profile") {
      setExternalProfileVisit(null);
    }
  }, [activeTab]);

  const clearFeedFocus = useCallback(() => {
    stripPostQueryFromUrl();
    setFeedFocusPostId(null);
  }, []);

  const navigateToFeedPost = useCallback(
    (postId: string) => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("post", postId);
        const q = url.searchParams.toString();
        window.history.replaceState(null, "", `${url.pathname}${q ? `?${q}` : ""}${url.hash}`);
      } catch {
        /* ignore */
      }
      setFeedFocusPostId(postId);
      goTo("feed");
    },
    [goTo],
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    try {
      const postId = new URLSearchParams(window.location.search).get("post")?.trim();
      if (!postId) return;
      setFeedFocusPostId(postId);
      goTo("feed");
    } catch {
      /* ignore */
    }
  }, [isAuthenticated, goTo]);

  useEffect(() => {
    if (!isAuthenticated) {
      try {
        sessionStorage.removeItem(TAB_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      clearWorkoutCreateDraft();
      setActiveTab("feed");
      setWorkoutsView("overview");
      setCatalogExerciseId(null);
      setCatalogFromEditor(false);
      setExerciseDetailFromEditor(false);
      setExerciseDetailReturnTarget("catalog");
      if (!authDeepLinkInUrl() && !sessionExpiredPending()) {
        setAuthWelcomePhase("splash");
      }
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col bg-black text-neutral-200 light:bg-[var(--goi-page-bg)] light:text-zinc-900 neon:bg-[#030303] neon:text-neutral-200">
        <main className="social-shell relative flex min-h-0 flex-1 flex-col overflow-x-hidden">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[min(26rem,52vh)] bg-[radial-gradient(ellipse_80%_72%_at_50%_-8%,rgba(212,175,55,0.16)_0%,transparent_70%)] neon:bg-[radial-gradient(ellipse_80%_72%_at_50%_-8%,rgba(120,220,60,0.12)_0%,transparent_70%)] encendido:hidden healthy:hidden"
            aria-hidden
          />
          {authWelcomePhase === "splash" ? (
            <div className="relative z-[1] flex min-h-[min(85vh,calc(100vh-8rem))] flex-1 flex-col items-center justify-center px-4 py-8">
              <LoginHeroBrand
                subtitle="Inicia sesión o regístrate"
                description="Red social y rutinas en un solo lugar. Entra al feed cuando inicies sesión."
                showDescriptionOnMobile
                onDismissComplete={() => setAuthWelcomePhase("form")}
              />
            </div>
          ) : (
            <div className="auth-form-reveal relative z-[1] flex w-full min-w-0 flex-1 flex-col justify-center px-4 pb-10 pt-6 sm:pb-14 sm:pt-8 md:pt-10">
              <AuthPage />
            </div>
          )}
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-neutral-200 light:bg-zinc-100 light:text-zinc-900">
      <main className="social-shell grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="auth-session-enter-aside social-sidebar relative sticky top-0 flex h-screen flex-col overflow-hidden border-r border-neutral-900 bg-black px-3.5 py-6 max-md:static max-md:h-auto max-md:border-b max-md:border-r-0 max-md:px-2.5 max-md:py-3 light:border-l-[3px] light:border-l-amber-400/35 healthy:border-l-[#2a4034]/70 light:border-zinc-200 light:bg-white light:shadow-none">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[2px] bg-linear-to-r from-goi-gold/85 via-goi-gold/40 to-transparent light:from-amber-500 healthy:from-goi-gold/88 light:via-amber-400/45 healthy:via-goi-gold/38"
            aria-hidden
          />
          <div className="relative z-[2] flex min-h-0 min-w-0 flex-1 flex-col gap-5 max-md:gap-3">
            <SidebarSessionBadge
              username={user?.username ?? ""}
              avatarUrl={user?.avatarUrl ?? ""}
              tagline={
                user?.goal?.trim() ||
                (user?.bio?.trim()
                  ? user.bio.trim().length > 72
                    ? `${user.bio.trim().slice(0, 72)}…`
                    : user.bio.trim()
                  : undefined)
              }
              onNavigateToProfile={() => {
                setExternalProfileVisit(null);
                goTo("profile");
              }}
            />
            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-1">
              <SidebarNavigation
                activeTab={activeTab}
                onFeed={() => goTo("feed")}
                onWorkouts={() => {
                  setWorkoutsView("overview");
                  setCatalogExerciseId(null);
                  setCatalogFromEditor(false);
                  setExerciseDetailFromEditor(false);
                  setExerciseDetailReturnTarget("catalog");
                  goTo("workouts");
                }}
                onStatistics={() => goTo("statistics")}
                onProfile={() => {
                  setExternalProfileVisit(null);
                  goTo("profile");
                }}
              />
            </div>
            <div className="mt-auto shrink-0 space-y-2.5 border-t border-neutral-800 pt-4 light:border-zinc-200">
              <SidebarSettingsButton active={activeTab === "settings"} onClick={() => goTo("settings")} />
              <SidebarLogoutButton onLogout={logout} />
            </div>
          </div>
        </aside>

        <section className="auth-session-enter-main social-content min-h-0 min-w-0 w-full p-4 max-md:p-2">
          <PageContainer>
            {activeTab === "workouts" && workoutsView === "overview" && (
              <WorkoutsPage
                onCreateWorkout={() => {
                  setWorkoutEditorMode({ mode: "create" });
                  setWorkoutsView("editor");
                }}
                onEditWorkout={(workout: Workout) => {
                  setWorkoutEditorMode({ mode: "edit", workout });
                  setWorkoutsView("editor");
                }}
              />
            )}
            {activeTab === "workouts" && workoutsView === "catalog" && (
              <ExerciseCatalogPage
                creationFlowLabel={catalogFromEditor ? "editor" : "standalone"}
                onBack={() => {
                  const backToEditor = catalogFromEditor;
                  setCatalogFromEditor(false);
                  setWorkoutsView(backToEditor ? "editor" : "overview");
                }}
                onNavigateToRutinas={() => {
                  setCatalogFromEditor(false);
                  setWorkoutsView("overview");
                }}
                routineFormCrumb={catalogFromEditor ? routineFormBreadcrumbLabel : undefined}
                onNavigateToEditorForm={
                  catalogFromEditor
                    ? () => {
                        setWorkoutsView("editor");
                        setCatalogFromEditor(true);
                      }
                    : undefined
                }
                onOpenExerciseDetail={(id) => {
                  setExerciseDetailReturnTarget("catalog");
                  setExerciseDetailFromEditor(catalogFromEditor);
                  setCatalogExerciseId(id);
                  setWorkoutsView("exerciseDetail");
                }}
                onNewRoutineWithExerciseIds={(ids) => {
                  setWorkoutEditorMode({ mode: "create", initialExerciseIds: ids });
                  setCatalogFromEditor(false);
                  setWorkoutsView("editor");
                }}
              />
            )}
            {activeTab === "workouts" && workoutsView === "exerciseDetail" && catalogExerciseId ? (
              <ExerciseDetailPage
                exerciseId={catalogExerciseId}
                showRoutineTrail={exerciseDetailFromEditor}
                routineFormCrumb={exerciseDetailFromEditor ? routineFormBreadcrumbLabel : undefined}
                listCrumbLabel={exerciseDetailReturnTarget === "editor" ? "Editor" : "Catálogo"}
                backButtonLabel={
                  exerciseDetailReturnTarget === "editor" ? "Volver al editor" : "Volver al catálogo"
                }
                onNavigateToEditorForm={
                  exerciseDetailFromEditor
                    ? () => {
                        setCatalogExerciseId(null);
                        setExerciseDetailFromEditor(false);
                        setExerciseDetailReturnTarget("catalog");
                        setWorkoutsView("editor");
                        setCatalogFromEditor(true);
                      }
                    : undefined
                }
                onBackToCatalog={() => {
                  setCatalogExerciseId(null);
                  setExerciseDetailFromEditor(false);
                  const backToEditor = exerciseDetailReturnTarget === "editor";
                  setExerciseDetailReturnTarget("catalog");
                  setWorkoutsView(backToEditor ? "editor" : "catalog");
                }}
                onBackToRoutines={() => {
                  setCatalogExerciseId(null);
                  setExerciseDetailFromEditor(false);
                  setExerciseDetailReturnTarget("catalog");
                  setWorkoutsView("overview");
                }}
                onNewRoutineWithExerciseIds={(ids) => {
                  setWorkoutEditorMode({ mode: "create", initialExerciseIds: ids });
                  setCatalogExerciseId(null);
                  setExerciseDetailFromEditor(false);
                  setExerciseDetailReturnTarget("catalog");
                  setCatalogFromEditor(false);
                  setWorkoutsView("editor");
                }}
              />
            ) : null}
            {activeTab === "workouts" && workoutsView === "editor" && (
              <WorkoutEditorPage
                mode={workoutEditorMode}
                onBack={() => setWorkoutsView("overview")}
                onSaved={() => setWorkoutsView("overview")}
                onOpenFullCatalog={() => {
                  setCatalogExerciseId(null);
                  setCatalogFromEditor(true);
                  setWorkoutsView("catalog");
                }}
                onOpenExerciseDetail={(exerciseId: string) => {
                  setExerciseDetailReturnTarget("editor");
                  setExerciseDetailFromEditor(true);
                  setCatalogExerciseId(exerciseId);
                  setWorkoutsView("exerciseDetail");
                }}
              />
            )}
            {activeTab === "profile" &&
              (externalProfileVisit?.userId && externalProfileVisit.userId !== user?.id ? (
                <ExternalUserProfilePage
                  userId={externalProfileVisit.userId}
                  currentUserId={user?.id}
                  initialFollowingIds={externalProfileVisit.followingIds}
                  onOpenPostInFeed={navigateToFeedPost}
                  onBack={() => setExternalProfileVisit(null)}
                  onFollowingChanged={(targetUserId, following) => {
                    setExternalProfileVisit((prev) =>
                      prev
                        ? {
                            ...prev,
                            followingIds: following
                              ? prev.followingIds.includes(targetUserId)
                                ? prev.followingIds
                                : [...prev.followingIds, targetUserId]
                              : prev.followingIds.filter((id) => id !== targetUserId),
                          }
                        : null,
                    );
                  }}
                />
              ) : (
                <ProfilePage
                  onOpenPostInFeed={navigateToFeedPost}
                  onGoToStatistics={() => goTo("statistics")}
                  onGoToSettings={() => goTo("settings")}
                />
              ))}
            {activeTab === "statistics" && <StatisticsPage />}
            {activeTab === "settings" && (
              <SettingsPage
                onGoToProfile={() => {
                  setExternalProfileVisit(null);
                  goTo("profile");
                }}
              />
            )}
            {activeTab === "feed" && (
              <FeedPage
                focusPostId={feedFocusPostId}
                onFocusPostHandled={clearFeedFocus}
                onNavigateToExternalProfile={(visitUserId, visitFollowingIds) => {
                  setExternalProfileVisit({ userId: visitUserId, followingIds: visitFollowingIds });
                  goTo("profile");
                }}
                onGoToOwnProfile={() => {
                  setExternalProfileVisit(null);
                  goTo("profile");
                }}
                onGoToWorkouts={() => goTo("workouts")}
              />
            )}
          </PageContainer>
        </section>
      </main>
      <SiteFooter className="auth-session-enter-footer" />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

import "./App.css";
import { useCallback, useEffect, useState } from "react";
import { GoISidebarBadge } from "./components/branding/GoISidebarBadge";
import { SidebarSessionBadge } from "./components/branding/SidebarSessionBadge";
import { SiteFooter } from "./components/layout/SiteFooter";
import { SidebarNavigation } from "./components/layout/SidebarNavigation";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AuthPage } from "./pages/AuthPage";
import { FeedPage } from "./pages/FeedPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ExerciseCatalogPage } from "./pages/ExerciseCatalogPage";
import { ExerciseDetailPage } from "./pages/ExerciseDetailPage";
import { WorkoutEditorPage, type WorkoutEditorMode } from "./pages/WorkoutEditorPage";
import { WorkoutsPage } from "./pages/WorkoutsPage";
import type { Workout } from "./types/workout";
import { clearWorkoutCreateDraft } from "./utils/workoutCreateDraft";

const TAB_STORAGE_KEY = "fitsocial:activeTab";
type ActiveTab = "feed" | "profile" | "workouts";
type WorkoutsView = "overview" | "catalog" | "exerciseDetail" | "editor";

function readStoredTab(): ActiveTab | null {
  try {
    const raw = sessionStorage.getItem(TAB_STORAGE_KEY);
    if (raw === "feed" || raw === "profile" || raw === "workouts") return raw;
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

function AppContent() {
  const { isAuthenticated, logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => readStoredTab() ?? "feed");
  const [workoutsView, setWorkoutsView] = useState<WorkoutsView>("overview");
  const [catalogExerciseId, setCatalogExerciseId] = useState<string | null>(null);
  const [catalogFromEditor, setCatalogFromEditor] = useState(false);
  /** Si la ficha se abrio desde el catalogo tras pasar por el editor (afecta la miga de pan). */
  const [exerciseDetailFromEditor, setExerciseDetailFromEditor] = useState(false);
  const [workoutEditorMode, setWorkoutEditorMode] = useState<WorkoutEditorMode>(() => ({ mode: "create" }));

  const routineFormBreadcrumbLabel =
    workoutEditorMode.mode === "edit" ? "Editar rutina" : "Nueva rutina";
  /** Desde Perfil: abrir Inicio y centrar esa publicación en el timeline (ids de `Mis publicaciones`). */
  const [feedFocusPostId, setFeedFocusPostId] = useState<string | null>(null);

  const goTo = useCallback((tab: ActiveTab) => {
    persistActiveTab(tab);
    setActiveTab(tab);
  }, []);

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
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col bg-black text-neutral-200">
        <main className="social-shell flex min-h-0 flex-1 flex-col items-center px-4 py-10 sm:py-14">
          <div className="mb-8 flex w-full flex-col items-center sm:mb-10">
            <GoISidebarBadge
              subtitle="Inicia sesión o regístrate"
              description="Red social y rutinas en un solo lugar. Entra al feed cuando inicies sesión."
              showDescriptionOnMobile
            />
          </div>
          <div className="flex w-full min-w-0 flex-1 flex-col justify-center pb-8">
            <AuthPage />
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-neutral-200">
      <main className="social-shell grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="social-sidebar sticky top-0 flex h-screen flex-col gap-5 border-r border-neutral-900 bg-black px-3.5 py-6 max-md:static max-md:h-auto max-md:border-b max-md:border-r-0 max-md:px-2.5 max-md:py-3">
          <SidebarSessionBadge username={user?.username ?? ""} avatarUrl={user?.avatarUrl ?? ""} />
          <SidebarNavigation
            activeTab={activeTab}
            onFeed={() => goTo("feed")}
            onWorkouts={() => {
              setWorkoutsView("overview");
              setCatalogExerciseId(null);
              setCatalogFromEditor(false);
              setExerciseDetailFromEditor(false);
              goTo("workouts");
            }}
            onProfile={() => goTo("profile")}
            onLogout={logout}
          />
        </aside>

        <section className="social-content min-h-0 min-w-0 w-full p-4 max-md:p-2.5">
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
              onNavigateToEditorForm={
                exerciseDetailFromEditor
                  ? () => {
                      setCatalogExerciseId(null);
                      setExerciseDetailFromEditor(false);
                      setWorkoutsView("editor");
                      setCatalogFromEditor(true);
                    }
                  : undefined
              }
              onBackToCatalog={() => {
                setCatalogExerciseId(null);
                setExerciseDetailFromEditor(false);
                setWorkoutsView("catalog");
              }}
              onBackToRoutines={() => {
                setCatalogExerciseId(null);
                setExerciseDetailFromEditor(false);
                setWorkoutsView("overview");
              }}
              onNewRoutineWithExerciseIds={(ids) => {
                setWorkoutEditorMode({ mode: "create", initialExerciseIds: ids });
                setCatalogExerciseId(null);
                setExerciseDetailFromEditor(false);
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
              onBrowseCatalog={() => {
                setCatalogExerciseId(null);
                setCatalogFromEditor(true);
                setWorkoutsView("catalog");
              }}
            />
          )}
          {activeTab === "profile" && <ProfilePage onOpenPostInFeed={navigateToFeedPost} />}
          {activeTab === "feed" && (
            <FeedPage focusPostId={feedFocusPostId} onFocusPostHandled={clearFeedFocus} />
          )}
        </section>
      </main>
      <SiteFooter />
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

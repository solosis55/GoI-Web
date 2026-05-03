import "./App.css";
import { useEffect, useState } from "react";
import { GoISidebarBadge } from "./components/branding/GoISidebarBadge";
import { SiteFooter } from "./components/layout/SiteFooter";
import { Button } from "./components/ui/Button";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AuthPage } from "./pages/AuthPage";
import { FeedPage } from "./pages/FeedPage";
import { ProfilePage } from "./pages/ProfilePage";
import { WorkoutsPage } from "./pages/WorkoutsPage";

const TAB_STORAGE_KEY = "fitsocial:activeTab";
type ActiveTab = "feed" | "profile" | "workouts";

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

function AppContent() {
  const { isAuthenticated, logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => readStoredTab() ?? "feed");

  useEffect(() => {
    if (!isAuthenticated) {
      try {
        sessionStorage.removeItem(TAB_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setActiveTab("feed");
    }
  }, [isAuthenticated]);

  function goTo(tab: ActiveTab) {
    persistActiveTab(tab);
    setActiveTab(tab);
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col bg-black text-neutral-200">
        <main className="social-shell grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="social-sidebar sticky top-0 flex h-screen flex-col gap-5 border-r border-neutral-900 bg-black px-3.5 py-6 max-md:static max-md:h-auto max-md:border-b max-md:border-r-0 max-md:px-2.5 max-md:py-3">
            <GoISidebarBadge
              subtitle="Inicia sesión o regístrate"
              description="Red social y entrenos en un solo lugar. Entra al feed cuando inicies sesión."
            />
          </aside>
          <section className="social-content flex min-h-0 min-w-0 w-full flex-col justify-center p-4 max-md:min-h-[50vh] max-md:py-6 max-md:max-lg:justify-start">
            <AuthPage />
          </section>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-neutral-200">
      <main className="social-shell grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="social-sidebar sticky top-0 flex h-screen flex-col gap-5 border-r border-neutral-900 bg-black px-3.5 py-6 max-md:static max-md:h-auto max-md:border-b max-md:border-r-0 max-md:px-2.5 max-md:py-3">
          <GoISidebarBadge subtitle={`@${user?.username ?? ""}`} />
          <nav className="sidebar-nav grid gap-2.5 max-md:grid-cols-2">
            <Button
              type="button"
              variant={activeTab === "feed" ? "navActive" : "secondary"}
              onClick={() => goTo("feed")}
            >
              Inicio
            </Button>
            <Button
              type="button"
              variant={activeTab === "workouts" ? "navActive" : "secondary"}
              onClick={() => goTo("workouts")}
            >
              Entrenamientos
            </Button>
            <Button
              type="button"
              variant={activeTab === "profile" ? "navActive" : "secondary"}
              onClick={() => goTo("profile")}
            >
              Perfil
            </Button>
            <Button type="button" variant="danger" className="sidebar-logout mt-4" onClick={logout}>
              Cerrar sesion
            </Button>
          </nav>
        </aside>

        <section className="social-content min-h-0 min-w-0 w-full p-4 max-md:p-2.5">
          {activeTab === "workouts" && <WorkoutsPage />}
          {activeTab === "profile" && <ProfilePage />}
          {activeTab === "feed" && <FeedPage />}
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

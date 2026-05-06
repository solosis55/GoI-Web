import { Button } from "../ui/Button";

export type SidebarActiveTab = "feed" | "profile" | "workouts";

function IconHome({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 10.5 12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z"
      />
    </svg>
  );
}

function IconDumbbell({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        d="M4 14V10M20 14V10M7 17V7M17 17V7M7 10h10M7 14h10"
      />
    </svg>
  );
}

function IconUser({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
      />
    </svg>
  );
}

function IconLogout({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
      />
    </svg>
  );
}

const navItemClass =
  "group/nav w-full !justify-start gap-3 px-3.5 py-2.5 text-left motion-safe:transition-[transform,box-shadow,background-color,color] motion-safe:duration-200 motion-safe:hover:translate-x-0.5 motion-safe:active:scale-[0.99] [&_svg]:shrink-0 [&_svg]:opacity-95 motion-safe:[&_svg]:transition-transform motion-safe:[&_svg]:duration-200 motion-safe:group-hover/nav:[&_svg]:scale-110";

type SidebarNavigationProps = {
  activeTab: SidebarActiveTab;
  onFeed: () => void;
  onWorkouts: () => void;
  onProfile: () => void;
  onLogout: () => void;
};

export function SidebarNavigation({ activeTab, onFeed, onWorkouts, onProfile, onLogout }: SidebarNavigationProps) {
  return (
    <nav className="sidebar-nav grid gap-2 max-md:grid-cols-2 md:gap-2.5" aria-label="Navegación principal">
      <Button
        type="button"
        variant={activeTab === "feed" ? "navActive" : "secondary"}
        className={navItemClass}
        onClick={onFeed}
      >
        <IconHome className="size-[1.125rem]" />
        <span className="min-w-0 font-medium">Inicio</span>
      </Button>
      <Button
        type="button"
        variant={activeTab === "workouts" ? "navActive" : "secondary"}
        className={navItemClass}
        onClick={onWorkouts}
      >
        <IconDumbbell className="size-[1.125rem]" />
        <span className="min-w-0 font-medium">Rutinas</span>
      </Button>
      <Button
        type="button"
        variant={activeTab === "profile" ? "navActive" : "secondary"}
        className={navItemClass}
        onClick={onProfile}
      >
        <IconUser className="size-[1.125rem]" />
        <span className="min-w-0 font-medium">Perfil</span>
      </Button>
      <Button
        type="button"
        variant="danger"
        className={`${navItemClass} sidebar-logout mt-2 max-md:col-span-2 md:mt-4`}
        onClick={onLogout}
      >
        <IconLogout className="size-[1.125rem]" />
        <span className="min-w-0 font-medium">Cerrar sesión</span>
      </Button>
    </nav>
  );
}

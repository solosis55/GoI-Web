import { Avatar } from "../ui/Avatar";

type SidebarSessionBadgeProps = {
  username: string;
  avatarUrl: string;
};

/**
 * Marca en el lateral con la foto de perfil del usuario conectado (sustituye al logo GoI en sesión).
 */
export function SidebarSessionBadge({ username, avatarUrl }: SidebarSessionBadgeProps) {
  const label = username.trim() || "Usuario";

  return (
    <div className="sidebar-session-badge grid w-full justify-items-center gap-2">
      <div className="relative flex h-[112px] w-[112px] shrink-0 overflow-hidden rounded-full bg-neutral-950 ring-2 ring-goi-gold-dim/30 shadow-[0_8px_28px_rgba(0,0,0,0.55)] max-md:h-[88px] max-md:w-[88px]">
        <Avatar src={avatarUrl.trim() || undefined} alt={label} fill className="ring-0" />
      </div>
      <p className="w-full pt-1 text-center text-xs font-semibold uppercase tracking-[0.18em] text-goi-steel">FitSocial</p>
      <div className="sidebar-user w-full text-center text-sm text-neutral-400">@{label}</div>
    </div>
  );
}

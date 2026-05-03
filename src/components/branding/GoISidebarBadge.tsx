import type { ReactNode } from "react";

type GoISidebarBadgeProps = {
  /** Texto debajo del logotipo (ej. @{user}, o texto de onboarding). */
  subtitle: ReactNode;
  /** Párrafo opcional (solo escritorio típico en login). */
  description?: ReactNode;
};

const LOGO_SRC = "/branding/goi-logo.png";

export function GoISidebarBadge({ subtitle, description }: GoISidebarBadgeProps) {
  return (
    <div className="sidebar-brand-goi grid w-full justify-items-center gap-2">
      <div className="flex h-[112px] w-[112px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-950 ring-2 ring-goi-gold-dim/30 shadow-[0_8px_28px_rgba(0,0,0,0.55)] max-md:h-[88px] max-md:w-[88px]">
        <img
          src={LOGO_SRC}
          alt="GoI · Group of Iron"
          className="h-[72%] w-[72%] object-contain opacity-95 max-md:h-[68%] max-md:w-[68%]"
          width={112}
          height={112}
        />
      </div>
      <p className="w-full pt-1 text-center text-xs font-semibold uppercase tracking-[0.18em] text-goi-steel">
        FitSocial
      </p>
      <div className="sidebar-user w-full text-center text-sm text-neutral-400">{subtitle}</div>
      {description && (
        <p className="mt-3 hidden max-w-[18rem] text-center text-sm leading-relaxed text-neutral-500 md:block">{description}</p>
      )}
    </div>
  );
}

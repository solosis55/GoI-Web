import type { ReactNode } from "react";
import type { CreatePostComposerSection } from "./createPostComposerActions";

type CreatePostSectionNavProps = {
  hasSession: boolean;
  imageCount: number;
  activeSection: CreatePostComposerSection;
  onPress: (section: CreatePostComposerSection) => void;
};

function ContentIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="size-[1.35rem]" aria-hidden>
      <path d="M4 7h16M4 12h11M4 17h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        d="M16.5 15.5V13M20.5 15.5V13M18.5 17.5V11M16.5 13h4"
      />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="size-[1.35rem]" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" />
      <path
        d="M3 16l5-5 4 4 3-3 6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PrivacyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="size-[1.35rem]" aria-hidden>
      <path
        d="M7 11V8a5 5 0 0 1 10 0v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

type SectionDef = {
  section: CreatePostComposerSection;
  label: string;
  hint: string;
  icon: ReactNode;
  badge?: number;
  marked?: boolean;
};

/** Tres secciones del editor: texto/sesión · foto · privacidad. */
export function CreatePostSectionNav({
  hasSession,
  imageCount,
  activeSection,
  onPress,
}: CreatePostSectionNavProps) {
  const sections: SectionDef[] = [
    {
      section: "content",
      label: "Texto y sesión",
      hint: "Pie de foto y entreno vinculado",
      icon: <ContentIcon />,
      marked: hasSession,
    },
    {
      section: "media",
      label: "Foto",
      hint: "Añadir y editar fotos",
      icon: <PhotoIcon />,
      badge: imageCount > 0 ? imageCount : undefined,
    },
    {
      section: "privacy",
      label: "Privacidad",
      hint: "Quién puede ver la publicación",
      icon: <PrivacyIcon />,
    },
  ];

  return (
    <nav className="shrink-0 px-3 pb-2 pt-0.5 sm:px-4" aria-label="Secciones de la publicación">
      <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-neutral-800/85 bg-black/25 p-1 light:border-zinc-200 light:bg-zinc-50">
        {sections.map((item) => {
          const active = activeSection === item.section;
          return (
            <button
              key={item.section}
              type="button"
              onClick={() => onPress(item.section)}
              aria-label={item.label}
              aria-current={active ? "step" : undefined}
              title={item.hint}
              className={[
                "relative flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-2 text-[10px] font-semibold leading-tight transition sm:text-[11px]",
                active
                  ? "border border-goi-gold/40 bg-goi-gold/12 text-goi-gold"
                  : "border border-transparent text-neutral-500 hover:bg-neutral-900/50 hover:text-neutral-300 light:hover:bg-zinc-100 light:hover:text-zinc-800",
              ].join(" ")}
            >
              <span className="relative inline-flex items-center justify-center">
                {item.icon}
                {item.badge != null && item.badge > 0 ? (
                  <span className="absolute -right-2.5 -top-1 flex min-w-4 items-center justify-center rounded-full bg-goi-gold px-1 text-[9px] font-extrabold text-black">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
                {item.marked && !item.badge ? (
                  <span className="absolute -right-1 -top-0.5 size-2 rounded-full bg-goi-gold" aria-hidden />
                ) : null}
              </span>
              <span className="text-center">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** @deprecated Usar CreatePostSectionNav */
export const CreatePostToolbar = CreatePostSectionNav;

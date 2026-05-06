import { useMemo } from "react";
import type { FeedStoryAuthor } from "../../types/story";
import { hasUnseenStories, loadStorySeenMap } from "../../utils/storySeen";
import { Avatar } from "../ui/Avatar";

type StoriesRowProps = {
  authors: FeedStoryAuthor[];
  currentUserId: string;
  /** Fuerza relectura del mapa «vistas» tras cerrar el visor. */
  seenRevision: number;
  onSelectAuthor: (userId: string) => void;
};

export function StoriesRow({ authors, currentUserId, seenRevision, onSelectAuthor }: StoriesRowProps) {
  const seenMap = useMemo(() => loadStorySeenMap(), [authors, seenRevision]);

  if (authors.length === 0) {
    return (
      <p className="px-2 text-center text-[11px] text-neutral-500">
        Tus historias aparecerán aquí; las personas que sigues pueden compartir la suya.
      </p>
    );
  }

  return (
    <div className="relative w-full">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-7 bg-linear-to-r from-zinc-950 to-transparent sm:w-9"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-7 bg-linear-to-l from-zinc-950 to-transparent sm:w-9"
        aria-hidden
      />
      <div className="flex w-full justify-center">
        <div className="inline-flex max-w-full gap-2 overflow-x-auto pb-1 pt-1 [scrollbar-gutter:stable]">
          {authors.map((author) => {
            const isSelf = author.userId === currentUserId;
            const hasSlides = author.slides.length > 0;
            const unseen = hasUnseenStories(author.userId, author.slides, seenMap[author.userId]);
            const ringClass = hasSlides
              ? unseen
                ? "border-goi-gold shadow-[0_0_14px_-4px_rgba(212,175,55,0.55)]"
                : "border-neutral-600"
              : "border-dashed border-neutral-500";

            const label = isSelf ? "Tu historia" : author.authorUsername;
            const a11y =
              isSelf && !hasSlides
                ? "Crear tu historia"
                : hasSlides
                  ? `Ver historia de ${author.authorUsername}`
                  : `Historia de ${author.authorUsername}`;

            return (
              <button
                key={`story-author-${author.userId}`}
                type="button"
                aria-label={a11y}
                onClick={() => onSelectAuthor(author.userId)}
                className="grid min-w-[56px] shrink-0 place-items-center gap-1 rounded-lg p-1 text-center transition hover:bg-neutral-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/35"
              >
                <div className="relative mx-auto w-fit">
                  <div className={`rounded-full border-2 p-0.5 ${ringClass}`}>
                    <Avatar src={author.authorAvatarUrl} alt="" size={36} />
                  </div>
                  {isSelf && !hasSlides ? (
                    <span
                      aria-hidden
                      className="absolute -bottom-0.5 -right-0.5 grid size-[22px] place-items-center rounded-full border border-black bg-goi-gold text-[13px] font-bold leading-none text-black shadow-md"
                    >
                      +
                    </span>
                  ) : null}
                </div>
                <small className="max-w-[4.5rem] truncate text-center text-[11px] leading-tight text-neutral-400">
                  {label}
                </small>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

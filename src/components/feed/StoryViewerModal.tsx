import { useCallback, useEffect, useState, type CSSProperties } from "react";
import type { FeedStoryAuthor, FeedStorySlide } from "../../types/story";
import { markStoryAuthorSeen } from "../../utils/storySeen";
import { Avatar } from "../ui/Avatar";

const AUTO_ADVANCE_MS = 5600;

type StoryViewerModalProps = {
  open: boolean;
  authors: FeedStoryAuthor[];
  startAuthorIdx: number;
  startSlideIdx: number;
  onClose: () => void;
  onStoriesUiRefresh: () => void;
};

export function StoryViewerModal({
  open,
  authors,
  startAuthorIdx,
  startSlideIdx,
  onClose,
  onStoriesUiRefresh,
}: StoryViewerModalProps) {
  const [authorIdx, setAuthorIdx] = useState(startAuthorIdx);
  const [slideIdx, setSlideIdx] = useState(startSlideIdx);

  useEffect(() => {
    if (!open) return;
    setAuthorIdx(startAuthorIdx);
    setSlideIdx(startSlideIdx);
  }, [open, startAuthorIdx, startSlideIdx]);

  const author: FeedStoryAuthor | undefined = authors[authorIdx];
  const slides: FeedStorySlide[] = author?.slides ?? [];
  const slide = slides[slideIdx];

  const finishCurrentAuthor = useCallback(() => {
    if (author && author.slides.length) {
      markStoryAuthorSeen(author.userId, author.slides);
      onStoriesUiRefresh();
    }
  }, [author, onStoriesUiRefresh]);

  const advance = useCallback(() => {
    if (!author) {
      onClose();
      return;
    }
    if (slideIdx >= slides.length - 1) {
      finishCurrentAuthor();
      const nextAuthor = authorIdx + 1;
      if (nextAuthor >= authors.length) {
        onClose();
        return;
      }
      setAuthorIdx(nextAuthor);
      setSlideIdx(0);
      return;
    }
    setSlideIdx((s) => s + 1);
  }, [
    author,
    authorIdx,
    authors.length,
    finishCurrentAuthor,
    onClose,
    slideIdx,
    slides.length,
  ]);

  const rewind = useCallback(() => {
    if (slideIdx > 0) {
      setSlideIdx((s) => s - 1);
      return;
    }
    if (authorIdx > 0) {
      const prevAuthor = authors[authorIdx - 1];
      setAuthorIdx(authorIdx - 1);
      setSlideIdx(Math.max(0, prevAuthor.slides.length - 1));
    }
  }, [authorIdx, authors, slideIdx]);

  useEffect(() => {
    if (!open || !author || slides.length === 0 || !slide) return;
    const t = window.setTimeout(advance, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(t);
  }, [open, author, slides.length, slide, slideIdx, authorIdx, advance]);

  const handleClose = useCallback(() => {
    if (author && slides.length > 0 && slideIdx >= slides.length - 1) {
      finishCurrentAuthor();
    }
    onClose();
  }, [author, finishCurrentAuthor, onClose, slideIdx, slides.length]);

  useEffect(() => {
    if (!open) return;
    function key(ev: KeyboardEvent) {
      if (ev.key === "Escape") handleClose();
      if (ev.key === "ArrowRight") advance();
      if (ev.key === "ArrowLeft") rewind();
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, handleClose, advance, rewind]);

  if (!open) return null;

  const segStyle = { "--story-segment-ms": `${AUTO_ADVANCE_MS}ms` } as CSSProperties;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black" role="dialog" aria-modal aria-label="Historias">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-black/40 px-2 py-2 sm:gap-3 sm:px-3">
        <button
          type="button"
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/90 hover:bg-white/10"
          onClick={handleClose}
          aria-label="Cerrar historias"
        >
          Cerrar
        </button>
        {author ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Avatar src={author.authorAvatarUrl} alt={author.authorUsername} size={36} />
            <span className="truncate text-sm font-semibold text-white">@{author.authorUsername}</span>
          </div>
        ) : (
          <span className="text-neutral-400">Sin historias</span>
        )}
      </div>

      <div className="flex shrink-0 gap-[3px] bg-black px-2 pt-2">
        {slides.map((seg, i) => (
          <div key={`${author?.userId ?? "u"}-${seg.id}`} className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/25">
            {i < slideIdx ? <div className="absolute inset-0 rounded-full bg-white" /> : null}
            {i === slideIdx ? (
              <div
                key={`${authorIdx}-${slideIdx}-${seg.id}`}
                className="story-segment-fill absolute rounded-full bg-white"
                style={segStyle}
              />
            ) : null}
          </div>
        ))}
      </div>

      <div className="relative min-h-0 flex-1">
        {!author || !slide ? (
          <div className="flex h-full items-center justify-center text-neutral-400">Historia no disponible</div>
        ) : (
          <>
            <img src={slide.mediaUrl} alt="" className="h-full w-full object-contain" />
            <button
              type="button"
              aria-label="Anterior"
              className="absolute inset-y-0 left-0 w-1/3 cursor-w-resize bg-transparent"
              onClick={rewind}
            />
            <button
              type="button"
              aria-label="Siguiente"
              className="absolute inset-y-0 right-0 w-1/3 cursor-e-resize bg-transparent"
              onClick={advance}
            />
          </>
        )}
      </div>
    </div>
  );
}

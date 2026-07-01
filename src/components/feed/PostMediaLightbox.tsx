import { useEffect } from "react";
import { createPortal } from "react-dom";

type PostMediaLightboxProps = {
  open: boolean;
  urls: string[];
  index: number;
  onClose: () => void;
  onIndexChange: (next: number) => void;
};

export function PostMediaLightbox({ open, urls, index, onClose, onIndexChange }: PostMediaLightboxProps) {
  const safeIndex = urls.length ? Math.min(Math.max(0, index), urls.length - 1) : 0;
  const url = urls[safeIndex] ?? "";

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "ArrowLeft" && urls.length > 1) {
        e.preventDefault();
        onIndexChange(safeIndex <= 0 ? urls.length - 1 : safeIndex - 1);
      }
      if (e.key === "ArrowRight" && urls.length > 1) {
        e.preventDefault();
        onIndexChange(safeIndex >= urls.length - 1 ? 0 : safeIndex + 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onIndexChange, safeIndex, urls.length]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Vista ampliada de la imagen"
    >
      <div
        className="flex shrink-0 items-center justify-between gap-3 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[2rem] font-light leading-none text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/50"
          onClick={onClose}
          aria-label="Volver al feed"
        >
          ×
        </button>
        {urls.length > 1 ? (
          <span className="text-sm font-semibold text-white/85">
            {safeIndex + 1} / {urls.length}
          </span>
        ) : (
          <span className="min-w-11" aria-hidden />
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-2">
        {urls.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Imagen anterior"
              className="absolute left-1 top-1/2 z-[2] -translate-y-1/2 rounded-full border border-white/20 bg-black/55 px-3 py-2 text-lg text-white hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/50 sm:left-3"
              onClick={() => onIndexChange(safeIndex <= 0 ? urls.length - 1 : safeIndex - 1)}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Imagen siguiente"
              className="absolute right-1 top-1/2 z-[2] -translate-y-1/2 rounded-full border border-white/20 bg-black/55 px-3 py-2 text-lg text-white hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/50 sm:right-3"
              onClick={() => onIndexChange(safeIndex >= urls.length - 1 ? 0 : safeIndex + 1)}
            >
              ›
            </button>
          </>
        ) : null}

        <button
          type="button"
          className="flex max-h-full max-w-full cursor-zoom-out items-center justify-center border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/50"
          onClick={onClose}
          aria-label="Cerrar vista ampliada"
        >
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- imagen ampliada */}
          <img
            src={url}
            alt=""
            className="max-h-[min(88vh,1200px)] max-w-full touch-manipulation object-contain"
          />
        </button>
      </div>

      <p className="pointer-events-none shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-[11px] font-medium text-white/45">
        Toca la imagen o × para volver
      </p>
    </div>,
    document.body,
  );
}

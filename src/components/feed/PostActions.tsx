type PostActionsProps = {
  likedByMe?: boolean;
  likesCount: number;
  onLike: () => void;
  onPressSessionPreview?: () => void;
  sessionPreviewActive?: boolean;
  likesInteractive?: boolean;
};

function HeartIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} aria-hidden>
      {filled ? (
        <path
          fill="currentColor"
          d="M12 21s-6.716-5.304-9.233-8.607C.32 9.59.32 6.26 2.49 4.22 4.66 2.18 7.79 2.39 9.9 4.22L12 6.13l2.1-1.91c2.11-1.83 5.24-2.04 7.41-.02 2.17 2.02 2.17 5.35-.28 8.18C16.72 15.7 12 21 12 21Z"
        />
      ) : (
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          d="M12 21s-6.716-5.304-9.233-8.607C.32 9.59.32 6.26 2.49 4.22 4.66 2.18 7.79 2.39 9.9 4.22L12 6.13l2.1-1.91c2.11-1.83 5.24-2.04 7.41-.02 2.17 2.02 2.17 5.35-.28 8.18C16.72 15.7 12 21 12 21Z"
        />
      )}
    </svg>
  );
}

function DumbbellIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M4 14V10M20 14V10M7 17V7M17 17V7" />
      <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M7 10h10M7 14h10" />
    </svg>
  );
}

export function PostActions({
  likedByMe,
  likesCount,
  onLike,
  onPressSessionPreview,
  sessionPreviewActive = false,
  likesInteractive = true,
}: PostActionsProps) {
  const liked = !!likedByMe;

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        disabled={!likesInteractive}
        onMouseDown={(event) => {
          if (!likesInteractive || event.button !== 0) return;
          event.preventDefault();
        }}
        onClick={likesInteractive ? onLike : undefined}
        aria-pressed={liked}
        aria-label={
          liked ? `Quitar tu me gusta. Total: ${likesCount}.` : `Dar me gusta. Actualmente ${likesCount}.`
        }
        className={[
          "inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-full px-2 py-1.5 text-[13px] font-semibold tabular-nums tracking-tight transition-[color,background-color]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/45 focus-visible:ring-offset-2 focus-visible:ring-offset-black light:focus-visible:ring-offset-white",
          liked
            ? "text-goi-gold hover:bg-goi-gold/[0.12] light:text-amber-700 healthy:text-goi-gold light:hover:bg-amber-100/90 healthy:hover:bg-goi-gold/[0.14]"
            : "text-neutral-500 hover:bg-neutral-800/55 hover:text-goi-gold light:text-zinc-500 light:hover:bg-zinc-200/70 light:hover:text-amber-700 healthy:hover:text-goi-gold",
          !likesInteractive ? "pointer-events-none opacity-45" : "",
        ].join(" ")}
      >
        <span
          className={[
            "inline-flex items-center justify-center",
            liked ? "drop-shadow-[0_0_10px_rgba(212,175,55,0.35)]" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <HeartIcon filled={liked} className="size-[1.35rem] shrink-0 text-current" />
        </span>
        <span className="min-w-[1ch]">{likesCount}</span>
      </button>

      {onPressSessionPreview ? (
        <button
          type="button"
          onClick={onPressSessionPreview}
          aria-pressed={sessionPreviewActive}
          aria-label={sessionPreviewActive ? "Ocultar entreno vinculado" : "Ver entreno vinculado"}
          className={[
            "inline-flex size-11 touch-manipulation items-center justify-center rounded-[10px] border transition-[color,background-color,border-color]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/45 focus-visible:ring-offset-2 focus-visible:ring-offset-black light:focus-visible:ring-offset-white",
            sessionPreviewActive
              ? "border-goi-gold/55 bg-goi-gold/20 text-goi-gold"
              : "border-goi-gold/25 bg-goi-gold/[0.08] text-neutral-500 hover:border-goi-gold/40 hover:bg-goi-gold/15 hover:text-goi-gold light:text-zinc-500 light:hover:text-amber-700 healthy:hover:text-goi-gold",
          ].join(" ")}
        >
          <DumbbellIcon className="size-[1.35rem] shrink-0 text-current" />
        </button>
      ) : null}
    </div>
  );
}

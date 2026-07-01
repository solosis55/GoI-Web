import type { PostFormat } from "../../../constants/postFormat";
import { POST_FORMAT_LABELS } from "../../../constants/postFormat";
import { CREATE_POST_FORM_ID } from "./createPostComposerActions";

type CreatePostComposerHeaderProps = {
  composerFormat: PostFormat | null;
  canPublish: boolean;
  publishing: boolean;
  publishDisabled: boolean;
  publishHint?: string;
  onCancel: () => void;
  onDiscardDraft?: () => void;
  showDiscardDraft?: boolean;
};

export function CreatePostComposerHeader({
  composerFormat,
  canPublish,
  publishing,
  publishDisabled,
  publishHint,
  onCancel,
  onDiscardDraft,
  showDiscardDraft = false,
}: CreatePostComposerHeaderProps) {
  const title = composerFormat ? POST_FORMAT_LABELS[composerFormat] : "Nueva publicación";

  return (
    <header className="sticky top-0 z-10 shrink-0 border-b border-neutral-800/80 bg-zinc-950/95 px-3 py-2.5 backdrop-blur-sm light:border-zinc-200 light:bg-white/95 sm:px-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex min-h-10 shrink-0 items-center rounded-lg px-2 text-sm font-semibold text-neutral-400 hover:text-neutral-100 light:text-zinc-600 light:hover:text-zinc-900"
          onClick={onCancel}
        >
          Cancelar
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold text-neutral-100 light:text-zinc-900">{title}</p>
          {publishHint && !canPublish ? (
            <p className="truncate text-[11px] text-amber-200/90 light:text-amber-800">{publishHint}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {showDiscardDraft && onDiscardDraft ? (
            <button
              type="button"
              className="hidden min-h-10 items-center rounded-lg border border-red-800/60 px-2.5 text-xs font-semibold text-red-300 hover:bg-red-950/40 sm:inline-flex light:border-red-300 light:text-red-800 light:hover:bg-red-50"
              onClick={onDiscardDraft}
            >
              Descartar
            </button>
          ) : null}
          {composerFormat ? (
            publishing ? (
              <span
                className="inline-flex min-h-10 min-w-[5.5rem] items-center justify-center rounded-full bg-neutral-800/80 px-4 text-sm font-bold text-neutral-500"
                aria-busy="true"
              >
                …
              </span>
            ) : (
              <button
                type="submit"
                form={CREATE_POST_FORM_ID}
                disabled={publishDisabled || !canPublish}
                title={!canPublish ? publishHint : undefined}
                className={[
                  "inline-flex min-h-10 min-w-[5.5rem] items-center justify-center rounded-full px-4 text-sm font-bold transition",
                  canPublish && !publishDisabled
                    ? "bg-goi-gold text-black hover:bg-goi-gold-dim"
                    : "cursor-not-allowed bg-neutral-800/90 text-neutral-500 light:bg-zinc-200 light:text-zinc-500",
                ].join(" ")}
              >
                Publicar
              </button>
            )
          ) : (
            <span className="inline-block min-w-[5.5rem]" aria-hidden />
          )}
        </div>
      </div>
    </header>
  );
}

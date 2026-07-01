import { useMemo } from "react";
import type { CreatePostInput, SessionExercisePreview } from "../../types/post";
import { POST_IMAGE_MAX_FILES } from "../../constants/createPost";
import { standardHeroAspectClass } from "../../constants/postPreviewLayout";
import { Avatar } from "../ui/Avatar";
import { PostActions } from "./PostActions";
import { PostMediaGallery } from "./PostMediaGallery";
import { PublicationLinkedSessionBody } from "./PublicationLinkedSessionBody";
import type { PostSessionAttachmentMetrics } from "./PostSessionAttachment";
import { visibilityBadgeClasses } from "../../utils/visibilityBadgeClasses";
import { MentionHighlighted, type MentionUserDirectory } from "../../utils/mentionText";

type Visibility = NonNullable<CreatePostInput["visibility"]>;

type LinkedSessionPreview = {
  workoutTitle?: string | null;
  performedAt?: string | null;
  metrics?: PostSessionAttachmentMetrics | null;
  exercisePreviews?: SessionExercisePreview[];
  moreExercisesCount?: number;
};

type PostFeedPreviewStandardProps = {
  username: string;
  avatarUrl: string;
  visibility: Visibility;
  content: string;
  imageUrls: string[];
  editorMode?: boolean;
  mentionDirectory?: MentionUserDirectory;
  onPressAddMedia?: () => void;
  onPressEditCaption?: () => void;
  showSessionInline?: boolean;
  sessionPreviewActive?: boolean;
  onPressSessionPreview?: () => void;
  onPressViewSession?: () => void;
  linkedSession?: LinkedSessionPreview | null;
  /** Composer: preview reducida junto al panel de edición. */
  compact?: boolean;
};

/** Vista previa feed estándar — foto → acciones → caption (paridad App). */
export function PostFeedPreviewStandard({
  username,
  avatarUrl,
  visibility,
  content,
  imageUrls,
  editorMode = false,
  mentionDirectory,
  onPressAddMedia,
  onPressEditCaption,
  showSessionInline = false,
  sessionPreviewActive = false,
  onPressSessionPreview,
  onPressViewSession,
  linkedSession,
  compact = false,
}: PostFeedPreviewStandardProps) {
  const visibilityLabel =
    visibility === "public" ? "Público" : visibility === "followers" ? "Seguidores" : "Solo yo";
  const caption = content.trim();
  const mediaItems = useMemo(
    () => imageUrls.map((url) => ({ type: "image" as const, url })),
    [imageUrls],
  );
  const hasMedia = imageUrls.length > 0;

  return (
    <article
      className={[
        "feed-post-card flex flex-col overflow-hidden rounded-2xl border",
        compact ? "w-full shadow-sm" : "",
      ].join(" ")}
      aria-label="Vista previa de la publicación"
    >
      <div className={compact ? "flex items-start gap-3 p-4 pb-2" : "flex items-start justify-between gap-3 p-4 sm:p-5 sm:pb-3"}>
        <div className="flex min-w-0 flex-1 gap-3.5">
          <div className="shrink-0 pt-0.5">
            <Avatar src={avatarUrl} alt={username} size={compact ? 42 : 46} />
          </div>
          <div className={compact ? "min-w-0 flex-1 border-b border-neutral-800/40 pb-2.5 light:border-zinc-200/75" : "min-w-0 flex-1 border-b border-neutral-800/40 pb-3 light:border-zinc-200/75"}>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className={compact ? "text-[14px] font-semibold tracking-tight text-neutral-100 light:text-zinc-900" : "text-[15px] font-semibold tracking-tight text-neutral-100 light:text-zinc-900"}>
                {username}
                <span className="font-normal text-neutral-500"> (tu)</span>
              </span>
              <span className="text-neutral-600">·</span>
              <time className="text-[13px] text-neutral-500">ahora</time>
              <span
                className={[
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  visibilityBadgeClasses(visibility),
                ].join(" ")}
              >
                {visibilityLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {hasMedia ? (
        <div
          className={[
            standardHeroAspectClass(),
            "w-full overflow-hidden bg-neutral-950 light:bg-zinc-100",
          ].join(" ")}
        >
          <PostMediaGallery layout="hero" media={mediaItems} feedInteractive heroCover />
        </div>
      ) : editorMode ? (
        <button
          type="button"
          onClick={onPressAddMedia}
          className={[
            standardHeroAspectClass(),
            "group relative flex w-full flex-col items-center justify-center gap-2 border-t border-neutral-800/65 bg-neutral-950/80 light:border-zinc-200 light:bg-zinc-100",
          ].join(" ")}
        >
          <span className="inline-flex size-12 items-center justify-center rounded-full border border-goi-gold/55 bg-goi-gold/15 text-3xl font-light text-goi-gold">
            +
          </span>
          <span className="text-base font-bold text-goi-gold">Añadir foto</span>
          <span className="text-xs font-semibold text-neutral-500">
            Obligatoria · hasta {POST_IMAGE_MAX_FILES} fotos
          </span>
        </button>
      ) : null}

      <div className="flex items-center gap-2 px-4 py-2 sm:px-5">
          <PostActions
            likedByMe={false}
            likesCount={0}
            onLike={() => {}}
            likesInteractive={!editorMode}
            onPressSessionPreview={onPressSessionPreview}
            sessionPreviewActive={sessionPreviewActive}
          />
      </div>

      <button
        type="button"
        disabled={!editorMode || !onPressEditCaption || showSessionInline}
        onClick={onPressEditCaption}
        className={[
          "mx-4 mb-4 mt-1 rounded-xl px-3.5 py-3 text-left sm:mx-5 sm:mb-5",
          editorMode && !showSessionInline ? "border border-goi-gold/25 hover:bg-goi-gold/5" : "border-transparent",
        ].join(" ")}
      >
        {showSessionInline && linkedSession ? (
          <PublicationLinkedSessionBody
            workoutTitle={linkedSession.workoutTitle}
            performedAt={linkedSession.performedAt}
            metrics={linkedSession.metrics}
            exercisePreviews={linkedSession.exercisePreviews}
            moreExercisesCount={linkedSession.moreExercisesCount}
            onPressViewSession={onPressViewSession}
            compact
          />
        ) : caption ? (
          <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-200 light:text-zinc-800">
            {mentionDirectory ? (
              <MentionHighlighted text={content} userDirectory={mentionDirectory} />
            ) : (
              content
            )}
          </div>
        ) : (
          <p className="text-sm italic text-neutral-500">
            {editorMode ? "Toca para escribir el pie de foto…" : "Sin texto."}
          </p>
        )}
        {editorMode && !showSessionInline ? (
          <p className="mt-2 text-[10px] font-semibold text-neutral-500">Toca para editar texto</p>
        ) : null}
      </button>

      {editorMode && !compact ? (
        <p className="px-4 pb-3 text-center text-[11px] font-semibold uppercase tracking-wide text-goi-gold-dim sm:px-5">
          Vista previa del feed
        </p>
      ) : null}
    </article>
  );
}

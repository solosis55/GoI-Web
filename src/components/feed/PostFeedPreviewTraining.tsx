import type { CreatePostInput } from "../../types/post";
import { Avatar } from "../ui/Avatar";
import { visibilityBadgeClasses } from "../../utils/visibilityBadgeClasses";
import { MentionHighlighted, type MentionUserDirectory } from "../../utils/mentionText";
import { PostTrainingBody } from "./PostTrainingBody";
import type { SessionExercisePreview } from "../../types/post";
import type { PostSessionAttachmentMetrics } from "./PostSessionAttachment";

type Visibility = NonNullable<CreatePostInput["visibility"]>;

type PostFeedPreviewTrainingProps = {
  username: string;
  avatarUrl: string;
  visibility: Visibility;
  content: string;
  sessionId?: string | null;
  workoutTitle?: string | null;
  performedAt?: string | null;
  metrics?: PostSessionAttachmentMetrics | null;
  exercisePreviews?: SessionExercisePreview[];
  moreExercisesCount?: number;
  imageUrls?: string[];
  editorMode?: boolean;
  mentionDirectory?: MentionUserDirectory;
  onPressLinkSession?: () => void;
  onPressEditCaption?: () => void;
  onPressAddMedia?: () => void;
};

/** Vista previa feed training — caption → sesión → foto inset (paridad App). */
export function PostFeedPreviewTraining({
  username,
  avatarUrl,
  visibility,
  content,
  sessionId,
  workoutTitle,
  performedAt,
  metrics,
  exercisePreviews = [],
  moreExercisesCount = 0,
  imageUrls = [],
  editorMode = false,
  mentionDirectory,
  onPressLinkSession,
  onPressEditCaption,
  onPressAddMedia,
}: PostFeedPreviewTrainingProps) {
  const caption = content.trim();
  const visibilityLabel =
    visibility === "public" ? "Público" : visibility === "followers" ? "Seguidores" : "Solo yo";

  return (
    <article
      className="feed-post-card flex flex-col overflow-hidden rounded-2xl border"
      aria-label="Vista previa training"
    >
      <div className="flex items-start gap-3 p-4 sm:p-5 sm:pb-3">
        <Avatar src={avatarUrl} alt={username} size={46} />
        <div className="min-w-0 flex-1 border-b border-neutral-800/40 pb-3 light:border-zinc-200/75">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[15px] font-semibold text-neutral-100 light:text-zinc-900">
              {username}
              <span className="font-normal text-neutral-500"> (tu)</span>
            </span>
            <span className="text-neutral-600">·</span>
            <time className="text-[13px] text-neutral-500">ahora</time>
            <span className="text-[11px] font-bold uppercase tracking-wide text-goi-gold-dim">Training</span>
            {visibility !== "public" ? (
              <span
                className={[
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  visibilityBadgeClasses(visibility),
                ].join(" ")}
              >
                {visibilityLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className={editorMode ? "pointer-events-none opacity-40" : undefined} aria-hidden={editorMode}>
        <div className="flex items-center gap-3 px-4 pb-2 text-neutral-500 sm:px-5">
          <span className="text-lg">♡</span>
          <span className="text-lg">💬</span>
        </div>
      </div>

      <button
        type="button"
        disabled={!editorMode || !onPressEditCaption}
        onClick={onPressEditCaption}
        className={[
          "mx-4 rounded-xl px-3.5 py-3 text-left sm:mx-5",
          editorMode ? "border border-goi-gold/25 hover:bg-goi-gold/5" : "border-transparent",
        ].join(" ")}
      >
        {caption ? (
          <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-200 light:text-zinc-800">
            {mentionDirectory ? (
              <MentionHighlighted text={content} userDirectory={mentionDirectory} />
            ) : (
              content
            )}
          </div>
        ) : (
          <p className="text-sm italic text-neutral-500">
            {editorMode ? "Toca para comentar el entreno…" : "Comentario del entreno…"}
          </p>
        )}
      </button>

      <div className="px-1 pb-4 pt-1 sm:px-2">
        <PostTrainingBody
          sessionId={sessionId}
          workoutTitle={workoutTitle}
          performedAt={performedAt}
          metrics={metrics}
          exercisePreviews={exercisePreviews}
          moreExercisesCount={moreExercisesCount}
          mediaUrls={imageUrls}
          onPressLinkSession={editorMode ? onPressLinkSession : undefined}
          onPressAddMedia={editorMode && imageUrls.length === 0 ? onPressAddMedia : undefined}
        />
      </div>

      {editorMode ? (
        <p className="px-4 pb-3 text-center text-[11px] font-semibold uppercase tracking-wide text-goi-gold-dim sm:px-5">
          Vista previa del feed
        </p>
      ) : null}
    </article>
  );
}

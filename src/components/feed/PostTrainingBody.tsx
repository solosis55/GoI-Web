import type { ReactNode } from "react";
import type { PostMediaItem } from "../../types/post";
import { PostMediaGallery } from "./PostMediaGallery";
import { PostSessionAttachment, type PostSessionAttachmentMetrics } from "./PostSessionAttachment";
import type { SessionExercisePreview } from "../../types/post";
import { trainingFeedInsetHeight, trainingFeedInsetWidth } from "../../utils/trainingFeedMediaLayout";

type PostTrainingBodyProps = {
  sessionId?: string | null;
  workoutTitle?: string | null;
  performedAt?: string | null;
  metrics?: PostSessionAttachmentMetrics | null;
  exercisePreviews?: SessionExercisePreview[];
  moreExercisesCount?: number;
  onPressSession?: () => void;
  onPressLinkSession?: () => void;
  showViewFullCta?: boolean;
  media?: PostMediaItem[];
  mediaUrls?: string[];
  onPressAddMedia?: () => void;
  cardWidth?: number;
};

/**
 * Bloque sesión + foto inset en posts Training del feed (paridad App).
 * Orden: sesión protagonista → foto opcional debajo.
 */
export function PostTrainingBody({
  sessionId,
  workoutTitle,
  performedAt,
  metrics,
  exercisePreviews = [],
  moreExercisesCount = 0,
  onPressSession,
  onPressLinkSession,
  showViewFullCta = false,
  media,
  mediaUrls,
  onPressAddMedia,
  cardWidth = 360,
}: PostTrainingBodyProps) {
  const hasMedia = (media?.length ?? 0) > 0 || (mediaUrls?.length ?? 0) > 0;
  const insetW = trainingFeedInsetWidth(cardWidth);
  const insetH = trainingFeedInsetHeight(insetW);
  const galleryMedia =
    media ??
    (mediaUrls?.map((url) => ({ type: "image" as const, url })) ?? []);

  let mediaSlot: ReactNode = null;
  if (hasMedia && galleryMedia.length > 0) {
    mediaSlot = (
      <div className="mx-auto w-[82%] max-w-md">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-500">Foto del entreno</p>
        <div className="overflow-hidden rounded-xl border border-neutral-800/70 light:border-zinc-200">
          <PostMediaGallery media={galleryMedia} layout="hero" feedInteractive insetMaxHeight={insetH} />
        </div>
      </div>
    );
  } else if (onPressAddMedia) {
    mediaSlot = (
      <button
        type="button"
        onClick={onPressAddMedia}
        className="mx-auto flex w-[82%] max-w-md flex-col items-center gap-1 rounded-xl border border-dashed border-neutral-600 bg-neutral-950/50 px-4 py-8 text-center light:border-zinc-300 light:bg-zinc-50"
      >
        <span className="text-sm font-bold text-goi-gold">Añadir fotos (opcional)</span>
        <span className="text-xs text-neutral-500">Hasta 4 fotos al final del post</span>
      </button>
    );
  }

  return (
    <div className="grid gap-3">
      {sessionId ? (
        <PostSessionAttachment
          workoutTitle={workoutTitle}
          performedAt={performedAt}
          metrics={metrics}
          exercisePreviews={exercisePreviews}
          moreExercisesCount={moreExercisesCount}
          onPress={onPressSession}
          showViewFullCta={showViewFullCta || Boolean(onPressSession)}
        />
      ) : onPressLinkSession ? (
        <PostSessionAttachment empty onPressLink={onPressLinkSession} />
      ) : null}
      {mediaSlot}
    </div>
  );
}

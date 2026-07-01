import type { SessionExercisePreview } from "../../types/post";
import { PostSessionAttachment, type PostSessionAttachmentMetrics } from "./PostSessionAttachment";

type PublicationLinkedSessionBodyProps = {
  workoutTitle?: string | null;
  performedAt?: string | null;
  metrics?: PostSessionAttachmentMetrics | null;
  exercisePreviews?: SessionExercisePreview[];
  moreExercisesCount?: number;
  onPressViewSession?: () => void;
  compact?: boolean;
};

/** Bloque de entreno vinculado dentro de una publicación estándar (sustituye el caption al pulsar mancuerna). */
export function PublicationLinkedSessionBody({
  workoutTitle,
  performedAt,
  metrics,
  exercisePreviews = [],
  moreExercisesCount = 0,
  onPressViewSession,
  compact = false,
}: PublicationLinkedSessionBodyProps) {
  return (
    <div className={compact ? "pb-1" : "pb-2"}>
      <p className="mb-1.5 px-0.5 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
        Entreno vinculado
      </p>
      <PostSessionAttachment
        workoutTitle={workoutTitle}
        performedAt={performedAt}
        metrics={metrics}
        exercisePreviews={exercisePreviews}
        moreExercisesCount={moreExercisesCount}
        linked
        onPress={onPressViewSession}
        showViewFullCta={Boolean(onPressViewSession)}
      />
    </div>
  );
}

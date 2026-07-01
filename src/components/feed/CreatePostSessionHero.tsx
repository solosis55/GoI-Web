import type { SessionPickerItem } from "../../types/sessionPicker";
import {
  buildSessionExercisePreviews,
  countRemainingExercises,
} from "../../utils/sessionExercisePreview";
import { PostSessionAttachment } from "./PostSessionAttachment";

type CreatePostSessionHeroProps = {
  session: SessionPickerItem;
  onPressView?: () => void;
};

export function CreatePostSessionHero({ session, onPressView }: CreatePostSessionHeroProps) {
  const snap = session.snapshot;
  const exercisePreviews = buildSessionExercisePreviews(snap, 3);
  const moreExercisesCount = countRemainingExercises(snap, exercisePreviews.length);

  return (
    <PostSessionAttachment
      workoutTitle={session.workoutTitle}
      performedAt={session.performedAt}
      metrics={
        snap
          ? {
              completedSets: snap.completedSets,
              totalSets: snap.totalSets,
              completedExercises: snap.completedExercises,
              totalExercises: snap.totalExercises,
            }
          : null
      }
      exercisePreviews={exercisePreviews}
      moreExercisesCount={moreExercisesCount}
      linked
      onPress={onPressView}
      showViewFullCta={Boolean(onPressView)}
    />
  );
}

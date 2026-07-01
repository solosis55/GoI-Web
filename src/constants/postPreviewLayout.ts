import type { PostFormat } from "./postFormat";
import {
  TRAINING_FEED_INSET,
  trainingFeedInsetHeight,
  trainingFeedInsetWidth,
} from "../utils/trainingFeedMediaLayout";

/** Layout preview/feed compartido (paridad App `postPreviewTheme.ts`). */
export const POST_PREVIEW_LAYOUT: Record<
  PostFormat,
  { mediaAspectRatio: number; showMediaPlaceholder: boolean }
> = {
  standard: { mediaAspectRatio: 1, showMediaPlaceholder: true },
  training: { mediaAspectRatio: 4 / 5, showMediaPlaceholder: false },
};

export { TRAINING_FEED_INSET, trainingFeedInsetHeight, trainingFeedInsetWidth };

export function standardHeroAspectClass(): string {
  return "aspect-square";
}

/** Grid del editor: preview más ancho que el panel de edición. */
export function composerEditorGridClass(): string {
  return "md:grid-cols-[minmax(0,3fr)_minmax(280px,2fr)]";
}

export function previewMediaHeightPx(width: number, format: PostFormat, compact = false): number {
  const ratio = POST_PREVIEW_LAYOUT[format].mediaAspectRatio;
  const natural = width / ratio;
  if (!compact) return natural;
  const cap = format === "training" ? 168 : 200;
  return Math.min(cap, natural);
}

export function previewTrainingInsetMaxHeight(cardWidth: number): number {
  return trainingFeedInsetHeight(trainingFeedInsetWidth(cardWidth));
}

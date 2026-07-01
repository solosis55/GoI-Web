/** Foto insertada en posts Training del feed (paridad App). */
export const TRAINING_FEED_INSET = {
  widthRatio: 0.82,
  maxHeight: 220,
} as const;

export function trainingFeedInsetWidth(cardWidth: number): number {
  return Math.round(cardWidth * TRAINING_FEED_INSET.widthRatio);
}

export function trainingFeedInsetHeight(insetWidth: number): number {
  const natural = Math.round(insetWidth * 0.85);
  return Math.min(natural, TRAINING_FEED_INSET.maxHeight);
}

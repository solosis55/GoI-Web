import type { FeedStorySlide } from "../types/story";

const STORAGE_KEY = "fitsocial:storySeen:v1";

/** Firma estable del set de slides visibles para distinguir historia nueva vs ya vista. */
export function signatureForSlides(slides: FeedStorySlide[]) {
  return slides
    .map((s) => s.id)
    .sort()
    .join("|");
}

function readSeen(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as unknown;
    return p && typeof p === "object" && !Array.isArray(p)
      ? (p as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

export function loadStorySeenMap(): Record<string, string> {
  return readSeen();
}

export function markStoryAuthorSeen(userId: string, slides: FeedStorySlide[]) {
  if (!slides.length) return;
  const sig = signatureForSlides(slides);
  const next = readSeen();
  next[userId] = sig;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

export function hasUnseenStories(_userId: string, slides: FeedStorySlide[], seenSig: string | undefined) {
  if (!slides.length) return false;
  return signatureForSlides(slides) !== (seenSig ?? "");
}

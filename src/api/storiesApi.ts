import { apiFetch } from "./client";
import type { CreatedStoryPayload, FeedStoriesPayload } from "../types/story";

export function getStories() {
  return apiFetch<FeedStoriesPayload>("/stories");
}

export function createStory(slides: { type: "image"; url: string }[]) {
  return apiFetch<CreatedStoryPayload>("/stories", {
    method: "POST",
    body: JSON.stringify({ slides }),
  });
}

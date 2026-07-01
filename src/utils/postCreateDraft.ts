export const POST_CREATE_DRAFT_KEY = "goi:postCreateDraft:v1";

export type PostCreateDraft = {
  userId: string;
  content: string;
  visibility: "public" | "followers" | "private";
  /** Sesión vinculada (post training). */
  selectedSessionId: string;
  /** @deprecated Usar selectedSessionId */
  selectedWorkoutId?: string;
};

export function readPostCreateDraft(userId: string): PostCreateDraft | null {
  try {
    const raw = sessionStorage.getItem(POST_CREATE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PostCreateDraft>;
    if (typeof parsed.userId !== "string" || typeof parsed.content !== "string") {
      return null;
    }
    if (
      parsed.visibility !== "public" &&
      parsed.visibility !== "followers" &&
      parsed.visibility !== "private"
    ) {
      return null;
    }
    if (parsed.userId !== userId) return null;
    const sessionId =
      typeof parsed.selectedSessionId === "string"
        ? parsed.selectedSessionId
        : typeof parsed.selectedWorkoutId === "string"
          ? parsed.selectedWorkoutId
          : "";
    return {
      userId: parsed.userId,
      content: parsed.content,
      visibility: parsed.visibility,
      selectedSessionId: sessionId,
    };
  } catch {
    return null;
  }
}

export function writePostCreateDraft(draft: PostCreateDraft): void {
  try {
    sessionStorage.setItem(POST_CREATE_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

export function clearPostCreateDraft(): void {
  try {
    sessionStorage.removeItem(POST_CREATE_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

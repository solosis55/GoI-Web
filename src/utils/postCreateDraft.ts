import type { PostVisibility } from "../constants/createPost";
import type { PostFormat } from "../constants/postFormat";

const DRAFT_KEY_PREFIX = "goi:postCreateDraft:v3";
const LEGACY_V2_KEY = "goi:postCreateDraft:v2";
const LEGACY_V1_KEY = "goi:postCreateDraft:v1";

export type PostCreateDraft = {
  userId: string;
  format: PostFormat;
  content: string;
  visibility: PostVisibility;
  sessionId: string;
  sessionWorkoutTitle: string;
};

function draftStorageKey(userId: string, format: PostFormat): string {
  return `${DRAFT_KEY_PREFIX}:${userId}:${format}`;
}

function parseDraft(raw: string, userId: string, format: PostFormat): PostCreateDraft | null {
  try {
    const parsed = JSON.parse(raw) as Partial<PostCreateDraft & { selectedSessionId?: string }>;
    if (typeof parsed.userId !== "string" || typeof parsed.content !== "string") return null;
    if (parsed.userId !== userId) return null;
    if (
      parsed.visibility !== "public" &&
      parsed.visibility !== "followers" &&
      parsed.visibility !== "private"
    ) {
      return null;
    }
    const sessionId =
      typeof parsed.sessionId === "string"
        ? parsed.sessionId
        : typeof parsed.selectedSessionId === "string"
          ? parsed.selectedSessionId
          : "";
    return {
      userId: parsed.userId,
      format: parsed.format === "training" || parsed.format === "standard" ? parsed.format : format,
      content: parsed.content,
      visibility: parsed.visibility,
      sessionId,
      sessionWorkoutTitle: typeof parsed.sessionWorkoutTitle === "string" ? parsed.sessionWorkoutTitle : "",
    };
  } catch {
    return null;
  }
}

function migrateLegacyStandard(userId: string): PostCreateDraft | null {
  try {
    const v2 = sessionStorage.getItem(LEGACY_V2_KEY);
    if (v2) {
      const draft = parseDraft(v2, userId, "standard");
      if (draft) {
        writePostCreateDraft(draft);
        return draft;
      }
    }
    const v1 = sessionStorage.getItem(LEGACY_V1_KEY);
    if (v1) {
      const draft = parseDraft(v1, userId, "standard");
      if (draft) {
        writePostCreateDraft(draft);
        return draft;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function readPostCreateDraft(userId: string, format: PostFormat): PostCreateDraft | null {
  try {
    const current = sessionStorage.getItem(draftStorageKey(userId, format));
    if (current) return parseDraft(current, userId, format);
    if (format === "standard") return migrateLegacyStandard(userId);
  } catch {
    /* ignore */
  }
  return null;
}

export function writePostCreateDraft(draft: PostCreateDraft): void {
  try {
    sessionStorage.setItem(draftStorageKey(draft.userId, draft.format), JSON.stringify(draft));
    if (draft.format === "standard") {
      sessionStorage.removeItem(LEGACY_V2_KEY);
      sessionStorage.removeItem(LEGACY_V1_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function clearPostCreateDraft(userId: string, format: PostFormat): void {
  try {
    sessionStorage.removeItem(draftStorageKey(userId, format));
    if (format === "standard") {
      sessionStorage.removeItem(LEGACY_V2_KEY);
      sessionStorage.removeItem(LEGACY_V1_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function clearAllPostCreateDrafts(userId: string): void {
  clearPostCreateDraft(userId, "standard");
  clearPostCreateDraft(userId, "training");
}

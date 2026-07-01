export type CreatePostComposerSection = "content" | "media" | "privacy";

export type CreatePostComposerActions = {
  openContent: () => void;
  openMedia: () => void;
  openPrivacy: () => void;
  openSession: () => void;
};

/** @deprecated Alias — usar CreatePostComposerSection */
export type CreatePostToolbarAction = CreatePostComposerSection;

export const CREATE_POST_FORM_ID = "goi-create-post-form";

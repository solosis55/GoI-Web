import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MentionPickUser } from "../../utils/mentionAutocomplete";
import { Button } from "../ui/Button";
import { MentionableTextarea } from "./MentionableTextarea";
import type { CreatePostInput } from "../../types/post";
import {
  POST_BODY_MAX,
  POST_IMAGE_MAX_FILES,
  POST_VISIBILITY_OPTIONS,
} from "../../constants/createPost";
import { MentionHighlighted, type MentionUserDirectory } from "../../utils/mentionText";
import { PostFeedPreviewStandard } from "./PostFeedPreviewStandard";
import { CreatePostSessionField } from "./CreatePostSessionField";
import type { WorkoutSessionWithTitle } from "../../types/workoutSession";
import {
  buildSessionExercisePreviews,
  countRemainingExercises,
} from "../../utils/sessionExercisePreview";
import { composerEditorGridClass } from "../../constants/postPreviewLayout";
import {
  CREATE_POST_FORM_ID,
  type CreatePostComposerActions,
  type CreatePostComposerSection,
} from "./composer/createPostComposerActions";

type Visibility = NonNullable<CreatePostInput["visibility"]>;

export type PendingPostImage = { id: string; dataUrl: string; name: string; uploadFile: File };
export type ComposerTransferState = {
  phase: "processing" | "uploading" | "error";
  progress: number;
  message: string;
};

type CreatePostFormProps = {
  content: string;
  visibility: Visibility;
  pendingImages: PendingPostImage[];
  onChangeContent: (value: string) => void;
  onChangeVisibility: (value: Visibility) => void;
  onAddImages: (files: FileList | null) => void;
  onRemoveImage: (id: string) => void;
  onMoveImage: (id: string, direction: "left" | "right") => void;
  onSetCoverImage: (id: string) => void;
  onCropImage: (id: string) => void;
  submitDisabled?: boolean;
  submitHint?: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  canSubmit: boolean;
  transferState?: ComposerTransferState | null;
  mediaBusy?: boolean;
  onMentionPick?: (picked: MentionPickUser) => void;
  mentionCandidates: MentionPickUser[];
  previewAuthor?: { username: string; avatarUrl: string };
  mentionDirectory?: MentionUserDirectory;
  selectedSessionId?: string;
  sessions?: WorkoutSessionWithTitle[];
  sessionPicker?: import("../../hooks/usePostSessionPicker").PostSessionPickerController;
  onChangeSessionId?: (sessionId: string) => void;
  hideSubmit?: boolean;
  onRegisterActions?: (actions: CreatePostComposerActions) => void;
  activeSection?: CreatePostComposerSection;
  onActiveSectionChange?: (section: CreatePostComposerSection) => void;
};

const EMPTY_MENTION_MAP: MentionUserDirectory = new Map();

export function CreatePostForm({
  content,
  visibility,
  pendingImages,
  onChangeContent,
  onChangeVisibility,
  onAddImages,
  onRemoveImage,
  onMoveImage,
  onSetCoverImage,
  onCropImage,
  submitDisabled = false,
  submitHint,
  onSubmit,
  canSubmit,
  transferState = null,
  mediaBusy = false,
  onMentionPick,
  mentionCandidates,
  previewAuthor,
  mentionDirectory,
  selectedSessionId = "",
  sessions = [],
  sessionPicker,
  onChangeSessionId,
  hideSubmit = false,
  onRegisterActions,
  activeSection = "content",
  onActiveSectionChange,
}: CreatePostFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [sessionPickerOpen, setSessionPickerOpen] = useState(false);
  const [sessionInlineOpen, setSessionInlineOpen] = useState(false);
  const slotsLeft = Math.max(0, POST_IMAGE_MAX_FILES - pendingImages.length);
  const currentHint = POST_VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.hint ?? "";
  const mentionDirResolved = mentionDirectory ?? EMPTY_MENTION_MAP;
  const imageUrls = useMemo(() => pendingImages.map((img) => img.dataUrl), [pendingImages]);
  const activeImage =
    pendingImages.find((img) => img.id === activeImageId) ?? pendingImages[0] ?? null;

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  );

  const exercisePreviews = useMemo(
    () => buildSessionExercisePreviews(selectedSession?.snapshot, 3),
    [selectedSession?.snapshot],
  );

  const moreExercisesCount = useMemo(
    () => countRemainingExercises(selectedSession?.snapshot, exercisePreviews.length),
    [selectedSession?.snapshot, exercisePreviews.length],
  );

  const sessionMetrics = useMemo(() => {
    const snap = selectedSession?.snapshot;
    if (!snap) return null;
    return {
      completedSets: snap.completedSets,
      totalSets: snap.totalSets,
      completedExercises: snap.completedExercises,
      totalExercises: snap.totalExercises,
    };
  }, [selectedSession?.snapshot]);

  const linkedSessionPreview = selectedSession
    ? {
        workoutTitle: selectedSession.workoutTitle,
        performedAt: selectedSession.performedAt,
        metrics: sessionMetrics,
        exercisePreviews,
        moreExercisesCount,
      }
    : null;

  useEffect(() => {
    if (!selectedSessionId) setSessionInlineOpen(false);
  }, [selectedSessionId]);

  useEffect(() => {
    if (pendingImages.length === 0) {
      setActiveImageId(null);
      return;
    }
    if (!activeImageId || !pendingImages.some((img) => img.id === activeImageId)) {
      setActiveImageId(pendingImages[0]!.id);
    }
  }, [pendingImages, activeImageId]);

  const openFilePicker = () => fileRef.current?.click();
  const goToSection = (section: CreatePostComposerSection) => onActiveSectionChange?.(section);
  const focusCaption = () => {
    goToSection("content");
    window.requestAnimationFrame(() => {
      const target = document.getElementById("create-post-caption-panel");
      target?.querySelector("textarea")?.focus();
    });
  };
  const openOptions = () => {
    goToSection("privacy");
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLSelectElement>("#create-post-visibility-panel select")?.focus();
    });
  };
  const openSessionPanel = () => {
    goToSection("content");
    setSessionPickerOpen(true);
  };

  useEffect(() => {
    if (!onRegisterActions) return;
    onRegisterActions({
      openContent: () => {
        goToSection("content");
        window.requestAnimationFrame(() => {
          document.getElementById("create-post-caption-panel")?.querySelector("textarea")?.focus();
        });
      },
      openMedia: () => goToSection("media"),
      openPrivacy: openOptions,
      openSession: openSessionPanel,
    });
  }, [onRegisterActions, onActiveSectionChange, selectedSessionId]);

  return (
    <form
      id={CREATE_POST_FORM_ID}
      className="stack flex min-h-0 flex-col gap-4"
      onSubmit={onSubmit}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(event) => {
          onAddImages(event.target.files);
          event.target.value = "";
        }}
      />

      <div className={["grid min-h-0 gap-4 md:items-start", composerEditorGridClass()].join(" ")}>
        <div className="min-w-0 md:sticky md:top-0">
          {previewAuthor ? (
            <PostFeedPreviewStandard
              username={previewAuthor.username}
              avatarUrl={previewAuthor.avatarUrl}
              visibility={visibility}
              content={content}
              imageUrls={imageUrls}
              editorMode
              compact
              mentionDirectory={mentionDirResolved}
              onPressAddMedia={() => {
                goToSection("media");
                openFilePicker();
              }}
              onPressEditCaption={focusCaption}
              showSessionInline={sessionInlineOpen && Boolean(selectedSessionId)}
              sessionPreviewActive={sessionInlineOpen}
              onPressSessionPreview={
                selectedSessionId
                  ? () => setSessionInlineOpen((open) => !open)
                  : undefined
              }
              linkedSession={linkedSessionPreview}
            />
          ) : null}
        </div>

        <div className="grid min-w-0 gap-3">
          {activeSection === "media" ? (
          <div id="create-post-media-panel">
          {pendingImages.length > 0 ? (
            <div className="rounded-xl border border-neutral-800/85 bg-black/25 p-3 light:border-zinc-200 light:bg-zinc-50">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Fotos</p>
              <div className="flex flex-wrap gap-2">
                {pendingImages.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    className={[
                      "relative size-16 overflow-hidden rounded-lg border-2",
                      img.id === activeImage?.id ? "border-goi-gold" : "border-neutral-700 light:border-zinc-300",
                    ].join(" ")}
                    onClick={() => setActiveImageId(img.id)}
                    aria-label={`Foto ${idx + 1}`}
                  >
                    <img src={img.dataUrl} alt="" className="size-full object-cover" />
                    {idx === 0 ? (
                      <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-center text-[9px] font-bold text-goi-gold">
                        Portada
                      </span>
                    ) : null}
                  </button>
                ))}
                {slotsLeft > 0 ? (
                  <button
                    type="button"
                    className="flex size-16 items-center justify-center rounded-lg border border-dashed border-neutral-600 text-xl text-goi-gold"
                    onClick={openFilePicker}
                    disabled={mediaBusy}
                    aria-label="Añadir foto"
                  >
                    +
                  </button>
                ) : null}
              </div>
              {activeImage ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" disabled={mediaBusy} onClick={openFilePicker}>
                    Añadir
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={mediaBusy}
                    onClick={() => onCropImage(activeImage.id)}
                  >
                    Recortar
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={mediaBusy}
                    onClick={() => onSetCoverImage(activeImage.id)}
                  >
                    Portada
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={mediaBusy}
                    onClick={() => onMoveImage(activeImage.id, "left")}
                  >
                    ←
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={mediaBusy}
                    onClick={() => onMoveImage(activeImage.id, "right")}
                  >
                    →
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={mediaBusy}
                    onClick={() => onRemoveImage(activeImage.id)}
                  >
                    Quitar
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              disabled={mediaBusy}
              onClick={openFilePicker}
              className="flex min-h-[150px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-600 bg-black/20 transition hover:border-goi-gold/50 light:border-zinc-300 light:bg-zinc-50 light:hover:border-goi-gold/60"
            >
              <span className="text-3xl font-light leading-none text-goi-gold">+</span>
              <span className="text-sm font-semibold text-neutral-300 light:text-zinc-700">Añadir fotos</span>
            </button>
          )}
          </div>
          ) : null}

          {activeSection === "content" ? (
          <>
          {onChangeSessionId && sessionPicker ? (
            <div id="create-post-session-panel">
            <CreatePostSessionField
              picker={sessionPicker}
              selectedSessionId={selectedSessionId}
              selectedSession={sessionPicker.getSession(selectedSessionId)}
              onChangeSessionId={onChangeSessionId}
              open={sessionPickerOpen}
              onOpenChange={setSessionPickerOpen}
            />
            </div>
          ) : null}

          <label id="create-post-caption-panel" className="grid gap-2 font-semibold">
            Pie de foto
            <span className="text-xs font-normal text-neutral-500">Opcional si hay foto. Escribe @ para mencionar.</span>
            <MentionableTextarea
              value={content}
              onChange={onChangeContent}
              candidates={mentionCandidates}
              onMentionPick={onMentionPick}
              autoGrow
              rows={4}
              maxLength={POST_BODY_MAX}
              className="goi-field min-h-[120px] w-full resize-none rounded-xl border-neutral-700/90 bg-black/55 px-3 py-3 light:border-zinc-300 light:bg-white"
              placeholder="Pie de foto opcional…"
              listPlacement="below"
            />
            {content.trim() ? (
              <div className="rounded-lg border border-neutral-800/70 bg-black/20 px-3 py-2 text-sm text-neutral-300 light:border-zinc-200 light:bg-zinc-50 light:text-zinc-800">
                <MentionHighlighted text={content} userDirectory={mentionDirResolved} />
              </div>
            ) : null}
          </label>
          </>
          ) : null}

          {activeSection === "privacy" ? (
          <fieldset
            id="create-post-visibility-panel"
            className="grid gap-1.5 rounded-xl border border-neutral-800/85 bg-black/25 p-3 light:border-zinc-200 light:bg-zinc-50"
          >
            <legend className="font-semibold">Visibilidad</legend>
            <select
              className="goi-field"
              value={visibility}
              onChange={(e) => onChangeVisibility(e.target.value as Visibility)}
              aria-describedby="post-visibility-hint"
            >
              {POST_VISIBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p id="post-visibility-hint" className="text-xs text-neutral-500">
              {currentHint}
            </p>
          </fieldset>
          ) : null}
        </div>
      </div>

      {transferState ? (
        <div
          className={[
            "rounded-lg border p-2.5",
            transferState.phase === "error"
              ? "border-red-800/80 bg-red-950/20 text-red-200"
              : "border-goi-gold/35 bg-goi-gold/10 text-neutral-200",
          ].join(" ")}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-2 text-xs">
            <span>{transferState.message}</span>
            <span>{Math.max(0, Math.min(100, Math.round(transferState.progress)))}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800/90 light:bg-zinc-200">
            <div
              className={[
                "h-full rounded-full transition-[width] duration-200",
                transferState.phase === "error" ? "bg-red-500" : "bg-goi-gold",
              ].join(" ")}
              style={{ width: `${Math.max(4, Math.min(100, transferState.progress))}%` }}
            />
          </div>
        </div>
      ) : null}

      {submitHint && !hideSubmit ? <p className="text-xs text-amber-200/90 light:text-amber-800">{submitHint}</p> : null}

      {!hideSubmit ? (
        <div className="hidden justify-end pt-1 md:flex">
          <Button type="submit" disabled={submitDisabled || !canSubmit} className="w-full sm:w-auto">
            Publicar
          </Button>
        </div>
      ) : null}
    </form>
  );
}

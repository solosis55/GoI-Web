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
import { CAPTION_PROMPTS_TRAINING, sessionPostTemplate } from "../../constants/createPostPrompts";
import { MentionHighlighted, type MentionUserDirectory } from "../../utils/mentionText";
import { PostFeedPreviewTraining } from "./PostFeedPreviewTraining";
import { CreatePostSessionField } from "./CreatePostSessionField";
import type { WorkoutSessionWithTitle } from "../../types/workoutSession";
import {
  buildSessionExercisePreviews,
  countRemainingExercises,
} from "../../utils/sessionExercisePreview";
import type { ComposerTransferState, PendingPostImage } from "./CreatePostForm";

type Visibility = NonNullable<CreatePostInput["visibility"]>;

type CreatePostTrainingFormProps = {
  content: string;
  visibility: Visibility;
  pendingImages: PendingPostImage[];
  selectedSessionId: string;
  sessions: WorkoutSessionWithTitle[];
  onChangeContent: (value: string) => void;
  onChangeVisibility: (value: Visibility) => void;
  onChangeSessionId: (sessionId: string) => void;
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
  onApplyTemplate?: (templateText: string) => void;
  mentionCandidates: MentionPickUser[];
  previewAuthor?: { username: string; avatarUrl: string };
  mentionDirectory?: MentionUserDirectory;
};

const EMPTY_MENTION_MAP: MentionUserDirectory = new Map();

export function CreatePostTrainingForm({
  content,
  visibility,
  pendingImages,
  selectedSessionId,
  sessions,
  onChangeContent,
  onChangeVisibility,
  onChangeSessionId,
  onAddImages,
  onRemoveImage,
  onCropImage,
  submitDisabled = false,
  submitHint,
  onSubmit,
  canSubmit,
  transferState = null,
  mediaBusy = false,
  onMentionPick,
  onApplyTemplate,
  mentionCandidates,
  previewAuthor,
  mentionDirectory,
}: CreatePostTrainingFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [sessionPickerOpen, setSessionPickerOpen] = useState(false);
  const slotsLeft = Math.max(0, POST_IMAGE_MAX_FILES - pendingImages.length);
  const currentHint = POST_VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.hint ?? "";
  const mentionDirResolved = mentionDirectory ?? EMPTY_MENTION_MAP;
  const imageUrls = useMemo(() => pendingImages.map((img) => img.dataUrl), [pendingImages]);
  const activeImage =
    pendingImages.find((img) => img.id === activeImageId) ?? pendingImages[0] ?? null;

  const mySessions = useMemo(
    () => [...sessions].sort((a, b) => b.performedAt.localeCompare(a.performedAt)),
    [sessions],
  );

  const selectedSession = useMemo(
    () => mySessions.find((s) => s.id === selectedSessionId) ?? null,
    [mySessions, selectedSessionId],
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
  const focusCaption = () => {
    document.getElementById("create-post-training-caption")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    document.querySelector<HTMLTextAreaElement>("#create-post-training-caption textarea")?.focus();
  };

  const handleSessionChange = (sessionId: string) => {
    onChangeSessionId(sessionId);
    const session = mySessions.find((s) => s.id === sessionId);
    if (session && !content.trim()) {
      onChangeContent(sessionPostTemplate(session.workoutTitle));
    }
  };

  return (
    <form className="stack flex min-h-0 flex-col gap-4" onSubmit={onSubmit}>
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

      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-start">
        <div className="min-w-0">
          {previewAuthor ? (
            <PostFeedPreviewTraining
              username={previewAuthor.username}
              avatarUrl={previewAuthor.avatarUrl}
              visibility={visibility}
              content={content}
              sessionId={selectedSessionId || null}
              workoutTitle={selectedSession?.workoutTitle}
              performedAt={selectedSession?.performedAt}
              metrics={sessionMetrics}
              exercisePreviews={exercisePreviews}
              moreExercisesCount={moreExercisesCount}
              imageUrls={imageUrls}
              editorMode
              mentionDirectory={mentionDirResolved}
              onPressLinkSession={() => setSessionPickerOpen(true)}
              onPressEditCaption={focusCaption}
              onPressAddMedia={openFilePicker}
            />
          ) : null}
        </div>

        <div className="grid gap-3">
          <CreatePostSessionField
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            onChangeSessionId={handleSessionChange}
            open={sessionPickerOpen}
            onOpenChange={setSessionPickerOpen}
            hint="Recomendado para contextualizar el entreno."
          />

          {pendingImages.length > 0 ? (
            <div className="rounded-xl border border-neutral-800/85 bg-black/25 p-3 light:border-zinc-200 light:bg-zinc-50">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Fotos (opcional)
              </p>
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
                  >
                    <img src={img.dataUrl} alt="" className="size-full object-cover" />
                    {idx === 0 ? (
                      <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-center text-[9px] font-bold text-goi-gold">
                        1ª
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
                  <Button type="button" variant="secondary" disabled={mediaBusy} onClick={() => onCropImage(activeImage.id)}>
                    Recortar
                  </Button>
                  <Button type="button" variant="secondary" disabled={mediaBusy} onClick={() => onRemoveImage(activeImage.id)}>
                    Quitar
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <Button type="button" variant="secondary" disabled={mediaBusy} onClick={openFilePicker}>
              Añadir foto (opcional)
            </Button>
          )}

          <label id="create-post-training-caption" className="grid gap-2 font-semibold">
            Comentario del entreno
            <span className="text-xs font-normal text-neutral-500">Opcional si hay sesión o foto. Mín. 4 caracteres sin foto.</span>
            <div className="flex flex-wrap gap-1.5">
              {CAPTION_PROMPTS_TRAINING.map((text) => (
                <button
                  key={text}
                  type="button"
                  className="rounded-full border border-neutral-700 bg-neutral-900/80 px-2.5 py-1 text-[11px] font-semibold text-neutral-300 hover:border-goi-gold/60 hover:text-goi-gold light:border-zinc-300 light:bg-zinc-100 light:text-zinc-700"
                  onClick={() => onApplyTemplate?.(text)}
                  disabled={mediaBusy}
                >
                  {text}
                </button>
              ))}
            </div>
            <MentionableTextarea
              value={content}
              onChange={onChangeContent}
              candidates={mentionCandidates}
              onMentionPick={onMentionPick}
              autoGrow
              rows={4}
              maxLength={POST_BODY_MAX}
              className="goi-field min-h-[120px] w-full resize-none rounded-xl border-neutral-700/90 bg-black/55 px-3 py-3 light:border-zinc-300 light:bg-white"
              placeholder="¿Cómo fue el entreno?"
              listPlacement="below"
            />
            {content.trim() ? (
              <div className="rounded-lg border border-neutral-800/70 bg-black/20 px-3 py-2 text-sm text-neutral-300 light:border-zinc-200 light:bg-zinc-50 light:text-zinc-800">
                <MentionHighlighted text={content} userDirectory={mentionDirResolved} />
              </div>
            ) : null}
          </label>

          <fieldset className="grid gap-1.5 rounded-xl border border-neutral-800/85 bg-black/25 p-3 light:border-zinc-200 light:bg-zinc-50">
            <legend className="font-semibold">Visibilidad</legend>
            <select
              className="goi-field"
              value={visibility}
              onChange={(e) => onChangeVisibility(e.target.value as Visibility)}
            >
              {POST_VISIBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-500">{currentHint}</p>
          </fieldset>
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
        </div>
      ) : null}

      {submitHint ? <p className="text-xs text-amber-200/90 light:text-amber-800">{submitHint}</p> : null}

      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={submitDisabled || !canSubmit} className="w-full sm:w-auto">
          Publicar training
        </Button>
      </div>
    </form>
  );
}

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MentionPickUser } from "../../utils/mentionAutocomplete";
import { Button } from "../ui/Button";
import { MentionableTextarea } from "./MentionableTextarea";
import type { Workout } from "../../types/workout";
import type { CreatePostInput, PostMediaItem } from "../../types/post";
import { POST_IMAGE_MAX_FILES } from "../../utils/postImages";
import { visibilityBadgeClasses } from "../../utils/visibilityBadgeClasses";
import { MentionHighlighted, type MentionUserDirectory } from "../../utils/mentionText";
import { Avatar } from "../ui/Avatar";
import { PostMediaGallery } from "./PostMediaGallery";

type Visibility = NonNullable<CreatePostInput["visibility"]>;

export type PendingPostImage = { id: string; dataUrl: string; name: string; uploadFile: File };
export type ComposerTransferState = {
  phase: "processing" | "uploading" | "error";
  progress: number;
  message: string;
};

type CreatePostFormProps = {
  content: string;
  selectedWorkoutId: string;
  visibility: Visibility;
  workouts: Workout[];
  pendingImages: PendingPostImage[];
  onChangeContent: (value: string) => void;
  onChangeWorkoutId: (value: string) => void;
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
  onApplyTemplate?: (templateText: string) => void;
  /** Usuarios para autocompletar @ al publicar. */
  mentionCandidates: MentionPickUser[];
  /** Para la vista previa de fase 3 (mismo aspecto que en el feed). */
  previewAuthor?: { username: string; avatarUrl: string };
  mentionDirectory?: MentionUserDirectory;
};

const EMPTY_MENTION_MAP: MentionUserDirectory = new Map();

function PreviewDumbbellIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        d="M4 14V10M20 14V10M7 17V7M17 17V7"
      />
      <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M7 10h10M7 14h10" />
    </svg>
  );
}

function PreviewHeartOutline({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        d="M12 21s-6.716-5.304-9.233-8.607C.32 9.59.32 6.26 2.49 4.22 4.66 2.18 7.79 2.39 9.9 4.22L12 6.13l2.1-1.91c2.11-1.83 5.24-2.04 7.41-.02 2.17 2.02 2.17 5.35-.28 8.18C16.72 15.7 12 21 12 21Z"
      />
    </svg>
  );
}

const QUICK_TEMPLATES: { id: string; label: string; text: string }[] = [
  { id: "pr", label: "PR", text: "PR de [ejercicio]: [peso/reps]\nContexto: [sensaciones/técnica]" },
  { id: "checkin", label: "Check-in", text: "Entreno hecho ✅\nEnfoque: [fuerza/cardio/movilidad]" },
  {
    id: "resumen",
    label: "Resumen",
    text: "Objetivo de la semana: ...\nLo mejor del entreno: ...\nPróximo paso: ...",
  },
  { id: "pregunta", label: "Pregunta", text: "¿Algún consejo para mejorar [ejercicio/meta]? 👀" },
];

const COMPOSER_STEPS = [
  { id: "media", label: "Imagen" },
  { id: "content", label: "Texto + config" },
  { id: "review", label: "Revisión" },
] as const;

const VISIBILITY_OPTIONS: { value: Visibility; label: string; hint: string }[] = [
  { value: "public", label: "Todo el mundo", hint: "Visible para cualquier usuario con sesión iniciada." },
  { value: "followers", label: "Solo seguidores", hint: "Solo quien te sigue (y tú al ver tus propios posts)." },
  { value: "private", label: "Solo yo", hint: "No aparece en el feed público ni para seguidores." },
];

export function CreatePostForm({
  content,
  selectedWorkoutId,
  visibility,
  workouts,
  pendingImages,
  onChangeContent,
  onChangeWorkoutId,
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
  onApplyTemplate,
  mentionCandidates,
  previewAuthor,
  mentionDirectory,
}: CreatePostFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [mediaMenuOpen, setMediaMenuOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const currentHint = VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.hint ?? "";
  const slotsLeft = Math.max(0, POST_IMAGE_MAX_FILES - pendingImages.length);
  const textOptional = pendingImages.length > 0;
  const selectedWorkoutTitle = workouts.find((w) => w.id === selectedWorkoutId)?.title ?? "";
  const visibilityLabel = VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.label ?? "Todo el mundo";
  const previewText = content.trim();
  const hasPreview = previewText.length > 0 || pendingImages.length > 0 || selectedWorkoutTitle;
  const isFirstStep = stepIdx === 0;
  const isFinalStep = stepIdx === COMPOSER_STEPS.length - 1;
  const stepTitle = COMPOSER_STEPS[stepIdx]?.label ?? "Editor";
  const activePreview = pendingImages[previewIndex] ?? pendingImages[0] ?? null;
  const previewMediaItems: PostMediaItem[] = useMemo(
    () => pendingImages.map((img) => ({ type: "image" as const, url: img.dataUrl })),
    [pendingImages],
  );
  const mentionDirResolved = mentionDirectory ?? EMPTY_MENTION_MAP;
  const feedVisibilityBadge =
    visibility === "public" ? "Público" : visibility === "followers" ? "Seguidores" : "Solo yo";
  const previewTimestampLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "short" }).format(new Date());
    } catch {
      return "Ahora";
    }
  }, [stepIdx]);
  const nextDisabled = useMemo(() => {
    if (stepIdx === 0) return pendingImages.length === 0;
    if (stepIdx === 1) return !canSubmit;
    return false;
  }, [stepIdx, canSubmit, pendingImages.length]);

  useEffect(() => {
    if (pendingImages.length === 0) {
      setPreviewIndex(0);
      setMediaMenuOpen(false);
      return;
    }
    if (previewIndex > pendingImages.length - 1) {
      setPreviewIndex(pendingImages.length - 1);
    }
  }, [pendingImages.length, previewIndex]);

  return (
    <form className="stack flex min-h-[62vh] flex-col gap-3 max-[479px]:gap-2.5" onSubmit={onSubmit}>
      <div className="rounded-xl border border-neutral-800/85 bg-black/25 p-2.5 light:border-zinc-200 light:bg-zinc-50">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-goi-gold-dim">
            Paso {stepIdx + 1} de {COMPOSER_STEPS.length}
          </p>
          <p className="text-xs text-neutral-400">{stepTitle}</p>
        </div>
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-neutral-800/90 light:bg-zinc-200">
          <div
            className="h-full rounded-full bg-goi-gold transition-[width] duration-200"
            style={{ width: `${((stepIdx + 1) / COMPOSER_STEPS.length) * 100}%` }}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
          {COMPOSER_STEPS.map((step, idx) => (
            <button
              key={step.id}
              type="button"
              aria-label={`Ir al paso ${idx + 1}: ${step.label}`}
              className={[
                "min-h-9 min-w-9 shrink-0 rounded-lg border px-2 text-[11px] font-semibold transition sm:min-w-0",
                idx === stepIdx
                  ? "border-goi-gold/60 bg-goi-gold/15 text-goi-gold"
                  : "border-neutral-800 bg-black/35 text-neutral-500 hover:border-neutral-700 hover:text-neutral-300 light:border-zinc-300 light:bg-white light:text-zinc-600",
              ].join(" ")}
              onClick={() => setStepIdx(idx)}
            >
              <span className="sm:hidden">{idx + 1}</span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          ))}
        </div>
      </div>

      {stepIdx === 0 ? (
        <div className="grid gap-2 rounded-xl border border-neutral-800/85 bg-black/25 p-3 light:border-zinc-200 light:bg-zinc-50">
          <div className="px-0.5">
            <p className="font-semibold text-neutral-100 light:text-zinc-900">Fase 1 · Añadir imagen y edición</p>
          </div>
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
          <div className="group relative mt-1 grid h-[min(56vh,560px)] w-full place-items-center overflow-hidden rounded-xl border border-dashed border-neutral-700/90 bg-black/35 transition hover:border-goi-gold/55 light:border-zinc-300 light:bg-zinc-50">
            {pendingImages.length > 0 ? (
              <img
                src={activePreview!.dataUrl}
                alt={activePreview!.name}
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : null}
            {pendingImages.length > 1 ? (
              <>
                <button
                  type="button"
                  className="absolute left-3 top-1/2 z-20 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-goi-gold/45 bg-black/70 text-goi-gold shadow-lg hover:bg-black/85"
                  aria-label="Ver imagen anterior"
                  onClick={() =>
                    setPreviewIndex((i) => (i - 1 + pendingImages.length) % pendingImages.length)
                  }
                >
                  <span aria-hidden className="text-lg leading-none">
                    ←
                  </span>
                </button>
                <button
                  type="button"
                  className="absolute right-3 top-1/2 z-20 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-goi-gold/45 bg-black/70 text-goi-gold shadow-lg hover:bg-black/85"
                  aria-label="Ver imagen siguiente"
                  onClick={() => setPreviewIndex((i) => (i + 1) % pendingImages.length)}
                >
                  <span aria-hidden className="text-lg leading-none">
                    →
                  </span>
                </button>
                <span className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border border-neutral-700/90 bg-black/75 px-2 py-0.5 text-[11px] font-medium text-neutral-300">
                  {previewIndex + 1} / {pendingImages.length}
                </span>
              </>
            ) : null}
            {pendingImages.length === 0 ? (
              <button
                type="button"
                className="relative z-10 flex flex-col items-center gap-2 rounded-xl border border-neutral-700/90 bg-black/65 px-4 py-3 text-center light:border-zinc-300 light:bg-white/90"
                disabled={slotsLeft === 0 || mediaBusy}
                onClick={() => fileRef.current?.click()}
              >
                <span className="inline-flex size-10 items-center justify-center rounded-full border border-goi-gold/60 bg-goi-gold/15 text-2xl font-bold leading-none text-goi-gold">
                  +
                </span>
                <p className="text-sm font-semibold text-neutral-200 light:text-zinc-800">Añadir foto o multimedia</p>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="absolute bottom-3 right-3 z-20 inline-flex size-11 items-center justify-center rounded-full border border-goi-gold/60 bg-black/75 text-goi-gold shadow-lg hover:bg-black/85"
                  onClick={() => setMediaMenuOpen((open) => !open)}
                  aria-label="Opciones de multimedia"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    aria-hidden
                    className="size-6"
                  >
                    <path
                      d="M12 5v14M5 12h14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                {mediaMenuOpen ? (
                  <div className="absolute bottom-16 right-3 z-20 grid min-w-[200px] gap-1 rounded-xl border border-neutral-700 bg-black/85 p-2 shadow-2xl light:border-zinc-300 light:bg-white">
                    <button
                      type="button"
                      className="rounded-lg px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800 light:text-zinc-800 light:hover:bg-zinc-100"
                      onClick={() => {
                        setMediaMenuOpen(false);
                        fileRef.current?.click();
                      }}
                    >
                      Añadir más contenido
                    </button>
                    <button
                      type="button"
                      className="rounded-lg px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800 light:text-zinc-800 light:hover:bg-zinc-100"
                      onClick={() => {
                        setMediaMenuOpen(false);
                        if (activePreview) onCropImage(activePreview.id);
                      }}
                    >
                      Editar foto
                    </button>
                    <button
                      type="button"
                      className="rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-900/30 light:text-red-700 light:hover:bg-red-100"
                      onClick={() => {
                        setMediaMenuOpen(false);
                        if (activePreview) onRemoveImage(activePreview.id);
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                ) : null}
              </>
            )}
            {slotsLeft === 0 ? (
              <span className="absolute right-2 top-2 rounded-md border border-goi-gold/45 bg-black/70 px-2 py-1 text-[11px] font-semibold text-goi-gold">
                Límite alcanzado
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {stepIdx === 1 ? (
        <>
          <label className="grid gap-2 rounded-xl border border-neutral-800/85 bg-black/35 p-2.5 font-semibold light:border-zinc-200 light:bg-zinc-50">
            Fase 2 · Texto, menciones y configuración
            <span className="font-normal text-xs text-neutral-500">Tip: escribe @ para mencionar.</span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className="rounded-full border border-neutral-700 bg-neutral-900/80 px-2.5 py-1 text-[11px] font-semibold text-neutral-300 hover:border-goi-gold/60 hover:text-goi-gold light:border-zinc-300 light:bg-zinc-100 light:text-zinc-700"
                  onClick={() => onApplyTemplate?.(template.text)}
                  disabled={mediaBusy}
                >
                  {template.label}
                </button>
              ))}
            </div>
            <MentionableTextarea
              value={content}
              onChange={onChangeContent}
              candidates={mentionCandidates}
              onMentionPick={onMentionPick}
              autoGrow
              rows={5}
              maxLength={280}
              required={!textOptional}
              className="goi-field min-h-[156px] w-full resize-none rounded-xl border-neutral-700/90 bg-black/55 px-3 py-3 light:border-zinc-300 light:bg-white"
              placeholder={
                textOptional ? "Pie de foto opcional…" : "Hoy rompí mi PR en sentadilla… (mínimo 4 caracteres sin fotos)"
              }
              listPlacement="below"
            />
          </label>

          <fieldset className="grid gap-1.5 rounded-xl border border-neutral-800/85 bg-black/25 p-3 light:border-zinc-200 light:bg-zinc-50">
            <legend className="font-semibold">Visibilidad</legend>
            <select
              className="goi-field"
              value={visibility}
              onChange={(e) => onChangeVisibility(e.target.value as Visibility)}
              aria-describedby="post-visibility-hint"
            >
              {VISIBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p id="post-visibility-hint" className="text-xs text-neutral-500">
              {currentHint}
            </p>
          </fieldset>

          <label className="grid gap-1.5 rounded-xl border border-neutral-800/85 bg-black/25 p-3 font-semibold light:border-zinc-200 light:bg-zinc-50">
            Rutina vinculada (opcional)
            <select
              className="goi-field"
              value={selectedWorkoutId}
              onChange={(event) => onChangeWorkoutId(event.target.value)}
            >
              <option value="">Sin rutina</option>
              {workouts.map((workout) => {
                const tagHint = (workout.tags ?? []).filter(Boolean);
                const hint =
                  tagHint.length > 0
                    ? ` — ${tagHint.slice(0, 3).join(", ")}${tagHint.length > 3 ? "…" : ""}`
                    : "";
                return (
                  <option key={workout.id} value={workout.id}>
                    {workout.title}
                    {hint}
                  </option>
                );
              })}
            </select>
          </label>
        </>
      ) : null}

      {stepIdx === 2 ? (
        hasPreview ? (
          <div className="mt-1 grid gap-3">
            {previewAuthor ? (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-goi-gold-dim">
                  Fase 3 · Vista previa en el feed
                </p>
                <article
                  className="feed-post-card flex flex-col gap-3 rounded-2xl border p-4 transition-[box-shadow,transform] duration-300 hover:-translate-y-px hover:shadow-[0_14px_44px_rgb(0_0_0_/_0.48)] sm:flex-row sm:items-start sm:justify-between sm:gap-5 sm:p-5 light:hover:shadow-[0_12px_36px_rgb(24_24_27_/_0.11)]"
                  aria-label="Vista previa de la publicación"
                >
                  <div className="flex min-w-0 flex-1 gap-3.5">
                    <div className="shrink-0 pt-1">
                      <Avatar src={previewAuthor.avatarUrl} alt={previewAuthor.username} size={46} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-neutral-800/65 pb-3 light:border-zinc-200/90">
                        <span className="text-[15px] font-semibold tracking-tight text-neutral-100 light:text-zinc-900">
                          {previewAuthor.username}
                          <span className="font-normal text-neutral-500"> (tu)</span>
                        </span>
                        <span className="text-neutral-600 max-[379px]:hidden">·</span>
                        <time className="text-[13px] tabular-nums text-neutral-500 light:text-zinc-500" dateTime={new Date().toISOString()}>
                          {previewTimestampLabel}
                        </time>
                        <span
                          className={[
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            visibilityBadgeClasses(visibility),
                          ].join(" ")}
                          title={
                            feedVisibilityBadge === "Solo yo"
                              ? "Visible solo para ti"
                              : feedVisibilityBadge === "Seguidores"
                                ? "Visible para tus seguidores"
                                : "Visible para todos"
                          }
                        >
                          {feedVisibilityBadge}
                        </span>
                      </div>

                      {content.trim() ? (
                        <div className="whitespace-pre-wrap rounded-xl border border-neutral-800/75 bg-black/30 px-3.5 py-3 text-[15px] leading-relaxed text-goi-steel shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.04)] light:border-zinc-200 light:bg-zinc-50/95 light:text-zinc-800 light:shadow-none">
                          <MentionHighlighted text={content} userDirectory={mentionDirResolved} />
                        </div>
                      ) : null}
                      <PostMediaGallery media={previewMediaItems} />
                      {selectedWorkoutTitle ? (
                        <div className="mt-0.5 inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-goi-gold/30 bg-goi-gold/[0.09] px-3 py-1.5 text-xs shadow-[inset_0_1px_0_0_rgba(212,175,55,0.12)] light:border-goi-gold/35 light:bg-goi-gold/[0.1] healthy:bg-goi-gold/[0.08]">
                          <PreviewDumbbellIcon className="size-4 shrink-0 text-goi-gold" />
                          <span className="font-semibold uppercase tracking-wide text-[10px] text-goi-gold-dim">
                            Rutina
                          </span>
                          <span className="text-neutral-600 max-[379px]:hidden">·</span>
                          <span className="truncate font-medium text-neutral-100 light:text-zinc-900">{selectedWorkoutTitle}</span>
                        </div>
                      ) : null}
                      <p className="text-[11px] text-neutral-500">
                        Tras publicar podrán comentar; aquí solo es una vista previa.
                      </p>
                    </div>
                  </div>

                  <div className="pointer-events-none w-full shrink-0 select-none sm:w-auto sm:self-start sm:pt-1">
                    <div className="actions flex flex-wrap gap-2 rounded-xl border border-neutral-800/80 bg-black/30 p-2.5 opacity-90 shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.04)] light:border-zinc-200 light:bg-zinc-50/98 light:shadow-none max-[479px]:grid max-[479px]:w-full max-[479px]:grid-cols-1">
                      <span className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-950/80 px-3 py-2 text-xs text-neutral-300 light:border-zinc-300 light:bg-white">
                        <PreviewHeartOutline className="size-4 shrink-0 opacity-95" />
                        0
                      </span>
                      <span className="inline-flex min-h-11 items-center rounded-lg border border-neutral-700 bg-neutral-950/40 px-3 py-2 text-xs text-neutral-500 light:border-zinc-300 light:bg-zinc-100">
                        Editar
                      </span>
                      <span className="inline-flex min-h-11 items-center rounded-lg border border-neutral-700 bg-neutral-950/40 px-3 py-2 text-xs text-neutral-500 light:border-zinc-300 light:bg-zinc-100">
                        Copiar enlace
                      </span>
                      <span className="inline-flex min-h-11 items-center rounded-lg border border-red-900/50 bg-red-950/25 px-3 py-2 text-xs text-red-300/90">
                        Eliminar
                      </span>
                    </div>
                  </div>
                </article>
              </>
            ) : (
              <div className="rounded-lg border border-neutral-800/90 bg-black/35 p-3 light:border-zinc-200 light:bg-zinc-50">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-goi-gold-dim">
                  Fase 3 · Revisión final
                </p>
                {previewText ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-200 light:text-zinc-800">{previewText}</p>
                ) : (
                  <p className="mt-1 text-sm text-neutral-500">Sin texto.</p>
                )}
                {selectedWorkoutTitle ? (
                  <p className="mt-1 text-xs text-neutral-400 light:text-zinc-600">Rutina: {selectedWorkoutTitle}</p>
                ) : null}
                {pendingImages.length > 0 ? (
                  <p className="mt-1 text-xs text-neutral-400 light:text-zinc-600">
                    Fotos adjuntas: {pendingImages.length}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-neutral-500">Visibilidad: {visibilityLabel}</p>
              </div>
            )}

            {pendingImages.length > 1 && activePreview ? (
              <div className="flex flex-wrap gap-2 rounded-lg border border-neutral-800/70 bg-black/20 p-2.5 light:border-zinc-200 light:bg-zinc-50">
                <span className="w-full text-[11px] font-medium text-neutral-500">
                  Orden en el carrusel / miniatura (primera = portada en el feed)
                </span>
                <button
                  type="button"
                  className="rounded-lg border border-neutral-700 px-2 py-1 text-[11px] text-neutral-300 hover:border-goi-gold/50 light:border-zinc-300 light:text-zinc-700"
                  disabled={mediaBusy}
                  onClick={() => onMoveImage(activePreview.id, "left")}
                >
                  ←
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-goi-gold/45 bg-goi-gold/10 px-2 py-1 text-[11px] font-semibold text-goi-gold"
                  disabled={mediaBusy}
                  onClick={() => onSetCoverImage(activePreview.id)}
                >
                  Portada
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-neutral-700 px-2 py-1 text-[11px] text-neutral-300 hover:border-goi-gold/50 light:border-zinc-300 light:text-zinc-700"
                  disabled={mediaBusy}
                  onClick={() => onMoveImage(activePreview.id, "right")}
                >
                  →
                </button>
              </div>
            ) : null}
            {previewAuthor && pendingImages[0] ? (
              <p className="text-[11px] text-neutral-500">
                Primera foto del bloque superior = portada: <span className="font-medium">{pendingImages[0].name}</span>
              </p>
            ) : null}
          </div>
        ) : (
          <p className="rounded-lg border border-neutral-800/90 bg-black/25 p-3 text-sm text-neutral-500 light:border-zinc-200 light:bg-zinc-50">
            Aún no hay contenido para previsualizar.
          </p>
        )
      ) : null}

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

      {submitHint ? <p className="text-xs text-neutral-500">{submitHint}</p> : null}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
        <Button
          type="button"
          variant="secondary"
          disabled={isFirstStep}
          className="w-full sm:w-auto"
          onClick={() => setStepIdx((s) => Math.max(0, s - 1))}
        >
          Atrás
        </Button>
        {isFinalStep ? (
          <Button type="submit" disabled={submitDisabled || !canSubmit} className="w-full sm:w-auto">
            Publicar
          </Button>
        ) : (
          <Button
            type="button"
            disabled={nextDisabled}
            className="w-full sm:w-auto"
            onClick={() => setStepIdx((s) => Math.min(COMPOSER_STEPS.length - 1, s + 1))}
          >
            Siguiente
          </Button>
        )}
      </div>
    </form>
  );
}

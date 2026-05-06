import type { FormEvent } from "react";
import { useRef } from "react";
import type { MentionPickUser } from "../../utils/mentionAutocomplete";
import { Button } from "../ui/Button";
import { MentionableTextarea } from "./MentionableTextarea";
import type { Workout } from "../../types/workout";
import type { CreatePostInput } from "../../types/post";
import { POST_IMAGE_MAX_FILES } from "../../utils/postImages";

type Visibility = NonNullable<CreatePostInput["visibility"]>;

export type PendingPostImage = { id: string; dataUrl: string; name: string };

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
  submitDisabled?: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** Usuarios para autocompletar @ al publicar. */
  mentionCandidates: MentionPickUser[];
};

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
  submitDisabled = false,
  onSubmit,
  mentionCandidates,
}: CreatePostFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const currentHint = VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.hint ?? "";
  const slotsLeft = Math.max(0, POST_IMAGE_MAX_FILES - pendingImages.length);
  const textOptional = pendingImages.length > 0;

  return (
    <form className="stack grid gap-3" onSubmit={onSubmit}>
      <label className="grid gap-1.5 font-semibold">
        Texto{textOptional ? " (opcional si hay fotos)" : ""}{" "}
        <span className="font-normal text-xs text-neutral-500">Tip: escribe @ para mencionar.</span>
        <MentionableTextarea
          value={content}
          onChange={onChangeContent}
          candidates={mentionCandidates}
          rows={5}
          maxLength={280}
          required={!textOptional}
          className="goi-field min-h-[96px]"
          placeholder={
            textOptional ? "Pie de foto opcional…" : "Hoy rompí mi PR en sentadilla… (mínimo 4 caracteres sin fotos)"
          }
          listPlacement="below"
        />
      </label>

      <fieldset className="grid gap-1.5 border-0 p-0">
        <legend className="font-semibold">Fotos (JPEG, PNG o WebP, máximo {POST_IMAGE_MAX_FILES})</legend>
        <div className="flex flex-wrap items-center gap-2">
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
          <Button
            type="button"
            variant="secondary"
            className="!text-sm"
            disabled={slotsLeft === 0}
            onClick={() => fileRef.current?.click()}
          >
            {pendingImages.length > 0 ? "Añadir más fotos" : "Adjuntar fotos"}
          </Button>
          {slotsLeft === 0 ? (
            <span className="text-xs text-neutral-500">Has alcanzado el máximo de fotos.</span>
          ) : (
            <span className="text-xs text-neutral-500">
              {pendingImages.length} / {POST_IMAGE_MAX_FILES}. Se comprimen al publicar (más ligero para el servidor).
            </span>
          )}
        </div>
        {pendingImages.length > 0 ? (
          <ul className="mt-2 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3 md:grid-cols-4">
            {pendingImages.map((img) => (
              <li key={img.id} className="relative overflow-hidden rounded-lg border border-neutral-700 bg-black/60">
                <img src={img.dataUrl} alt={img.name} className="aspect-square w-full object-cover" loading="lazy" />
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white hover:bg-red-900/90"
                  onClick={() => onRemoveImage(img.id)}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </fieldset>

      <fieldset className="grid gap-1.5 border-0 p-0">
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

      <label className="grid gap-1.5 font-semibold">
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

      <Button type="submit" disabled={submitDisabled}>
        Publicar
      </Button>
    </form>
  );
}

import { type FormEvent, useRef, useState } from "react";
import { createStory } from "../../api/storiesApi";
import { getErrorMessage } from "../../utils/errorMessages";
import { compressManyStorySlides, STORY_IMAGE_MAX_FILES } from "../../utils/postImages";
import { Button } from "../ui/Button";

type DraftSlide = { id: string; dataUrl: string; name: string };

type CreateStoryModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateStoryModal({ open, onClose, onCreated }: CreateStoryModalProps) {
  const [slides, setSlides] = useState<DraftSlide[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function resetAndClose() {
    setSlides([]);
    setErr("");
    onClose();
  }

  if (!open) return null;

  async function handleAdd(files: FileList | null) {
    if (!files?.length) return;
    setErr("");
    setBusy(true);
    try {
      const next = await compressManyStorySlides(files, slides.length);
      setSlides((curr) =>
        [
          ...curr,
          ...next.map((img) => ({
            dataUrl: img.dataUrl,
            name: img.name,
            id:
              typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random()}`,
          })),
        ].slice(0, STORY_IMAGE_MAX_FILES),
      );
    } catch {
      setErr("No se pudieron procesar algunas imágenes. Prueba JPG, PNG o WebP.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (slides.length === 0) {
      setErr("Añade al menos una foto.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await createStory(slides.map((s) => ({ type: "image" as const, url: s.dataUrl })));
      setSlides([]);
      onCreated();
      onClose();
    } catch (e) {
      setErr(getErrorMessage(e, "No se pudo publicar la historia"));
    } finally {
      setBusy(false);
    }
  }

  const slotsLeft = Math.max(0, STORY_IMAGE_MAX_FILES - slides.length);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-4 sm:items-center" role="dialog" aria-modal>
      <div className="grid w-full max-w-md gap-4 rounded-xl border border-neutral-700 bg-zinc-950 p-4 shadow-2xl">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">Nueva historia</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Visible ~24 horas para quien te sigue. Máximo {STORY_IMAGE_MAX_FILES} fotos.
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg px-2 py-1 text-sm text-neutral-400 hover:bg-neutral-900 hover:text-white"
            onClick={resetAndClose}
          >
            Cerrar
          </button>
        </header>

        <form className="grid gap-4" onSubmit={(e) => void handleSubmit(e)}>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            aria-hidden
            tabIndex={-1}
            onChange={(event) => {
              void handleAdd(event.target.files);
              event.target.value = "";
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="!text-sm"
              disabled={busy || slotsLeft === 0}
              onClick={() => fileRef.current?.click()}
            >
              Elegir fotos
            </Button>
            <span className="text-xs text-neutral-500">
              {slides.length} / {STORY_IMAGE_MAX_FILES}
            </span>
          </div>

          {slides.length > 0 ? (
            <ul className="grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-4">
              {slides.map((s) => (
                <li key={s.id} className="relative aspect-square overflow-hidden rounded-lg border border-neutral-700">
                  <img src={s.dataUrl} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                    onClick={() => setSlides((list) => list.filter((x) => x.id !== s.id))}
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {err ? <p className="text-sm text-red-400">{err}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy || slides.length === 0}>
              Publicar historia
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

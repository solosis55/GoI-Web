import type { FormEvent } from "react";
import { Button } from "../ui/Button";

type WorkoutFormProps = {
  title: string;
  description: string;
  exercises: string[];
  tags: string[];
  onChangeTitle: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeExercises: (value: string[]) => void;
  onChangeTags: (value: string[]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  onCancel?: () => void;
};

export function WorkoutForm({
  title,
  description,
  exercises,
  tags,
  onChangeTitle,
  onChangeDescription,
  onChangeExercises,
  onChangeTags,
  onSubmit,
  submitLabel,
  onCancel,
}: WorkoutFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(event);
  }

  function setExerciseLine(index: number, value: string) {
    const next = [...exercises];
    next[index] = value;
    onChangeExercises(next);
  }

  function addExerciseLine() {
    onChangeExercises([...exercises, ""]);
  }

  function removeExerciseLine(index: number) {
    if (exercises.length <= 1) {
      onChangeExercises([""]);
      return;
    }
    onChangeExercises(exercises.filter((_, i) => i !== index));
  }

  function setTagLine(index: number, value: string) {
    const next = [...tags];
    next[index] = value;
    onChangeTags(next);
  }

  function addTagLine() {
    onChangeTags([...tags, ""]);
  }

  function removeTagLine(index: number) {
    if (tags.length <= 1) {
      onChangeTags([""]);
      return;
    }
    onChangeTags(tags.filter((_, i) => i !== index));
  }

  const exerciseLines = exercises.length ? exercises : [""];
  const tagLines = tags.length ? tags : [""];

  return (
    <form className="stack grid gap-3" onSubmit={handleSubmit}>
      <label className="grid gap-1.5 font-semibold">
        Titulo
        <input
          className="goi-field"
          required
          value={title}
          onChange={(event) => onChangeTitle(event.target.value)}
        />
      </label>
      <label className="grid gap-1.5 font-semibold">
        Descripcion
        <textarea
          className="goi-field min-h-[80px]"
          value={description}
          onChange={(event) => onChangeDescription(event.target.value)}
        />
      </label>
      <div className="grid gap-2">
        <span className="font-semibold">Etiquetas</span>
        <p className="text-sm text-neutral-500">Opcional. Una linea por etiqueta (max. 20 caracteres). Sirven para filtrar en &quot;Mis entrenamientos&quot;.</p>
        <ul className="grid list-none gap-2 p-0">
          {tagLines.map((line, index) => (
            <li key={`tag-${index}`} className="flex flex-wrap gap-2 max-sm:flex-col sm:items-center">
              <input
                className="goi-field min-w-0 flex-1"
                maxLength={20}
                aria-label={`Etiqueta ${index + 1}`}
                value={line}
                onChange={(event) => setTagLine(index, event.target.value)}
                placeholder="pecho, tiron, full-body..."
              />
              <Button type="button" variant="secondary" className="shrink-0" onClick={() => removeTagLine(index)}>
                Quitar
              </Button>
            </li>
          ))}
        </ul>
        <Button type="button" variant="secondary" className="w-fit" onClick={addTagLine}>
          Añadir etiqueta
        </Button>
      </div>
      <div className="grid gap-2">
        <span className="font-semibold">Ejercicios</span>
        <p className="text-sm text-neutral-500">Una línea por ejercicio (sin comas).</p>
        <ul className="grid list-none gap-2 p-0">
          {exerciseLines.map((line, index) => (
            <li key={`ex-${index}`} className="flex flex-wrap gap-2 max-sm:flex-col sm:items-center">
              <input
                className="goi-field min-w-0 flex-1"
                aria-label={`Ejercicio ${index + 1}`}
                value={line}
                onChange={(event) => setExerciseLine(index, event.target.value)}
                placeholder={`Ejercicio ${index + 1}`}
              />
              <Button type="button" variant="secondary" className="shrink-0" onClick={() => removeExerciseLine(index)}>
                Quitar
              </Button>
            </li>
          ))}
        </ul>
        <Button type="button" variant="secondary" className="w-fit" onClick={addExerciseLine}>
          Añadir ejercicio
        </Button>
      </div>
      <div className="actions flex gap-2">
        <Button type="submit">{submitLabel}</Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

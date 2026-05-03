import type { FormEvent } from "react";
import { Button } from "../ui/Button";
import type { Workout } from "../../types/workout";

type CreatePostFormProps = {
  content: string;
  selectedWorkoutId: string;
  workouts: Workout[];
  onChangeContent: (value: string) => void;
  onChangeWorkoutId: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function CreatePostForm({
  content,
  selectedWorkoutId,
  workouts,
  onChangeContent,
  onChangeWorkoutId,
  onSubmit,
}: CreatePostFormProps) {
  return (
    <form className="stack grid gap-3" onSubmit={onSubmit}>
      <label className="grid gap-1.5 font-semibold">
        Contenido
        <textarea
          className="goi-field min-h-[96px]"
          required
          value={content}
          onChange={(event) => onChangeContent(event.target.value)}
          placeholder="Hoy rompi PR en sentadilla..."
        />
      </label>

      <label className="grid gap-1.5 font-semibold">
        Entrenamiento vinculado (opcional)
        <select
          className="goi-field"
          value={selectedWorkoutId}
          onChange={(event) => onChangeWorkoutId(event.target.value)}
        >
          <option value="">Sin entrenamiento</option>
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

      <Button type="submit">Publicar</Button>
    </form>
  );
}

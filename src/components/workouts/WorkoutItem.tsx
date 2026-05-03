import type { FormEvent } from "react";
import type { Workout } from "../../types/workout";
import { Button } from "../ui/Button";
import { WorkoutForm } from "./WorkoutForm";
import { formatSessionPerformedAt } from "./WorkoutSessionsHistory";

type WorkoutItemProps = {
  workout: Workout;
  sessionCount: number;
  lastSessionPerformedAt: string | null;
  isEditing: boolean;
  editTitle: string;
  editDescription: string;
  editExercises: string[];
  editTags: string[];
  onChangeEditTitle: (value: string) => void;
  onChangeEditDescription: (value: string) => void;
  onChangeEditExercises: (value: string[]) => void;
  onChangeEditTags: (value: string[]) => void;
  onSubmitEdit: (event: FormEvent<HTMLFormElement>) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onLogSession: () => void;
};

export function WorkoutItem({
  workout,
  sessionCount,
  lastSessionPerformedAt,
  isEditing,
  editTitle,
  editDescription,
  editExercises,
  editTags,
  onChangeEditTitle,
  onChangeEditDescription,
  onChangeEditExercises,
  onChangeEditTags,
  onSubmitEdit,
  onStartEdit,
  onCancelEdit,
  onDelete,
  onDuplicate,
  onLogSession,
}: WorkoutItemProps) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-neutral-800 bg-black/30 p-3 shadow-[inset_0_1px_0_0_rgba(212,175,55,0.05)] max-md:flex-col">
      {isEditing ? (
        <WorkoutForm
          title={editTitle}
          description={editDescription}
          exercises={editExercises}
          tags={editTags}
          onChangeTitle={onChangeEditTitle}
          onChangeDescription={onChangeEditDescription}
          onChangeExercises={onChangeEditExercises}
          onChangeTags={onChangeEditTags}
          onSubmit={onSubmitEdit}
          submitLabel="Guardar cambios"
          onCancel={onCancelEdit}
        />
      ) : (
        <>
          <div className="min-w-0">
            <strong className="text-neutral-100">{workout.title}</strong>
            <p className="text-goi-steel">{workout.description || "Sin descripcion"}</p>
            {(workout.tags ?? []).filter(Boolean).length > 0 ? (
              <>
                <p className="mt-2 text-xs uppercase tracking-wide text-neutral-600">Etiquetas</p>
                <ul className="mt-1 flex list-none flex-wrap gap-1.5 p-0">
                  {(workout.tags ?? [])
                    .filter(Boolean)
                    .map((tag) => (
                      <li key={`${workout.id}-tag-${tag}`}>
                        <span className="inline-block rounded-full border border-goi-gold-dim/35 bg-neutral-950 px-2 py-0.5 text-xs text-goi-steel">
                          {tag}
                        </span>
                      </li>
                    ))}
                </ul>
              </>
            ) : null}
            <p className="mt-2 text-xs uppercase tracking-wide text-neutral-600">Sesiones</p>
            <p className="mt-0.5 text-sm text-neutral-400">
              {sessionCount === 0
                ? "Ninguna registrada."
                : `${sessionCount} ${sessionCount === 1 ? "sesion" : "sesiones"}`}
              {sessionCount > 0 && lastSessionPerformedAt ? (
                <span className="text-neutral-500">
                  {" "}
                  · Ultima: {formatSessionPerformedAt(lastSessionPerformedAt)}
                </span>
              ) : null}
            </p>
            <p className="mt-2 text-xs uppercase tracking-wide text-neutral-600">Ejercicios</p>
            {workout.exercises.filter(Boolean).length > 0 ? (
              <ol className="mt-1 max-w-xl list-inside list-decimal space-y-1 pl-0.5 text-sm text-goi-steel">
                {workout.exercises.filter(Boolean).map((name, idx) => (
                  <li key={`${workout.id}-ex-${idx}`} className="break-words pl-1">
                    {name}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-1 text-sm text-neutral-500">No definidos.</p>
            )}
          </div>
          <div className="actions flex flex-wrap gap-2 max-md:w-full">
            <Button
              type="button"
              variant="primary"
              className="max-md:flex-1 min-[480px]:min-w-[6.5rem]"
              title="Selecciona este entreno en el formulario de abajo y lleva el foco alli"
              onClick={onLogSession}
            >
              Registrar sesión
            </Button>
            <Button type="button" variant="secondary" className="max-md:flex-1 min-[480px]:min-w-[6.5rem]" onClick={onDuplicate}>
              Duplicar
            </Button>
            <Button type="button" className="max-md:flex-1 min-[480px]:min-w-[6.5rem]" onClick={onStartEdit}>
              Editar
            </Button>
            <Button type="button" variant="danger" className="max-md:flex-1 min-[480px]:min-w-[6.5rem]" onClick={onDelete}>
              Eliminar
            </Button>
          </div>
        </>
      )}
    </li>
  );
}

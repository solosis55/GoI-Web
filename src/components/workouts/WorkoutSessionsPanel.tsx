import type { FormEvent } from "react";
import type { Workout } from "../../types/workout";
import type { WorkoutSessionWithTitle } from "../../types/workoutSession";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { WorkoutSessionsHistory } from "./WorkoutSessionsHistory";

type WorkoutSessionsPanelProps = {
  workouts: Workout[];
  sessions: WorkoutSessionWithTitle[];
  loading: boolean;
  sessionWorkoutId: string;
  sessionPerformedAt: string;
  sessionNotes: string;
  onChangeSessionWorkoutId: (value: string) => void;
  onChangeSessionPerformedAt: (value: string) => void;
  onChangeSessionNotes: (value: string) => void;
  onSubmitSession: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteSession: (id: string) => void;
};

export function WorkoutSessionsPanel({
  workouts,
  sessions,
  loading,
  sessionWorkoutId,
  sessionPerformedAt,
  sessionNotes,
  onChangeSessionWorkoutId,
  onChangeSessionPerformedAt,
  onChangeSessionNotes,
  onSubmitSession,
  onDeleteSession,
}: WorkoutSessionsPanelProps) {
  return (
    <>
      <Card id="registrar-sesion">
        <h2>Registrar sesión</h2>
        <p className="mb-3 text-sm text-neutral-500">
          Anota cuándo hiciste un entrenamiento guardado como plantilla. No sustituye al feed; sirve para seguimiento personal.
        </p>
        {workouts.length === 0 ? (
          <EmptyState message="Crea un entrenamiento antes de poder registrar sesiones." />
        ) : (
          <form className="grid gap-3" onSubmit={onSubmitSession}>
            <label className="grid gap-1.5 font-semibold">
              Entrenamiento
              <select
                className="goi-field"
                required
                value={sessionWorkoutId}
                onChange={(event) => onChangeSessionWorkoutId(event.target.value)}
              >
                <option value="">— Elige —</option>
                {workouts.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 font-semibold">
              Fecha y hora
              <input
                className="goi-field"
                type="datetime-local"
                required
                value={sessionPerformedAt}
                onChange={(event) => onChangeSessionPerformedAt(event.target.value)}
              />
            </label>
            <label className="grid gap-1.5 font-semibold">
              Notas (opcional)
              <textarea
                className="goi-field min-h-[72px]"
                maxLength={500}
                value={sessionNotes}
                onChange={(event) => onChangeSessionNotes(event.target.value)}
                placeholder="Sensaciones, pesos usados, etc."
              />
            </label>
            <Button type="submit" disabled={loading}>
              Guardar sesión
            </Button>
          </form>
        )}
      </Card>

      <WorkoutSessionsHistory
        sessions={sessions}
        loading={loading}
        showDelete
        onDeleteSession={onDeleteSession}
      />
    </>
  );
}

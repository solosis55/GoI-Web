import type { ReactNode } from "react";
import type { WorkoutSessionWithTitle } from "../../types/workoutSession";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";

export function formatSessionPerformedAt(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

type WorkoutSessionsHistoryProps = {
  sessions: WorkoutSessionWithTitle[];
  loading: boolean;
  title?: string;
  description?: ReactNode;
  emptyMessage?: string;
  /** Si es true, muestra boton para borrar cada sesion (pantalla Entrenamientos). */
  showDelete?: boolean;
  onDeleteSession?: (id: string) => void;
};

export function WorkoutSessionsHistory({
  sessions,
  loading,
  title = "Historial de sesiones",
  description,
  emptyMessage = "Aun no has registrado ninguna sesion.",
  showDelete = false,
  onDeleteSession,
}: WorkoutSessionsHistoryProps) {
  return (
    <Card>
      <h2>{title}</h2>
      {description ? <div className="mb-3 text-sm text-neutral-500">{description}</div> : null}
      {!loading && sessions.length === 0 && <EmptyState className="mt-2" message={emptyMessage} />}
      <ul className="mt-3 grid list-none gap-2.5 p-0">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-black/30 p-3 shadow-[inset_0_1px_0_0_rgba(212,175,55,0.05)] sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0">
              <strong className="text-neutral-100">{session.workoutTitle}</strong>
              <p className="mt-1 text-sm text-neutral-500">{formatSessionPerformedAt(session.performedAt)}</p>
              {session.notes ? <p className="mt-2 text-sm text-goi-steel">{session.notes}</p> : null}
            </div>
            {showDelete && onDeleteSession ? (
              <Button
                type="button"
                variant="danger"
                className="shrink-0 self-start sm:self-center"
                onClick={() => onDeleteSession(session.id)}
              >
                Quitar del historial
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}

import { Button } from "../ui/Button";
import { formatSessionPerformedAt } from "../workouts/WorkoutSessionsHistory";
import type { WorkoutSessionWithTitle } from "../../types/workoutSession";

type CreatePostSessionFieldProps = {
  sessions: WorkoutSessionWithTitle[];
  selectedSessionId: string;
  onChangeSessionId: (sessionId: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hint?: string;
};

export function CreatePostSessionField({
  sessions,
  selectedSessionId,
  onChangeSessionId,
  open,
  onOpenChange,
  hint = "Entrenos completados en la app móvil.",
}: CreatePostSessionFieldProps) {
  const sorted = [...sessions].sort((a, b) => b.performedAt.localeCompare(a.performedAt));
  const selected = sorted.find((s) => s.id === selectedSessionId) ?? null;

  return (
    <fieldset className="grid gap-2 rounded-xl border border-neutral-800/85 bg-black/25 p-3 light:border-zinc-200 light:bg-zinc-50">
      <legend className="font-semibold">Entreno vinculado (opcional)</legend>
      <p className="text-xs text-neutral-500">{hint}</p>
      {selected ? (
        <div className="rounded-lg border border-goi-gold/30 bg-goi-gold/5 p-3">
          <p className="font-semibold text-neutral-100 light:text-zinc-900">{selected.workoutTitle}</p>
          <p className="text-xs text-neutral-500">{formatSessionPerformedAt(selected.performedAt)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(true)}>
              Cambiar
            </Button>
            <Button type="button" variant="secondary" onClick={() => onChangeSessionId("")}>
              Quitar
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="secondary" onClick={() => onOpenChange(true)}>
          Vincular sesión
        </Button>
      )}
      {open ? (
        <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-neutral-700 light:border-zinc-300">
          {sorted.length === 0 ? (
            <p className="p-3 text-sm text-neutral-500">No hay sesiones. Completa un entreno en la app móvil.</p>
          ) : (
            <ul className="divide-y divide-neutral-800 light:divide-zinc-200">
              {sorted.map((session) => (
                <li key={session.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left hover:bg-goi-gold/10"
                    onClick={() => {
                      onChangeSessionId(session.id);
                      onOpenChange(false);
                    }}
                  >
                    <span className="font-semibold text-neutral-100 light:text-zinc-900">{session.workoutTitle}</span>
                    <span className="text-xs text-neutral-500">{formatSessionPerformedAt(session.performedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </fieldset>
  );
}

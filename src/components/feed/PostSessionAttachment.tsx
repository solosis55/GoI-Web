import type { SessionExercisePreview } from "../../types/post";
import { formatSessionPerformedAt } from "../workouts/WorkoutSessionsHistory";

export type PostSessionAttachmentMetrics = {
  completedSets?: number | null;
  totalSets?: number | null;
  completedExercises?: number | null;
  totalExercises?: number | null;
};

type PostSessionAttachmentProps = {
  workoutTitle?: string | null;
  performedAt?: string | null;
  metrics?: PostSessionAttachmentMetrics | null;
  exercisePreviews?: SessionExercisePreview[];
  moreExercisesCount?: number;
  onPress?: () => void;
  onPressLink?: () => void;
  empty?: boolean;
  linked?: boolean;
  showViewFullCta?: boolean;
};

function DumbbellIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M4 14V10M20 14V10M7 17V7M17 17V7" />
      <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M7 10h10M7 14h10" />
    </svg>
  );
}

function SessionProgressBar({ completed, total }: { completed: number; total: number }) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, completed / total)) : 0;
  const pct = Math.round(ratio * 100);
  return (
    <div className="grid gap-1.5">
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-700/40 light:bg-zinc-200">
        <div className="h-full rounded-full bg-goi-gold transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs font-semibold text-neutral-500">
        {completed}/{total} series
      </p>
    </div>
  );
}

/** Tarjeta de sesión vinculada en posts Training del feed (paridad App). */
export function PostSessionAttachment({
  workoutTitle,
  performedAt,
  metrics,
  exercisePreviews = [],
  moreExercisesCount = 0,
  onPress,
  onPressLink,
  empty = false,
  linked = false,
  showViewFullCta = false,
}: PostSessionAttachmentProps) {
  if (empty) {
    return (
      <button
        type="button"
        onClick={onPressLink}
        disabled={!onPressLink}
        className="flex w-full items-center gap-3 rounded-[14px] border border-dashed border-goi-gold/40 bg-neutral-950/75 p-3.5 text-left transition hover:border-goi-gold/60 hover:bg-goi-gold/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/45 light:bg-zinc-50 sm:p-4"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-goi-gold/25 bg-goi-gold/12">
          <DumbbellIcon className="size-4 text-goi-gold" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-neutral-100 light:text-zinc-900">Vincular sesión</p>
          <p className="text-sm text-neutral-500">Elige un entreno completado en la app móvil</p>
        </div>
        <span className="text-2xl font-light text-neutral-500" aria-hidden>
          ›
        </span>
      </button>
    );
  }

  const title = workoutTitle?.trim() || "Entrenamiento";
  const dateLabel = performedAt ? formatSessionPerformedAt(performedAt) : null;
  const totalSets = metrics?.totalSets ?? null;
  const completedSets = metrics?.completedSets ?? null;
  const exercisesLabel =
    metrics?.totalExercises != null && metrics.totalExercises > 0
      ? `${metrics.completedExercises ?? 0}/${metrics.totalExercises} ejercicios`
      : null;
  const showProgress = totalSets != null && totalSets > 0;
  const visibleExercises = exercisePreviews.slice(0, 3);
  const moreCount =
    moreExercisesCount > 0 ? moreExercisesCount : Math.max(0, exercisePreviews.length - visibleExercises.length);
  const showCta = Boolean(onPress) || showViewFullCta;

  const cardClass = [
    "rounded-[14px] border p-3.5 sm:p-4",
    linked
      ? "border-goi-gold/45 bg-[rgba(22,20,16,0.96)] shadow-[0_2px_8px_rgba(212,175,55,0.12)] light:bg-amber-50/80"
      : "border-neutral-700/55 bg-neutral-950/95 light:border-zinc-300 light:bg-zinc-50",
  ].join(" ");

  const body = (
    <div className="grid gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-goi-gold/25 bg-goi-gold/12">
            <DumbbellIcon className="size-4 text-goi-gold" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Sesión de entreno</p>
            {dateLabel ? <p className="text-xs font-semibold text-neutral-400">{dateLabel}</p> : null}
          </div>
        </div>
      </div>

      <h3 className="text-lg font-extrabold leading-snug tracking-tight text-neutral-100 light:text-zinc-900">{title}</h3>

      {showProgress ? (
        <SessionProgressBar completed={completedSets ?? 0} total={totalSets ?? 0} />
      ) : null}

      {exercisesLabel && showProgress ? (
        <p className="-mt-1 text-xs font-semibold text-neutral-500">{exercisesLabel}</p>
      ) : null}

      {visibleExercises.length > 0 ? (
        <ul className="grid gap-2 border-t border-neutral-700/30 pt-2.5 light:border-zinc-200">
          {visibleExercises.map((item, index) => (
            <li key={`${item.exerciseName}-${index}`} className="flex items-center gap-2 text-sm">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-goi-gold/25 bg-goi-gold/10 text-[11px] font-extrabold text-goi-gold">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold text-neutral-200 light:text-zinc-800">
                {item.exerciseName}
              </span>
              {item.summary ? (
                <span className="max-w-[42%] shrink-0 truncate text-right text-xs font-semibold text-neutral-500">
                  {item.summary}
                </span>
              ) : null}
            </li>
          ))}
          {moreCount > 0 ? (
            <li className="text-[11px] font-semibold text-neutral-500">
              +{moreCount} ejercicio{moreCount === 1 ? "" : "s"} más
            </li>
          ) : null}
        </ul>
      ) : null}

      {showCta ? (
        <div className="flex items-center justify-center gap-1 rounded-[10px] border border-goi-gold/30 bg-goi-gold/10 px-3 py-2.5 text-sm font-bold text-goi-gold">
          Ver entreno completo
          <span aria-hidden className="text-lg font-light">
            ›
          </span>
        </div>
      ) : null}
    </div>
  );

  if (onPress) {
    return (
      <button
        type="button"
        onClick={onPress}
        className={[cardClass, "w-full text-left transition hover:border-goi-gold/40 hover:bg-goi-gold/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/45"].join(" ")}
        aria-label={`Sesión ${title}`}
      >
        {body}
      </button>
    );
  }

  return <div className={cardClass}>{body}</div>;
}

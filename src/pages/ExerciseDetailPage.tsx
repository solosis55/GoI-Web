import { useCallback, useEffect, useState } from "react";
import { getExercise } from "../api/exercisesApi";
import { ExerciseDetailStatsPlaceholder } from "../components/exercises/ExerciseDetailStatsPlaceholder";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { StatusMessage } from "../components/ui/StatusMessage";
import { CATALOG_EQUIPMENT_OPTIONS } from "../data/exerciseEquipmentFilters";
import { CATALOG_MUSCLE_OPTIONS } from "../data/exerciseMuscleFilters";
import type { Exercise } from "../types/exercise";
import { getErrorMessage } from "../utils/errorMessages";

const MUSCLE_LABEL = Object.fromEntries(
  CATALOG_MUSCLE_OPTIONS.map((o) => [o.slug, o.label] as const),
) as Record<string, string>;

const EQUIPMENT_LABEL = Object.fromEntries(
  CATALOG_EQUIPMENT_OPTIONS.map((o) => [o.slug, o.label] as const),
) as Record<string, string>;

type ExerciseDetailPageProps = {
  exerciseId: string;
  /** Rutinas → Editor → Nueva rutina → Catalogo → ejercicio */
  showRoutineTrail?: boolean;
  routineFormCrumb?: string;
  onNavigateToEditorForm?: () => void;
  /** Eslabón de la miga antes del nombre del ejercicio (p. ej. «Editor» si se abrió desde el panel del editor). */
  listCrumbLabel?: string;
  /** Texto del botón secundario que vuelve al listado previo. */
  backButtonLabel?: string;
  onBackToCatalog: () => void;
  onBackToRoutines: () => void;
  onNewRoutineWithExerciseIds: (exerciseIds: string[]) => void;
};

export function ExerciseDetailPage({
  exerciseId,
  showRoutineTrail = false,
  routineFormCrumb,
  onNavigateToEditorForm,
  listCrumbLabel = "Catálogo",
  backButtonLabel = "Volver al listado",
  onBackToCatalog,
  onBackToRoutines,
  onNewRoutineWithExerciseIds,
}: ExerciseDetailPageProps) {
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getExercise(exerciseId);
      setExercise(data);
    } catch (err) {
      setExercise(null);
      setError(getErrorMessage(err, "No se pudo cargar el ejercicio"));
    } finally {
      setLoading(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const titleShort =
    exercise && exercise.name.length > 42 ? `${exercise.name.slice(0, 39)}…` : exercise?.name ?? "Ejercicio";

  return (
    <section className="layout grid w-full min-w-0 gap-4">
      <header className="feed-page-header px-4 py-4 sm:px-5 sm:py-5">
        <nav className="mb-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500" aria-label="Miga de pan">
          <button
            type="button"
            className="rounded px-1 py-0.5 text-neutral-400 transition-colors hover:text-goi-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/35"
            onClick={onBackToRoutines}
          >
            Rutinas
          </button>
          <span className="text-neutral-600">/</span>
          {showRoutineTrail && routineFormCrumb && onNavigateToEditorForm ? (
            <>
              <button
                type="button"
                className="rounded px-1 py-0.5 text-neutral-400 transition-colors hover:text-goi-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/35"
                onClick={onNavigateToEditorForm}
              >
                Editor de rutinas
              </button>
              <span className="text-neutral-600">/</span>
              <button
                type="button"
                className="max-w-[min(100%,11rem)] truncate rounded px-1 py-0.5 text-neutral-400 transition-colors hover:text-goi-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/35"
                onClick={onNavigateToEditorForm}
              >
                {routineFormCrumb}
              </button>
              <span className="text-neutral-600">/</span>
            </>
          ) : null}
          <button
            type="button"
            className="rounded px-1 py-0.5 text-neutral-400 transition-colors hover:text-goi-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/35"
            onClick={onBackToCatalog}
          >
            {listCrumbLabel}
          </button>
          <span className="text-neutral-600">/</span>
          <span className="max-w-[min(100%,12rem)] truncate rounded-full border border-goi-gold/30 bg-goi-gold/15 px-2 py-0.5 font-medium text-goi-gold">
            {loading ? "…" : titleShort}
          </span>
        </nav>
        <p className="text-xs font-medium uppercase tracking-wider text-goi-gold-dim">Ficha del movimiento</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-neutral-100 light:text-zinc-900 sm:text-2xl">
          {loading ? "Cargando…" : exercise?.name ?? "Ejercicio"}
        </h1>
        {!loading && exercise?.description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-goi-steel light:text-zinc-700">{exercise.description}</p>
        ) : null}
        {!loading && exercise && !exercise.description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500">
            Sin descripcion breve en el catalogo.
          </p>
        ) : null}
      </header>

      <Card tone="dark">
        <StatusMessage tone="dark" loading={loading} error={error} />

        {!loading && exercise && !error ? (
          <div className="grid gap-5">
            {exercise.equipment ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Equipamiento</p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-200 light:text-zinc-800">{exercise.equipment}</p>
              </div>
            ) : null}

            {exercise.instructions ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Ejecucion</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-goi-steel light:text-zinc-800">{exercise.instructions}</p>
              </div>
            ) : null}

            {exercise.equipmentTags && exercise.equipmentTags.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Variantes de material</p>
                <ul className="mt-2 flex list-none flex-wrap gap-2 p-0">
                  {exercise.equipmentTags.map((slug) => (
                    <li key={slug}>
                      <span className="inline-block rounded-full border border-amber-500/30 bg-amber-950/30 px-2.5 py-1 text-xs text-amber-100/90">
                        {EQUIPMENT_LABEL[slug] ?? slug}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <ExerciseDetailStatsPlaceholder />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Grupos musculares</p>
              {exercise.muscles && exercise.muscles.length > 0 ? (
                <ul className="mt-2 flex list-none flex-wrap gap-2 p-0">
                  {exercise.muscles.map((slug) => (
                    <li key={slug}>
                      <span className="inline-block rounded-full border border-goi-gold-dim/35 bg-neutral-950 px-2.5 py-1 text-xs text-goi-steel light:bg-white light:text-yellow-950 healthy:text-goi-gold-dim">
                        {MUSCLE_LABEL[slug] ?? slug}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-neutral-500">Sin etiquetas musculares en el catalogo.</p>
              )}
            </div>

            <p className="text-xs text-neutral-600">
              ID tecnico: <code className="rounded bg-neutral-900 px-1 py-0.5 text-neutral-400">{exercise.id}</code>
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={onBackToCatalog}>
                {backButtonLabel}
              </Button>
              <Button type="button" onClick={() => onNewRoutineWithExerciseIds([exercise.id])}>
                Nueva rutina con este ejercicio
              </Button>
            </div>
          </div>
        ) : null}

        {!loading && !exercise && error ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={onBackToCatalog}>
              {backButtonLabel}
            </Button>
          </div>
        ) : null}
      </Card>
    </section>
  );
}

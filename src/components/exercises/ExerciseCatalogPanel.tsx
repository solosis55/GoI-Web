import { useCallback, useEffect, useMemo, useState } from "react";
import { getExercises } from "../../api/exercisesApi";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { StatusMessage } from "../ui/StatusMessage";
import { CATALOG_EQUIPMENT_OPTIONS } from "../../data/exerciseEquipmentFilters";
import { CATALOG_MUSCLE_OPTIONS } from "../../data/exerciseMuscleFilters";
import type { Exercise } from "../../types/exercise";
import { getErrorMessage } from "../../utils/errorMessages";
import { WORKOUT_EXERCISES_MAX } from "../workouts/workoutFormLimits";
import {
  catalogExerciseDisplayTitle,
  catalogExerciseMetaLine,
  ExerciseCatalogThumbPlaceholder,
} from "./exerciseCatalogChrome";

export type ExerciseCatalogPanelVariant = "full" | "embedded";

type PrefetchedCatalog = {
  exercises: Exercise[];
  loading: boolean;
  error: string | null;
};

type ExerciseCatalogPanelProps = {
  variant: ExerciseCatalogPanelVariant;
  /** Si viene del padre (p. ej. Rutinas), no se vuelve a fetchear. */
  prefetchedCatalog?: PrefetchedCatalog | null;
  onOpenExerciseDetail: (exerciseId: string) => void;

  /** Modo página completa */
  creationFlowLabel?: "standalone" | "editor";
  onBack?: () => void;
  onNewRoutineWithExerciseIds?: (exerciseIds: string[]) => void;

  /** Panel junto al creador: añade uno o varios bloques (respeta el máximo en el padre). */
  onAppendToRoutine?: (exerciseIds: string[]) => void;
  routineBlockCount?: number;
  onOpenFullCatalog?: () => void;
  /** En editor: cabeceras Músculos/Material visibles; chips detrás de un + por sección. */
  compactEmbedded?: boolean;
};

function CompactFilterExpandIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      className={["h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform duration-200 light:text-zinc-600", open ? "rotate-45" : "", className].filter(Boolean).join(" ")}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

export function ExerciseCatalogPanel({
  variant,
  prefetchedCatalog,
  onOpenExerciseDetail,
  creationFlowLabel = "standalone",
  onBack,
  onNewRoutineWithExerciseIds,
  onAppendToRoutine,
  routineBlockCount = 0,
  onOpenFullCatalog,
  compactEmbedded = false,
}: ExerciseCatalogPanelProps) {
  const embedded = variant === "embedded";
  const compactFilters = embedded && compactEmbedded;

  const [internalExercises, setInternalExercises] = useState<Exercise[]>([]);
  const [internalLoading, setInternalLoading] = useState(!prefetchedCatalog);
  const [internalError, setInternalError] = useState("");

  const exercises = prefetchedCatalog?.exercises ?? internalExercises;
  const loading = prefetchedCatalog ? prefetchedCatalog.loading : internalLoading;
  const error = prefetchedCatalog ? prefetchedCatalog.error ?? "" : internalError;

  const loadCatalog = useCallback(async () => {
    setInternalLoading(true);
    setInternalError("");
    try {
      const list = await getExercises();
      setInternalExercises(list);
    } catch (err) {
      setInternalError(getErrorMessage(err, "No se pudo cargar el catálogo"));
    } finally {
      setInternalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (prefetchedCatalog) return;
    void loadCatalog();
  }, [prefetchedCatalog, loadCatalog]);

  const [query, setQuery] = useState("");
  const [activeMuscleSlugs, setActiveMuscleSlugs] = useState<string[]>([]);
  const [activeEquipmentSlugs, setActiveEquipmentSlugs] = useState<string[]>([]);
  const [pickedOrder, setPickedOrder] = useState<string[]>([]);
  const [compactMuscleOpen, setCompactMuscleOpen] = useState(false);
  const [compactEquipmentOpen, setCompactEquipmentOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = exercises;
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((e) => e.name.toLowerCase().includes(q));
    if (activeMuscleSlugs.length > 0) {
      const sel = new Set(activeMuscleSlugs);
      list = list.filter((e) => {
        const m = e.muscles ?? [];
        return m.some((muscle) => sel.has(muscle));
      });
    }
    if (activeEquipmentSlugs.length > 0) {
      const sel = new Set(activeEquipmentSlugs);
      list = list.filter((e) => {
        const t = e.equipmentTags ?? [];
        return t.some((slug) => sel.has(slug));
      });
    }
    return list;
  }, [exercises, query, activeMuscleSlugs, activeEquipmentSlugs]);

  function toggleMuscleFilter(slug: string) {
    setActiveMuscleSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  function clearMuscleFilters() {
    setActiveMuscleSlugs([]);
  }

  function toggleEquipmentFilter(slug: string) {
    setActiveEquipmentSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  function clearEquipmentFilters() {
    setActiveEquipmentSlugs([]);
  }

  function togglePick(id: string) {
    setPickedOrder((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= WORKOUT_EXERCISES_MAX) return prev;
      return [...prev, id];
    });
  }

  function handleSingleExercise(id: string) {
    onNewRoutineWithExerciseIds?.([id]);
  }

  function handleBulkCreate() {
    if (pickedOrder.length === 0 || !onNewRoutineWithExerciseIds) return;
    onNewRoutineWithExerciseIds([...pickedOrder]);
  }

  function handleAppendPickedEmbedded() {
    if (!onAppendToRoutine || pickedOrder.length === 0) return;
    const room = Math.max(0, WORKOUT_EXERCISES_MAX - routineBlockCount);
    const slice = pickedOrder.slice(0, room);
    if (slice.length > 0) onAppendToRoutine(slice);
    setPickedOrder([]);
  }

  const atCapacity = routineBlockCount >= WORKOUT_EXERCISES_MAX;

  const cardClass = [embedded ? "rounded-2xl border-neutral-800/80" : "", compactFilters ? "p-3 sm:p-4" : ""]
    .filter(Boolean)
    .join(" ");

  const chipBtnClass = compactFilters
    ? "!min-h-8 !rounded-lg !px-2 !py-1 text-[11px] font-medium !tracking-normal"
    : "!min-h-9 !rounded-lg !px-2.5 !py-1.5 text-xs";

  const muscleChipButtons = CATALOG_MUSCLE_OPTIONS.map(({ slug, label }) => {
    const active = activeMuscleSlugs.includes(slug);
    return (
      <Button
        key={slug}
        type="button"
        variant={active ? "navActive" : "secondary"}
        className={chipBtnClass}
        onClick={() => toggleMuscleFilter(slug)}
        aria-pressed={active}
      >
        {label}
      </Button>
    );
  });

  const equipmentChipButtons = CATALOG_EQUIPMENT_OPTIONS.map(({ slug, label }) => {
    const active = activeEquipmentSlugs.includes(slug);
    return (
      <Button
        key={slug}
        type="button"
        variant={active ? "navActive" : "secondary"}
        className={chipBtnClass}
        onClick={() => toggleEquipmentFilter(slug)}
        aria-pressed={active}
      >
        {label}
      </Button>
    );
  });

  const filterBlocksFull = (
    <>
      <div className="grid gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 light:text-zinc-600">Músculos</span>
          {activeMuscleSlugs.length > 0 ? (
            <button
              type="button"
              className="text-xs text-goi-gold underline-offset-2 hover:text-goi-gold/90 hover:underline"
              onClick={clearMuscleFilters}
            >
              Quitar filtros musculares
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por grupo muscular">
          {muscleChipButtons}
        </div>
      </div>

      <div className="grid gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 light:text-zinc-600">Material</span>
          {activeEquipmentSlugs.length > 0 ? (
            <button
              type="button"
              className="text-xs text-goi-gold underline-offset-2 hover:text-goi-gold/90 hover:underline"
              onClick={clearEquipmentFilters}
            >
              Quitar filtros de material
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por tipo de material">
          {equipmentChipButtons}
        </div>
      </div>
    </>
  );

  const filterBlocksCompact = (
    <div className="space-y-1.5">
      <div className="rounded-lg border border-neutral-800/50 bg-neutral-950/25 light:border-zinc-300 light:bg-zinc-100/65">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 light:text-zinc-600">Músculos</span>
            {activeMuscleSlugs.length > 0 ? (
              <span className="tabular-nums rounded-full bg-goi-gold/14 px-1.5 py-px text-[9px] font-semibold text-goi-gold light:bg-goi-gold/[0.18] light:text-goi-gold-dim healthy:bg-goi-gold/[0.13] healthy:text-goi-gold-dim">
                {activeMuscleSlugs.length}
              </span>
            ) : null}
            {activeMuscleSlugs.length > 0 ? (
              <button
                type="button"
                className="text-[10px] text-goi-gold underline-offset-2 hover:text-goi-gold/90 hover:underline"
                onClick={clearMuscleFilters}
              >
                Quitar
              </button>
            ) : null}
          </div>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-700/70 bg-neutral-900/85 text-neutral-400 transition-colors hover:border-neutral-500 hover:bg-neutral-800 hover:text-neutral-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/30 light:border-zinc-300 light:bg-white light:text-zinc-600 light:hover:border-zinc-400 light:hover:bg-zinc-50 light:hover:text-zinc-900 healthy:focus-visible:ring-goi-gold/26"
            aria-expanded={compactMuscleOpen}
            aria-controls="catalog-muscle-chips"
            id="catalog-muscle-toggle"
            onClick={() => setCompactMuscleOpen((o) => !o)}
          >
            <span className="sr-only">{compactMuscleOpen ? "Ocultar opciones de músculo" : "Mostrar opciones de músculo"}</span>
            <CompactFilterExpandIcon open={compactMuscleOpen} />
          </button>
        </div>
        {compactMuscleOpen ? (
          <div
            id="catalog-muscle-chips"
            role="group"
            aria-label="Filtrar por grupo muscular"
            className="border-t border-neutral-800/45 px-2 pb-2 pt-1.5 light:border-zinc-200"
          >
            <div className="flex flex-wrap gap-1.5">{muscleChipButtons}</div>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-neutral-800/50 bg-neutral-950/25 light:border-zinc-300 light:bg-zinc-100/65">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 light:text-zinc-600">Material</span>
            {activeEquipmentSlugs.length > 0 ? (
              <span className="tabular-nums rounded-full bg-goi-gold/14 px-1.5 py-px text-[9px] font-semibold text-goi-gold light:bg-goi-gold/[0.18] light:text-goi-gold-dim healthy:bg-goi-gold/[0.13] healthy:text-goi-gold-dim">
                {activeEquipmentSlugs.length}
              </span>
            ) : null}
            {activeEquipmentSlugs.length > 0 ? (
              <button
                type="button"
                className="text-[10px] text-goi-gold underline-offset-2 hover:text-goi-gold/90 hover:underline"
                onClick={clearEquipmentFilters}
              >
                Quitar
              </button>
            ) : null}
          </div>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-700/70 bg-neutral-900/85 text-neutral-400 transition-colors hover:border-neutral-500 hover:bg-neutral-800 hover:text-neutral-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/30 light:border-zinc-300 light:bg-white light:text-zinc-600 light:hover:border-zinc-400 light:hover:bg-zinc-50 light:hover:text-zinc-900 healthy:focus-visible:ring-goi-gold/26"
            aria-expanded={compactEquipmentOpen}
            aria-controls="catalog-equipment-chips"
            id="catalog-equipment-toggle"
            onClick={() => setCompactEquipmentOpen((o) => !o)}
          >
            <span className="sr-only">{compactEquipmentOpen ? "Ocultar opciones de material" : "Mostrar opciones de material"}</span>
            <CompactFilterExpandIcon open={compactEquipmentOpen} />
          </button>
        </div>
        {compactEquipmentOpen ? (
          <div
            id="catalog-equipment-chips"
            role="group"
            aria-label="Filtrar por tipo de material"
            className="border-t border-neutral-800/45 px-2 pb-2 pt-1.5 light:border-zinc-200"
          >
            <div className="flex flex-wrap gap-1.5">{equipmentChipButtons}</div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <Card tone="dark" className={cardClass}>
      {embedded ? (
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500 light:text-zinc-600">
          Explorar ejercicios
        </p>
      ) : null}
      <div
        className={
          embedded
            ? "flex flex-col gap-3"
            : "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        }
      >
        <label className="grid min-w-0 w-full flex-1 gap-1.5 font-semibold">
          Buscar por nombre
          <input
            className="goi-field"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre del ejercicio…"
            autoComplete="off"
            aria-label="Filtrar ejercicios por nombre"
          />
        </label>
        <div
          className={
            embedded
              ? "flex w-full min-w-0 flex-wrap gap-2"
              : "flex shrink-0 flex-wrap gap-2"
          }
        >
          {embedded && onOpenFullCatalog ? (
            <Button type="button" variant="secondary" onClick={onOpenFullCatalog}>
              Ver catálogo completo
            </Button>
          ) : null}
          {!embedded && onBack ? (
            <Button type="button" variant="secondary" onClick={onBack}>
              {creationFlowLabel === "editor" ? "Volver al formulario" : "Volver al panel"}
            </Button>
          ) : null}
          {!embedded && onNewRoutineWithExerciseIds ? (
            <Button type="button" disabled={pickedOrder.length === 0} onClick={handleBulkCreate}>
              {creationFlowLabel === "editor"
                ? `Llevar selección al editor (${pickedOrder.length > 0 ? pickedOrder.length : "…"})`
                : `Nueva rutina (${pickedOrder.length > 0 ? pickedOrder.length : "…"})`}
            </Button>
          ) : null}
          {embedded && onAppendToRoutine && pickedOrder.length > 0 ? (
            <Button type="button" disabled={atCapacity} onClick={handleAppendPickedEmbedded}>
              Añadir selección ({pickedOrder.length})
            </Button>
          ) : null}
        </div>
      </div>

      {embedded ? (
        <div className="mt-2 min-h-[2.5rem] shrink-0" aria-hidden />
      ) : null}

      {compactFilters ? <div className="mt-2">{filterBlocksCompact}</div> : <div className="mt-3 space-y-3">{filterBlocksFull}</div>}

      <StatusMessage tone="dark" loading={loading} error={error ? error : undefined} />

      {!loading && !error ? (
        <p className="text-sm text-neutral-500">
          {filtered.length === exercises.length &&
          query.trim() === "" &&
          activeMuscleSlugs.length === 0 &&
          activeEquipmentSlugs.length === 0
            ? `${exercises.length} ejercicios en el catálogo.`
            : `${filtered.length} resultado${filtered.length === 1 ? "" : "s"} (${exercises.length} en total).`}
          {!embedded && pickedOrder.length > 0 ? (
            <span className="text-neutral-400">
              {" "}
              Seleccionados: {pickedOrder.length}/{WORKOUT_EXERCISES_MAX} (orden de selección).
            </span>
          ) : null}
          {embedded && pickedOrder.length > 0 ? (
            <span className="text-neutral-400">
              {" "}
              Marcados para añadir: {pickedOrder.length}.
            </span>
          ) : null}
        </p>
      ) : null}

      {!loading && !error && filtered.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">Ningún resultado. Prueba otro término.</p>
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <ul
          className={[
            "mt-2.5 grid list-none p-0",
            embedded
              ? "gap-3 max-h-[min(560px,58vh)] overflow-y-auto rounded-xl border border-neutral-800/35 bg-neutral-950/20 p-2 pr-1 light:border-zinc-200/90 light:bg-zinc-50/60"
              : "gap-3",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label="Lista de ejercicios"
        >
          {filtered.map((ex) => {
            const checked = pickedOrder.includes(ex.id);
            const metaLine = catalogExerciseMetaLine(ex);
            const displayTitle = catalogExerciseDisplayTitle(ex);
            const compactActions = "!min-h-10 rounded-xl text-sm !px-3.5 !py-2";
            return (
              <li
                key={ex.id}
                className={[
                  "flex flex-col gap-4 rounded-xl border px-4 py-4 transition-colors sm:flex-row sm:items-stretch sm:gap-5",
                  "border-neutral-800/40 bg-neutral-900/25 hover:border-neutral-700/50 hover:bg-neutral-900/45",
                  "light:border-zinc-200 light:bg-white light:hover:border-zinc-300 light:hover:bg-zinc-50/95",
                ].join(" ")}
              >
                <ExerciseCatalogThumbPlaceholder />

                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <label className="flex min-w-0 cursor-pointer gap-3 sm:gap-3.5">
                    <input
                      type="checkbox"
                      className="mt-1 size-[1.125rem] shrink-0 rounded border border-neutral-600 bg-neutral-950 accent-goi-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/35 light:border-zinc-400 light:bg-white healthy:accent-goi-gold healthy:focus-visible:ring-goi-gold/30"
                      checked={checked}
                      onChange={() => togglePick(ex.id)}
                      aria-label={`Seleccionar ${displayTitle}`}
                    />
                    <span className="min-w-0 flex-1">
                      <button
                        type="button"
                        className="group flex w-full min-w-0 items-center gap-1.5 text-left"
                        onClick={() => onOpenExerciseDetail(ex.id)}
                      >
                        <span className="block min-w-0 flex-1 text-base font-semibold leading-snug tracking-tight text-neutral-100 transition-colors group-hover:text-goi-gold sm:text-[1.05rem] light:text-zinc-900 light:group-hover:text-yellow-900">
                          {displayTitle}
                        </span>
                        <span className="shrink-0 text-lg text-neutral-600 transition-colors group-hover:text-goi-gold light:text-zinc-500" aria-hidden>
                          ›
                        </span>
                      </button>
                      {metaLine ? (
                        <span className="mt-1.5 block text-xs leading-snug text-neutral-500 light:text-zinc-600">{metaLine}</span>
                      ) : null}
                      {ex.description ? (
                        <span className="mt-2 block text-sm leading-relaxed text-neutral-500 line-clamp-3 light:text-zinc-600">
                          {ex.description}
                        </span>
                      ) : null}
                    </span>
                  </label>

                  <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      className={compactActions}
                      onClick={() => onOpenExerciseDetail(ex.id)}
                    >
                      Ver ficha
                    </Button>
                    {embedded && onAppendToRoutine ? (
                      <Button
                        type="button"
                        disabled={atCapacity}
                        className={compactActions}
                        onClick={() => onAppendToRoutine([ex.id])}
                      >
                        Añadir a la rutina
                      </Button>
                    ) : !embedded && onNewRoutineWithExerciseIds ? (
                      <Button type="button" variant="secondary" className={compactActions} onClick={() => handleSingleExercise(ex.id)}>
                        {creationFlowLabel === "editor" ? "Añadir este al formulario" : "Solo este — nueva rutina"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Card>
  );
}

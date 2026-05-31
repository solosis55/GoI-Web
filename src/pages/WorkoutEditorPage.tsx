import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { getExercises } from "../api/exercisesApi";
import { createWorkout, updateWorkout } from "../api/workoutsApi";
import { CATALOG_EQUIPMENT_OPTIONS } from "../data/exerciseEquipmentFilters";
import { CATALOG_MUSCLE_OPTIONS } from "../data/exerciseMuscleFilters";
import { ExerciseCatalogPanel } from "../components/exercises/ExerciseCatalogPanel";
import { WorkoutEditorBarbellIcon } from "../components/icons/WorkoutEditorBarbellIcon";
import { WorkoutForm } from "../components/workouts/WorkoutForm";
import {
  WORKOUT_DESCRIPTION_MAX,
  WORKOUT_EXERCISES_MAX,
  WORKOUT_TITLE_MIN,
} from "../components/workouts/workoutFormLimits";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { StatusMessage } from "../components/ui/StatusMessage";
import { useAuth } from "../context/AuthContext";
import type { Exercise } from "../types/exercise";
import type { Workout, WorkoutExerciseBlock } from "../types/workout";
import { getErrorMessage } from "../utils/errorMessages";
import { defaultEquipmentSlugForExercise, sanitizeEquipmentSlug } from "../utils/exerciseEquipmentLimits";
import { sanitizeLaterality } from "../utils/exerciseLateralityLimits";
import { blocksFromLegacy, createBlockForExercise } from "../utils/workoutBlocks";
import {
  clearWorkoutCreateDraft,
  readWorkoutCreateDraft,
  writeWorkoutCreateDraft,
} from "../utils/workoutCreateDraft";

const EQUIPMENT_PREVIEW = Object.fromEntries(
  CATALOG_EQUIPMENT_OPTIONS.map((o) => [o.slug, o.label] as const),
) as Record<string, string>;

const MUSCLE_PREVIEW = Object.fromEntries(
  CATALOG_MUSCLE_OPTIONS.map((o) => [o.slug, o.label] as const),
) as Record<string, string>;

export type WorkoutEditorMode =
  | { mode: "create"; initialExerciseIds?: string[] }
  | { mode: "edit"; workout: Workout };

type WorkoutEditorPageProps = {
  mode: WorkoutEditorMode;
  onBack: () => void;
  onSaved: () => void;
  /** Catálogo a pantalla completa (solo botón dentro del panel «Explorar ejercicios»). */
  onOpenFullCatalog?: () => void;
  /** Ficha del ejercicio (desde el catálogo embebido). */
  onOpenExerciseDetail: (exerciseId: string) => void;
};

function normalizeNonEmptyLines(lines: string[]) {
  return lines.map((item) => item.trim()).filter(Boolean);
}

/** Reparto visual entre formulario y panel lateral (catálogo / resumen). */
export type WorkoutEditorLayoutFocus = "editor" | "balanced" | "catalog";

/** Columnas en xl: la columna a 0fr colapsa por completo (sin segunda “franja”). */
const LAYOUT_GRID: Record<WorkoutEditorLayoutFocus, string> = {
  balanced: "xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]",
  editor: "xl:grid-cols-[minmax(0,1fr)_minmax(0,0fr)]",
  catalog: "xl:grid-cols-[minmax(0,0fr)_minmax(0,1fr)]",
};

const layoutSlideEase = "ease-[cubic-bezier(0.22,1,0.36,1)]";

export function WorkoutEditorPage({ mode, onBack, onSaved, onOpenFullCatalog, onOpenExerciseDetail }: WorkoutEditorPageProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [exerciseBlocks, setExerciseBlocks] = useState<WorkoutExerciseBlock[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [exerciseCatalog, setExerciseCatalog] = useState<Exercise[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  /** Evita sobrescribir el borrador en sessionStorage antes de hidratar desde el mismo borrador. */
  const [createDraftReady, setCreateDraftReady] = useState(false);
  /** Columna derecha del editor: catálogo o resumen (menos ruido visual). */
  const [editorSideTab, setEditorSideTab] = useState<"catalog" | "preview">("catalog");
  const [layoutFocus, setLayoutFocus] = useState<WorkoutEditorLayoutFocus>("balanced");

  useEffect(() => {
    if (layoutFocus === "catalog") setEditorSideTab("catalog");
  }, [layoutFocus]);

  useEffect(() => {
    void getExercises()
      .then((list) => {
        setExerciseCatalog(list);
        setCatalogError(null);
      })
      .catch((err) => {
        setCatalogError(getErrorMessage(err, "No se pudo cargar el catálogo de ejercicios"));
      })
      .finally(() => {
        setCatalogLoading(false);
      });
  }, []);

  /** Preselección / corrección de material y lateralidad al cargar el catálogo. */
  useEffect(() => {
    if (!exerciseCatalog.length) return;
    setExerciseBlocks((prev) => {
      if (!prev.length) return prev;
      let changed = false;
      const next = prev.map((b) => {
        const ex = exerciseCatalog.find((e) => e.id === b.exerciseId);
        if (!ex) return b;
        const currentEq = b.equipmentSlug ?? "";
        const fixedEq = currentEq.trim()
          ? sanitizeEquipmentSlug(currentEq, ex)
          : defaultEquipmentSlugForExercise(ex);
        const fixedLat = sanitizeLaterality(b.laterality, fixedEq, ex);
        const latSame = (b.laterality ?? "bilateral") === fixedLat;
        if (fixedEq === currentEq && latSame) return b;
        changed = true;
        return { ...b, equipmentSlug: fixedEq, laterality: fixedLat };
      });
      return changed ? next : prev;
    });
  }, [exerciseCatalog]);

  const editWorkoutId = mode.mode === "edit" ? mode.workout.id : "";
  const appendExerciseIdsKey =
    mode.mode === "create" && mode.initialExerciseIds?.length
      ? mode.initialExerciseIds.join("\u0001")
      : "";

  useEffect(() => {
    setError("");
    if (mode.mode === "edit") {
      const w = mode.workout;
      setTitle(w.title);
      setDescription(w.description);
      setExerciseBlocks(blocksFromLegacy(w.exerciseIds, w.exerciseBlocks));
      setTags([...(w.tags ?? [])]);
      setCreateDraftReady(false);
      return;
    }

    setCreateDraftReady(false);
    const d = readWorkoutCreateDraft();
    const nextTitle = d?.title ?? "";
    const nextDesc = d?.description ?? "";
    let nextBlocks = blocksFromLegacy(d?.exerciseIds, d?.exerciseBlocks).slice(0, WORKOUT_EXERCISES_MAX);
    if (mode.initialExerciseIds?.length) {
      for (const id of mode.initialExerciseIds) {
        if (nextBlocks.length >= WORKOUT_EXERCISES_MAX) break;
        if (!nextBlocks.some((b) => b.exerciseId === id)) {
          nextBlocks = [...nextBlocks, createBlockForExercise(id, exerciseById.get(id))];
        }
      }
    }

    setTitle(nextTitle);
    setDescription(nextDesc);
    setExerciseBlocks(nextBlocks);
    setTags([]);
    setCreateDraftReady(true);
    // Claves derivadas (`editWorkoutId`, `appendExerciseIdsKey`) sustituyen a `mode.workout` / `initialExerciseIds` para no re-hidratar en exceso.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ver comentario arriba
  }, [mode.mode, editWorkoutId, appendExerciseIdsKey]);

  useEffect(() => {
    if (mode.mode !== "create" || !createDraftReady) return;
    writeWorkoutCreateDraft({
      title,
      description,
      exerciseBlocks,
      tags,
    });
  }, [mode.mode, createDraftReady, title, description, exerciseBlocks, tags]);

  const exerciseById = useMemo(() => new Map(exerciseCatalog.map((e) => [e.id, e])), [exerciseCatalog]);

  const previewTags = useMemo(
    () => normalizeNonEmptyLines(tags),
    [tags],
  );
  const previewExerciseNames = useMemo(
    () =>
      exerciseBlocks.map((b) => {
        const ex = exerciseById.get(b.exerciseId);
        const name = ex?.name ?? "…";
        const n = b.sets?.length ?? 0;
        const mat = b.equipmentSlug ? EQUIPMENT_PREVIEW[b.equipmentSlug] ?? b.equipmentSlug : null;
        const muscleStr =
          (ex?.muscles ?? []).length > 0
            ? (ex?.muscles ?? []).map((s) => MUSCLE_PREVIEW[s] ?? s).join(", ")
            : null;
        const lat = (b.laterality ?? "bilateral") === "unilateral" ? "Unilateral" : "Bilateral";
        const bits = [name];
        bits.push(lat);
        if (n > 0) bits.push(`${n} serie${n === 1 ? "" : "s"}`);
        if (mat) bits.push(mat);
        if (muscleStr) bits.push(muscleStr);
        return bits.join(" · ");
      }),
    [exerciseBlocks, exerciseById],
  );

  const isEdit = mode.mode === "edit";
  const breadcrumbLeaf = isEdit ? "Editar rutina" : "Nueva rutina";
  const pageTitle = isEdit ? "Editar rutina" : "Nueva rutina";
  const headerLine = isEdit ? (
    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-400 light:text-zinc-600">
      Cambios en{" "}
      <span className="font-medium text-neutral-300 light:text-zinc-800">
        {mode.workout.title.length > 48 ? `${mode.workout.title.slice(0, 45)}…` : mode.workout.title}
      </span>
      . Al guardar volverás al listado de rutinas.
    </p>
  ) : (
    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-400 light:text-zinc-600">
      Formulario a la izquierda; a la derecha alterna entre catálogo y resumen con las pestañas.
    </p>
  );

  function handleBack() {
    onBack();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    if (title.trim().length < WORKOUT_TITLE_MIN) {
      setLoading(false);
      setError("El título debe tener al menos 3 caracteres");
      return;
    }
    if (description.length > WORKOUT_DESCRIPTION_MAX) {
      setLoading(false);
      setError("La descripción no puede superar 280 caracteres");
      return;
    }

    const tagList = isEdit ? normalizeNonEmptyLines(tags) : [];

    if (exerciseBlocks.length > WORKOUT_EXERCISES_MAX) {
      setLoading(false);
      setError(`Como máximo ${WORKOUT_EXERCISES_MAX} ejercicios`);
      return;
    }

    try {
      if (mode.mode === "edit") {
        await updateWorkout(mode.workout.id, {
          title,
          description,
          exerciseBlocks,
          tags: tagList,
        });
      } else {
        await createWorkout({ title, description, exerciseBlocks, tags: tagList });
        clearWorkoutCreateDraft();
      }
      onSaved();
    } catch (submitError) {
      setError(getErrorMessage(submitError, isEdit ? "No se pudo actualizar la rutina" : "No se pudo crear la rutina"));
      setLoading(false);
    }
  }

  function appendToRoutine(exerciseIds: string[]) {
    if (exerciseIds.length === 0) return;
    setExerciseBlocks((prev) => {
      let next = [...prev];
      for (const id of exerciseIds) {
        if (next.length >= WORKOUT_EXERCISES_MAX) break;
        next.push(createBlockForExercise(id, exerciseById.get(id)));
      }
      return next;
    });
    setLayoutFocus("balanced");
  }

  return (
    <section className="layout grid w-full min-w-0 gap-5 lg:gap-6">
      <header className="feed-page-header relative overflow-hidden rounded-2xl border border-neutral-800/75 bg-linear-to-b from-neutral-950 via-neutral-950 to-neutral-950/90 px-4 py-5 shadow-[0_14px_44px_-20px_rgba(0,0,0,0.65)] sm:px-6 sm:py-6 light:border-zinc-200/90 light:from-white light:via-white light:to-zinc-50 light:shadow-[0_14px_40px_-18px_rgba(24,24,27,0.12)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 z-0 h-52 w-52 rounded-full bg-goi-gold/[0.07] blur-3xl encendido:bg-orange-400/16 healthy:bg-goi-gold/[0.11]"
        />
        <div className="relative space-y-4">
          <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-neutral-500 light:text-zinc-600" aria-label="Miga de pan">
            <button
              type="button"
              className="rounded-xl border border-neutral-700/50 bg-neutral-900/35 px-3 py-1.5 text-[11px] font-medium text-neutral-400 transition-colors hover:border-neutral-600 hover:bg-neutral-800/70 hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/30 active:scale-[0.99] light:border-zinc-300 light:bg-white light:text-zinc-600 light:hover:border-zinc-400 light:hover:bg-zinc-50 light:hover:text-zinc-900"
              onClick={handleBack}
            >
              Rutinas
            </button>
            <span className="text-neutral-600 light:text-zinc-400" aria-hidden>
              /
            </span>
            <span className="text-neutral-500">Editor</span>
            <span className="text-neutral-600 light:text-zinc-400" aria-hidden>
              /
            </span>
            <span className="max-w-[min(100%,16rem)] truncate rounded-full border border-goi-gold/35 bg-goi-gold/[0.12] px-2.5 py-0.5 font-semibold text-goi-gold light:border-goi-gold/40 healthy:border-goi-gold/30 light:bg-goi-gold/[0.11] healthy:bg-goi-gold/[0.11] light:text-goi-gold-dim healthy:text-goi-gold-dim">
              {breadcrumbLeaf}
            </span>
          </nav>

          <div className="flex flex-wrap items-start gap-3 sm:gap-4">
            <div className="hidden shrink-0 sm:grid sm:size-14 sm:place-items-center sm:rounded-2xl sm:border sm:border-goi-gold/30 sm:bg-goi-gold/[0.09] sm:shadow-inner sm:shadow-black/20 light:sm:bg-goi-gold/[0.1] healthy:sm:bg-goi-gold/[0.08]">
              <WorkoutEditorBarbellIcon className="size-8 text-goi-gold healthy:text-goi-gold-dim" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-goi-gold-dim">Editor de rutinas</p>
                {user?.username ? (
                  <span className="rounded-full border border-neutral-700/85 bg-neutral-900/55 px-2.5 py-0.5 text-[10px] font-medium tabular-nums text-neutral-400 light:border-zinc-200 light:bg-zinc-100 light:text-zinc-600">
                    @{user.username}
                  </span>
                ) : null}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-50 sm:text-[1.7rem] light:text-zinc-900">{pageTitle}</h1>
              {headerLine}
            </div>
          </div>
        </div>
      </header>

      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800/55 bg-neutral-950/40 px-4 py-3 light:border-zinc-200/85 light:bg-zinc-50/90"
        role="region"
        aria-label="Disposición del editor"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500 light:text-zinc-600">
          Vista del editor
        </p>
        <div
          className="flex min-w-0 flex-1 justify-end sm:justify-center sm:flex-none sm:flex-initial"
          role="group"
          aria-label="Priorizar formulario o catálogo"
        >
          <div className="relative inline-grid w-full max-w-md grid-cols-3 rounded-2xl border border-neutral-800/70 bg-neutral-950/70 p-1 shadow-[inset_0_1px_6px_rgba(0,0,0,0.22)] light:border-zinc-300 light:bg-zinc-100/90 light:shadow-[inset_0_1px_3px_rgba(15,23,42,0.05)]">
            <span
              aria-hidden
              className={[
                "pointer-events-none absolute inset-y-1 left-1 z-0 rounded-xl border border-goi-gold/20 bg-goi-gold/[0.13] shadow-[0_1px_12px_-4px_rgba(212,175,55,0.35)] transition-transform duration-700 motion-reduce:transition-none light:border-goi-gold/30 healthy:border-goi-gold/24 light:bg-goi-gold/[0.12] healthy:bg-goi-gold/[0.1] light:shadow-[0_1px_10px_-4px_rgba(160,58,24,0.22)] healthy:shadow-[0_1px_10px_-4px_rgba(95,116,107,0.16)]",
                layoutSlideEase,
                "w-[calc((100%-0.5rem)/3)]",
              ].join(" ")}
              style={{
                transform: `translateX(calc(${layoutFocus === "editor" ? 0 : layoutFocus === "balanced" ? 1 : 2} * 100%))`,
              }}
            />
            {(
              [
                { id: "editor" as const, label: "Formulario" },
                { id: "balanced" as const, label: "Ambos" },
                { id: "catalog" as const, label: "Catálogo" },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={layoutFocus === id}
                className={[
                  "relative z-10 min-h-10 rounded-xl px-2 py-2 text-[11px] font-semibold tracking-tight transition-colors duration-500 sm:min-h-11 sm:px-3 sm:text-xs",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/35 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 light:focus-visible:ring-offset-white",
                  layoutFocus === id
                    ? "text-goi-gold healthy:text-goi-gold-dim"
                    : "text-neutral-500 hover:text-neutral-300 active:scale-[0.99] light:text-zinc-600 light:hover:text-zinc-900",
                ].join(" ")}
                onClick={() => setLayoutFocus(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className={[
          "min-w-0 gap-6 max-xl:gap-8 max-xl:flex",
          layoutFocus === "catalog" ? "max-xl:flex-col-reverse" : "max-xl:flex-col",
          "xl:grid xl:items-start xl:gap-8 xl:transition-[grid-template-columns] xl:duration-700 motion-reduce:xl:transition-none",
          layoutSlideEase,
          LAYOUT_GRID[layoutFocus],
        ].join(" ")}
      >
        <div
          className={[
            "min-w-0 overflow-hidden xl:transition-[opacity,transform] xl:duration-700 motion-reduce:xl:transition-none",
            layoutSlideEase,
            layoutFocus === "catalog"
              ? "max-xl:hidden xl:pointer-events-none xl:opacity-0 xl:-translate-x-12 xl:scale-[0.96]"
              : "xl:translate-x-0 xl:scale-100 xl:opacity-100",
          ].join(" ")}
          aria-hidden={layoutFocus === "catalog"}
          inert={layoutFocus === "catalog" ? true : undefined}
        >
        <Card
          tone="dark"
          className="scroll-mt-20 min-w-0 rounded-2xl border-neutral-800/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
        >
          <div className="-mx-4 -mt-4 mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/60 px-4 pb-4 pt-0.5 light:border-zinc-200/85">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-neutral-100 light:text-zinc-900">
                {isEdit ? "Detalle de la rutina" : "Crea tu rutina"}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={handleBack} disabled={loading} className="text-xs sm:text-sm">
                Volver
              </Button>
            </div>
          </div>
          <StatusMessage tone="dark" loading={loading} error={error} />
          <WorkoutForm
            title={title}
            description={description}
            exerciseBlocks={exerciseBlocks}
            exerciseCatalog={exerciseCatalog}
            exerciseCatalogError={catalogError}
            exerciseCatalogLoading={catalogLoading}
            onChangeTitle={setTitle}
            onChangeDescription={setDescription}
            onChangeExerciseBlocks={setExerciseBlocks}
            onSubmit={handleSubmit}
            submitLabel={loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Guardar rutina"}
            onCancel={handleBack}
            omitEmbeddedCatalogUi
            showExerciseBlockPhotos={layoutFocus === "editor"}
            disabled={loading}
          />
        </Card>
        </div>

        <div
          className={[
            "flex min-w-0 flex-col gap-3 xl:sticky xl:top-[4.75rem] xl:transition-[opacity,transform] xl:duration-700 motion-reduce:xl:transition-none",
            layoutSlideEase,
            layoutFocus === "editor"
              ? "max-xl:hidden xl:pointer-events-none xl:opacity-0 xl:translate-x-14 xl:scale-[0.96]"
              : "xl:translate-x-0 xl:scale-100 xl:opacity-100",
          ].join(" ")}
          aria-hidden={layoutFocus === "editor"}
          inert={layoutFocus === "editor" ? true : undefined}
        >
          <div className="flex flex-wrap items-end justify-between gap-2 px-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500 light:text-zinc-600">
              Panel lateral
            </p>
          </div>
          <div
            className="flex rounded-2xl border border-neutral-800/70 bg-neutral-950/70 p-1 shadow-[inset_0_1px_6px_rgba(0,0,0,0.28)] light:border-zinc-300 light:bg-zinc-100/90 light:shadow-[inset_0_1px_3px_rgba(15,23,42,0.05)]"
            role="tablist"
            aria-label="Panel lateral del editor"
          >
            <button
              type="button"
              role="tab"
              aria-selected={editorSideTab === "catalog"}
              className={[
                "min-h-11 flex-1 rounded-xl px-3 text-xs font-semibold tracking-tight transition-colors duration-200 sm:text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/35 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 light:focus-visible:ring-offset-white",
                editorSideTab === "catalog"
                  ? "border border-goi-gold/25 bg-goi-gold/[0.11] text-goi-gold light:border-goi-gold/35 healthy:border-goi-gold/28 light:bg-goi-gold/[0.1] healthy:bg-goi-gold/[0.095] light:text-goi-gold-dim healthy:text-goi-gold-dim"
                  : "border border-transparent text-neutral-500 hover:bg-neutral-900/50 hover:text-neutral-300 active:scale-[0.99] light:text-zinc-600 light:hover:bg-white/90 light:hover:text-zinc-900",
              ].join(" ")}
              onClick={() => setEditorSideTab("catalog")}
            >
              Catálogo
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={editorSideTab === "preview"}
              className={[
                "min-h-11 flex-1 rounded-xl px-3 text-xs font-semibold tracking-tight transition-colors duration-200 sm:text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/35 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 light:focus-visible:ring-offset-white",
                editorSideTab === "preview"
                  ? "border border-goi-gold/25 bg-goi-gold/[0.11] text-goi-gold light:border-goi-gold/35 healthy:border-goi-gold/28 light:bg-goi-gold/[0.1] healthy:bg-goi-gold/[0.095] light:text-goi-gold-dim healthy:text-goi-gold-dim"
                  : "border border-transparent text-neutral-500 hover:bg-neutral-900/50 hover:text-neutral-300 active:scale-[0.99] light:text-zinc-600 light:hover:bg-white/90 light:hover:text-zinc-900",
              ].join(" ")}
              onClick={() => setEditorSideTab("preview")}
            >
              Resumen
            </button>
          </div>

          {editorSideTab === "catalog" ? (
            <ExerciseCatalogPanel
              variant="embedded"
              compactEmbedded
              prefetchedCatalog={{
                exercises: exerciseCatalog,
                loading: catalogLoading,
                error: catalogError,
              }}
              onOpenExerciseDetail={onOpenExerciseDetail}
              onAppendToRoutine={appendToRoutine}
              routineBlockCount={exerciseBlocks.length}
              onOpenFullCatalog={onOpenFullCatalog}
            />
          ) : (
            <aside className="min-w-0" aria-label="Vista previa de la rutina">
              <div className="relative flex h-fit flex-col overflow-hidden rounded-2xl border border-neutral-800/75 bg-zinc-950/90 p-4 shadow-[0_12px_36px_-22px_rgba(0,0,0,0.55)] light:border-zinc-200 light:bg-white light:shadow-[0_12px_28px_-18px_rgba(24,24,27,0.12)]">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-14 -top-10 z-0 h-32 w-32 rounded-full bg-goi-gold/[0.06] blur-3xl encendido:bg-orange-400/12 healthy:bg-goi-gold/[0.09]"
                />
                <div className="relative z-[1] flex flex-col gap-3">
                  <div className="border-b border-neutral-800/50 pb-3 light:border-zinc-200">
                    <p className="text-xs font-medium uppercase tracking-wider text-goi-gold-dim">Cómo se verá</p>
                    <p className="mt-1 text-[11px] leading-snug text-neutral-500 light:text-zinc-600">En listados e historial de entrenos.</p>
                  </div>
                  <div className="fs-panel-elevated rounded-xl border border-neutral-800/60 bg-black/25 p-3.5 light:border-zinc-200/90 light:bg-zinc-50">
                    <strong className="block text-base font-semibold tracking-tight text-neutral-100 light:text-zinc-900">
                      {title.trim() || "Sin título"}
                    </strong>
                    <p className="mt-1.5 text-sm leading-relaxed text-goi-steel light:text-zinc-700">
                      {description.trim() || "Sin descripción"}
                    </p>
                    {previewTags.length > 0 ? (
                      <>
                        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 light:text-zinc-600">Etiquetas</p>
                        <ul className="mt-2 flex list-none flex-wrap gap-1.5 p-0">
                          {previewTags.map((tag, tIdx) => (
                            <li key={`${tag}-${tIdx}`}>
                              <span className="inline-block rounded-full border border-goi-gold-dim/35 bg-neutral-950/80 px-2.5 py-0.5 text-xs font-medium text-goi-steel light:bg-white light:text-yellow-950 healthy:text-goi-gold-dim">
                                {tag}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                    <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 light:text-zinc-600">Ejercicios</p>
                    {previewExerciseNames.length > 0 ? (
                      <ol className="mt-2 max-w-xl list-inside list-decimal space-y-1.5 pl-0.5 text-sm leading-snug text-goi-steel light:text-zinc-800">
                        {previewExerciseNames.map((name, idx) => (
                          <li key={`pv-${idx}`} className="break-words pl-1">
                            {catalogLoading && !exerciseById.size ? "…" : name}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-2 text-sm text-neutral-500 light:text-zinc-600">
                        Aún sin ejercicios: añádelos desde la pestaña Catálogo.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}

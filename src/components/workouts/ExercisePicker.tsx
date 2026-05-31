import { useEffect, useMemo, useState } from "react";
import { allowsUnilateralWithEquipment } from "../../data/equipmentLaterality";
import {
  equipmentOptionsForExercise,
  exerciseHasEquipmentRestrictions,
  isEquipmentSlugAllowed,
} from "../../utils/exerciseEquipmentLimits";
import {
  isLateralityAllowed,
  lateralityRestrictionHint,
} from "../../utils/exerciseLateralityLimits";
import { WORKOUT_SET_TYPE_OPTIONS } from "../../data/workoutSetTypes";
import type { Exercise } from "../../types/exercise";
import type { WorkoutExerciseBlock, WorkoutSetRow } from "../../types/workout";
import { createBlockForExercise, createEmptySet } from "../../utils/workoutBlocks";
import {
  catalogExerciseDisplayTitle,
  catalogExerciseMetaLine,
  EQUIPMENT_LABEL,
  ExerciseCatalogThumbPlaceholder,
  MUSCLE_LABEL,
} from "../exercises/exerciseCatalogChrome";
import { Button } from "../ui/Button";
import {
  WORKOUT_EXERCISES_MAX,
  WORKOUT_SET_FIELD_MAX_LEN,
  WORKOUT_SETS_MAX_PER_EXERCISE,
} from "./workoutFormLimits";

const LATERALITY_OPTIONS = [
  { slug: "bilateral" as const, label: "Bilateral" },
  { slug: "unilateral" as const, label: "Unilateral" },
];

type ExercisePickerProps = {
  exerciseBlocks: WorkoutExerciseBlock[];
  onChange: (blocks: WorkoutExerciseBlock[]) => void;
  catalog: Exercise[];
  disabled?: boolean;
  catalogError?: string | null;
  catalogLoading?: boolean;
  onOpenCatalog?: () => void;
  /** Sin buscador ni botón de catálogo: el listado vive fuera (p. ej. columna del editor). */
  omitEmbeddedCatalogUi?: boolean;
  /** Hueco para foto (placeholder): solo en vista «Formulario» del editor de rutinas. */
  showExerciseThumbnails?: boolean;
};

function updateBlock(
  blocks: WorkoutExerciseBlock[],
  index: number,
  fn: (b: WorkoutExerciseBlock) => WorkoutExerciseBlock,
): WorkoutExerciseBlock[] {
  return blocks.map((b, i) => (i === index ? fn(b) : b));
}

/** Chevron abajo; con `expanded` rota 180° (flecha arriba = minimizar bloque). */
function BlockCollapseChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={["h-4 w-4 shrink-0 text-current transition-transform duration-200", expanded ? "rotate-180" : ""].join(" ")}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

export function ExercisePicker({
  exerciseBlocks: blocks,
  onChange: onChangeBlocks,
  catalog,
  disabled = false,
  catalogError,
  catalogLoading = false,
  onOpenCatalog,
  omitEmbeddedCatalogUi = false,
  showExerciseThumbnails = false,
}: ExercisePickerProps) {
  const [query, setQuery] = useState("");
  /** Una entrada por índice de bloque: true = detalle colapsado (solo cabecera). */
  const [collapsedRows, setCollapsedRows] = useState<boolean[]>([]);

  const catalogById = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog]);

  const byId = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog]);

  useEffect(() => {
    setCollapsedRows((prev) => {
      if (prev.length === blocks.length) return prev;
      if (blocks.length > prev.length) {
        return [...prev, ...Array(blocks.length - prev.length).fill(false)];
      }
      return prev.slice(0, blocks.length);
    });
  }, [blocks.length]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog
      .filter((e) => !q || e.name.toLowerCase().includes(q))
      .slice(0, 40);
  }, [catalog, query]);

  function addId(id: string) {
    if (disabled || blocks.length >= WORKOUT_EXERCISES_MAX) return;
    onChangeBlocks([...blocks, createBlockForExercise(id, catalogById.get(id))]);
    setQuery("");
  }

  function removeAt(index: number) {
    onChangeBlocks(blocks.filter((_, i) => i !== index));
    setCollapsedRows((prev) => prev.filter((_, i) => i !== index));
  }

  function move(index: number, delta: -1 | 1) {
    const j = index + delta;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    const tmp = next[index];
    next[index] = next[j]!;
    next[j] = tmp!;
    onChangeBlocks(next);
    setCollapsedRows((prev) => {
      const row = [...prev];
      while (row.length < blocks.length) row.push(false);
      const a = row[index];
      const b = row[j];
      row[index] = b ?? false;
      row[j] = a ?? false;
      return row.slice(0, blocks.length);
    });
  }

  function toggleRowCollapsed(index: number) {
    setCollapsedRows((prev) => {
      const next = [...prev];
      while (next.length <= index) next.push(false);
      next[index] = !next[index];
      return next;
    });
  }

  function setEquipment(index: number, slug: string) {
    const ex = catalogById.get(blocks[index]?.exerciseId ?? "");
    if (!isEquipmentSlugAllowed(slug, ex)) return;
    onChangeBlocks(
      updateBlock(blocks, index, (b) => {
        const nextSlug = b.equipmentSlug === slug ? "" : slug;
        const patch: WorkoutExerciseBlock = { ...b, equipmentSlug: nextSlug };
        if (!isLateralityAllowed(b.laterality, nextSlug, ex)) {
          patch.laterality = "bilateral";
        }
        return patch;
      }),
    );
  }

  function setLaterality(index: number, slug: "bilateral" | "unilateral") {
    const ex = catalogById.get(blocks[index]?.exerciseId ?? "");
    if (!isLateralityAllowed(slug, blocks[index]?.equipmentSlug, ex)) return;
    onChangeBlocks(
      updateBlock(blocks, index, (b) => ({
        ...b,
        laterality: slug,
      })),
    );
  }

  function addSet(blockIndex: number) {
    onChangeBlocks(
      updateBlock(blocks, blockIndex, (b) => {
        if (b.sets.length >= WORKOUT_SETS_MAX_PER_EXERCISE) return b;
        return { ...b, sets: [...b.sets, createEmptySet()] };
      }),
    );
  }

  function removeSet(blockIndex: number, setIndex: number) {
    onChangeBlocks(
      updateBlock(blocks, blockIndex, (b) => {
        if (b.sets.length <= 1) return b;
        return { ...b, sets: b.sets.filter((_, i) => i !== setIndex) };
      }),
    );
  }

  function patchSet(blockIndex: number, setIndex: number, patch: Partial<WorkoutSetRow>) {
    onChangeBlocks(
      updateBlock(blocks, blockIndex, (b) => ({
        ...b,
        sets: b.sets.map((row, i) => (i === setIndex ? { ...row, ...patch } : row)),
      })),
    );
  }

  function exerciseBlockDetailFields(index: number, block: WorkoutExerciseBlock) {
    const ex = catalogById.get(block.exerciseId);
    const equipmentOpts = equipmentOptionsForExercise(ex);
    const restricted = exerciseHasEquipmentRestrictions(ex);
    const equipmentSlug = block.equipmentSlug ?? "";
    const unilateralAllowed = allowsUnilateralWithEquipment(equipmentSlug);
    const latHint = lateralityRestrictionHint(equipmentSlug);
    const lateralityOptions = LATERALITY_OPTIONS.filter(
      (opt) => opt.slug === "bilateral" || unilateralAllowed,
    );

    return (
      <>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 light:text-zinc-600">Material</p>
            {restricted ? (
              <span className="text-[10px] font-medium text-neutral-500 light:text-zinc-500">Variantes del movimiento</span>
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {equipmentOpts.map((opt) => {
              const active = block.equipmentSlug === opt.slug;
              return (
                <button
                  key={opt.slug}
                  type="button"
                  disabled={disabled}
                  onClick={() => setEquipment(index, opt.slug)}
                  className={
                    active
                      ? "rounded-full border border-goi-gold/40 bg-goi-gold/15 px-2.5 py-1 text-xs text-goi-gold"
                      : "rounded-full border border-neutral-700 bg-neutral-950/80 px-2.5 py-1 text-xs text-neutral-300 hover:border-neutral-500 disabled:opacity-40 light:border-zinc-300 light:bg-white light:text-zinc-800 light:hover:border-zinc-400"
                  }
                >
                  {opt.label}
                </button>
              );
            })}
            {!restricted ? (
              <span className="self-center text-[10px] text-neutral-600">
                {block.equipmentSlug ? `· ${EQUIPMENT_LABEL[block.equipmentSlug] ?? block.equipmentSlug}` : "· opcional"}
              </span>
            ) : null}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 light:text-zinc-600">Lado</p>
            {latHint ? (
              <span className="text-[10px] font-medium text-neutral-500 light:text-zinc-500">{latHint}</span>
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {lateralityOptions.map((opt) => {
              const active = (block.laterality ?? "bilateral") === opt.slug;
              return (
                <button
                  key={opt.slug}
                  type="button"
                  disabled={disabled}
                  onClick={() => setLaterality(index, opt.slug)}
                  className={
                    active
                      ? "rounded-full border border-sky-500/40 bg-sky-950/40 px-2.5 py-1 text-xs text-sky-100"
                      : "rounded-full border border-neutral-700 bg-neutral-950/80 px-2.5 py-1 text-xs text-neutral-300 hover:border-neutral-500 disabled:opacity-40 light:border-zinc-300 light:bg-white light:text-zinc-800 light:hover:border-zinc-400"
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 light:text-zinc-600">Series</p>
            <Button
              type="button"
              variant="secondary"
              className="!px-2 !py-1 text-xs"
              disabled={disabled || block.sets.length >= WORKOUT_SETS_MAX_PER_EXERCISE}
              onClick={() => addSet(index)}
            >
              Añadir serie
            </Button>
          </div>
          <div className="mt-2 overflow-x-auto rounded-md border border-neutral-800/80 bg-black/20 light:border-zinc-200 light:bg-zinc-100">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-800 text-left text-[10px] uppercase tracking-wide text-neutral-500 light:border-zinc-200 light:text-zinc-600">
                  <th className="px-2 py-2 font-semibold">#</th>
                  <th className="px-2 py-2 font-semibold">Reps</th>
                  <th className="px-2 py-2 font-semibold">Peso</th>
                  <th className="min-w-[9rem] px-2 py-2 font-semibold">Tipo de serie</th>
                  <th className="px-2 py-2 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {block.sets.map((row, sIdx) => (
                  <tr key={`set-${index}-${sIdx}`} className="border-b border-neutral-800/50 last:border-b-0 light:border-zinc-200">
                    <td className="px-2 py-1.5 tabular-nums text-neutral-500">{sIdx + 1}</td>
                    <td className="px-2 py-1.5">
                      <input
                        className="goi-field w-full min-w-[4rem] py-1.5 text-sm"
                        maxLength={WORKOUT_SET_FIELD_MAX_LEN}
                        disabled={disabled}
                        value={row.reps}
                        onChange={(e) => patchSet(index, sIdx, { reps: e.target.value })}
                        placeholder="p. ej. 8"
                        aria-label={`Repeticiones serie ${sIdx + 1}`}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        className="goi-field w-full min-w-[4rem] py-1.5 text-sm"
                        maxLength={WORKOUT_SET_FIELD_MAX_LEN}
                        disabled={disabled}
                        value={row.weight}
                        onChange={(e) => patchSet(index, sIdx, { weight: e.target.value })}
                        placeholder="kg"
                        aria-label={`Peso serie ${sIdx + 1}`}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        className="goi-field w-full py-1.5 text-sm"
                        disabled={disabled}
                        value={row.setType}
                        onChange={(e) => patchSet(index, sIdx, { setType: e.target.value })}
                        aria-label={`Tipo de serie ${sIdx + 1}`}
                      >
                        {WORKOUT_SET_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.slug} value={opt.slug}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <Button
                        type="button"
                        variant="secondary"
                        className="!px-2 !py-1 text-xs"
                        disabled={disabled || block.sets.length <= 1}
                        onClick={() => removeSet(index, sIdx)}
                      >
                        Eliminar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  if (catalogError) {
    return (
      <p className="rounded-md border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200">
        {catalogError}
      </p>
    );
  }

  if (catalogLoading) {
    return <p className="text-sm text-neutral-500">Cargando catálogo de ejercicios…</p>;
  }

  /** Editor con catálogo en columna: menos bordes redundantes respecto al Card exterior. */
  const flatChrome = omitEmbeddedCatalogUi;
  const showPickerThumbs = flatChrome && showExerciseThumbnails;

  const addFromCatalog = omitEmbeddedCatalogUi
    ? null
    : onOpenCatalog
      ? (
          <div className="grid gap-2 rounded-xl border border-neutral-800/55 bg-neutral-950/25 p-3 light:border-zinc-200 light:bg-zinc-50/90">
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={disabled || blocks.length >= WORKOUT_EXERCISES_MAX}
              onClick={onOpenCatalog}
            >
              {blocks.length >= WORKOUT_EXERCISES_MAX
                ? "Límite de ejercicios alcanzado"
                : "Elegir ejercicios en el catálogo"}
            </Button>
            {blocks.length >= WORKOUT_EXERCISES_MAX ? (
              <p className="text-sm text-neutral-500">Quita un ejercicio de la lista para añadir más desde el catálogo.</p>
            ) : null}
          </div>
        )
      : (
          <div className="rounded-xl border border-neutral-800/55 bg-neutral-950/30 p-3 light:border-zinc-200 light:bg-zinc-50/90">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-neutral-400">Buscar en el catálogo</span>
              <input
                className="goi-field"
                type="search"
                value={query}
                disabled={disabled}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Empieza a escribir…"
                autoComplete="off"
                aria-label="Buscar ejercicio para añadir"
              />
            </label>

            {filtered.length > 0 ? (
              <ul
                className="fs-muted-well max-h-48 list-none space-y-1 overflow-y-auto rounded-md p-1.5"
                aria-label="Resultados del catálogo"
              >
                {filtered.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      disabled={disabled || blocks.length >= WORKOUT_EXERCISES_MAX}
                      className="w-full rounded px-2 py-2 text-left text-sm text-neutral-200 transition-colors hover:bg-goi-gold/10 hover:text-goi-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/35 disabled:opacity-40"
                      onClick={() => addId(e.id)}
                    >
                      {e.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">
                {query.trim()
                  ? "Ningún resultado (prueba otro término o ya están todos elegidos)."
                  : "Escribe para filtrar o elige de la lista."}
              </p>
            )}
          </div>
        );

  const emptyEmbeddedHint =
    omitEmbeddedCatalogUi && blocks.length === 0 ? (
      <div className="rounded-lg bg-neutral-950/25 px-3 py-9 text-center light:bg-zinc-100/50">
        <p className="text-sm font-medium text-neutral-300 light:text-zinc-800">Todavía sin ejercicios</p>
        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-neutral-500 light:text-zinc-600">
          Usa la pestaña <span className="font-medium text-neutral-400 light:text-zinc-700">Catálogo</span> y pulsa
          &quot;Añadir a la rutina&quot; o marca varios y &quot;Añadir selección&quot;.
        </p>
      </div>
    ) : null;

  return (
    <div className="grid gap-4">
      {addFromCatalog}

      <div className="grid gap-3">
        <div
          className={
            flatChrome
              ? "flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/35 pb-3 pt-0.5 light:border-zinc-200/75"
              : "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800/50 bg-neutral-900/35 px-3 py-2.5 light:border-zinc-200 light:bg-zinc-100/90"
          }
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500 light:text-zinc-600">
            Orden en la rutina
          </span>
          <span
            className={[
              "rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
              blocks.length >= WORKOUT_EXERCISES_MAX
                ? "border border-amber-500/40 bg-amber-950/35 text-amber-100/95 light:border-goi-gold/40 healthy:border-goi-gold/26 light:bg-goi-gold/[0.12] healthy:bg-goi-gold/[0.09] light:text-goi-gold-dim healthy:text-goi-gold-dim"
                : "border border-goi-gold/25 bg-goi-gold/[0.12] text-goi-gold light:border-goi-gold/40 healthy:border-goi-gold/28 light:bg-goi-gold/[0.1] healthy:bg-goi-gold/[0.11] light:text-goi-gold-dim healthy:text-goi-gold-dim",
            ].join(" ")}
          >
            {blocks.length}/{WORKOUT_EXERCISES_MAX}
          </span>
        </div>

        {emptyEmbeddedHint}

        {blocks.length === 0 && !omitEmbeddedCatalogUi ? (
          <p className="text-sm text-neutral-500 light:text-zinc-600">Aún no has añadido ejercicios.</p>
        ) : null}

        {blocks.length > 0 ? (
          <ul className={[flatChrome ? "gap-4" : "gap-3", "grid list-none p-0"].join(" ")}>
            {blocks.map((block, index) => {
              const ex = byId.get(block.exerciseId);
              const fallbackLabel = `ID desconocido (${block.exerciseId.slice(0, 8)}…)`;
              const label = ex?.name ?? fallbackLabel;
              const displayTitle = ex ? catalogExerciseDisplayTitle(ex) : label;
              const metaLinePicker = ex ? catalogExerciseMetaLine(ex) : null;
              const isCollapsed = Boolean(collapsedRows[index]);
              const setCount = block.sets?.length ?? 0;

              const detailSection = !isCollapsed ? (
                <div
                  id={`exercise-block-detail-${index}`}
                  className={
                    flatChrome
                      ? "space-y-3 border-t border-neutral-800/40 pt-3 light:border-zinc-200"
                      : "space-y-3 px-3 pb-3 pt-3"
                  }
                  role="region"
                  aria-labelledby={`exercise-block-toggle-${index}`}
                >
                  {exerciseBlockDetailFields(index, block)}
                </div>
              ) : null;

              const rowBtnClass = "!min-h-10 rounded-lg !px-3 !py-2 text-xs";

              if (flatChrome) {
                return (
                  <li
                    key={`${block.exerciseId}-${index}`}
                    className="overflow-hidden rounded-xl border border-neutral-800/40 bg-neutral-950/25 p-4 light:border-zinc-200/90 light:bg-white"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                      {showPickerThumbs ? <ExerciseCatalogThumbPlaceholder variant="picker" /> : null}
                      <div className="flex min-w-0 flex-1 flex-col gap-3">
                        <div className="flex flex-wrap items-start gap-2 border-b border-neutral-800/45 pb-3 light:border-zinc-200">
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => toggleRowCollapsed(index)}
                            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-neutral-700/75 bg-neutral-900/90 text-neutral-400 transition-colors hover:border-neutral-500 hover:bg-neutral-800 hover:text-neutral-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/30 disabled:opacity-40 light:border-zinc-300 light:bg-white light:text-zinc-600 light:hover:border-zinc-400 light:hover:bg-zinc-50 light:hover:text-zinc-900"
                            aria-expanded={!isCollapsed}
                            aria-controls={`exercise-block-detail-${index}`}
                            id={`exercise-block-toggle-${index}`}
                            title={isCollapsed ? "Expandir detalle" : "Minimizar detalle"}
                            aria-label={
                              isCollapsed
                                ? `Expandir detalle del ejercicio ${index + 1}: ${displayTitle}`
                                : `Minimizar detalle del ejercicio ${index + 1}: ${displayTitle}`
                            }
                          >
                            <BlockCollapseChevron expanded={!isCollapsed} />
                          </button>
                          <span
                            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-goi-gold/30 bg-goi-gold/[0.08] text-xs font-bold tabular-nums text-goi-gold light:border-goi-gold/40 healthy:border-goi-gold/32 light:bg-goi-gold/[0.1] healthy:bg-goi-gold/[0.09] light:text-goi-gold-dim healthy:text-goi-gold-dim"
                            aria-hidden
                          >
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="block text-base font-semibold leading-snug tracking-tight text-neutral-100 light:text-zinc-900">
                              {displayTitle}
                            </span>
                            {metaLinePicker ? (
                              <span className="mt-1 block text-xs leading-snug text-neutral-500 light:text-zinc-600">{metaLinePicker}</span>
                            ) : null}
                            {isCollapsed ? (
                              <span className="mt-1 block text-xs tabular-nums text-neutral-500 light:text-zinc-600">
                                {setCount} serie{setCount === 1 ? "" : "s"} ·{" "}
                                {(block.laterality ?? "bilateral") === "unilateral" ? "Unilateral" : "Bilateral"}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex w-full flex-wrap gap-1.5 max-sm:justify-stretch sm:ml-auto sm:w-auto sm:max-w-[13.5rem] sm:flex-col sm:items-stretch sm:gap-1.5">
                            <Button
                              type="button"
                              variant="secondary"
                              className={rowBtnClass}
                              disabled={disabled || index === 0}
                              onClick={() => move(index, -1)}
                              aria-label={`Subir ejercicio ${index + 1}`}
                            >
                              Arriba
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className={rowBtnClass}
                              disabled={disabled || index >= blocks.length - 1}
                              onClick={() => move(index, 1)}
                              aria-label={`Bajar ejercicio ${index + 1}`}
                            >
                              Abajo
                            </Button>
                            <Button type="button" variant="secondary" className={rowBtnClass} disabled={disabled} onClick={() => removeAt(index)}>
                              Quitar
                            </Button>
                          </div>
                        </div>

                        {!isCollapsed && ex?.description ? (
                          <p className="text-sm leading-relaxed text-neutral-500 line-clamp-2 light:text-zinc-600">{ex.description}</p>
                        ) : null}

                        {detailSection}
                      </div>
                    </div>
                  </li>
                );
              }

              return (
                <li
                  key={`${block.exerciseId}-${index}`}
                  className="overflow-hidden rounded-xl border border-neutral-800/55 bg-neutral-950/45 shadow-[0_1px_0_0_rgba(255,255,255,0.04)] light:border-zinc-200 light:bg-white light:shadow-none"
                >
                  <div
                    className={[
                      "flex flex-wrap items-center gap-2 bg-black/15 px-3 py-2.5 light:bg-zinc-50/90 max-sm:flex-col max-sm:items-stretch",
                      isCollapsed ? "" : "border-b border-neutral-800/55 light:border-zinc-200",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleRowCollapsed(index)}
                      className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-neutral-700/75 bg-neutral-900/90 text-neutral-400 transition-colors hover:border-neutral-500 hover:bg-neutral-800 hover:text-neutral-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/30 disabled:opacity-40 light:border-zinc-300 light:bg-white light:text-zinc-600 light:hover:border-zinc-400 light:hover:bg-zinc-50 light:hover:text-zinc-900"
                      aria-expanded={!isCollapsed}
                      aria-controls={`exercise-block-detail-${index}`}
                      id={`exercise-block-toggle-${index}`}
                      title={isCollapsed ? "Expandir detalle" : "Minimizar detalle"}
                      aria-label={
                        isCollapsed
                          ? `Expandir detalle del ejercicio ${index + 1}: ${displayTitle}`
                          : `Minimizar detalle del ejercicio ${index + 1}: ${displayTitle}`
                      }
                    >
                      <BlockCollapseChevron expanded={!isCollapsed} />
                    </button>
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-goi-gold/30 bg-goi-gold/[0.08] text-xs font-bold tabular-nums text-goi-gold light:border-goi-gold/40 healthy:border-goi-gold/32 light:bg-goi-gold/[0.1] healthy:bg-goi-gold/[0.09] light:text-goi-gold-dim healthy:text-goi-gold-dim"
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
                      <span className="text-sm font-medium text-neutral-100 light:text-zinc-900">{displayTitle}</span>
                      {isCollapsed ? (
                        <span className="text-xs tabular-nums text-neutral-500 light:text-zinc-600">
                          {setCount} serie{setCount === 1 ? "" : "s"} ·{" "}
                          {(block.laterality ?? "bilateral") === "unilateral" ? "Unilateral" : "Bilateral"}
                        </span>
                      ) : (
                        <>
                          <span className="inline-block rounded-full border border-neutral-700 bg-neutral-900/80 px-2 py-0.5 text-[10px] font-medium text-neutral-400 light:border-zinc-300 light:bg-zinc-200 light:text-zinc-700">
                            {(block.laterality ?? "bilateral") === "unilateral" ? "Unilateral" : "Bilateral"}
                          </span>
                          {block.equipmentSlug ? (
                            <span className="inline-block rounded-full border border-amber-500/35 bg-amber-950/30 px-2 py-0.5 text-[10px] font-medium text-amber-100/90">
                              {EQUIPMENT_LABEL[block.equipmentSlug] ?? block.equipmentSlug}
                            </span>
                          ) : null}
                          {(ex?.muscles ?? []).map((slug) => (
                            <span
                              key={slug}
                              className="inline-block rounded-full border border-goi-gold-dim/35 bg-neutral-950 px-2 py-0.5 text-[10px] font-medium text-goi-steel light:bg-white light:text-yellow-950 healthy:text-goi-gold-dim"
                            >
                              {MUSCLE_LABEL[slug] ?? slug}
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5 sm:gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="!px-2 !py-1.5 text-xs"
                        disabled={disabled || index === 0}
                        onClick={() => move(index, -1)}
                        aria-label={`Subir ejercicio ${index + 1}`}
                      >
                        Arriba
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="!px-2 !py-1.5 text-xs"
                        disabled={disabled || index >= blocks.length - 1}
                        onClick={() => move(index, 1)}
                        aria-label={`Bajar ejercicio ${index + 1}`}
                      >
                        Abajo
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="!px-2 !py-1.5 text-xs"
                        disabled={disabled}
                        onClick={() => removeAt(index)}
                      >
                        Quitar
                      </Button>
                    </div>
                  </div>

                  {detailSection}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

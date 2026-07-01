import type { RefObject } from "react";
import type { PostSessionPickerController } from "../../hooks/usePostSessionPicker";
import type { SessionPickerItem } from "../../types/sessionPicker";
import { SESSION_PICKER_DATE_PRESETS } from "../../utils/sessionPickerDateRange";
import { formatSessionPerformedAt } from "../../utils/formatSessionDate";
import { groupSessionsForPicker } from "../../utils/sessionPickerGroups";
import { formatSessionPickerMetrics } from "../../utils/sessionPickerMetrics";
import { isSessionPickerItemLinked } from "../../utils/sessionPickerDateRange";

type SessionPickerFiltersProps = {
  picker: Pick<
    PostSessionPickerController,
    "query" | "setQuery" | "datePreset" | "setDatePreset" | "workoutId" | "setWorkoutId" | "routineOptions"
  >;
  searchRef?: RefObject<HTMLInputElement | null>;
};

export function SessionPickerFilters({ picker, searchRef }: SessionPickerFiltersProps) {
  return (
    <div className="grid gap-2">
      <input
        ref={searchRef}
        type="search"
        value={picker.query}
        onChange={(e) => picker.setQuery(e.target.value)}
        placeholder="Buscar rutina, ejercicio o nota…"
        className="goi-field w-full rounded-xl border-neutral-700/90 bg-black/55 px-3 py-2.5 text-sm light:border-zinc-300 light:bg-white"
        aria-label="Buscar sesión"
      />
      <div className="flex flex-wrap gap-1.5">
        {SESSION_PICKER_DATE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => picker.setDatePreset(preset.id)}
            className={[
              "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
              picker.datePreset === preset.id
                ? "border-goi-gold/45 bg-goi-gold/12 text-goi-gold"
                : "border-neutral-700 text-neutral-400 hover:border-neutral-500 light:border-zinc-300 light:text-zinc-600",
            ].join(" ")}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {picker.routineOptions.length > 1 ? (
        <select
          className="goi-field rounded-xl border-neutral-700/90 bg-black/55 px-3 py-2 text-sm light:border-zinc-300 light:bg-white"
          value={picker.workoutId}
          onChange={(e) => picker.setWorkoutId(e.target.value)}
          aria-label="Filtrar por rutina"
        >
          <option value="">Todas las rutinas</option>
          {picker.routineOptions.map((routine) => (
            <option key={routine.workoutId} value={routine.workoutId}>
              {routine.workoutTitle} ({routine.sessionCount})
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}

type SessionPickerListProps = {
  sessions: SessionPickerItem[];
  selectedSessionId: string;
  suggestedSessionId?: string | null;
  showUnlink?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSelect: (sessionId: string) => void;
  onSelectUnlink?: () => void;
  hideUnlinkWhenSearching?: boolean;
};

export function SessionPickerList({
  sessions,
  selectedSessionId,
  suggestedSessionId = null,
  showUnlink = true,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  onSelect,
  onSelectUnlink,
  hideUnlinkWhenSearching = false,
}: SessionPickerListProps) {
  const groups = groupSessionsForPicker(sessions, {
    suggestedSessionId:
      suggestedSessionId && !isSessionPickerItemLinked(sessions.find((s) => s.id === suggestedSessionId))
        ? suggestedSessionId
        : null,
  });

  return (
    <ul className="grid list-none gap-4 p-0 pb-3">
      {showUnlink && !hideUnlinkWhenSearching ? (
        <li>
          <button
            type="button"
            className={[
              "flex w-full flex-col items-start gap-0.5 rounded-xl border px-3 py-3 text-left transition hover:bg-goi-gold/5",
              !selectedSessionId
                ? "border-goi-gold/40 bg-goi-gold/10"
                : "border-neutral-700/80 light:border-zinc-300",
            ].join(" ")}
            onClick={() => onSelectUnlink?.()}
          >
            <span className="font-semibold text-neutral-100 light:text-zinc-900">Sin sesión vinculada</span>
            <span className="text-xs text-neutral-500">Solo texto o fotos</span>
          </button>
        </li>
      ) : null}
      {groups.map((group) => (
        <li key={group.label}>
          <p className="mb-2 px-0.5 text-[11px] font-bold uppercase tracking-wide text-neutral-500">{group.label}</p>
          <ul className="grid list-none gap-2 p-0">
            {group.sessions.map((session) => {
              const linked = isSessionPickerItemLinked(session);
              const selected = selectedSessionId === session.id;
              const isSuggested =
                suggestedSessionId === session.id && group.label === "Recomendado" && !selected && !linked;
              const metrics = formatSessionPickerMetrics(session);
              const dateLabel = formatSessionPerformedAt(session.performedAt);
              return (
                <li key={session.id}>
                  <button
                    type="button"
                    disabled={linked}
                    className={[
                      "flex w-full flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition",
                      linked
                        ? "cursor-not-allowed border-neutral-800/60 bg-neutral-950/40 opacity-60 light:border-zinc-200 light:bg-zinc-100"
                        : selected
                          ? "border-goi-gold/45 bg-goi-gold/10 hover:bg-goi-gold/5"
                          : "border-neutral-700/80 hover:bg-goi-gold/5 light:border-zinc-300",
                    ].join(" ")}
                    onClick={() => {
                      if (!linked) onSelect(session.id);
                    }}
                  >
                    <div className="flex w-full items-center gap-2">
                      <span className="min-w-0 flex-1 truncate font-semibold text-neutral-100 light:text-zinc-900">
                        {session.workoutTitle}
                      </span>
                      {linked ? (
                        <span className="shrink-0 rounded-md border border-neutral-600/80 bg-neutral-900/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-neutral-400">
                          Publicada
                        </span>
                      ) : null}
                      {isSuggested ? (
                        <span className="shrink-0 rounded-md border border-goi-gold/35 bg-goi-gold/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-goi-gold">
                          Reciente
                        </span>
                      ) : null}
                      {selected ? (
                        <span className="shrink-0 text-sm font-bold text-goi-gold" aria-hidden>
                          ✓
                        </span>
                      ) : null}
                    </div>
                    <span className="text-xs text-neutral-500">
                      {dateLabel ? `Sesión · ${dateLabel}` : "Sesión realizada"}
                      {linked ? " · Ya compartida en el feed" : ""}
                    </span>
                    {metrics ? (
                      <span className="line-clamp-2 text-xs leading-relaxed text-neutral-400 light:text-zinc-600">
                        {metrics}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
      {hasMore ? (
        <li className="pt-1">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => onLoadMore?.()}
            className="w-full rounded-xl border border-neutral-700/80 py-2.5 text-sm font-semibold text-neutral-300 hover:border-goi-gold/40 hover:text-goi-gold light:border-zinc-300 light:text-zinc-700"
          >
            {loadingMore ? "Cargando…" : "Cargar más sesiones"}
          </button>
        </li>
      ) : null}
    </ul>
  );
}

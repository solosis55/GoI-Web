const STAT_SLOTS = [
  { key: "pr", label: "Récord (PR)", hint: "—" },
  { key: "vol", label: "Volumen 30 d", hint: "—" },
  { key: "freq", label: "Sesiones", hint: "—" },
] as const;

export function ExerciseDetailStatsPlaceholder() {
  return (
    <div className="rounded-xl border border-dashed border-neutral-700/55 bg-neutral-950/35 p-4 light:border-zinc-300 light:bg-zinc-50/80">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 light:text-zinc-600">
        Estadísticas
      </p>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500 light:text-zinc-600">
        Próximamente: récords personales, volumen y frecuencia con este movimiento.
      </p>
      <ul className="mt-3 grid list-none grid-cols-3 gap-2 p-0">
        {STAT_SLOTS.map((slot) => (
          <li
            key={slot.key}
            className="rounded-lg border border-neutral-800/50 bg-neutral-900/40 px-2 py-2.5 text-center light:border-zinc-200 light:bg-white"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 light:text-zinc-500">
              {slot.label}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-neutral-600 light:text-zinc-400">{slot.hint}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

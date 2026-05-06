type FeedModeTabsProps = {
  mode: "all" | "following";
  onChangeMode: (mode: "all" | "following") => void;
  /** Pills and spacing tuned for compact strips (e. g. historias). */
  compact?: boolean;
};

export function FeedModeTabs({ mode, onChangeMode, compact }: FeedModeTabsProps) {
  const shell = compact ? "p-0.5 gap-0.5 max-w-full" : "p-1 gap-1";
  const seg = compact ? "px-2.5 py-1 text-xs min-w-0 flex-1 sm:flex-none" : "px-4 py-1.5 text-sm";
  return (
    <div
      className={[
        "inline-flex w-full max-w-xs rounded-lg border border-neutral-800 bg-neutral-950/90 shadow-inner shadow-black/30 sm:w-auto sm:max-w-none",
        shell,
      ].join(" ")}
      role="tablist"
      aria-label="Modo del feed"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === "all"}
        className={[
          "rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/35",
          seg,
          mode === "all"
            ? "bg-neutral-800 text-goi-gold shadow-sm"
            : "text-neutral-500 hover:bg-neutral-900/80 hover:text-neutral-200",
        ].join(" ")}
        onClick={() => onChangeMode("all")}
      >
        Todos
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "following"}
        className={[
          "rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/35",
          seg,
          mode === "following"
            ? "bg-neutral-800 text-goi-gold shadow-sm"
            : "text-neutral-500 hover:bg-neutral-900/80 hover:text-neutral-200",
        ].join(" ")}
        onClick={() => onChangeMode("following")}
      >
        Seguidos
      </button>
    </div>
  );
}

import type { PostFormat } from "../../constants/postFormat";

type CreatePostFormatSegmentProps = {
  value: PostFormat;
  onChange: (format: PostFormat) => void;
  compact?: boolean;
};

export function CreatePostFormatSegment({ value, onChange, compact = false }: CreatePostFormatSegmentProps) {
  const tabClass = (active: boolean) =>
    [
      "inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition",
      active
        ? "border-goi-gold/50 bg-goi-gold/15 text-goi-gold"
        : "border-neutral-700 bg-neutral-900/50 text-neutral-400 hover:border-neutral-600 light:border-zinc-300 light:bg-zinc-100 light:text-zinc-600",
    ].join(" ");

  return (
    <div
      className={[
        "flex gap-2",
        compact ? "" : "rounded-xl border border-neutral-800/85 bg-black/25 p-1.5 light:border-zinc-200 light:bg-zinc-50",
      ].join(" ")}
      role="tablist"
      aria-label="Formato de publicación"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "standard"}
        className={tabClass(value === "standard")}
        onClick={() => onChange("standard")}
      >
        Publicación
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "training"}
        className={tabClass(value === "training")}
        onClick={() => onChange("training")}
      >
        Training
      </button>
    </div>
  );
}

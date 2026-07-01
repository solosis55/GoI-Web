import type { PostFormat } from "../../../constants/postFormat";
import { POST_BODY_MIN } from "../../../constants/createPost";
import type { PostVisibility } from "../../../constants/createPost";

type CreatePostRequirementChipsProps = {
  format: PostFormat;
  imageCount: number;
  charCount: number;
  hasSession: boolean;
  visibility: PostVisibility;
  onPressPhoto?: () => void;
  onPressText?: () => void;
  onPressSession?: () => void;
  onPressVisibility?: () => void;
};

type ChipDef = {
  key: string;
  label: string;
  done: boolean;
  warn?: boolean;
  onPress?: () => void;
};

function visibilityChipLabel(visibility: PostVisibility): string {
  if (visibility === "followers") return "Seguidores";
  if (visibility === "private") return "Solo yo";
  return "Público";
}

function ChipIcon({ done, warn }: { done: boolean; warn?: boolean }) {
  if (done) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" className="size-3 shrink-0" aria-hidden>
        <path
          d="M2.5 6.2 4.8 8.5 9.5 3.5"
          stroke="rgb(134,239,172)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }
  return (
    <span
      className={[
        "size-2 shrink-0 rounded-full",
        warn ? "bg-goi-gold" : "bg-red-400/90",
      ].join(" ")}
      aria-hidden
    />
  );
}

export function CreatePostRequirementChips({
  format,
  imageCount,
  charCount,
  hasSession,
  visibility,
  onPressPhoto,
  onPressText,
  onPressSession,
  onPressVisibility,
}: CreatePostRequirementChipsProps) {
  const hasPhoto = imageCount > 0;
  const hasText = charCount >= POST_BODY_MIN;

  const chips: ChipDef[] =
    format === "standard"
      ? [
          { key: "photo", label: "Foto", done: hasPhoto, onPress: onPressPhoto },
          {
            key: "text",
            label: "Texto",
            done: hasText || hasPhoto,
            warn: !hasText && hasPhoto,
            onPress: onPressText,
          },
          {
            key: "vis",
            label: visibilityChipLabel(visibility),
            done: true,
            onPress: onPressVisibility,
          },
        ]
      : [
          { key: "session", label: "Sesión", done: hasSession, onPress: onPressSession },
          {
            key: "text",
            label: "Texto",
            done: hasText || hasPhoto,
            warn: !hasText && !hasPhoto,
            onPress: onPressText,
          },
          {
            key: "photo",
            label: imageCount > 0 ? `Foto · ${imageCount}` : "Foto opc.",
            done: hasPhoto,
            warn: !hasPhoto,
            onPress: onPressPhoto,
          },
        ];

  return (
    <div className="shrink-0 overflow-x-auto px-3 pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-4 [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max min-w-full gap-2">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            disabled={!chip.onPress}
            onClick={chip.onPress}
            className={[
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition",
              chip.done
                ? "border-emerald-500/35 bg-emerald-950/40 text-emerald-300 light:border-emerald-400/50 light:bg-emerald-50 light:text-emerald-800"
                : chip.warn
                  ? "border-goi-gold/40 bg-goi-gold/10 text-goi-gold-dim"
                  : "border-red-400/35 bg-red-950/35 text-red-300 light:border-red-300 light:bg-red-50 light:text-red-800",
              chip.onPress ? "hover:brightness-110" : "cursor-default",
            ].join(" ")}
          >
            <ChipIcon done={chip.done} warn={chip.warn} />
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}

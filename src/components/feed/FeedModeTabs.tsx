import { Button } from "../ui/Button";

type FeedModeTabsProps = {
  mode: "all" | "following";
  onChangeMode: (mode: "all" | "following") => void;
  /** Pills and spacing tuned for compact strips (e.g. historias). */
  compact?: boolean;
};

export function FeedModeTabs({ mode, onChangeMode, compact }: FeedModeTabsProps) {
  const btn = compact ? "!px-2 !py-1 text-xs" : "";
  return (
    <div className={["actions flex flex-wrap justify-center", compact ? "gap-1.5" : "gap-2"].join(" ")}>
      <Button
        type="button"
        className={btn}
        variant={mode === "all" ? "navActive" : "secondary"}
        onClick={() => onChangeMode("all")}
      >
        Todos
      </Button>
      <Button
        type="button"
        className={btn}
        variant={mode === "following" ? "navActive" : "secondary"}
        onClick={() => onChangeMode("following")}
      >
        Seguidos
      </Button>
    </div>
  );
}

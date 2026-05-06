import { useCallback, useEffect, useRef, useState } from "react";
import type { MentionPickUser } from "../../utils/mentionAutocomplete";
import { filterMentionCandidates, getActiveMention } from "../../utils/mentionAutocomplete";

export function MentionableTextarea({
  value,
  onChange,
  candidates,
  rows = 2,
  maxLength,
  className = "goi-field min-h-[2.75rem] w-full resize-y py-2 text-sm",
  placeholder,
  /** Si no hay lista @ abierta: Enter (sin Shift) llama a esto. */
  onEnterSubmit,
  listPlacement = "above",
  required,
}: {
  value: string;
  onChange: (next: string) => void;
  candidates: MentionPickUser[];
  rows?: number;
  maxLength?: number;
  className?: string;
  placeholder?: string;
  onEnterSubmit?: () => void;
  /** Desplegable arriba (comentarios) o abajo (crear post). */
  listPlacement?: "above" | "below";
  required?: boolean;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [caretPos, setCaretPos] = useState(0);

  const mentionState = getActiveMention(value, caretPos);
  const filtered = filterMentionCandidates(candidates, mentionState?.query ?? "");
  const showList = filtered.length > 0 && mentionState !== null;
  const [highlightIdx, setHighlightIdx] = useState(0);

  useEffect(() => {
    if (!showList) {
      setHighlightIdx(0);
      return;
    }
    setHighlightIdx((idx) => Math.min(idx, Math.max(0, filtered.length - 1)));
  }, [showList, filtered.length]);

  const syncCaret = useCallback(() => {
    const el = areaRef.current;
    setCaretPos(el?.selectionStart ?? value.length);
  }, [value.length]);

  const insertMention = useCallback(
    (username: string) => {
      const el = areaRef.current;
      if (!el || !mentionState) return;
      const { triggerIndex } = mentionState;
      const caret = el.selectionStart ?? value.length;
      const before = value.slice(0, triggerIndex);
      const tail = value.slice(caret);
      const insert = `@${username} `;
      const next = `${before}${insert}${tail}`;
      onChange(next);
      const pos = triggerIndex + insert.length;
      queueMicrotask(() => {
        el.focus();
        el.setSelectionRange(pos, pos);
        setCaretPos(pos);
      });
    },
    [value, mentionState, onChange],
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (showList) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIdx((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIdx((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const pick = filtered[highlightIdx];
        if (pick) insertMention(pick.username);
        return;
      }
      if (e.key === "Tab" && filtered[highlightIdx]) {
        e.preventDefault();
        insertMention(filtered[highlightIdx]!.username);
      }
      return;
    }

    if (e.key === "Enter" && !e.shiftKey && onEnterSubmit) {
      e.preventDefault();
      onEnterSubmit();
    }
  }

  const listClass =
    listPlacement === "above"
      ? "absolute bottom-full left-0 right-0 z-20 mb-1"
      : "absolute left-0 right-0 top-full z-20 mt-1";

  return (
    <div className="relative w-full min-w-0">
      {showList ? (
        <ul
          role="listbox"
          className={`${listClass} max-h-40 overflow-auto rounded-lg border border-neutral-700 bg-zinc-950 py-1 text-sm shadow-xl ring-1 ring-goi-gold/15`}
        >
          {filtered.map((u, i) => (
            <li key={u.id} role="option" aria-selected={i === highlightIdx}>
              <button
                type="button"
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-800/90 ${
                  i === highlightIdx ? "bg-neutral-800/80 text-goi-gold" : "text-neutral-200"
                }`}
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  insertMention(u.username);
                }}
              >
                <span className="truncate font-medium">@{u.username}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <textarea
        ref={areaRef}
        className={className}
        rows={rows}
        required={required}
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        onChange={(ev) => {
          onChange(ev.target.value);
          setCaretPos(ev.target.selectionStart ?? 0);
        }}
        onSelect={syncCaret}
        onClick={syncCaret}
        onKeyUp={syncCaret}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

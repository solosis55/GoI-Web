import type { ReactNode } from "react";
import type { MentionPickUser } from "./mentionAutocomplete";

/** Coincide con usernames típicos (3–24 caracteres tras @). No valida unicidad hasta comparar con el directorio. */
const MENTION_TOKEN = /@([a-zA-Z][a-zA-Z0-9_]{2,23})\b/g;

export type MentionUserDirectory = Map<string, string>;

export function buildMentionDirectory(candidates: readonly MentionPickUser[]): MentionUserDirectory {
  const m: MentionUserDirectory = new Map();
  for (const c of candidates) {
    m.set(c.username.toLowerCase(), c.id);
  }
  return m;
}

export function MentionHighlighted({
  text,
  userDirectory,
  onOpenProfile,
  className = "",
}: {
  text: string;
  userDirectory: MentionUserDirectory;
  onOpenProfile?: (userId: string) => void;
  /** Clases para el párrafo contenedor (`whitespace-pre-wrap`, etc.). */
  className?: string;
}) {
  if (!text) return null;

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(MENTION_TOKEN.source, MENTION_TOKEN.flags);
  while ((m = re.exec(text)) !== null) {
    const [full, username] = m;
    const start = m.index;
    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }
    const key = username.toLowerCase();
    const userId = userDirectory.get(key);
    if (userId && onOpenProfile) {
      nodes.push(
        <button
          key={`${start}-${username}`}
          type="button"
          onClick={() => onOpenProfile(userId)}
          className="font-semibold text-goi-gold/95 underline-offset-4 hover:text-goi-gold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/40"
        >
          {full}
        </button>,
      );
    } else {
      nodes.push(<span key={`${start}-${username}`}>{full}</span>);
    }
    lastIndex = start + full.length;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return <span className={className}>{nodes}</span>;
}

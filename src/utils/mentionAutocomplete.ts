export type MentionPickUser = { id: string; username: string };

export function getActiveMention(value: string, caret: number): { triggerIndex: number; query: string } | null {
  const slice = value.slice(0, caret);
  const lastAt = slice.lastIndexOf("@");
  if (lastAt < 0) return null;
  if (lastAt > 0 && !/\s/.test(slice.charAt(lastAt - 1) ?? "")) return null;
  const afterAt = slice.slice(lastAt + 1);
  if (afterAt.includes("\n")) return null;
  const segment = (afterAt.split(/\s/)[0] ?? "").slice(0, 24);
  if (!/^[\w]*$/i.test(segment)) return null;
  return { triggerIndex: lastAt, query: segment };
}

export function filterMentionCandidates(
  candidates: MentionPickUser[],
  rawQuery: string,
  opts?: { max?: number },
): MentionPickUser[] {
  const max = opts?.max ?? 8;
  const q = rawQuery.toLowerCase();
  const uniq = new Map<string, MentionPickUser>();
  for (const c of candidates) {
    uniq.set(c.id, c);
  }
  const list = [...uniq.values()].sort((a, b) => a.username.localeCompare(b.username));
  if (!q) return list.slice(0, max);
  return list.filter((c) => c.username.toLowerCase().startsWith(q)).slice(0, max);
}

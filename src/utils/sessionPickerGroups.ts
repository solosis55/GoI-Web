import type { SessionPickerItem } from "../types/sessionPicker";

export type SessionPickerGroup = {
  label: string;
  sessions: SessionPickerItem[];
};

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayOffsetFromToday(performedAt: string, now: Date): number | null {
  const d = new Date(performedAt);
  if (!Number.isFinite(d.getTime())) return null;
  const diff = startOfLocalDay(now) - startOfLocalDay(d);
  return Math.round(diff / 86_400_000);
}

/** Agrupa sesiones: Recomendado (opcional) · Hoy · Ayer · Esta semana · Anterior. */
export function groupSessionsForPicker(
  sessions: SessionPickerItem[],
  options?: { suggestedSessionId?: string | null },
): SessionPickerGroup[] {
  const now = new Date();
  const suggestedId = options?.suggestedSessionId ?? null;
  const suggested = suggestedId ? sessions.find((s) => s.id === suggestedId) : null;
  const rest = suggested ? sessions.filter((s) => s.id !== suggested.id) : sessions;

  const buckets: Record<string, SessionPickerItem[]> = {
    Hoy: [],
    Ayer: [],
    "Esta semana": [],
    Anterior: [],
  };

  for (const session of rest) {
    const offset = dayOffsetFromToday(session.performedAt, now);
    if (offset === 0) buckets.Hoy.push(session);
    else if (offset === 1) buckets.Ayer.push(session);
    else if (offset != null && offset >= 2 && offset <= 7) buckets["Esta semana"].push(session);
    else buckets.Anterior.push(session);
  }

  const groups: SessionPickerGroup[] = [];
  if (suggested) {
    groups.push({ label: "Recomendado", sessions: [suggested] });
  }
  for (const label of ["Hoy", "Ayer", "Esta semana", "Anterior"] as const) {
    if (buckets[label].length > 0) {
      groups.push({ label, sessions: buckets[label] });
    }
  }
  return groups;
}

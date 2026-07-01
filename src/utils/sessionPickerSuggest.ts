import type { SessionPickerItem } from "../types/sessionPicker";

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function isToday(performedAt: string, now = new Date()): boolean {
  const d = new Date(performedAt);
  if (!Number.isFinite(d.getTime())) return false;
  return startOfLocalDay(d) === startOfLocalDay(now);
}

export function isSessionPickerAvailable(session: SessionPickerItem): boolean {
  return !session.linkedPostId;
}

/** Primera sesión disponible de hoy (más reciente primero en la lista). */
export function findTodayAvailableSession(sessions: SessionPickerItem[]): SessionPickerItem | null {
  const now = new Date();
  return sessions.find((s) => isSessionPickerAvailable(s) && isToday(s.performedAt, now)) ?? null;
}

/** Sugiere sesión: prioriza hoy sin publicar, luego la más reciente disponible. */
export function pickSuggestedSessionId(sessions: SessionPickerItem[]): string | null {
  const available = sessions.filter(isSessionPickerAvailable);
  if (available.length === 0) return null;
  const today = findTodayAvailableSession(available);
  return today?.id ?? available[0]?.id ?? null;
}

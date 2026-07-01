import type { SessionPickerDatePreset } from "../types/sessionPicker";

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** Convierte preset de fecha a rango ISO para la API del picker. */
export function dateRangeForSessionPickerPreset(
  preset: SessionPickerDatePreset,
  now = new Date(),
): { from?: string; to?: string } {
  if (preset === "all") return {};

  const todayStart = startOfDay(now);

  if (preset === "today") {
    return { from: todayStart.toISOString(), to: endOfDay(now).toISOString() };
  }

  if (preset === "yesterday") {
    const y = new Date(todayStart);
    y.setDate(y.getDate() - 1);
    return { from: y.toISOString(), to: endOfDay(y).toISOString() };
  }

  if (preset === "week") {
    const from = new Date(todayStart);
    from.setDate(from.getDate() - 6);
    return { from: from.toISOString(), to: endOfDay(now).toISOString() };
  }

  if (preset === "month") {
    const from = new Date(todayStart);
    from.setDate(from.getDate() - 29);
    return { from: from.toISOString(), to: endOfDay(now).toISOString() };
  }

  return {};
}

export const SESSION_PICKER_DATE_PRESETS: { id: SessionPickerDatePreset; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "today", label: "Hoy" },
  { id: "yesterday", label: "Ayer" },
  { id: "week", label: "7 días" },
  { id: "month", label: "30 días" },
];

export function isSessionPickerItemLinked(session?: { linkedPostId?: string | null } | null): boolean {
  return Boolean(session?.linkedPostId);
}

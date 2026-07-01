import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getWorkoutSessionsPicker } from "../api/workoutSessionsApi";
import { useDebouncedValue } from "./useDebouncedValue";
import type {
  SessionPickerDatePreset,
  SessionPickerItem,
  SessionPickerRoutineOption,
} from "../types/sessionPicker";
import { dateRangeForSessionPickerPreset } from "../utils/sessionPickerDateRange";
import { findTodayAvailableSession, pickSuggestedSessionId } from "../utils/sessionPickerSuggest";

export function usePostSessionPicker(userId: string | undefined) {
  const [sessions, setSessions] = useState<SessionPickerItem[]>([]);
  const [routineOptions, setRoutineOptions] = useState<SessionPickerRoutineOption[]>([]);
  const [query, setQuery] = useState("");
  const [datePreset, setDatePreset] = useState<SessionPickerDatePreset>("all");
  const [workoutId, setWorkoutId] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const nextCursorRef = useRef<string | null>(null);

  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);

  const fetchPage = useCallback(
    async (reset: boolean) => {
      if (!userId) {
        setSessions([]);
        setRoutineOptions([]);
        setNextCursor(null);
        nextCursorRef.current = null;
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const range = dateRangeForSessionPickerPreset(datePreset);
        const page = await getWorkoutSessionsPicker({
          q: debouncedQuery,
          workoutId: workoutId || undefined,
          from: range.from,
          to: range.to,
          cursor: reset ? undefined : nextCursorRef.current ?? undefined,
          limit: 25,
          includeLinked: true,
        });

        setSessions((prev) => (reset ? page.sessions : [...prev, ...page.sessions]));
        if (reset) setRoutineOptions(page.routineOptions);
        setNextCursor(page.nextCursor);
        nextCursorRef.current = page.nextCursor;
        setHasMore(page.hasMore);
      } catch {
        if (reset) {
          setSessions([]);
          setRoutineOptions([]);
        }
        setNextCursor(null);
        nextCursorRef.current = null;
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [userId, debouncedQuery, datePreset, workoutId],
  );

  const refresh = useCallback(() => fetchPage(true), [fetchPage]);

  useEffect(() => {
    void fetchPage(true);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore || !nextCursorRef.current) return;
    void fetchPage(false);
  }, [loading, loadingMore, hasMore, fetchPage]);

  const linkedSessionIds = useMemo(
    () => new Set(sessions.filter((s) => s.linkedPostId).map((s) => s.id)),
    [sessions],
  );

  const available = useMemo(
    () => sessions.filter((s) => !s.linkedPostId),
    [sessions],
  );

  const getSession = useCallback(
    (id: string | null) => (id ? sessions.find((s) => s.id === id) ?? null : null),
    [sessions],
  );

  const resolveAvailable = useCallback(
    (selectedSessionId: string | null) => {
      if (!selectedSessionId) return available;
      const current = getSession(selectedSessionId);
      if (!current) return available;
      if (available.some((s) => s.id === current.id)) return available;
      return [current, ...available];
    },
    [available, getSession],
  );

  const suggestedSessionId = useMemo(() => pickSuggestedSessionId(sessions), [sessions]);

  const todayAvailableSession = useMemo(() => findTodayAvailableSession(sessions), [sessions]);

  const linkTodaySession = useCallback(async (): Promise<SessionPickerItem | null> => {
    if (!userId) return null;
    const cached = findTodayAvailableSession(sessions);
    if (cached) return cached;
    try {
      const range = dateRangeForSessionPickerPreset("today");
      const page = await getWorkoutSessionsPicker({
        from: range.from,
        to: range.to,
        limit: 10,
        includeLinked: true,
      });
      return findTodayAvailableSession(page.sessions);
    } catch {
      return null;
    }
  }, [userId, sessions]);

  return {
    sessions,
    available,
    linkedSessionIds,
    loading,
    loadingMore,
    hasMore,
    query,
    setQuery,
    datePreset,
    setDatePreset,
    workoutId,
    setWorkoutId,
    routineOptions,
    refresh,
    loadMore,
    getSession,
    resolveAvailable,
    suggestedSessionId,
    todayAvailableSession,
    linkTodaySession,
  };
}

export type PostSessionPickerController = ReturnType<typeof usePostSessionPicker>;

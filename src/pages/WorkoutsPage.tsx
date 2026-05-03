import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createWorkout, deleteWorkout, getWorkouts, updateWorkout } from "../api/workoutsApi";
import {
  createWorkoutSession,
  deleteWorkoutSession,
  getWorkoutSessions,
} from "../api/workoutSessionsApi";
import { WorkoutForm } from "../components/workouts/WorkoutForm";
import { WorkoutItem } from "../components/workouts/WorkoutItem";
import { WorkoutSessionsPanel } from "../components/workouts/WorkoutSessionsPanel";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { StatusMessage } from "../components/ui/StatusMessage";
import { useAuth } from "../context/AuthContext";
import type { Workout } from "../types/workout";
import type { WorkoutSessionWithTitle } from "../types/workoutSession";
import { getErrorMessage } from "../utils/errorMessages";

const TITLE_MAX = 80;
const DUPLICATE_SUFFIX = " (copia)";

function toDatetimeLocalValue(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Titulo derivado para `POST /workouts`, respeta el limite del backend. */
function titleForDuplicate(sourceTitle: string): string {
  const base = sourceTitle.trimEnd();
  if (base.length + DUPLICATE_SUFFIX.length <= TITLE_MAX) {
    return `${base}${DUPLICATE_SUFFIX}`;
  }
  const room = TITLE_MAX - DUPLICATE_SUFFIX.length;
  const prefix = base.slice(0, Math.max(3, room)).trimEnd();
  return `${prefix}${DUPLICATE_SUFFIX}`.slice(0, TITLE_MAX);
}

function normalizeNonEmptyLines(lines: string[]) {
  return lines.map((item) => item.trim()).filter(Boolean);
}

type SessionStats = { sessionCount: number; lastSessionPerformedAt: string | null };

type WorkoutSortKey = "recent_session" | "sessions_desc" | "created_desc" | "title_asc";

function computeSessionStatsByWorkoutId(sessions: WorkoutSessionWithTitle[]): Map<string, SessionStats> {
  const map = new Map<string, SessionStats>();
  for (const s of sessions) {
    const cur = map.get(s.workoutId) ?? { sessionCount: 0, lastSessionPerformedAt: null as string | null };
    cur.sessionCount += 1;
    if (
      !cur.lastSessionPerformedAt ||
      Date.parse(s.performedAt) > Date.parse(cur.lastSessionPerformedAt)
    ) {
      cur.lastSessionPerformedAt = s.performedAt;
    }
    map.set(s.workoutId, cur);
  }
  return map;
}

export function WorkoutsPage() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [sessions, setSessions] = useState<WorkoutSessionWithTitle[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [exercises, setExercises] = useState<string[]>([""]);
  const [tags, setTags] = useState<string[]>([""]);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editExercises, setEditExercises] = useState<string[]>([""]);
  const [editTags, setEditTags] = useState<string[]>([""]);
  const [tagFilter, setTagFilter] = useState("");
  const [titleQuery, setTitleQuery] = useState("");
  const [sortKey, setSortKey] = useState<WorkoutSortKey>("recent_session");
  const [sessionWorkoutId, setSessionWorkoutId] = useState("");
  const [sessionPerformedAt, setSessionPerformedAt] = useState(() => toDatetimeLocalValue());
  const [sessionNotes, setSessionNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const sessionStatsByWorkoutId = useMemo(() => computeSessionStatsByWorkoutId(sessions), [sessions]);

  const tagFilterOptions = useMemo(() => {
    const set = new Set<string>();
    for (const w of workouts) {
      for (const t of w.tags ?? []) {
        if (t) set.add(t);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [workouts]);

  const displayedWorkouts = useMemo(() => {
    let list = workouts;
    if (tagFilter) {
      const tagNeedle = tagFilter.toLowerCase();
      list = list.filter((w) => (w.tags ?? []).some((t) => t.toLowerCase() === tagNeedle));
    }
    const q = titleQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((w) => w.title.toLowerCase().includes(q));
    }
    const stats = sessionStatsByWorkoutId;
    const sorted = [...list].sort((a, b) => {
      if (sortKey === "title_asc") {
        return a.title.localeCompare(b.title, "es", { sensitivity: "base" });
      }
      if (sortKey === "created_desc") {
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      }
      if (sortKey === "sessions_desc") {
        const ca = stats.get(a.id)?.sessionCount ?? 0;
        const cb = stats.get(b.id)?.sessionCount ?? 0;
        if (cb !== ca) return cb - ca;
        return a.title.localeCompare(b.title, "es", { sensitivity: "base" });
      }
      /* recent_session */
      const ta = stats.get(a.id)?.lastSessionPerformedAt;
      const tb = stats.get(b.id)?.lastSessionPerformedAt;
      if (!ta && !tb) return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      if (!ta) return 1;
      if (!tb) return -1;
      const diff = Date.parse(tb) - Date.parse(ta);
      if (diff !== 0) return diff;
      return a.title.localeCompare(b.title, "es", { sensitivity: "base" });
    });
    return sorted;
  }, [workouts, tagFilter, titleQuery, sortKey, sessionStatsByWorkoutId]);

  async function loadData() {
    if (!user) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const [allWorkouts, sessionList] = await Promise.all([getWorkouts(), getWorkoutSessions()]);
      const ownWorkouts = allWorkouts.filter((workout) => workout.userId === user.id);
      setWorkouts(ownWorkouts);
      setSessions(sessionList);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "No se pudo cargar datos de entrenamientos"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [user?.id]);

  useEffect(() => {
    if (sessionWorkoutId && !workouts.some((w) => w.id === sessionWorkoutId)) {
      setSessionWorkoutId("");
    }
  }, [workouts, sessionWorkoutId]);

  async function handleCreateWorkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setError("");
    setMessage("");

    if (title.trim().length < 3) {
      setError("El titulo debe tener al menos 3 caracteres");
      return;
    }
    if (description.length > 280) {
      setError("La descripcion no puede superar 280 caracteres");
      return;
    }

    const exerciseList = normalizeNonEmptyLines(exercises);
    const tagList = normalizeNonEmptyLines(tags);

    try {
      await createWorkout({
        title,
        description,
        exercises: exerciseList,
        tags: tagList,
      });
      setTitle("");
      setDescription("");
      setExercises([""]);
      setTags([""]);
      await loadData();
      setMessage("Entrenamiento creado");
    } catch (createError) {
      setError(getErrorMessage(createError, "No se pudo crear el entrenamiento"));
    }
  }

  async function handleDuplicateWorkout(workout: Workout) {
    if (!user) return;
    setError("");
    setMessage("");

    const newTitle = titleForDuplicate(workout.title);
    if (newTitle.trim().length < 3) {
      setError("No se pudo generar un titulo valido para la copia");
      return;
    }

    try {
      await createWorkout({
        title: newTitle,
        description: workout.description,
        exercises: [...workout.exercises],
        tags: [...(workout.tags ?? [])],
      });
      await loadData();
      setMessage("Entrenamiento duplicado");
    } catch (dupError) {
      setError(getErrorMessage(dupError, "No se pudo duplicar el entrenamiento"));
    }
  }

  async function handleDeleteWorkout(id: string) {
    if (!window.confirm("Seguro que quieres eliminar este entrenamiento?")) return;
    setError("");
    setMessage("");
    try {
      await deleteWorkout(id);
      await loadData();
      setMessage("Entrenamiento eliminado");
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "No se pudo eliminar"));
    }
  }

  function startEditingWorkout(workout: Workout) {
    setEditingWorkoutId(workout.id);
    setEditTitle(workout.title);
    setEditDescription(workout.description);
    setEditExercises(workout.exercises.length > 0 ? [...workout.exercises] : [""]);
    setEditTags((workout.tags ?? []).length > 0 ? [...(workout.tags ?? [])] : [""]);
    setError("");
  }

  function cancelEditingWorkout() {
    setEditingWorkoutId(null);
    setEditTitle("");
    setEditDescription("");
    setEditExercises([""]);
    setEditTags([""]);
  }

  async function handleUpdateWorkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingWorkoutId) return;
    setError("");
    setMessage("");

    if (editTitle.trim().length < 3) {
      setError("El titulo debe tener al menos 3 caracteres");
      return;
    }
    if (editDescription.length > 280) {
      setError("La descripcion no puede superar 280 caracteres");
      return;
    }

    const exerciseList = normalizeNonEmptyLines(editExercises);
    const tagList = normalizeNonEmptyLines(editTags);

    try {
      await updateWorkout(editingWorkoutId, {
        title: editTitle,
        description: editDescription,
        exercises: exerciseList,
        tags: tagList,
      });
      cancelEditingWorkout();
      await loadData();
      setMessage("Entrenamiento actualizado");
    } catch (updateError) {
      setError(getErrorMessage(updateError, "No se pudo actualizar"));
    }
  }

  async function handleLogSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setError("");
    setMessage("");

    if (!sessionWorkoutId) {
      setError("Elige un entrenamiento para la sesion");
      return;
    }

    const performedIso = new Date(sessionPerformedAt).toISOString();
    if (!Number.isFinite(Date.parse(performedIso))) {
      setError("Fecha u hora no valida");
      return;
    }

    try {
      await createWorkoutSession({
        workoutId: sessionWorkoutId,
        performedAt: performedIso,
        notes: sessionNotes.trim(),
      });
      setSessionNotes("");
      setSessionPerformedAt(toDatetimeLocalValue());
      await loadData();
      setMessage("Sesion registrada");
    } catch (sessionError) {
      setError(getErrorMessage(sessionError, "No se pudo registrar la sesion"));
    }
  }

  async function handleDeleteSession(sessionId: string) {
    if (!window.confirm("Quitar esta entrada del historial?")) return;
    setError("");
    setMessage("");
    try {
      await deleteWorkoutSession(sessionId);
      await loadData();
      setMessage("Sesion eliminada del historial");
    } catch (delError) {
      setError(getErrorMessage(delError, "No se pudo eliminar la sesion"));
    }
  }

  function scrollToSessionForm() {
    queueMicrotask(() => {
      document.getElementById("registrar-sesion")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <section className="layout grid gap-4">
      <Card>
        <h2>Crear entrenamiento</h2>
        <WorkoutForm
          title={title}
          description={description}
          exercises={exercises}
          tags={tags}
          onChangeTitle={setTitle}
          onChangeDescription={setDescription}
          onChangeExercises={setExercises}
          onChangeTags={setTags}
          onSubmit={handleCreateWorkout}
          submitLabel="Guardar entrenamiento"
        />
      </Card>

      <Card>
        <h2>Mis entrenamientos</h2>
        <StatusMessage tone="dark" loading={loading} error={error} success={message} />
        {!loading && workouts.length === 0 && <EmptyState message="Aun no tienes entrenamientos." />}
        {!loading && workouts.length > 0 && displayedWorkouts.length === 0 && (
          <EmptyState className="mt-2" message="Ningun entreno coincide con la busqueda o la etiqueta." />
        )}

        {!loading && workouts.length > 0 ? (
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1.5 font-semibold">
              Buscar por titulo
              <input
                className="goi-field"
                type="search"
                value={titleQuery}
                onChange={(event) => setTitleQuery(event.target.value)}
                placeholder="Ej. pierna, press..."
                autoComplete="off"
              />
            </label>
            <div
              className={
                tagFilterOptions.length > 0 ? "grid gap-3 sm:grid-cols-2" : "grid max-w-md gap-3"
              }
            >
              {tagFilterOptions.length > 0 ? (
                <label className="grid gap-1.5 font-semibold">
                  Filtrar por etiqueta
                  <select
                    className="goi-field"
                    value={tagFilter}
                    onChange={(event) => setTagFilter(event.target.value)}
                  >
                    <option value="">Todas</option>
                    {tagFilterOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="grid gap-1.5 font-semibold">
                Ordenar lista
                <select
                  className="goi-field"
                  value={sortKey}
                  onChange={(event) => setSortKey(event.target.value as WorkoutSortKey)}
                >
                  <option value="recent_session">Ultima sesion (mas reciente primero)</option>
                  <option value="sessions_desc">Mas sesiones registradas</option>
                  <option value="created_desc">Plantilla creada mas reciente</option>
                  <option value="title_asc">Titulo A-Z</option>
                </select>
              </label>
            </div>
          </div>
        ) : null}

        <ul className="workouts-list mt-3 grid list-none gap-2.5 p-0">
          {displayedWorkouts.map((workout) => {
            const stats = sessionStatsByWorkoutId.get(workout.id);
            return (
            <WorkoutItem
              key={workout.id}
              workout={workout}
              sessionCount={stats?.sessionCount ?? 0}
              lastSessionPerformedAt={stats?.lastSessionPerformedAt ?? null}
              isEditing={editingWorkoutId === workout.id}
              editTitle={editTitle}
              editDescription={editDescription}
              editExercises={editExercises}
              editTags={editTags}
              onChangeEditTitle={setEditTitle}
              onChangeEditDescription={setEditDescription}
              onChangeEditExercises={setEditExercises}
              onChangeEditTags={setEditTags}
              onSubmitEdit={handleUpdateWorkout}
              onStartEdit={() => startEditingWorkout(workout)}
              onCancelEdit={cancelEditingWorkout}
              onDelete={() => handleDeleteWorkout(workout.id)}
              onDuplicate={() => handleDuplicateWorkout(workout)}
              onLogSession={() => {
                setSessionWorkoutId(workout.id);
                setSessionPerformedAt(toDatetimeLocalValue());
                scrollToSessionForm();
              }}
            />
            );
          })}
        </ul>
      </Card>

      <WorkoutSessionsPanel
        workouts={workouts}
        sessions={sessions}
        loading={loading}
        sessionWorkoutId={sessionWorkoutId}
        sessionPerformedAt={sessionPerformedAt}
        sessionNotes={sessionNotes}
        onChangeSessionWorkoutId={setSessionWorkoutId}
        onChangeSessionPerformedAt={setSessionPerformedAt}
        onChangeSessionNotes={setSessionNotes}
        onSubmitSession={handleLogSession}
        onDeleteSession={handleDeleteSession}
      />
    </section>
  );
}

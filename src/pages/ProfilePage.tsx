import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getProfile, updateProfile } from "../api/authApi";
import { getWorkoutSessions } from "../api/workoutSessionsApi";
import { ProfileForm } from "../components/profile/ProfileForm";
import { WorkoutSessionsHistory } from "../components/workouts/WorkoutSessionsHistory";
import { Card } from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import type { WorkoutSessionWithTitle } from "../types/workoutSession";
import { getErrorMessage } from "../utils/errorMessages";

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [goal, setGoal] = useState(user?.goal ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<WorkoutSessionWithTitle[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      setLoading(true);
      setError("");
      try {
        const response = await getProfile(user.id);
        setUsername(response.user.username);
        setBio(response.user.bio);
        setGoal(response.user.goal);
        setAvatarUrl(response.user.avatarUrl);
        updateUser(response.user);
      } catch (loadError) {
        setError(getErrorMessage(loadError, "No se pudo cargar el perfil"));
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadSessions() {
      setSessionsLoading(true);
      setSessionsError("");
      try {
        const list = await getWorkoutSessions();
        if (!cancelled) setSessions(list);
      } catch (loadError) {
        if (!cancelled) {
          setSessionsError(getErrorMessage(loadError, "No se pudieron cargar las sesiones"));
        }
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    }

    void loadSessions();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage("");
    setError("");

    if (username.trim().length < 3) {
      setLoading(false);
      setError("El usuario debe tener al menos 3 caracteres");
      return;
    }
    if (goal.length > 60) {
      setLoading(false);
      setError("El objetivo no puede superar 60 caracteres");
      return;
    }
    if (bio.length > 200) {
      setLoading(false);
      setError("La bio no puede superar 200 caracteres");
      return;
    }
    if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) {
      setLoading(false);
      setError("La foto debe empezar por http:// o https://");
      return;
    }

    try {
      const response = await updateProfile(user.id, {
        username: username.trim(),
        bio,
        goal,
        avatarUrl,
      });
      updateUser(response.user);
      setMessage("Perfil actualizado correctamente");
    } catch (submitError) {
      setError(getErrorMessage(submitError, "No se pudo actualizar el perfil"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="layout grid gap-4">
      <Card>
        <h2>Mi perfil</h2>
        <p className="mb-3 text-neutral-500">Configura tu identidad deportiva para la parte social</p>
        <ProfileForm
          username={username}
          goal={goal}
          avatarUrl={avatarUrl}
          bio={bio}
          loading={loading}
          error={error}
          message={message}
          onChangeUsername={setUsername}
          onChangeGoal={setGoal}
          onChangeAvatarUrl={setAvatarUrl}
          onChangeBio={setBio}
          onSubmit={handleSubmit}
        />
      </Card>

      {sessionsError ? <p className="m-0 text-sm text-red-400">{sessionsError}</p> : null}

      <WorkoutSessionsHistory
        title="Sesiones registradas"
        description="Lo que anotas en Entrenamientos aparece aqui. Para registrar nuevas sesiones o quitarlas del historial, usa la pestaña Entrenamientos."
        sessions={sessions}
        loading={sessionsLoading}
        emptyMessage="Aun no hay sesiones. Registralas en la pestaña Entrenamientos."
        showDelete={false}
      />
    </section>
  );
}

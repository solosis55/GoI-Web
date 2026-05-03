import type { FormEvent } from "react";
import { Button } from "../ui/Button";
import { StatusMessage } from "../ui/StatusMessage";

type ProfileFormProps = {
  username: string;
  goal: string;
  avatarUrl: string;
  bio: string;
  loading: boolean;
  error: string;
  message: string;
  onChangeUsername: (value: string) => void;
  onChangeGoal: (value: string) => void;
  onChangeAvatarUrl: (value: string) => void;
  onChangeBio: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ProfileForm({
  username,
  goal,
  avatarUrl,
  bio,
  loading,
  error,
  message,
  onChangeUsername,
  onChangeGoal,
  onChangeAvatarUrl,
  onChangeBio,
  onSubmit,
}: ProfileFormProps) {
  return (
    <form className="stack grid gap-3" onSubmit={onSubmit}>
      <label className="grid gap-1.5 font-semibold">
        Usuario
        <input
          className="goi-field"
          required
          value={username}
          onChange={(event) => onChangeUsername(event.target.value)}
        />
      </label>
      <label className="grid gap-1.5 font-semibold">
        Objetivo deportivo
        <input
          className="goi-field"
          value={goal}
          onChange={(event) => onChangeGoal(event.target.value)}
          placeholder="Ganar fuerza"
        />
      </label>
      <label className="grid gap-1.5 font-semibold">
        URL foto de perfil
        <input
          className="goi-field"
          value={avatarUrl}
          onChange={(event) => onChangeAvatarUrl(event.target.value)}
          placeholder="https://..."
        />
      </label>
      <label className="grid gap-1.5 font-semibold">
        Bio
        <textarea
          className="goi-field min-h-[80px]"
          value={bio}
          onChange={(event) => onChangeBio(event.target.value)}
          placeholder="Entreno 5 dias por semana..."
        />
      </label>

      <StatusMessage tone="dark" error={error} success={message} />

      <Button type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar perfil"}
      </Button>
    </form>
  );
}

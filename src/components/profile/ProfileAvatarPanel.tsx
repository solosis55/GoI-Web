import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { updateProfile } from "../../api/authApi";
import type { SafeUser } from "../../types/auth";
import { compressImageFileToDataUrlSafe } from "../../utils/postImages";
import { getErrorMessage } from "../../utils/errorMessages";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";

const DATA_OR_HTTP =
  /^(https?:\/\/|data:image\/(jpeg|jpg|png|webp);base64,)/i;

type ProfileAvatarPanelProps = {
  open: boolean;
  onClose: () => void;
  userId: string;
  avatarUrl: string;
  usernameTrimmed: string;
  usernameAlt: string;
  bio: string;
  goal: string;
  onSaved: (user: SafeUser) => void;
};

export function ProfileAvatarPanel({
  open,
  onClose,
  userId,
  avatarUrl,
  usernameTrimmed,
  usernameAlt,
  bio,
  goal,
  onSaved,
}: ProfileAvatarPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<string | undefined>(undefined);
  const [linkDraft, setLinkDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const displayUrl = staged !== undefined ? staged : avatarUrl;

  useEffect(() => {
    if (!open) return;
    setStaged(undefined);
    setLinkDraft("");
    setErr("");
  }, [open, avatarUrl]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function onPickFiles(files: FileList | null) {
    if (!files?.length) return;
    const file = [...files].find((f) => f.type.startsWith("image/"));
    if (!file) {
      setErr("Elige un archivo de imagen.");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const dataUrl = await compressImageFileToDataUrlSafe(file);
      setStaged(dataUrl);
    } catch {
      setErr("No se pudo leer la imagen.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSavePhoto(e?: FormEvent) {
    e?.preventDefault();
    setErr("");
    const nextAvatar = staged !== undefined ? staged : avatarUrl;

    if (nextAvatar && !DATA_OR_HTTP.test(nextAvatar)) {
      setErr("La foto debe ser un enlace https o una imagen del equipo.");
      return;
    }
    setBusy(true);
    try {
      const response = await updateProfile(userId, {
        username: usernameTrimmed,
        bio,
        goal,
        avatarUrl: nextAvatar,
      });
      onSaved(response.user);
      onClose();
    } catch (saveErr) {
      setErr(getErrorMessage(saveErr, "No se pudo guardar la foto"));
    } finally {
      setBusy(false);
    }
  }

  function applyLink() {
    const t = linkDraft.trim();
    if (!t) {
      setErr("Pega un enlace https o http.");
      return;
    }
    if (!/^https?:\/\//i.test(t)) {
      setErr("El enlace debe empezar por http:// o https://.");
      return;
    }
    setErr("");
    setStaged(t);
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-[2px]"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-panel-title"
        className="relative z-[1] w-full max-w-sm rounded-xl border border-neutral-700 bg-zinc-950 p-4 shadow-2xl shadow-black/50 ring-1 ring-goi-gold/20"
      >
        <div className="-mt-0.5 mb-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs text-neutral-400 transition hover:bg-neutral-800/80 hover:text-neutral-100"
          >
            Cerrar
          </button>
        </div>

        <h2 id="avatar-panel-title" className="mt-0 text-sm font-semibold text-neutral-100">
          Foto de perfil
        </h2>
        <p className="mb-3 text-xs text-neutral-500">
          Elige una imagen en este equipo (se comprime antes de guardar) o usa un enlace público.
        </p>

        <div className="mb-3 flex justify-center">
          <Avatar src={displayUrl || undefined} alt={usernameAlt} size={88} />
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          className="sr-only"
          onChange={(ev) => void onPickFiles(ev.target.files)}
        />

        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={busy} className="!py-2 !text-xs" onClick={() => fileRef.current?.click()}>
              Elegir del equipo
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={busy || !displayUrl}
              className="!py-2 !text-xs"
              onClick={() => setStaged("")}
            >
              Quitar foto
            </Button>
          </div>

          <div className="grid gap-1.5 rounded-lg border border-neutral-800/90 bg-black/40 p-2.5">
            <span className="text-[11px] font-medium text-neutral-500">O enlace a imagen</span>
            <div className="flex flex-wrap gap-2">
              <input
                className="goi-field min-w-[10rem] flex-1 py-2 text-xs"
                value={linkDraft}
                placeholder="https://…"
                onChange={(ev) => setLinkDraft(ev.target.value)}
              />
              <Button type="button" variant="secondary" className="shrink-0 !py-2 !text-xs" disabled={busy} onClick={() => applyLink()}>
                Usar enlace
              </Button>
            </div>
          </div>

          {err ? <p className="text-xs text-red-400">{err}</p> : null}

          <Button type="button" variant="primary" disabled={busy || usernameTrimmed.length < 3} onClick={() => void handleSavePhoto()}>
            {busy ? "Guardando…" : "Guardar foto"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

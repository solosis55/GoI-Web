import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { updateProfile, uploadProfileAvatarFile, uploadProfileBannerFile } from "../../api/authApi";
import type { SafeUser } from "../../types/auth";
import { compressImageFileToJpegFile } from "../../utils/postImages";
import { getErrorMessage } from "../../utils/errorMessages";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";

const DATA_OR_HTTP =
  /^(https?:\/\/|data:image\/(jpeg|jpg|png|webp);base64,)/i;

function isRenderableImageSrc(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  return (
    /^https?:\/\//i.test(u) ||
    /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(u) ||
    /^blob:/i.test(u)
  );
}

function revokeIfObjectUrl(url: string | undefined) {
  if (url && url.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
}

type ProfileAvatarPanelProps = {
  open: boolean;
  onClose: () => void;
  userId: string;
  avatarUrl: string;
  bannerUrl: string;
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
  bannerUrl,
  usernameTrimmed,
  usernameAlt,
  bio,
  goal,
  onSaved,
}: ProfileAvatarPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<string | undefined>(undefined);
  const [stagedBanner, setStagedBanner] = useState<string | undefined>(undefined);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);
  const [avatarPickedFile, setAvatarPickedFile] = useState<File | null>(null);
  const [bannerPickedFile, setBannerPickedFile] = useState<File | null>(null);
  const [linkDraft, setLinkDraft] = useState("");
  const [bannerLinkDraft, setBannerLinkDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const displayUrl = (avatarPreviewUrl ?? (staged !== undefined ? staged : avatarUrl)) || undefined;
  const displayBanner =
    bannerPreviewUrl ?? (stagedBanner !== undefined ? stagedBanner : bannerUrl);

  useEffect(() => {
    if (!open) return;
    setStaged(undefined);
    setStagedBanner(undefined);
    setAvatarPickedFile(null);
    setBannerPickedFile(null);
    setAvatarPreviewUrl((prev) => {
      revokeIfObjectUrl(prev ?? undefined);
      return null;
    });
    setBannerPreviewUrl((prev) => {
      revokeIfObjectUrl(prev ?? undefined);
      return null;
    });
    setLinkDraft("");
    setBannerLinkDraft("");
    setErr("");
  }, [open, avatarUrl, bannerUrl]);

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
      setStaged(undefined);
      setAvatarPickedFile(file);
      setAvatarPreviewUrl((prev) => {
        revokeIfObjectUrl(prev ?? undefined);
        return URL.createObjectURL(file);
      });
    } catch {
      setErr("No se pudo leer la imagen.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onPickBannerFiles(files: FileList | null) {
    if (!files?.length) return;
    const file = [...files].find((f) => f.type.startsWith("image/"));
    if (!file) {
      setErr("Elige un archivo de imagen para la cabecera.");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      setStagedBanner(undefined);
      setBannerPickedFile(file);
      setBannerPreviewUrl((prev) => {
        revokeIfObjectUrl(prev ?? undefined);
        return URL.createObjectURL(file);
      });
    } catch {
      setErr("No se pudo leer la imagen de cabecera.");
    } finally {
      setBusy(false);
      if (bannerFileRef.current) bannerFileRef.current.value = "";
    }
  }

  async function handleSavePhoto(e?: FormEvent) {
    e?.preventDefault();
    setErr("");
    let nextAvatar = avatarUrl;
    if (avatarPickedFile) {
      setBusy(true);
      try {
        const jpeg = await compressImageFileToJpegFile(avatarPickedFile, "avatar.jpg");
        nextAvatar = await uploadProfileAvatarFile(userId, jpeg);
      } catch (upErr) {
        setErr(getErrorMessage(upErr, "No se pudo subir la foto"));
        setBusy(false);
        return;
      } finally {
        setBusy(false);
      }
    } else if (staged !== undefined) {
      nextAvatar = staged;
    }

    let nextBanner = (stagedBanner !== undefined ? stagedBanner : bannerUrl).trim();
    if (bannerPickedFile) {
      setBusy(true);
      try {
        const jpeg = await compressImageFileToJpegFile(bannerPickedFile, "banner.jpg");
        nextBanner = await uploadProfileBannerFile(userId, jpeg);
      } catch (upErr) {
        setErr(getErrorMessage(upErr, "No se pudo subir la cabecera"));
        setBusy(false);
        return;
      } finally {
        setBusy(false);
      }
    }

    if (nextAvatar && !DATA_OR_HTTP.test(nextAvatar)) {
      setErr("La foto debe ser un enlace https o una imagen del equipo.");
      return;
    }
    const bannerOk =
      !nextBanner ||
      /^https?:\/\//i.test(nextBanner) ||
      /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(nextBanner);
    if (!bannerOk) {
      setErr("La cabecera debe ser https o una imagen (data URL) como la foto de perfil.");
      return;
    }

    setBusy(true);
    try {
      const response = await updateProfile(userId, {
        username: usernameTrimmed,
        bio,
        goal,
        avatarUrl: nextAvatar,
        bannerUrl: nextBanner,
      });
      onSaved(response.user);
      onClose();
    } catch (saveErr) {
      setErr(getErrorMessage(saveErr, "No se pudo guardar"));
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
    setAvatarPickedFile(null);
    setAvatarPreviewUrl((prev) => {
      revokeIfObjectUrl(prev ?? undefined);
      return null;
    });
  }

  function applyBannerLink() {
    const t = bannerLinkDraft.trim();
    if (!t) {
      setErr("Pega un enlace https para la cabecera.");
      return;
    }
    if (!/^https?:\/\//i.test(t)) {
      setErr("El enlace de cabecera debe empezar por http:// o https://.");
      return;
    }
    setErr("");
    setStagedBanner(t);
    setBannerPickedFile(null);
    setBannerPreviewUrl((prev) => {
      revokeIfObjectUrl(prev ?? undefined);
      return null;
    });
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-[2px] light:bg-zinc-900/35"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-panel-title"
        className="relative z-[1] max-h-[min(92vh,720px)] w-full max-w-md overflow-y-auto rounded-xl border border-neutral-700 bg-zinc-950 p-4 shadow-2xl shadow-black/50 ring-1 ring-goi-gold/20 light:border-zinc-200 light:bg-white light:shadow-zinc-900/15 healthy:ring-goi-gold/18"
      >
        <div className="-mt-0.5 mb-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs text-neutral-400 transition hover:bg-neutral-800/80 hover:text-neutral-100 light:text-zinc-600 light:hover:bg-zinc-100 light:hover:text-zinc-900"
          >
            Cerrar
          </button>
        </div>

        <h2 id="avatar-panel-title" className="mt-0 text-sm font-semibold text-neutral-100 light:text-zinc-900">
          Foto de perfil e imagen de cabecera
        </h2>
        <p className="mb-3 text-xs text-neutral-500">
          Elige imágenes en este equipo (se comprimen y se suben al servidor) o enlaces públicos. Al guardar, el perfil
          guarda solo la URL del fichero, no una imagen enorme en el JSON.
        </p>

        <div className="mb-4 overflow-hidden rounded-lg border border-neutral-700/80 bg-black/30 light:border-zinc-200">
          <div className="relative h-24 w-full sm:h-28">
            {isRenderableImageSrc(displayBanner) ? (
              <img src={displayBanner} alt="" className="absolute inset-0 size-full object-cover" decoding="async" />
            ) : (
              <div
                className="absolute inset-0 bg-gradient-to-br from-goi-gold/25 via-neutral-900 to-zinc-950 light:from-amber-200/50 healthy:from-goi-gold/20 light:via-zinc-100 light:to-white"
                aria-hidden
              />
            )}
          </div>
          <div className="flex justify-center border-t border-neutral-800/60 bg-zinc-950/90 px-3 py-3 light:border-zinc-200 light:bg-white">
            <Avatar src={displayUrl || undefined} alt={usernameAlt} size={88} />
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          className="sr-only"
          onChange={(ev) => void onPickFiles(ev.target.files)}
        />
        <input
          ref={bannerFileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          className="sr-only"
          onChange={(ev) => void onPickBannerFiles(ev.target.files)}
        />

        <div className="grid gap-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 light:text-zinc-600">
              Foto de perfil
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" disabled={busy} className="!py-2 !text-xs" onClick={() => fileRef.current?.click()}>
                Elegir foto
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={busy || !displayUrl}
                className="!py-2 !text-xs"
                onClick={() => {
                  setStaged("");
                  setAvatarPickedFile(null);
                  setAvatarPreviewUrl((prev) => {
                    revokeIfObjectUrl(prev ?? undefined);
                    return null;
                  });
                }}
              >
                Quitar foto
              </Button>
            </div>
            <div className="fs-muted-well mt-2 grid gap-1.5 p-2.5">
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
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 light:text-zinc-600">
              Imagen de cabecera
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                className="!py-2 !text-xs"
                onClick={() => bannerFileRef.current?.click()}
              >
                Elegir cabecera
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={busy || !displayBanner.trim()}
                className="!py-2 !text-xs"
                onClick={() => {
                  setStagedBanner("");
                  setBannerPickedFile(null);
                  setBannerPreviewUrl((prev) => {
                    revokeIfObjectUrl(prev ?? undefined);
                    return null;
                  });
                }}
              >
                Quitar cabecera
              </Button>
            </div>
            <div className="fs-muted-well mt-2 grid gap-1.5 p-2.5">
              <span className="text-[11px] font-medium text-neutral-500">O enlace https</span>
              <div className="flex flex-wrap gap-2">
                <input
                  className="goi-field min-w-[10rem] flex-1 py-2 text-xs"
                  value={bannerLinkDraft}
                  placeholder="https://…"
                  onChange={(ev) => setBannerLinkDraft(ev.target.value)}
                />
                <Button type="button" variant="secondary" className="shrink-0 !py-2 !text-xs" disabled={busy} onClick={() => applyBannerLink()}>
                  Usar enlace
                </Button>
              </div>
            </div>
          </div>

          {err ? <p className="text-xs text-red-400">{err}</p> : null}

          <Button type="button" variant="primary" disabled={busy || usernameTrimmed.length < 3} onClick={() => void handleSavePhoto()}>
            {busy ? "Guardando…" : "Guardar foto y cabecera"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

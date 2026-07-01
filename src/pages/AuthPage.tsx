import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  login,
  register,
  requestPasswordReset,
  resendVerificationEmail,
  resetPasswordWithToken,
  verifyEmailWithToken,
} from "../api/authApi";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { StatusMessage } from "../components/ui/StatusMessage";
import { useAuth } from "../context/AuthContext";
import { SESSION_EXPIRED_STORAGE_KEY } from "../constants/storageKeys";
import { getErrorMessage } from "../utils/errorMessages";

type AuthView =
  | "register"
  | "login"
  | "forgot"
  | "reset"
  | "verify-pending"
  | "verify-confirmed";

const labelClass = "grid gap-1.5 font-semibold text-neutral-200 light:text-zinc-800";
const fieldClass = "goi-field w-full";
const MIN_PASSWORD = 8;

export function AuthPage() {
  const { setAuth } = useAuth();
  const rateLimitTimeoutRef = useRef<number | null>(null);
  const [view, setView] = useState<AuthView>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [devResetHint, setDevResetHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    return () => {
      if (rateLimitTimeoutRef.current) {
        window.clearTimeout(rateLimitTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    try {
      const flag = sessionStorage.getItem(SESSION_EXPIRED_STORAGE_KEY);
      if (!flag) return;
      sessionStorage.removeItem(SESSION_EXPIRED_STORAGE_KEY);
      setView("login");
      setMessage("");
      setError(
        flag === "stale"
          ? getErrorMessage(
              new ApiError("session stale", 401, "AUTH_SESSION_STALE"),
              "Tu sesión ya no coincide con el servidor. Inicia sesión otra vez.",
            )
          : "Tu sesión ha caducado. Vuelve a iniciar sesión.",
      );
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyToken = params.get("verify");
    const resetParam = params.get("reset");
    const verified = params.get("verified");
    const verifyError = params.get("verifyError");

    if (verified === "1") {
      clearUrlParam("verified");
      setView("verify-confirmed");
      setMessage("Email confirmado. Ya puedes iniciar sesión.");
      return;
    }

    if (verifyError === "1") {
      clearUrlParam("verifyError");
      setView("login");
      setError("El enlace de verificación no es válido o ha caducado. Puedes solicitar uno nuevo al iniciar sesión.");
      return;
    }

    if (verifyToken) {
      setError("");
      setMessage("");
      setLoading(true);
      void verifyEmailWithToken(verifyToken)
        .then(() => {
          clearUrlParam("verify");
          setView("verify-confirmed");
          setMessage("Email confirmado. Ya puedes iniciar sesión.");
        })
        .catch((err) => {
          clearUrlParam("verify");
          setView("login");
          setError(getErrorMessage(err, "No se pudo verificar el email"));
        })
        .finally(() => setLoading(false));
      return;
    }

    if (resetParam) {
      setResetToken(resetParam);
      setView("reset");
      setError("");
      setMessage("");
    }
  }, []);

  function clearUrlParam(key: "reset" | "verify" | "verified" | "verifyError") {
    const url = new URL(window.location.href);
    url.searchParams.delete(key);
    const q = url.searchParams.toString();
    window.history.replaceState({}, "", `${url.pathname}${q ? `?${q}` : ""}`);
  }

  function handleRateLimited() {
    setRateLimited(true);
    setError("Has hecho demasiados intentos. Espera unos 15 minutos antes de volver a intentarlo.");
    if (rateLimitTimeoutRef.current) {
      window.clearTimeout(rateLimitTimeoutRef.current);
    }
    rateLimitTimeoutRef.current = window.setTimeout(() => {
      setRateLimited(false);
    }, 60_000);
  }

  async function handleResendVerification(targetEmail?: string) {
    const normalized = (targetEmail ?? pendingEmail ?? email).trim();
    if (!normalized) {
      setError("Introduce el email de tu cuenta.");
      return;
    }
    setResendLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await resendVerificationEmail(normalized);
      setMessage(response.message);
      if (import.meta.env.DEV && response.devVerificationToken) {
        const link = `${window.location.origin}${window.location.pathname}?verify=${encodeURIComponent(response.devVerificationToken)}`;
        setDevResetHint(`Modo desarrollo: ${link}`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === "AUTH_RATE_LIMITED") {
        handleRateLimited();
        return;
      }
      setError(getErrorMessage(err, "No se pudo reenviar el correo"));
    } finally {
      setResendLoading(false);
    }
  }

  async function handleLoginOrRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setDevResetHint("");
    setLoading(true);

    try {
      if (view === "register" && username.trim().length < 3) {
        throw new Error("El usuario debe tener al menos 3 caracteres");
      }
      if (password.length < MIN_PASSWORD) {
        throw new Error(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`);
      }
      if (view === "register" && !acceptedLegal) {
        throw new Error("Debes aceptar el aviso legal y la política de privacidad");
      }

      if (view === "register") {
        const normalizedEmail = email.trim().toLowerCase();
        const reg = await register({ username: username.trim(), email: normalizedEmail, password });
        if (reg.requiresEmailVerification || !reg.token) {
          setPendingEmail(normalizedEmail);
          setPassword("");
          setView("verify-pending");
          if (reg.verificationEmailSent || reg.devVerificationToken) {
            setMessage(
              "Te hemos enviado un correo para confirmar tu cuenta. Revisa bandeja y spam.",
            );
            if (import.meta.env.DEV && reg.devVerificationToken) {
              const link = `${window.location.origin}${window.location.pathname}?verify=${encodeURIComponent(reg.devVerificationToken)}`;
              setDevResetHint(`Modo desarrollo: enlace de verificación:\n${link}`);
            }
          } else {
            setMessage("Cuenta creada. Pulsa «Reenviar correo» si no recibes el enlace en unos minutos.");
            setError(
              "No se pudo enviar el correo de verificación. Si es una cuenta de prueba, autoriza el email en Resend.",
            );
          }
          return;
        }
        if (reg.token && reg.user) {
          setAuth(reg.token, reg.user);
        }
      } else {
        const response = await login({ email, password });
        if (!response.token) throw new Error("Login token missing");
        setAuth(response.token, response.user);
      }
    } catch (submitError) {
      if (submitError instanceof ApiError && submitError.code === "AUTH_RATE_LIMITED") {
        handleRateLimited();
        return;
      }
      if (submitError instanceof ApiError && submitError.code === "AUTH_EMAIL_NOT_VERIFIED") {
        setPendingEmail(email.trim());
        setError(getErrorMessage(submitError, "Confirma tu email antes de entrar."));
        return;
      }
      setError(getErrorMessage(submitError, "No se pudo autenticar"));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setDevResetHint("");
    setLoading(true);

    try {
      const response = await requestPasswordReset(email.trim());
      setMessage(response.message);
      if (import.meta.env.DEV && response.devResetToken) {
        const link = `${window.location.origin}${window.location.pathname}?reset=${encodeURIComponent(response.devResetToken)}`;
        setDevResetHint(
          `Modo desarrollo (AUTH_RESET_RETURN_TOKEN en el servidor): abre este enlace o cópialo en la misma pestaña:\n${link}`
        );
      }
    } catch (submitError) {
      if (submitError instanceof ApiError && submitError.code === "AUTH_RATE_LIMITED") {
        handleRateLimited();
        return;
      }
      setError(getErrorMessage(submitError, "No se pudo enviar la solicitud"));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (newPassword.length < MIN_PASSWORD) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`);
      setLoading(false);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    try {
      await resetPasswordWithToken({ token: resetToken, password: newPassword });
      setMessage("Contraseña actualizada. Ya puedes iniciar sesión.");
      setNewPassword("");
      setConfirmNewPassword("");
      setResetToken("");
      clearUrlParam("reset");
      setView("login");
    } catch (submitError) {
      if (submitError instanceof ApiError && submitError.code === "AUTH_RATE_LIMITED") {
        handleRateLimited();
        return;
      }
      setError(getErrorMessage(submitError, "No se pudo restablecer la contraseña"));
    } finally {
      setLoading(false);
    }
  }

  const title =
    view === "register"
      ? "Crear cuenta"
      : view === "login"
        ? "Iniciar sesión"
        : view === "forgot"
          ? "Recuperar contraseña"
          : view === "reset"
            ? "Nueva contraseña"
            : view === "verify-pending"
              ? "Confirma tu email"
              : "Email confirmado";

  return (
    <section className="layout mx-auto w-full max-w-[480px] sm:max-w-[520px]">
      <Card
        tone="dark"
        className="p-[1.15rem] shadow-[0_22px_50px_-12px_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(212,175,55,0.09)] ring-1 ring-goi-gold/15 sm:p-5 light:shadow-[0_20px_45px_-16px_rgba(24,24,27,0.18)] light:ring-goi-gold/20"
      >
        <h2 className="text-xl font-semibold tracking-tight text-neutral-100 light:text-zinc-900">{title}</h2>
        <p className="mb-5 mt-1.5 text-sm leading-relaxed text-neutral-400 light:text-zinc-600">
          {view === "register" && "Únete con un usuario, email y contraseña."}
          {view === "login" && "Introduce tus credenciales para continuar."}
          {view === "forgot" && "Te enviaremos instrucciones si el correo está registrado."}
          {view === "reset" && "Define una contraseña nueva para volver a entrar."}
          {view === "verify-pending" &&
            "Abre el enlace del correo para activar tu cuenta. Si no lo ves, revisa spam."}
          {view === "verify-confirmed" && "Tu cuenta ya está activa."}
        </p>

        {(view === "register" || view === "login") && (
          <form className="grid gap-3.5" onSubmit={handleLoginOrRegister}>
            {view === "register" && (
              <label className={labelClass}>
                Usuario
                <input
                  className={fieldClass}
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="tu_usuario"
                />
              </label>
            )}

            <label className={labelClass}>
              Email
              <input
                className={fieldClass}
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@email.com"
              />
            </label>

            <label className={labelClass}>
              Contraseña
              <input
                className={fieldClass}
                required
                type="password"
                minLength={MIN_PASSWORD}
                autoComplete={view === "register" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={`Mínimo ${MIN_PASSWORD} caracteres`}
              />
            </label>

            {view === "register" && (
              <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-relaxed text-neutral-300 light:text-zinc-700">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-goi-gold"
                  checked={acceptedLegal}
                  onChange={(event) => setAcceptedLegal(event.target.checked)}
                />
                <span>
                  Acepto el{" "}
                  <Link className="text-goi-gold hover:underline" to="/aviso-legal" target="_blank">
                    aviso legal
                  </Link>{" "}
                  y la{" "}
                  <Link className="text-goi-gold hover:underline" to="/privacidad" target="_blank">
                    política de privacidad
                  </Link>
                  .
                </span>
              </label>
            )}

            {view === "login" && (
              <Button
                type="button"
                variant="link"
                className="!mt-0 justify-self-start py-1 text-sm"
                onClick={() => {
                  setError("");
                  setMessage("");
                  setView("forgot");
                }}
              >
                ¿Olvidaste tu contraseña?
              </Button>
            )}

            <StatusMessage tone="dark" error={error} success={message} />

            {view === "login" && error && pendingEmail ? (
              <Button
                type="button"
                variant="secondary"
                disabled={resendLoading || rateLimited}
                className="w-full"
                onClick={() => void handleResendVerification(pendingEmail)}
              >
                {resendLoading ? "Reenviando…" : "Reenviar correo de verificación"}
              </Button>
            ) : null}

            <Button type="submit" disabled={loading || rateLimited} className="w-full">
              {loading
                ? "Procesando..."
                : rateLimited
                  ? "Espera un momento..."
                  : view === "register"
                    ? "Crear cuenta"
                    : "Entrar"}
            </Button>
          </form>
        )}

        {view === "verify-pending" && (
          <div className="grid gap-3.5">
            {resendLoading ? (
              <p className="m-0 text-sm text-neutral-400 light:text-zinc-600">Enviando correo de verificación…</p>
            ) : error ? (
              <p className="m-0 text-sm text-neutral-300 light:text-zinc-700">
                Cuenta creada para{" "}
                <strong className="font-semibold text-neutral-100 light:text-zinc-900">{pendingEmail}</strong>.
                Cuando recibas el enlace, ábrelo para activar tu cuenta (revisa también spam).
              </p>
            ) : (
              <p className="m-0 text-sm text-neutral-300 light:text-zinc-700">
                Hemos enviado un enlace a{" "}
                <strong className="font-semibold text-neutral-100 light:text-zinc-900">{pendingEmail}</strong>.
                Ábrelo para activar tu cuenta (revisa también spam).
              </p>
            )}
            <StatusMessage tone="dark" error={error} success={message} />
            {devResetHint ? (
              <pre className="fs-muted-well max-h-40 overflow-auto whitespace-pre-wrap break-all p-3 text-xs leading-relaxed text-neutral-400 light:text-zinc-600">
                {devResetHint}
              </pre>
            ) : null}
            <Button
              type="button"
              disabled={resendLoading || rateLimited}
              className="w-full"
              onClick={() => void handleResendVerification()}
            >
              {resendLoading ? "Reenviando…" : "Reenviar correo"}
            </Button>
            <Button
              type="button"
              variant="link"
              className="!mt-1"
              onClick={() => {
                setError("");
                setMessage("");
                setDevResetHint("");
                setView("login");
              }}
            >
              Ir a iniciar sesión
            </Button>
          </div>
        )}

        {view === "verify-confirmed" && (
          <div className="grid gap-3.5">
            <StatusMessage tone="dark" success={message || "Email confirmado."} />
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                setMessage("");
                setView("login");
              }}
            >
              Iniciar sesión
            </Button>
          </div>
        )}

        {view === "forgot" && (
          <form className="grid gap-3.5" onSubmit={handleForgotPassword}>
            <p className="m-0 text-sm leading-relaxed text-neutral-400 light:text-zinc-600">
              Indica el correo de tu cuenta. Si existe, recibirás un email con instrucciones (revisa también spam).
            </p>
            <label className={labelClass}>
              Email
              <input
                className={fieldClass}
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@email.com"
              />
            </label>
            <StatusMessage tone="dark" error={error} success={message} />
            {devResetHint && (
              <pre className="fs-muted-well max-h-40 overflow-auto whitespace-pre-wrap break-all p-3 text-xs leading-relaxed text-neutral-400 light:text-zinc-600">
                {devResetHint}
              </pre>
            )}
            <Button type="submit" disabled={loading || rateLimited} className="w-full">
              {loading ? "Enviando..." : rateLimited ? "Espera un momento..." : "Enviar instrucciones"}
            </Button>
            <Button
              type="button"
              variant="link"
              className="!mt-1"
              onClick={() => {
                setError("");
                setMessage("");
                setDevResetHint("");
                setView("login");
              }}
            >
              Volver a iniciar sesión
            </Button>
          </form>
        )}

        {view === "reset" && (
          <form className="grid gap-3.5" onSubmit={handleResetPassword}>
            <p className="m-0 text-sm text-neutral-400 light:text-zinc-600">Elige una contraseña nueva para tu cuenta.</p>
            <label className={labelClass}>
              Nueva contraseña
              <input
                className={fieldClass}
                required
                type="password"
                minLength={MIN_PASSWORD}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder={`Mínimo ${MIN_PASSWORD} caracteres`}
              />
            </label>
            <label className={labelClass}>
              Repetir contraseña
              <input
                className={fieldClass}
                required
                type="password"
                minLength={MIN_PASSWORD}
                autoComplete="new-password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                placeholder={`Mínimo ${MIN_PASSWORD} caracteres`}
              />
            </label>
            <StatusMessage tone="dark" error={error} success={message} />
            <Button type="submit" disabled={loading || rateLimited || !resetToken} className="w-full">
              {loading ? "Guardando..." : rateLimited ? "Espera un momento..." : "Guardar nueva contraseña"}
            </Button>
            <Button
              type="button"
              variant="link"
              className="!mt-1"
              onClick={() => {
                setError("");
                setMessage("");
                clearUrlParam("reset");
                setView("login");
              }}
            >
              Volver a iniciar sesión
            </Button>
          </form>
        )}

        {(view === "register" || view === "login") && (
          <div className="mt-6 border-t border-neutral-700 pt-4 light:border-zinc-200">
            <Button
              type="button"
              variant="link"
              className="!mt-0 w-full"
              onClick={() => {
                setError("");
                setMessage("");
                setView((v) => (v === "register" ? "login" : "register"));
              }}
            >
              {view === "register" ? "Ya tengo cuenta — Iniciar sesión" : "¿No tienes cuenta? Crear cuenta"}
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
}

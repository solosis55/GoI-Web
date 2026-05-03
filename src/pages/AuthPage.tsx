import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../api/client";
import { login, register, requestPasswordReset, resetPasswordWithToken } from "../api/authApi";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { StatusMessage } from "../components/ui/StatusMessage";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../utils/errorMessages";

type AuthView = "register" | "login" | "forgot" | "reset";

const labelClass = "grid gap-1.5 font-semibold text-neutral-200";
const fieldClass = "goi-field w-full";

export function AuthPage() {
  const { setAuth } = useAuth();
  const rateLimitTimeoutRef = useRef<number | null>(null);
  const [view, setView] = useState<AuthView>("register");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [devResetHint, setDevResetHint] = useState("");
  const [loading, setLoading] = useState(false);
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
    const params = new URLSearchParams(window.location.search);
    const token = params.get("reset");
    if (token) {
      setResetToken(token);
      setView("reset");
      setError("");
      setMessage("");
    }
  }, []);

  function clearUrlResetParam() {
    const url = new URL(window.location.href);
    url.searchParams.delete("reset");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
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

  async function handleLoginOrRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (view === "register" && username.trim().length < 3) {
        throw new Error("El usuario debe tener al menos 3 caracteres");
      }
      if (password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres");
      }

      if (view === "register") {
        const response = await register({ username: username.trim(), email, password });
        const loginResponse = await login({ email, password });
        if (!loginResponse.token) throw new Error("Login token missing");
        setAuth(loginResponse.token, response.user);
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

    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
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
      clearUrlResetParam();
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
          : "Nueva contraseña";

  return (
    <section className="layout mx-auto w-full max-w-[520px]">
      <Card tone="dark">
        <h2 className="text-lg font-semibold text-neutral-100">{title}</h2>
        <p className="mb-5 mt-1 text-sm text-neutral-400">
          {view === "register" && "Únete con un usuario, email y contraseña."}
          {view === "login" && "Introduce tus credenciales para continuar."}
          {view === "forgot" && "Te enviaremos instrucciones si el correo está registrado."}
          {view === "reset" && "Define una contraseña nueva para volver a entrar."}
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
                minLength={6}
                autoComplete={view === "register" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </label>

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

            <Button type="submit" disabled={loading || rateLimited} className="w-full">
              {loading ? "Procesando..." : rateLimited ? "Espera un momento..." : view === "register" ? "Crear cuenta" : "Entrar"}
            </Button>
          </form>
        )}

        {view === "forgot" && (
          <form className="grid gap-3.5" onSubmit={handleForgotPassword}>
            <p className="m-0 text-sm leading-relaxed text-neutral-400">
              Indica el correo de tu cuenta. Si existe, podrás restablecer la contraseña (en producción llegaría un email; en
              local revisa la documentación y{" "}
              <code className="rounded bg-neutral-800 px-1 py-0.5 font-mono text-xs text-goi-gold">
                AUTH_RESET_RETURN_TOKEN
              </code>
              ).
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
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-neutral-700 bg-black p-3 text-xs leading-relaxed text-neutral-400">
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
            <p className="m-0 text-sm text-neutral-400">Elige una contraseña nueva para tu cuenta.</p>
            <label className={labelClass}>
              Nueva contraseña
              <input
                className={fieldClass}
                required
                type="password"
                minLength={6}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </label>
            <label className={labelClass}>
              Repetir contraseña
              <input
                className={fieldClass}
                required
                type="password"
                minLength={6}
                autoComplete="new-password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                placeholder="Mínimo 6 caracteres"
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
                clearUrlResetParam();
                setView("login");
              }}
            >
              Volver a iniciar sesión
            </Button>
          </form>
        )}

        {(view === "register" || view === "login") && (
          <div className="mt-6 border-t border-neutral-700 pt-4">
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
              {view === "register" ? "Ya tengo cuenta" : "No tengo cuenta aún"}
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
}

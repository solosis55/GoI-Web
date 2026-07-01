import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AUTH_EXPIRED_EVENT } from "../api/client";
import { AUTH_STORAGE_KEY, SESSION_EXPIRED_STORAGE_KEY } from "../constants/storageKeys";
import type { SafeUser } from "../types/auth";
import { mergeSafeUser } from "../utils/safeUserDefaults";

type AuthState = {
  token: string | null;
  user: SafeUser | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: SafeUser) => void;
  updateUser: (user: SafeUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

function getStoredAuth(): { token: string | null; user: SafeUser | null } {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { token: null, user: null };

    const parsed = JSON.parse(raw) as { token: string; user: SafeUser };
    if (!parsed?.token || !parsed?.user) return { token: null, user: null };

    return { token: parsed.token, user: mergeSafeUser(parsed.user) };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = getStoredAuth();
  const [token, setToken] = useState<string | null>(stored.token);
  const [user, setUser] = useState<SafeUser | null>(stored.user);

  useEffect(() => {
    function handleAuthExpired(event: Event) {
      const code = (event as CustomEvent<{ code?: string }>).detail?.code;
      try {
        sessionStorage.setItem(
          SESSION_EXPIRED_STORAGE_KEY,
          code === "AUTH_SESSION_STALE" ? "stale" : "expired",
        );
      } catch {
        /* ignore */
      }
      setToken(null);
      setUser(null);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, []);

  const setAuth = useCallback((nextToken: string, nextUser: SafeUser) => {
    const merged = mergeSafeUser(nextUser);
    setToken(nextToken);
    setUser(merged);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: nextToken, user: merged }));
  }, []);

  const updateUser = useCallback((nextUser: SafeUser) => {
    const merged = mergeSafeUser(nextUser);
    setUser(merged);
    setToken((currentToken) => {
      if (currentToken) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: currentToken, user: merged }));
      }
      return currentToken;
    });
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      setAuth,
      updateUser,
      logout,
    }),
    [token, user, setAuth, updateUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

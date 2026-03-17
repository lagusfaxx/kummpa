"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { clearSession, loadSession, saveSession } from "./auth-storage";
import {
  getCurrentUser,
  login,
  logout,
  refresh,
  register
} from "./auth-api";
import type { AuthSession, LoginPayload, RegisterPayload } from "./types";

interface AuthContextValue {
  session: AuthSession | null;
  isReady: boolean;
  isAuthenticated: boolean;
  signIn: (payload: LoginPayload) => Promise<void>;
  signUp: (payload: RegisterPayload) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  const persistSession = useCallback((nextSession: AuthSession | null) => {
    setSession(nextSession);

    if (nextSession) {
      saveSession(nextSession);
      return;
    }

    clearSession();
  }, []);

  const refreshSession = useCallback(async () => {
    const current = loadSession();
    if (!current?.tokens?.refreshToken) {
      persistSession(null);
      return;
    }

    try {
      const renewed = await refresh(current.tokens.refreshToken);
      const currentUser = await getCurrentUser(renewed.tokens.accessToken);
      persistSession({
        user: currentUser,
        tokens: renewed.tokens
      });
    } catch {
      persistSession(null);
    }
  }, [persistSession]);

  useEffect(() => {
    const boot = async () => {
      const current = loadSession();
      if (!current) {
        setIsReady(true);
        return;
      }

      try {
        const renewed = await refresh(current.tokens.refreshToken);
        const currentUser = await getCurrentUser(renewed.tokens.accessToken);
        persistSession({
          user: currentUser,
          tokens: renewed.tokens
        });
      } catch {
        persistSession(null);
      } finally {
        setIsReady(true);
      }
    };

    void boot();
  }, [persistSession]);

  const signIn = useCallback(
    async (payload: LoginPayload) => {
      const nextSession = await login(payload);
      persistSession(nextSession);
    },
    [persistSession]
  );

  const signUp = useCallback(
    async (payload: RegisterPayload) => {
      const nextSession = await register(payload);
      persistSession(nextSession);
    },
    [persistSession]
  );

  const signOut = useCallback(async () => {
    if (session?.tokens.refreshToken) {
      try {
        await logout(session.tokens.refreshToken);
      } catch {
        // ignore logout transport errors and force local cleanup
      }
    }

    persistSession(null);
  }, [persistSession, session?.tokens.refreshToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isReady,
      isAuthenticated: Boolean(session),
      signIn,
      signUp,
      signOut,
      refreshSession
    }),
    [isReady, refreshSession, session, signIn, signOut, signUp]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

export function getAuthErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  const maybeError = error as { message?: string } | null;
  if (maybeError?.message) {
    return maybeError.message;
  }

  return "Ocurrio un error inesperado.";
}

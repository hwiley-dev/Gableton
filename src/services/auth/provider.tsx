import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { useDesktopBridge } from "../desktop-bridge/provider";
import { getConfiguredApiBaseUrl } from "../runtime/config";
import type { AuthSession, AuthSessionValue } from "./types";

const AuthSessionContext = createContext<AuthSessionValue | null>(null);

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const desktopBridge = useDesktopBridge();
  const apiBaseUrl = getConfiguredApiBaseUrl();
  const [status, setStatus] = useState<AuthSessionValue["status"]>("booting");
  const [session, setSession] = useState<AuthSession>();
  const [error, setError] = useState<string>();

  const restoreSession = async () => {
    if (!apiBaseUrl) {
      setSession(undefined);
      setStatus("signed_out");
      setError("Gableton API base URL is not configured.");
      return;
    }

    setStatus("booting");
    setError(undefined);

    try {
      const restoredSession = await desktopBridge.restoreAuthSession(apiBaseUrl);
      if (!restoredSession) {
        setSession(undefined);
        setStatus("signed_out");
        return;
      }

      setSession(restoredSession);
      setStatus("authenticated");
    } catch (restoreError) {
      setSession(undefined);
      setStatus("signed_out");
      setError(
        restoreError instanceof Error ? restoreError.message : "Restoring the session failed."
      );
    }
  };

  useEffect(() => {
    void restoreSession();
  }, [apiBaseUrl, desktopBridge]);

  const value = useMemo<AuthSessionValue>(() => {
    return {
      status,
      session,
      error,
      apiBaseUrl,
      async signIn() {
        if (!apiBaseUrl) {
          const reason = "Gableton API base URL is not configured.";
          setStatus("signed_out");
          setError(reason);
          return { ok: false, reason };
        }

        setStatus("signing_in");
        setError(undefined);

        try {
          const nextSession = await desktopBridge.signIn({ apiBaseUrl });
          setSession(nextSession);
          setStatus("authenticated");
          return { ok: true };
        } catch (signInError) {
          const reason =
            signInError instanceof Error ? signInError.message : "Signing in failed.";
          setSession(undefined);
          setStatus("signed_out");
          setError(reason);
          return { ok: false, reason };
        }
      },
      async signOut() {
        if (apiBaseUrl) {
          try {
            await desktopBridge.signOut(apiBaseUrl);
          } catch {
            // Keep sign-out best-effort so the renderer can always clear local session state.
          }
        }

        setSession(undefined);
        setStatus("signed_out");
        setError(undefined);
      },
      restoreSession
    };
  }, [apiBaseUrl, desktopBridge, error, session, status]);

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession(): AuthSessionValue {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error("useAuthSession must be used inside AuthSessionProvider.");
  }
  return context;
}

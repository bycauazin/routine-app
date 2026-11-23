import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, onUnauthorized } from "@/lib/api";

const AuthContext = createContext(null);

/**
 * Holds the signed-in user. The session itself lives in an HttpOnly cookie
 * the JavaScript cannot read; the UI only knows what /auth/me returns.
 * status: "loading" | "authenticated" | "anonymous"
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api("/auth/me")
      .then((res) => {
        if (cancelled) return;
        setUser(res.data.user);
        setStatus("authenticated");
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setStatus("anonymous");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Any 401 from the API after login means the session ended (expired,
  // revoked by a password change, logged out elsewhere).
  useEffect(
    () =>
      onUnauthorized(() => {
        setUser((current) => {
          if (current) setSessionExpired(true);
          return null;
        });
        setStatus("anonymous");
      }),
    [],
  );

  const signedIn = useCallback((nextUser) => {
    setUser(nextUser);
    setStatus("authenticated");
    setSessionExpired(false);
  }, []);

  /**
   * First step. With two-step verification on, nobody is signed in yet:
   * returns `{ twoFactorRequired: true, ticket }` for `loginWithCode`.
   */
  const login = useCallback(
    async (email, password) => {
      const res = await api("/auth/login", { method: "POST", body: { email, password } });
      if (res.data.twoFactorRequired) return res.data;
      signedIn(res.data.user);
      return { user: res.data.user };
    },
    [signedIn],
  );

  /** Second step: the code from the authenticator app (or a recovery code). */
  const loginWithCode = useCallback(
    async (ticket, code) => {
      const res = await api("/auth/login/two-factor", { method: "POST", body: { ticket, code } });
      signedIn(res.data.user);
      return res.data.user;
    },
    [signedIn],
  );

  /** After deleting the account: the session no longer exists. */
  const forget = useCallback(() => {
    setUser(null);
    setStatus("anonymous");
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, sessionExpired, login, loginWithCode, logout, forget, setUser }),
    [user, status, sessionExpired, login, loginWithCode, logout, forget],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

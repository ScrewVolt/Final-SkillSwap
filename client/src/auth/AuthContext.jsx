import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../api/http";
import { AuthContext } from "./authctx"; // keep your path

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("/auth/me");
      setUser(data);
      return data;
    } catch (e) {
      // If session expired or not logged in, we normalize to null user
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(
    async (email, password) => {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await loadMe(); // pulls user after cookie is set
    },
    [loadMe]
  );

  const register = useCallback(
    async (name, email, password) => {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      await login(email, password);
    },
    [login]
  );

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      reloadUser: loadMe,
      isAuthed: !!user,
      isAdmin: user?.role === "admin",
    }),
    [user, loading, login, register, logout, loadMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

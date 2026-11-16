import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, clearTokens, getTokens, saveTokens } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!getTokens().access && !getTokens().refresh) {
      setReady(true);
      return () => { active = false; };
    }
    api.get("/auth/me/").then((profile) => {
      if (active) setUser(profile);
    }).catch(() => {
      clearTokens();
      if (active) setUser(null);
    }).finally(() => {
      if (active) setReady(true);
    });
    return () => { active = false; };
  }, []);

  async function login(email, password) {
    const tokens = await api.post("/auth/token/", { email, password });
    saveTokens(tokens);
    const profile = await api.get("/auth/me/");
    setUser(profile);
    return profile;
  }

  async function register(fields) {
    await api.post("/auth/register/", fields);
    return login(fields.email, fields.password);
  }

  async function logout() {
    const { refresh } = getTokens();
    try {
      if (refresh) await api.post("/auth/logout/", { refresh });
    } finally {
      clearTokens();
      setUser(null);
    }
  }

  async function updateProfile(fields) {
    const profile = await api.patch("/auth/me/", fields);
    setUser(profile);
    return profile;
  }

  const value = useMemo(() => ({ user, ready, login, register, logout, updateProfile }), [user, ready]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth doit être utilisé dans AuthProvider.");
  return context;
}

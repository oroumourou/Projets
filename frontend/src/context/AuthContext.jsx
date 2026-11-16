import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [dealerProfile, setDealerProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("automoto.access");
    localStorage.removeItem("automoto.refresh");
    setUser(null);
    setDealerProfile(null);
  }, []);

  const reloadProfile = useCallback(async () => {
    const data = await apiRequest("/auth/me/");
    setUser(data.user);
    setDealerProfile(data.dealer_profile || null);
    return data;
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("automoto.access")) {
      setLoading(false);
      return;
    }
    reloadProfile().catch(logout).finally(() => setLoading(false));
  }, [reloadProfile, logout]);

  useEffect(() => {
    window.addEventListener("automoto:logout", logout);
    return () => window.removeEventListener("automoto:logout", logout);
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const tokens = await apiRequest("/auth/token/", { method: "POST", body: { email, password } });
    localStorage.setItem("automoto.access", tokens.access);
    localStorage.setItem("automoto.refresh", tokens.refresh);
    await reloadProfile();
  }, [reloadProfile]);

  const value = useMemo(() => ({ user, dealerProfile, loading, login, logout, reloadProfile }), [user, dealerProfile, loading, login, logout, reloadProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth doit être utilisé dans AuthProvider.");
  return value;
}

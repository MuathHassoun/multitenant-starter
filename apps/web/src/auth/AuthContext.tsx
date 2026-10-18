import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken } from "../api/client";
import type { Me } from "../types";

type AuthState = {
  me: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  switchTenant: (tenantId: number) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api<Me>("/me")
      .then(setMe)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<Me & { token: string }>("/auth/login", { method: "POST", body: { email, password } });
    setToken(res.token);
    setMe(res);
  }, []);

  const switchTenant = useCallback(async (tenantId: number) => {
    const res = await api<Me & { token: string }>("/auth/switch", { method: "POST", body: { tenantId } });
    setToken(res.token);
    setMe(res);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setMe(null);
  }, []);

  return <Ctx.Provider value={{ me, loading, login, switchTenant, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}

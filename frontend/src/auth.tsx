import { createContext, useContext, useEffect, useState } from "react";
import { api, setAccessToken } from "./api";
import type { User } from "./types";
const C = createContext<any>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .post("/auth/refresh")
      .then((r) => {
        setAccessToken(r.data.data.accessToken);
        setUser(r.data.data.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  return <C.Provider value={{ user, setUser, loading }}>{children}</C.Provider>;
}
export const useAuth = () => useContext(C);

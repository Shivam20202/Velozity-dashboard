import { createContext, useContext, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "./api";
import { useAuth } from "./auth";
const C = createContext<{ socket: Socket | null; online: number }>({
  socket: null,
  online: 0,
});
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [online, setOnline] = useState(0);
  useEffect(() => {
    if (!user) return;
    const s = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:4000", {
      auth: { token: getAccessToken() },
      transports: ["websocket"],
    });
    s.on("presence:count", (x) => setOnline(x.count));
    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [user]);
  return <C.Provider value={{ socket, online }}>{children}</C.Provider>;
}
export const useSocket = () => useContext(C);

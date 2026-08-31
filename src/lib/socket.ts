"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    const url =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || ""));
    socketInstance = io(url, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }
  return socketInstance;
}

export const initSocket = getSocket;

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const s = getSocket();
    setSocket(s);

    if (s.connected) {
      setIsConnected(true);
    }

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    s.on("connect", handleConnect);
    s.on("disconnect", handleDisconnect);

    return () => {
      s.off("connect", handleConnect);
      s.off("disconnect", handleDisconnect);
    };
  }, []);

  return { socket, isConnected };
}

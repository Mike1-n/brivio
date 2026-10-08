"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    let url = process.env.NEXT_PUBLIC_SOCKET_URL;
    
    if (!url) {
      if (typeof window !== "undefined") {
        if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
          url = window.location.origin;
        } else {
          url = "https://brivio-production.up.railway.app";
        }
      } else {
        url = "https://brivio-production.up.railway.app";
      }
    }
    
    socketInstance = io(url, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    if (typeof window !== "undefined") {
      socketInstance.on("connect", () => {
        console.log("[Socket.io] Connected successfully to:", url, "Socket ID:", socketInstance?.id);
      });
      socketInstance.on("connect_error", (err) => {
        console.warn("[Socket.io] Connection error to:", url, err.message);
      });
      socketInstance.on("disconnect", (reason) => {
        console.log("[Socket.io] Disconnected. Reason:", reason);
      });
    }
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

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "./use-toast";
import { useAuth } from "./use-auth";

export type Prices = Record<string, number>;

export function useWebSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const closedByUnmountRef = useRef(false);
  const [prices, setPrices] = useState<Prices>({});
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Keep latest user id in a ref so reconnects don't churn on identity changes
  const userIdRef = useRef<string | undefined>(user?.id);
  userIdRef.current = user?.id;

  useEffect(() => {
    closedByUnmountRef.current = false;

    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "priceUpdate" && msg.payload) {
            setPrices((p) => ({ ...p, [msg.payload.market]: msg.payload.price }));
          } else if (msg.type === "tradeResult" && msg.payload) {
            const uid = userIdRef.current;
            if (uid && msg.payload.userId !== uid) return;
            queryClient.invalidateQueries({ queryKey: [api.trades.list.path] });
            queryClient.invalidateQueries({ queryKey: [api.wallet.get.path] });
            toast({
              title: msg.payload.result === "won" ? "Trade Won" : "Trade Lost",
              description:
                msg.payload.result === "won"
                  ? `You won KSh ${Number(msg.payload.payout).toLocaleString()}`
                  : "Better luck next time.",
              variant: msg.payload.result === "won" ? "default" : "destructive",
              className:
                msg.payload.result === "won"
                  ? "bg-green-600 border-green-700 text-white"
                  : "",
            });
          }
        } catch (err) {
          console.error("WS error:", err);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        if (closedByUnmountRef.current) return;
        // Exponential backoff capped at 5s, then keep retrying so the feed never sleeps
        const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 5000);
        reconnectAttemptsRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    return () => {
      closedByUnmountRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
    };
  }, [toast, queryClient]);

  return { prices, isConnected };
}

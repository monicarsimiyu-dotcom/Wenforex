import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "./use-toast";
import { useAuth } from "./use-auth";

export type Prices = Record<string, number>;

export function useWebSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  const [prices, setPrices] = useState<Prices>({});
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => setIsConnected(true);

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "priceUpdate" && msg.payload) {
          setPrices((p) => ({ ...p, [msg.payload.market]: msg.payload.price }));
        } else if (msg.type === "tradeResult" && msg.payload) {
          if (user?.id && msg.payload.userId !== user.id) return;
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

    socket.onclose = () => setIsConnected(false);

    return () => socket.close();
  }, [toast, queryClient, user?.id]);

  return { prices, isConnected };
}

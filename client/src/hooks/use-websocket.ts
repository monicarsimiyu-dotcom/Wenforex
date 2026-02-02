import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ws, api } from '@shared/routes';
import { useToast } from './use-toast';
import { z } from 'zod';

export function useWebSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      // Subscribe to default market
      const msg = JSON.stringify({
        type: 'subscribe',
        payload: { market: 'BTC/USD' }
      });
      socket.send(msg);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'priceUpdate') {
          const payload = ws.receive.priceUpdate.parse(data.payload);
          setCurrentPrice(payload.price);
        } else if (data.type === 'tradeResult') {
          const payload = ws.receive.tradeResult.parse(data.payload);
          
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: [api.trades.list.path] });
          queryClient.invalidateQueries({ queryKey: [api.wallet.get.path] });
          
          toast({
            title: payload.result === 'won' ? "Trade Won! 🎉" : "Trade Lost",
            description: payload.result === 'won' 
              ? `You won $${payload.payout}` 
              : "Better luck next time.",
            variant: payload.result === 'won' ? "default" : "destructive",
            className: payload.result === 'won' ? "bg-green-600 border-green-700 text-white" : "",
          });
        }
      } catch (err) {
        console.error("WS Error:", err);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      // Simple reconnection logic could go here
    };

    return () => {
      socket.close();
    };
  }, [toast, queryClient]);

  return { currentPrice, isConnected };
}

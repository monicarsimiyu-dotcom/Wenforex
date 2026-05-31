import { useEffect, useRef, useState, useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from "@/components/ui/badge";

interface TradeMarker {
  id: string;
  direction: "buy" | "sell";
  entryPrice: number;
  entryTime: number;
}

interface TradingChartProps {
  currentPrice: number;
  marketKey?: string;
  tradeMarkers?: TradeMarker[];
}

const MAX_POINTS = 50;
const TICK_MS = 1000;

// Build a plausible price history leading up to `price` so the chart shows an
// accumulated curve the moment a user lands, instead of starting on a flat line.
function seedHistory(price: number): { time: number; price: number }[] {
  const points: { time: number; price: number }[] = [];
  const now = Date.now();
  const volatility = price * 0.001; // matches server tick volatility
  let p = price;
  // Walk backwards from the current price, then reverse into chronological order
  for (let i = 0; i < MAX_POINTS - 1; i++) {
    p = p - (Math.random() - 0.5) * 2 * volatility;
    points.push({ time: now - (i + 1) * TICK_MS, price: p });
  }
  points.reverse();
  points.push({ time: now, price });
  return points;
}

export function TradingChart({ currentPrice, marketKey, tradeMarkers = [] }: TradingChartProps) {
  // Store price history per market so switching markets doesn't reset the curve
  const historyRef = useRef<Record<string, { time: number; price: number }[]>>({});
  const [data, setData] = useState<{ time: number; price: number }[]>([]);

  // Append incoming price to the correct market's history, then update display
  useEffect(() => {
    if (!currentPrice || !marketKey) return;
    const key = marketKey;

    if (!historyRef.current[key] || historyRef.current[key].length === 0) {
      // First price for this market — seed an accumulated history curve
      historyRef.current[key] = seedHistory(currentPrice);
    } else {
      historyRef.current[key] = [
        ...historyRef.current[key],
        { time: Date.now(), price: currentPrice },
      ].slice(-MAX_POINTS);
    }

    setData([...historyRef.current[key]]);
  }, [currentPrice, marketKey]);

  // When market switches, immediately show that market's accumulated history
  useEffect(() => {
    if (!marketKey) return;
    setData(historyRef.current[marketKey] ? [...historyRef.current[marketKey]] : []);
  }, [marketKey]);

  const priceColor = useMemo(() => {
    if (data.length < 2) return "#FFA127";
    const last = data[data.length - 1].price;
    const prev = data[data.length - 2].price;
    return last >= prev ? "#22c55e" : "#ef4444";
  }, [data]);

  const domain = useMemo(() => {
    if (data.length === 0) return [0, 100];
    const prices = data.map(d => d.price);
    tradeMarkers.forEach(t => prices.push(t.entryPrice));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min) * 0.1 || max * 0.001;
    return [min - pad, max + pad];
  }, [data, tradeMarkers]);

  const visibleMarkers = useMemo(() => {
    if (data.length === 0) return [];
    const firstT = data[0].time;
    return tradeMarkers.filter(t => t.entryTime >= firstT);
  }, [tradeMarkers, data]);

  return (
    <div className="w-full h-full relative group">
      {/* Live Price Tag */}
      <div className="absolute top-4 right-4 z-10">
        <Badge variant="outline" className={`text-lg font-mono px-3 py-1 bg-background/80 backdrop-blur border-none shadow-lg ${
          priceColor === "#22c55e" ? "text-green-500" : "text-red-500"
        }`}>
          {currentPrice ? currentPrice.toFixed(2) : "Loading..."}
        </Badge>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={priceColor} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={priceColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="time" tick={false} axisLine={false} />
          <YAxis
            domain={domain}
            orientation="right"
            tick={{ fill: '#666', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
            tickCount={6}
            width={50}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-background/90 border border-white/10 p-2 rounded shadow-xl backdrop-blur-sm">
                    <p className="font-mono text-sm text-primary font-bold">
                      ${Number(payload[0].value).toFixed(2)}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />

          {visibleMarkers.map(t => {
            const color = t.direction === "buy" ? "#22c55e" : "#ef4444";
            const label = t.direction === "buy" ? "▲ BUY" : "▼ SELL";
            return (
              <ReferenceLine
                key={`h-${t.id}`}
                y={t.entryPrice}
                stroke={color}
                strokeDasharray="5 3"
                strokeWidth={1.5}
                label={{ value: `${label} @ ${t.entryPrice.toFixed(2)}`, position: "insideRight", fill: color, fontSize: 10, fontWeight: 700, dx: -4 }}
              />
            );
          })}

          <Area
            type="monotone"
            dataKey="price"
            stroke={priceColor}
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorPrice)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

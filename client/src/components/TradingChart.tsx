import { useEffect, useState, useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from "@/components/ui/badge";

interface ActiveTradeMarker {
  id: string;
  direction: "buy" | "sell";
  entryPrice: number;
  entryTime: number;
}

interface TradingChartProps {
  currentPrice: number;
  marketKey?: string;
  activeTrades?: ActiveTradeMarker[];
}

const MAX_POINTS = 90;
const SEED_POINTS = 60;
const TICK_MS = 1000;

// Build a believable backfill so the curve looks like it has been running
// before the user arrived, instead of starting as a flat line.
function seedHistory(price: number): { time: number; price: number }[] {
  const now = Date.now();
  const points: { time: number; price: number }[] = [];
  // Volatility scales with price magnitude
  const vol = Math.max(price * 0.0006, 0.0002);
  let p = price;
  // Walk backwards from current price, then reverse to get oldest -> newest
  for (let i = 0; i < SEED_POINTS; i++) {
    const drift = (Math.random() - 0.5) * vol * price;
    p = p - drift;
    points.push({ time: now - (SEED_POINTS - i) * TICK_MS, price: p });
  }
  // Make sure the last seeded point matches current price for a clean handoff
  points.push({ time: now, price });
  return points;
}

export function TradingChart({ currentPrice, marketKey, activeTrades = [] }: TradingChartProps) {
  const [data, setData] = useState<{ time: number; price: number }[]>([]);

  // Reset on market change
  useEffect(() => {
    setData([]);
  }, [marketKey]);

  // Update chart with live price (seed on first tick so the curve appears
  // already running instead of flat).
  useEffect(() => {
    if (currentPrice > 0) {
      setData(prev => {
        if (prev.length === 0) {
          return seedHistory(currentPrice);
        }
        const newData = [...prev, { time: Date.now(), price: currentPrice }];
        if (newData.length > MAX_POINTS) return newData.slice(newData.length - MAX_POINTS);
        return newData;
      });
    }
  }, [currentPrice]);

  const priceColor = useMemo(() => {
    if (data.length < 2) return "#FFA127";
    const last = data[data.length - 1].price;
    const prev = data[data.length - 2].price;
    return last >= prev ? "#22c55e" : "#ef4444";
  }, [data]);

  const domain = useMemo(() => {
    if (data.length === 0) return [0, 100];
    const prices = data.map(d => d.price);
    // Include entry prices in the domain so ref lines never get clipped
    activeTrades.forEach(t => prices.push(t.entryPrice));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min) * 0.12 || max * 0.001;
    return [min - pad, max + pad];
  }, [data, activeTrades]);

  // Filter to markers whose entry time falls within the visible range
  const visibleMarkers = useMemo(() => {
    if (data.length === 0) return [];
    const firstT = data[0].time;
    return activeTrades.filter(t => t.entryTime >= firstT);
  }, [activeTrades, data]);

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
        <AreaChart data={data} margin={{ top: 10, right: 4, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={priceColor} stopOpacity={0.35}/>
              <stop offset="95%" stopColor={priceColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="time"
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={false}
            axisLine={false}
          />
          <YAxis
            domain={domain}
            orientation="right"
            tick={{ fill: '#888', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
            tickCount={6}
            width={46}
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

          {/* Trade entry markers — dotted lines */}
          {visibleMarkers.map((t) => {
            const color = t.direction === "buy" ? "#22c55e" : "#ef4444";
            return (
              <ReferenceLine
                key={`v-${t.id}`}
                x={t.entryTime}
                stroke={color}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                ifOverflow="extendDomain"
                label={{
                  value: t.direction === "buy" ? "▲ ENTRY" : "▼ ENTRY",
                  position: "insideTopLeft",
                  fill: color,
                  fontSize: 10,
                  fontWeight: 700,
                  offset: 2,
                  dx: -2,
                }}
              />
            );
          })}
          {visibleMarkers.map((t) => {
            const color = t.direction === "buy" ? "#22c55e" : "#ef4444";
            return (
              <ReferenceLine
                key={`h-${t.id}`}
                y={t.entryPrice}
                stroke={color}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                ifOverflow="extendDomain"
                label={{
                  value: `@ ${t.entryPrice.toFixed(2)}`,
                  position: "insideRight",
                  fill: color,
                  fontSize: 10,
                  fontWeight: 700,
                  offset: 2,
                  dx: -2,
                }}
              />
            );
          })}

          <Area
            type="monotone"
            dataKey="price"
            stroke={priceColor}
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorPrice)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

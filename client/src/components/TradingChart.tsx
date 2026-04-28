import { useEffect, useState, useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from "@/components/ui/badge";

interface TradingChartProps {
  currentPrice: number;
  marketKey?: string;
}

const SEED_POINTS = 60;
const MAX_POINTS = 110;
const TICK_MS = 1000;

// Build a believable backfill so the curve looks like it has been running
// before the user arrived. Newest point is pinned to the live price; older
// points wander naturally backwards in time.
function seedHistory(price: number): { time: number; price: number }[] {
  const now = Date.now();
  const vol = Math.max(price * 0.001, 0.0002);
  const reversed: { time: number; price: number }[] = [{ time: now, price }];
  let p = price;
  for (let i = 1; i <= SEED_POINTS; i++) {
    const drift = (Math.random() - 0.5) * vol * price;
    p = p - drift;
    reversed.push({ time: now - i * TICK_MS, price: p });
  }
  return reversed.reverse();
}

export function TradingChart({ currentPrice, marketKey }: TradingChartProps) {
  const [data, setData] = useState<{ time: number; price: number }[]>([]);

  // Reset on market change
  useEffect(() => {
    setData([]);
  }, [marketKey]);

  // Seed the chart on first live price, then append each subsequent tick
  useEffect(() => {
    if (currentPrice > 0) {
      setData(prev => {
        if (prev.length === 0) return seedHistory(currentPrice);
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
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return [min - (max - min) * 0.1, max + (max - min) * 0.1];
  }, [data]);

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
              <stop offset="0%" stopColor={priceColor} stopOpacity={0.45}/>
              <stop offset="100%" stopColor={priceColor} stopOpacity={0.2}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="time" 
            tick={false} 
            axisLine={false} 
          />
          <YAxis 
            domain={domain} 
            orientation="right" 
            tick={{ fill: '#666', fontSize: 12, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
            tickCount={6}
            width={60}
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

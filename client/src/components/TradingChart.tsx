import { useEffect, useState, useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TradingChartProps {
  currentPrice: number;
}

// Mock initial data generation
const generateInitialData = () => {
  const data = [];
  let price = 45000;
  const now = Date.now();
  for (let i = 0; i < 50; i++) {
    price = price + (Math.random() - 0.5) * 100;
    data.push({
      time: now - (50 - i) * 1000,
      price: price
    });
  }
  return data;
};

export function TradingChart({ currentPrice }: TradingChartProps) {
  const [data, setData] = useState<{ time: number; price: number }[]>([]);

  // Initialize with mock data
  useEffect(() => {
    setData(generateInitialData());
  }, []);

  // Update chart with live price
  useEffect(() => {
    if (currentPrice > 0) {
      setData(prev => {
        const newData = [...prev, { time: Date.now(), price: currentPrice }];
        // Keep last 50 points
        if (newData.length > 50) return newData.slice(newData.length - 50);
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
              <stop offset="5%" stopColor={priceColor} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={priceColor} stopOpacity={0}/>
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

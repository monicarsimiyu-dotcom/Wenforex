import { useEffect, useState, useRef } from "react";
import { TrendingUp } from "lucide-react";

const START_VALUE = 30178989;

export function TradePoolCounter() {
  const [value, setValue] = useState(START_VALUE);
  const baseRef = useRef(START_VALUE);

  useEffect(() => {
    baseRef.current = START_VALUE + Math.floor((Date.now() / 1000) % 100000);
    setValue(baseRef.current);

    const id = setInterval(() => {
      // Random small increment, occasional small dip
      const delta =
        Math.random() < 0.85
          ? Math.floor(Math.random() * 850) + 50
          : -(Math.floor(Math.random() * 200) + 20);
      baseRef.current = Math.max(START_VALUE, baseRef.current + delta);
      setValue(baseRef.current);
    }, 700);

    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="hidden md:flex items-center gap-2 bg-background/50 border border-white/10 rounded-lg px-3 py-1.5"
      data-testid="trade-pool-counter"
    >
      <TrendingUp className="w-3.5 h-3.5 text-green-400" />
      <div className="flex flex-col leading-tight">
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
          Trade Pool
        </span>
        <span
          className="font-mono font-bold text-sm text-green-400 tabular-nums"
          data-testid="text-trade-pool-value"
        >
          ${value.toLocaleString("en-US")}
        </span>
      </div>
    </div>
  );
}

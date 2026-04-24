import { useEffect, useState, useRef } from "react";
import { TrendingUp, Users, Activity } from "lucide-react";

const START_VALUE = 30178989;

export function TradePoolCounter() {
  const [value, setValue] = useState(START_VALUE);
  const [traders, setTraders] = useState(12480);
  const [trades24h, setTrades24h] = useState(184320);
  const baseRef = useRef(START_VALUE);
  const tradersRef = useRef(12480);
  const trades24hRef = useRef(184320);

  useEffect(() => {
    baseRef.current = START_VALUE + Math.floor((Date.now() / 1000) % 100000);
    setValue(baseRef.current);

    const id = setInterval(() => {
      const delta =
        Math.random() < 0.85
          ? Math.floor(Math.random() * 850) + 50
          : -(Math.floor(Math.random() * 200) + 20);
      baseRef.current = Math.max(START_VALUE, baseRef.current + delta);
      setValue(baseRef.current);

      if (Math.random() < 0.4) {
        tradersRef.current += Math.random() < 0.7 ? 1 : -1;
        setTraders(tradersRef.current);
      }
      if (Math.random() < 0.6) {
        trades24hRef.current += Math.floor(Math.random() * 8) + 1;
        setTrades24h(trades24hRef.current);
      }
    }, 700);

    return () => clearInterval(id);
  }, []);

  return (
    <section
      className="w-full py-12 px-4 bg-gradient-to-b from-background via-card/40 to-background border-t border-border"
      data-testid="trade-pool-section"
    >
      <div className="max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-1.5 mb-5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-bold text-green-400 uppercase tracking-wider">
            Live Trade Pool
          </span>
        </div>

        <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-semibold mb-3">
          Total Pool Value
        </h2>

        <div
          className="font-mono font-black text-5xl md:text-7xl lg:text-8xl text-green-400 tabular-nums tracking-tight mb-2"
          data-testid="text-trade-pool-value"
        >
          ${value.toLocaleString("en-US")}
        </div>

        <p className="text-sm text-muted-foreground mb-10">
          Total funds currently active across the wenforex platform
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <div className="bg-card/50 border border-white/10 rounded-xl p-5 flex items-center gap-4" data-testid="stat-active-traders">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left flex-1">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Active Traders
              </div>
              <div className="font-mono font-bold text-2xl text-white tabular-nums">
                {traders.toLocaleString("en-US")}
              </div>
            </div>
          </div>

          <div className="bg-card/50 border border-white/10 rounded-xl p-5 flex items-center gap-4" data-testid="stat-trades-24h">
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <Activity className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-left flex-1">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Trades · 24h
              </div>
              <div className="font-mono font-bold text-2xl text-white tabular-nums">
                {trades24h.toLocaleString("en-US")}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-10 text-xs text-muted-foreground">
          <TrendingUp className="w-3.5 h-3.5 text-green-400" />
          <span>Updated in real time · Last tick {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </section>
  );
}

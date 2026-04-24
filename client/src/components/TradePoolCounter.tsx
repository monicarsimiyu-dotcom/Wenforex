import { useEffect, useState, useRef } from "react";
import { TrendingUp, TrendingDown, Users, Activity, ShieldCheck, ArrowUpRight } from "lucide-react";

const START_VALUE = 30178989;

export function TradePoolCounter() {
  const [value, setValue] = useState(START_VALUE);
  const [delta, setDelta] = useState(0);
  const [traders, setTraders] = useState(12480);
  const [trades24h, setTrades24h] = useState(184320);
  const [volume24h, setVolume24h] = useState(8429100);
  const [lastTick, setLastTick] = useState<string>("");

  const baseRef = useRef(START_VALUE);
  const tradersRef = useRef(12480);
  const trades24hRef = useRef(184320);
  const volume24hRef = useRef(8429100);

  useEffect(() => {
    baseRef.current = START_VALUE + Math.floor((Date.now() / 1000) % 100000);
    setValue(baseRef.current);
    setLastTick(new Date().toLocaleTimeString());

    const id = setInterval(() => {
      const change =
        Math.random() < 0.85
          ? Math.floor(Math.random() * 850) + 50
          : -(Math.floor(Math.random() * 200) + 20);
      baseRef.current = Math.max(START_VALUE, baseRef.current + change);
      setValue(baseRef.current);
      setDelta(change);

      if (Math.random() < 0.4) {
        tradersRef.current += Math.random() < 0.7 ? 1 : -1;
        setTraders(tradersRef.current);
      }
      if (Math.random() < 0.6) {
        trades24hRef.current += Math.floor(Math.random() * 8) + 1;
        setTrades24h(trades24hRef.current);
      }
      if (Math.random() < 0.7) {
        volume24hRef.current += Math.floor(Math.random() * 4000) + 500;
        setVolume24h(volume24hRef.current);
      }
      setLastTick(new Date().toLocaleTimeString());
    }, 700);

    return () => clearInterval(id);
  }, []);

  const isUp = delta >= 0;
  const dollars = Math.floor(value);
  const cents = Math.round((value - dollars) * 100)
    .toString()
    .padStart(2, "0");

  return (
    <section
      className="w-full py-16 px-4 bg-gradient-to-b from-background via-card/30 to-background border-t border-border/60"
      data-testid="trade-pool-section"
    >
      <div className="max-w-5xl mx-auto">
        {/* Top label row */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-3 py-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <span className="text-[10px] font-bold text-green-400 uppercase tracking-[0.18em]">
              Live
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/30 rounded-full px-3 py-1">
            <ShieldCheck className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.18em]">
              Verified Pool
            </span>
          </div>
        </div>

        {/* Main ticker card */}
        <div className="bg-gradient-to-br from-card/80 to-background border border-white/10 rounded-2xl p-8 md:p-12 shadow-2xl shadow-black/40 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                Wenforex · Total Trade Pool
              </span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
              USD
            </span>
          </div>

          <div className="flex items-baseline gap-2 md:gap-3 flex-wrap" data-testid="text-trade-pool-value">
            <span className="font-mono font-light text-3xl md:text-5xl text-muted-foreground/70 leading-none">
              $
            </span>
            <span className="font-mono font-black text-5xl md:text-7xl lg:text-8xl text-white tabular-nums tracking-tight leading-none">
              {dollars.toLocaleString("en-US")}
            </span>
            <span className="font-mono font-bold text-2xl md:text-4xl text-muted-foreground/80 tabular-nums leading-none">
              .{cents}
            </span>
          </div>

          <div className="mt-5 flex items-center justify-between flex-wrap gap-3">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-mono font-bold text-sm ${
                isUp
                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
              data-testid="text-pool-delta"
            >
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {isUp ? "+" : ""}
              {delta.toLocaleString("en-US")} USD
            </div>

            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Last update {lastTick}
            </div>
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label="Active Traders"
            value={traders.toLocaleString("en-US")}
            icon={<Users className="w-4 h-4" />}
            accent="text-primary"
            testid="stat-active-traders"
          />
          <StatCard
            label="Trades · 24h"
            value={trades24h.toLocaleString("en-US")}
            icon={<Activity className="w-4 h-4" />}
            accent="text-green-400"
            testid="stat-trades-24h"
          />
          <StatCard
            label="Volume · 24h"
            value={`$${volume24h.toLocaleString("en-US")}`}
            icon={<ArrowUpRight className="w-4 h-4" />}
            accent="text-blue-400"
            testid="stat-volume-24h"
          />
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[10px] text-muted-foreground/70 uppercase tracking-[0.18em] font-semibold">
          Aggregated platform liquidity · Updated in real time
        </p>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
  testid,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  testid: string;
}) {
  return (
    <div
      className="bg-card/40 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:border-white/20 transition-colors"
      data-testid={testid}
    >
      <div className="flex flex-col">
        <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">
          {label}
        </span>
        <span className="font-mono font-bold text-xl text-white tabular-nums">
          {value}
        </span>
      </div>
      <div className={`w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center ${accent}`}>
        {icon}
      </div>
    </div>
  );
}

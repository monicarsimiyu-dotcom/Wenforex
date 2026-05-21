import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTrades, useCreateTrade } from "@/hooks/use-trades";
import { useWebSocket } from "@/hooks/use-websocket";
import { Header } from "@/components/Header";
import { TradingChart } from "@/components/TradingChart";
import { TradePoolCounter } from "@/components/TradePoolCounter";
import { Footer } from "@/components/Footer";
import { DepositModal, WithdrawModal } from "@/components/TransactionModals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, Clock, Activity, Minus, Plus } from "lucide-react";
import { format } from "date-fns";

const MARKETS = [
  { code: "BTC/USD", label: "Bitcoin", icon: "₿", color: "text-orange-400" },
  { code: "ETH/USD", label: "Ethereum", icon: "Ξ", color: "text-indigo-400" },
  { code: "EUR/USD", label: "Euro", icon: "€", color: "text-blue-400" },
  { code: "GBP/USD", label: "Pound", icon: "£", color: "text-emerald-400" },
  { code: "USD/JPY", label: "Yen", icon: "¥", color: "text-pink-400" },
  { code: "GOLD",    label: "Gold",  icon: "Au", color: "text-yellow-400" },
];

const DURATIONS: { value: number; label: string }[] = [
  { value: 15,   label: "15s" },
  { value: 30,   label: "30s" },
  { value: 60,   label: "1m"  },
  { value: 120,  label: "2m"  },
  { value: 300,  label: "5m"  },
  { value: 900,  label: "15m" },
  { value: 1800, label: "30m" },
];
const PROFIT_PCT = 82;

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { prices } = useWebSocket();
  const { data: trades } = useTrades();
  const { mutate: createTrade, isPending: isTrading } = useCreateTrade();
  const { toast } = useToast();

  const [market, setMarket]   = useState("BTC/USD");
  const [amount, setAmount]   = useState(100);
  const [duration, setDuration] = useState(60);
  const [depositOpen, setDepositOpen]   = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const currentPrice    = prices[market] || 0;
  const potentialProfit = (amount * (PROFIT_PCT / 100)).toFixed(2);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("paystack")) {
      const reference = url.searchParams.get("reference");
      if (reference) {
        fetch(`/api/paystack/verify?reference=${reference}`)
          .then(r => r.json())
          .then(d => {
            if (d.status === "success") {
              toast({ title: "Deposit successful", description: "Your live wallet has been credited." });
            } else {
              toast({ title: "Payment pending", description: "We'll credit your wallet once it confirms." });
            }
          });
      }
      url.searchParams.delete("paystack");
      url.searchParams.delete("reference");
      window.history.replaceState({}, "", url.toString());
    }
  }, [toast]);

  const handleTrade = (direction: "buy" | "sell") => {
    if (!user) { window.location.href = "/api/login"; return; }
    if (!currentPrice) {
      toast({ title: "Wait for market data", description: "Connecting to live feed...", variant: "destructive" });
      return;
    }
    createTrade(
      { market, direction, amount, duration },
      {
        onSuccess: () => {
          toast({
            title: `${direction === "buy" ? "BUY ↑" : "SELL ↓"} placed`,
            description: `KSh ${amount} on ${market} for ${duration < 60 ? `${duration}s` : `${duration / 60}m`}`,
          });
        },
        onError: (err: any) => {
          toast({ title: "Trade failed", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const activeTrades = (trades || []).filter((t: any) => t.status === "active");
  const closedTrades = (trades || []).filter((t: any) => t.status !== "active").slice(0, 20);

  return (
    <div className="min-h-screen w-full flex flex-col bg-background text-foreground">
      <Header onDeposit={() => setDepositOpen(true)} onWithdraw={() => setWithdrawOpen(true)} />

      <main className="grid grid-cols-12 gap-px bg-black/30">

        {/* ── Chart area ── */}
        <section className="col-span-12 lg:col-span-9 flex flex-col min-h-[72vh]" style={{ background: "hsl(222 20% 11%)" }}>

          {/* Market tabs */}
          <div
            className="h-12 border-b border-white/5 flex items-center px-2 gap-1 overflow-x-auto shrink-0"
            style={{ background: "hsl(222 18% 14%)" }}
            data-testid="market-tabs"
          >
            {MARKETS.map(m => {
              const price    = prices[m.code] || 0;
              const isActive = market === m.code;
              return (
                <button
                  key={m.code}
                  onClick={() => setMarket(m.code)}
                  className={`shrink-0 h-8 px-3 flex items-center gap-2 rounded-md text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? "bg-primary/20 text-white border border-primary/50 shadow-sm shadow-primary/10"
                      : "text-muted-foreground border border-transparent hover:bg-white/5 hover:text-white"
                  }`}
                  data-testid={`market-${m.code.replace("/", "-")}`}
                >
                  <span className={`font-mono font-bold text-[13px] ${m.color}`}>{m.icon}</span>
                  <span className="font-bold tracking-wide">{m.code}</span>
                  <span className={`font-mono text-[10px] ${isActive ? "text-white/70" : "text-muted-foreground/70"}`}>
                    {price > 0 ? price.toFixed(price > 100 ? 2 : 4) : "—"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Asset bar */}
          <div
            className="h-9 border-b border-white/5 flex items-center px-4 justify-between shrink-0"
            style={{ background: "hsl(222 18% 13%)" }}
          >
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm tracking-wide" data-testid="text-current-market">{market}</span>
              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide ${
                currentPrice > 0
                  ? "bg-green-500/15 text-green-400 border border-green-500/25"
                  : "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${currentPrice > 0 ? "bg-green-400" : "bg-yellow-400"} animate-pulse`} />
                {currentPrice > 0 ? "LIVE" : "Connecting"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Payout <span className="text-green-400 font-bold">+{PROFIT_PCT}%</span>
              </span>
            </div>
            <div className="font-mono font-bold text-sm text-primary tabular-nums" data-testid="text-current-price">
              {currentPrice > 0 ? currentPrice.toFixed(currentPrice > 100 ? 2 : 4) : "—"}
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 relative" data-testid="chart-area">
            <TradingChart
              currentPrice={currentPrice}
              marketKey={market}
              tradeMarkers={activeTrades
                .filter((t: any) => t.market === market)
                .map((t: any) => ({
                  id: t.id,
                  direction: t.direction as "buy" | "sell",
                  entryPrice: Number(t.entryPrice),
                  entryTime: new Date(t.createdAt).getTime(),
                }))}
            />
          </div>

          {/* Trade history strip */}
          <div className="h-20 border-t border-white/5 shrink-0 overflow-hidden" style={{ background: "hsl(222 18% 14%)" }}>
            <Tabs defaultValue="active" className="h-full flex flex-col">
              <TabsList className="bg-transparent h-7 px-3 justify-start gap-2 rounded-none shrink-0 border-b border-white/5">
                <TabsTrigger value="active" className="h-5 text-[10px] px-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-sm" data-testid="tab-active-trades">
                  Open ({activeTrades.length})
                </TabsTrigger>
                <TabsTrigger value="history" className="h-5 text-[10px] px-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-sm" data-testid="tab-history">
                  History
                </TabsTrigger>
              </TabsList>
              <TabsContent value="active" className="flex-1 m-0 overflow-y-auto">
                <TradeRows trades={activeTrades} />
              </TabsContent>
              <TabsContent value="history" className="flex-1 m-0 overflow-y-auto">
                <TradeRows trades={closedTrades} />
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* ── Trade panel ── */}
        <aside
          className="col-span-12 lg:col-span-3 flex flex-col p-4 gap-4 border-l border-white/5"
          style={{ background: "hsl(222 18% 14%)" }}
          data-testid="trade-panel"
        >
          {/* Amount */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Amount (KES)
            </label>
            <div className="flex items-center gap-1.5">
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 shrink-0 border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                onClick={() => setAmount(Math.max(10, amount - 100))}
                data-testid="button-amount-decrease"
              >
                <Minus className="w-3.5 h-3.5" />
              </Button>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(Math.max(10, Number(e.target.value) || 0))}
                className="text-center font-mono font-bold text-base border-white/10 bg-white/5 h-10 focus:border-primary/50 focus:ring-0"
                data-testid="input-amount"
              />
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 shrink-0 border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                onClick={() => setAmount(amount + 100)}
                data-testid="button-amount-increase"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[100, 500, 1000, 5000].map(v => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className={`text-[10px] px-2.5 py-1 rounded-md font-bold transition-all ${
                    amount === v
                      ? "bg-primary/20 border border-primary/50 text-primary"
                      : "border border-white/10 text-muted-foreground hover:border-white/25 hover:text-white"
                  }`}
                  data-testid={`button-quick-amount-${v}`}
                >
                  {v.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/5" />

          {/* Duration */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Duration
            </label>
            <div className="grid grid-cols-4 gap-1">
              {DURATIONS.map(d => (
                <button
                  key={d.value}
                  onClick={() => setDuration(d.value)}
                  className={`h-8 rounded-md font-bold text-xs transition-all ${
                    duration === d.value
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "bg-white/5 border border-white/8 text-muted-foreground hover:bg-white/10 hover:text-white hover:border-white/20"
                  }`}
                  data-testid={`button-duration-${d.value}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/5" />

          {/* Profit preview */}
          <div
            className="rounded-xl p-3.5 flex items-center justify-between"
            style={{
              background: "linear-gradient(135deg, hsl(142 60% 10% / 0.8), hsl(222 20% 14%))",
              border: "1px solid hsl(142 60% 25% / 0.25)",
            }}
          >
            <div>
              <div className="text-[9px] uppercase font-bold tracking-[0.18em] text-muted-foreground mb-0.5">Potential Profit</div>
              <div className="font-mono font-bold text-green-400 text-xl leading-tight" data-testid="text-potential-profit">
                +KSh {potentialProfit}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] uppercase font-bold tracking-[0.18em] text-muted-foreground mb-0.5">Payout</div>
              <div className="font-mono font-bold text-primary text-xl leading-tight">+{PROFIT_PCT}%</div>
            </div>
          </div>

          {/* BUY / SELL */}
          <div className="grid grid-cols-2 gap-2 mt-auto">
            <Button
              onClick={() => handleTrade("buy")}
              disabled={isTrading || authLoading}
              className="h-14 text-base font-extrabold text-white border-0 rounded-xl transition-all"
              style={{
                background: "linear-gradient(160deg, #22c55e, #16a34a)",
                boxShadow: "0 4px 20px hsl(142 70% 35% / 0.35)",
              }}
              data-testid="button-call"
            >
              <TrendingUp className="w-5 h-5 mr-1.5" /> BUY
            </Button>
            <Button
              onClick={() => handleTrade("sell")}
              disabled={isTrading || authLoading}
              className="h-14 text-base font-extrabold text-white border-0 rounded-xl transition-all"
              style={{
                background: "linear-gradient(160deg, #ef4444, #dc2626)",
                boxShadow: "0 4px 20px hsl(0 84% 50% / 0.35)",
              }}
              data-testid="button-put"
            >
              <TrendingDown className="w-5 h-5 mr-1.5" /> SELL
            </Button>
          </div>
        </aside>
      </main>

      <TradePoolCounter />
      <Footer />

      <DepositModal open={depositOpen} onOpenChange={setDepositOpen} userEmail={user?.email || ""} />
      <WithdrawModal open={withdrawOpen} onOpenChange={setWithdrawOpen} />
    </div>
  );
}

function TradeRows({ trades }: { trades: any[] }) {
  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-3">
        <Activity className="w-5 h-5 mb-1 opacity-20" />
        <p className="text-[10px]">No trades yet</p>
      </div>
    );
  }
  return (
    <div className="divide-y divide-white/5 text-xs">
      {trades.map(trade => (
        <div
          key={trade.id}
          className="px-3 py-1.5 grid grid-cols-12 items-center gap-2 hover:bg-white/3 transition-colors"
          data-testid={`trade-row-${trade.id}`}
        >
          <div className={`col-span-1 ${trade.direction === "buy" ? "text-green-400" : "text-red-400"}`}>
            {trade.direction === "buy" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          </div>
          <div className="col-span-3 font-semibold truncate text-white/90">{trade.market}</div>
          <div className="col-span-2 font-mono text-muted-foreground">{format(new Date(trade.createdAt), "HH:mm")}</div>
          <div className="col-span-3 font-mono text-right text-white/70">KSh {Number(trade.amount).toFixed(0)}</div>
          <div className="col-span-3 text-right font-mono font-bold">
            {trade.status === "active" ? (
              <span className="text-primary animate-pulse">Live</span>
            ) : trade.status === "won" ? (
              <span className="text-green-400">+{Number(trade.payout).toFixed(0)}</span>
            ) : (
              <span className="text-red-400">-{Number(trade.amount).toFixed(0)}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

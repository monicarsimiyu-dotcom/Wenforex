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

// Durations in seconds with display labels
const DURATIONS: { value: number; label: string }[] = [
  { value: 15, label: "15s" },
  { value: 30, label: "30s" },
  { value: 60, label: "1m" },
  { value: 120, label: "2m" },
  { value: 300, label: "5m" },
  { value: 900, label: "15m" },
  { value: 1800, label: "30m" },
];
const PROFIT_PCT = 82;

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { prices, isConnected } = useWebSocket();
  const { data: trades } = useTrades();
  const { mutate: createTrade, isPending: isTrading } = useCreateTrade();
  const { toast } = useToast();

  const [market, setMarket] = useState("BTC/USD");
  const [amount, setAmount] = useState(100);
  const [duration, setDuration] = useState(60);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const currentPrice = prices[market] || 0;
  const potentialProfit = (amount * (PROFIT_PCT / 100)).toFixed(2);

  // Show toast on Paystack callback return
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("paystack")) {
      const reference = url.searchParams.get("reference");
      if (reference) {
        fetch(`/api/paystack/verify?reference=${reference}`)
          .then((r) => r.json())
          .then((d) => {
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
    if (!user) {
      window.location.href = "/api/login";
      return;
    }
    if (!currentPrice) {
      toast({ title: "Wait for market data", description: "Connecting to live feed...", variant: "destructive" });
      return;
    }
    createTrade(
      { market, direction, amount, duration },
      {
        onSuccess: () => {
          toast({
            title: `${direction === "buy" ? "CALL ↑" : "PUT ↓"} placed`,
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

      <main className="grid grid-cols-12 gap-px bg-border/40">
        {/* ==== Chart center ==== */}
        <section className="col-span-12 lg:col-span-9 flex flex-col bg-background/60 min-h-[72vh]">
          {/* Market tabs */}
          <div
            className="h-12 border-b border-border/50 flex items-center px-2 bg-card/30 gap-1 overflow-x-auto shrink-0"
            data-testid="market-tabs"
          >
            {MARKETS.map((m) => {
              const price = prices[m.code] || 0;
              const isActive = market === m.code;
              return (
                <button
                  key={m.code}
                  onClick={() => setMarket(m.code)}
                  className={`shrink-0 h-9 px-3 flex items-center gap-2 rounded-md transition-colors ${
                    isActive
                      ? "bg-primary/15 text-white border border-primary/40"
                      : "hover:bg-white/5 text-muted-foreground border border-transparent"
                  }`}
                  data-testid={`market-${m.code.replace("/", "-")}`}
                >
                  <span className={`font-mono font-bold ${m.color}`}>{m.icon}</span>
                  <span className="text-xs font-bold">{m.code}</span>
                  <span className="text-[10px] font-mono opacity-70">
                    {price > 0 ? price.toFixed(price > 100 ? 2 : 4) : "—"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Asset bar */}
          <div className="h-10 border-b border-border/50 flex items-center px-4 bg-card/20 justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm" data-testid="text-current-market">{market}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isConnected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                {isConnected ? "● LIVE" : "OFFLINE"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Payout <span className="text-green-400 font-bold">+{PROFIT_PCT}%</span>
              </span>
            </div>
            <div className="font-mono font-bold text-sm text-primary" data-testid="text-current-price">
              {currentPrice > 0 ? currentPrice.toFixed(currentPrice > 100 ? 2 : 4) : "..."}
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 relative" data-testid="chart-area">
            <TradingChart currentPrice={currentPrice} marketKey={market} />
          </div>

          {/* History strip (compact) */}
          <div className="h-20 border-t border-border/50 bg-card/20 shrink-0 overflow-hidden">
            <Tabs defaultValue="active" className="h-full flex flex-col">
              <TabsList className="bg-transparent h-7 px-2 justify-start gap-1 rounded-none shrink-0">
                <TabsTrigger value="active" className="h-6 text-[10px] px-2" data-testid="tab-active-trades">
                  Open ({activeTrades.length})
                </TabsTrigger>
                <TabsTrigger value="history" className="h-6 text-[10px] px-2" data-testid="tab-history">
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

        {/* ==== Trade panel (right) ==== */}
        <aside className="col-span-12 lg:col-span-3 bg-card/40 flex flex-col p-3 gap-3" data-testid="trade-panel">
          {/* Amount */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Amount (KES)
            </label>
            <div className="flex items-center gap-1 mt-1">
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 shrink-0 bg-background/50"
                onClick={() => setAmount(Math.max(10, amount - 100))}
                data-testid="button-amount-decrease"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Math.max(10, Number(e.target.value) || 0))}
                className="text-center font-mono font-bold text-base bg-background/50 border-white/10 h-10"
                data-testid="input-amount"
              />
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 shrink-0 bg-background/50"
                onClick={() => setAmount(amount + 100)}
                data-testid="button-amount-increase"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {[100, 500, 1000, 5000].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className="text-[10px] px-2 py-1 rounded border border-white/10 hover:border-primary hover:text-primary text-muted-foreground font-bold"
                  data-testid={`button-quick-amount-${v}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Duration
            </label>
            <div className="grid grid-cols-4 gap-1 mt-1">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDuration(d.value)}
                  className={`h-9 rounded font-bold text-xs transition-all ${
                    duration === d.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-background/50 border border-white/10 text-muted-foreground hover:text-white"
                  }`}
                  data-testid={`button-duration-${d.value}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Profit preview */}
          <div className="bg-background/50 border border-white/5 rounded-lg p-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Potential Profit</div>
              <div className="font-mono font-bold text-green-400 text-lg" data-testid="text-potential-profit">
                +KSh {potentialProfit}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Payout</div>
              <div className="font-mono font-bold text-primary">+{PROFIT_PCT}%</div>
            </div>
          </div>

          {/* Trade buttons */}
          <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
            <Button
              onClick={() => handleTrade("buy")}
              disabled={isTrading || authLoading}
              className="h-14 text-base font-extrabold bg-green-500 hover:bg-green-600 text-white border-0 shadow-none rounded-md"
              data-testid="button-call"
            >
              <TrendingUp className="w-5 h-5 mr-1" /> UP
            </Button>
            <Button
              onClick={() => handleTrade("sell")}
              disabled={isTrading || authLoading}
              className="h-14 text-base font-extrabold bg-red-600 hover:bg-red-700 text-white border-0 shadow-none rounded-md"
              data-testid="button-put"
            >
              <TrendingDown className="w-5 h-5 mr-1" /> DOWN
            </Button>
          </div>
        </aside>
      </main>

      {/* Trade pool counter — appears below the trade buttons after scrolling */}
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
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-4">
        <Activity className="w-6 h-6 mb-1 opacity-30" />
        <p className="text-xs">No trades</p>
      </div>
    );
  }
  return (
    <div className="divide-y divide-border/30 text-xs">
      {trades.map((trade) => (
        <div
          key={trade.id}
          className="px-3 py-1.5 grid grid-cols-12 items-center gap-2 hover:bg-white/5"
          data-testid={`trade-row-${trade.id}`}
        >
          <div className={`col-span-1 ${trade.direction === "buy" ? "text-green-400" : "text-red-400"}`}>
            {trade.direction === "buy" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          </div>
          <div className="col-span-3 font-bold truncate">{trade.market}</div>
          <div className="col-span-2 font-mono text-muted-foreground">{format(new Date(trade.createdAt), "HH:mm")}</div>
          <div className="col-span-3 font-mono text-right">KSh {Number(trade.amount).toFixed(0)}</div>
          <div className="col-span-3 text-right font-mono font-bold">
            {trade.status === "active" ? (
              <span className="text-primary animate-pulse">Running</span>
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

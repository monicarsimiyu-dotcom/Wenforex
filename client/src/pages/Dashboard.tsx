import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTrades, useCreateTrade } from "@/hooks/use-trades";
import { useWallet } from "@/hooks/use-wallet";
import { useWebSocket } from "@/hooks/use-websocket";
import { Header } from "@/components/Header";
import { TradingChart } from "@/components/TradingChart";
import { DepositModal, WithdrawModal } from "@/components/TransactionModals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, TrendingDown, Clock, History, Activity } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const { currentPrice, isConnected } = useWebSocket();
  const { data: trades, isLoading: tradesLoading } = useTrades();
  const { mutate: createTrade, isPending: isTrading } = useCreateTrade();
  const { toast } = useToast();
  
  const [amount, setAmount] = useState(10);
  const [duration, setDuration] = useState(60); // seconds
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const profitPercentage = 82; // Static for now, usually dynamic
  const potentialProfit = (amount * (profitPercentage / 100)).toFixed(2);

  const handleTrade = (direction: "buy" | "sell") => {
    if (!currentPrice) {
      toast({ title: "Error", description: "Waiting for market data...", variant: "destructive" });
      return;
    }

    createTrade({
      market: "BTC/USD",
      direction,
      amount,
      duration,
    }, {
      onSuccess: () => {
        toast({ title: "Trade Placed", description: `${direction === 'buy' ? 'CALL' : 'PUT'} trade for $${amount}` });
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header 
        onDeposit={() => setDepositOpen(true)} 
        onWithdraw={() => setWithdrawOpen(true)} 
      />

      <main className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
        
        {/* LEFT: Chart & Assets */}
        <div className="flex-1 flex flex-col min-h-[50vh] relative border-r border-border">
          {/* Asset Info Bar */}
          <div className="h-12 border-b border-border flex items-center px-4 bg-card/30 justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                <span className="text-orange-500 font-bold text-xs">₿</span>
              </div>
              <span className="font-bold text-sm">BTC/USD</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${isConnected ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                {isConnected ? 'Live' : 'Connecting...'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
              <span>Payout: <span className="text-green-500 font-bold">{profitPercentage}%</span></span>
            </div>
          </div>

          {/* Chart Area */}
          <div className="flex-1 relative bg-gradient-to-b from-background to-background/50">
            <TradingChart currentPrice={currentPrice} />
          </div>

          {/* Bottom Trades List (Desktop) */}
          <div className="h-64 border-t border-border bg-card/20 hidden lg:block">
            <Tabs defaultValue="active" className="h-full flex flex-col">
              <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                <TabsList className="bg-transparent p-0 gap-4">
                  <TabsTrigger value="active" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full px-4 h-8">Active Trades</TabsTrigger>
                  <TabsTrigger value="history" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full px-4 h-8">History</TabsTrigger>
                </TabsList>
              </div>
              <ScrollArea className="flex-1">
                <TabsContent value="active" className="m-0">
                  <TradeList trades={trades?.filter(t => t.status === 'active') || []} />
                </TabsContent>
                <TabsContent value="history" className="m-0">
                  <TradeList trades={trades?.filter(t => t.status !== 'active') || []} />
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>

        {/* RIGHT: Trading Panel */}
        <div className="w-full lg:w-80 bg-card border-l border-border flex flex-col shadow-xl z-20">
          <div className="p-6 space-y-6 flex-1">
            
            {/* Amount Input */}
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Amount ($)</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="h-12 text-lg font-mono bg-background/50 border-border focus:border-primary pr-12"
                />
                <div className="absolute right-0 top-0 h-full flex flex-col border-l border-border">
                  <button onClick={() => setAmount(a => a + 1)} className="flex-1 px-2 hover:bg-white/5 text-xs">+</button>
                  <button onClick={() => setAmount(a => Math.max(1, a - 1))} className="flex-1 px-2 hover:bg-white/5 text-xs">-</button>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                {[10, 50, 100, 500].map(val => (
                  <button 
                    key={val}
                    onClick={() => setAmount(val)}
                    className="flex-1 py-1 text-xs rounded bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                  >
                    ${val}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Input */}
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Time (Sec)</Label>
              <div className="grid grid-cols-3 gap-2">
                {[30, 60, 120].map(sec => (
                  <button
                    key={sec}
                    onClick={() => setDuration(sec)}
                    className={`h-10 rounded border text-sm font-medium transition-all ${
                      duration === sec 
                        ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' 
                        : 'bg-background/50 border-border hover:bg-white/5'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
              <div className="text-center text-xs text-muted-foreground pt-1 flex items-center justify-center gap-1">
                 <Clock className="w-3 h-3" /> Closes at {format(new Date(Date.now() + duration * 1000), "HH:mm:ss")}
              </div>
            </div>

            {/* Profit Info */}
            <div className="p-4 rounded-xl bg-background/30 border border-white/5 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Profit</span>
                <span className="text-green-500 font-bold">+{profitPercentage}%</span>
              </div>
              <div className="flex justify-between text-2xl font-bold text-green-400 font-mono">
                <span>+${potentialProfit}</span>
              </div>
            </div>
            
            <div className="flex-1" />

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={() => handleTrade("buy")}
                disabled={isTrading || !isConnected}
                className="h-24 flex flex-col items-center justify-center bg-green-600 hover:bg-green-500 hover:-translate-y-1 transition-all shadow-lg shadow-green-900/30 border-b-4 border-green-800 active:border-b-0 active:translate-y-1"
              >
                <TrendingUp className="w-8 h-8 mb-1" />
                <span className="text-lg font-bold">CALL</span>
                <span className="text-xs opacity-70">Price Up</span>
              </Button>

              <Button 
                onClick={() => handleTrade("sell")}
                disabled={isTrading || !isConnected}
                className="h-24 flex flex-col items-center justify-center bg-red-600 hover:bg-red-500 hover:-translate-y-1 transition-all shadow-lg shadow-red-900/30 border-b-4 border-red-800 active:border-b-0 active:translate-y-1"
              >
                <TrendingDown className="w-8 h-8 mb-1" />
                <span className="text-lg font-bold">PUT</span>
                <span className="text-xs opacity-70">Price Down</span>
              </Button>
            </div>

          </div>
        </div>

        {/* Mobile Trades Sheet (Optional - could be a drawer) */}
      </main>

      <DepositModal 
        open={depositOpen} 
        onOpenChange={setDepositOpen} 
        userEmail={user?.email || ""}
      />
      <WithdrawModal 
        open={withdrawOpen} 
        onOpenChange={setWithdrawOpen} 
      />
    </div>
  );
}

function TradeList({ trades }: { trades: any[] }) {
  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <Activity className="w-10 h-10 mb-2 opacity-20" />
        <p>No trades found</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {trades.map((trade) => (
        <div key={trade.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${trade.direction === 'buy' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
              {trade.direction === 'buy' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            </div>
            <div>
              <p className="font-bold text-sm">{trade.market}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(trade.createdAt), "HH:mm:ss")}</p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="font-mono font-bold">${Number(trade.amount).toFixed(2)}</p>
            {trade.status === 'active' ? (
              <Badge variant="outline" className="text-xs border-primary text-primary animate-pulse">Running</Badge>
            ) : (
              <span className={`text-xs font-bold ${trade.status === 'won' ? 'text-green-500' : 'text-red-500'}`}>
                {trade.status === 'won' ? `+$${Number(trade.payout).toFixed(2)}` : '-$0.00'}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

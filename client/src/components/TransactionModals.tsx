import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWithdraw } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, Building2, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

// ── Deposit Modal ──────────────────────────────────────────────────────────

interface DepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail?: string;
}

const QUICK_PICKS = [
  { kes: 650, usd: 5 },
  { kes: 1300, usd: 10 },
  { kes: 2600, usd: 20 },
  { kes: 6500, usd: 50 },
  { kes: 13000, usd: 100 },
  { kes: 26000, usd: 200 },
];

export function DepositModal({ open, onOpenChange }: DepositModalProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState(1300);
  const [phone, setPhone] = useState("");
  const [stkState, setStkState] = useState<"idle" | "sending" | "sent" | "success" | "failed">("idle");

  const phoneValid = /^(?:\+?254|0)?[17]\d{8}$/.test(phone.replace(/\s+/g, ""));

  // Poll the deposit status until TinyPesa confirms payment (or it times out),
  // then credit reflects automatically in the wallet.
  const pollStatus = (requestId: string) => {
    const deadline = Date.now() + 150000; // ~2.5 min
    const tick = async () => {
      try {
        const res = await fetch(`/api/deposit/tinypesa/status/${requestId}`, { credentials: "include" });
        const { status } = await res.json();
        if (status === "success") {
          setStkState("success");
          await queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
          toast({ title: "Deposit successful!", description: `KSh ${amount.toLocaleString()} added to your live account.` });
          return;
        }
        if (status === "failed") {
          setStkState("failed");
          toast({ title: "Payment not completed", description: "The M-PESA payment was cancelled or failed.", variant: "destructive" });
          return;
        }
      } catch {
        /* keep polling */
      }
      if (Date.now() < deadline) setTimeout(tick, 3000);
    };
    setTimeout(tick, 3000);
  };

  const sendStkPush = async () => {
    if (!phoneValid) {
      toast({ title: "Invalid phone number", description: "Enter a valid Safaricom number, e.g. 07XX XXX XXX", variant: "destructive" });
      return;
    }
    setStkState("sending");
    try {
      const res = await apiRequest("POST", "/api/deposit/tinypesa/initiate", { amount, phone });
      const { requestId } = await res.json();
      setStkState("sent");
      toast({
        title: "STK push sent!",
        description: "Check your phone and enter your M-PESA PIN to complete the payment.",
      });
      if (requestId) pollStatus(requestId);
    } catch (err: any) {
      setStkState("idle");
      toast({ title: "Could not send STK push", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-modal sm:max-w-sm" data-testid="modal-deposit">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">Deposit via M-PESA</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1 max-h-[78vh] overflow-y-auto pr-1">

          {/* ── Amount picker ── */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Select Amount (KES)</label>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(Math.max(1, Number(e.target.value) || 0))}
              className="bg-background/50 border-white/10 focus:border-primary text-lg h-11"
              data-testid="input-deposit-amount"
            />
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PICKS.map(({ kes, usd }) => (
                <button
                  key={kes}
                  type="button"
                  onClick={() => setAmount(kes)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md border transition-all ${
                    amount === kes
                      ? "border-primary text-primary bg-primary/10"
                      : "border-white/10 text-muted-foreground hover:border-primary hover:text-primary"
                  }`}
                  data-testid={`button-quick-${kes}`}
                >
                  KSh {kes.toLocaleString()} <span className="opacity-60">(${usd})</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Pay with M-PESA ── */}
          <div className="rounded-xl border border-green-500/40 bg-green-500/15 p-4 space-y-3">
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-green-300" /> Pay with M-PESA
            </p>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">M-PESA Phone Number</label>
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="07XX XXX XXX"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="bg-background/50 border-white/10 focus:border-primary h-11 text-base tracking-wide"
                data-testid="input-mpesa-phone"
              />
            </div>

            <Button
              type="button"
              onClick={sendStkPush}
              disabled={stkState === "sending" || !phoneValid}
              className="w-full h-11 text-sm font-bold bg-green-500 hover:bg-green-500/90 text-white"
              data-testid="button-send-stk"
            >
              {stkState === "sending" ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending prompt…</>
              ) : stkState === "sent" ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Waiting for payment…</>
              ) : stkState === "success" ? (
                <><Smartphone className="w-4 h-4 mr-2" /> Pay Again</>
              ) : stkState === "failed" ? (
                <><Smartphone className="w-4 h-4 mr-2" /> Retry Payment</>
              ) : (
                <><Smartphone className="w-4 h-4 mr-2" /> Pay KSh {amount.toLocaleString()}</>
              )}
            </Button>

            {stkState === "sent" && (
              <div className="flex items-start gap-2.5 rounded-lg bg-background/60 border border-green-500/20 px-3 py-2.5" data-testid="status-stk-sent">
                <Loader2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5 animate-spin" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Payment prompt sent to <span className="text-white font-semibold">{phone}</span>. Enter your M-PESA PIN — your balance updates automatically once payment is confirmed.
                </p>
              </div>
            )}

            {stkState === "success" && (
              <div className="flex items-start gap-2.5 rounded-lg bg-green-500/15 border border-green-500/40 px-3 py-2.5" data-testid="status-stk-success">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                <p className="text-xs text-green-100 leading-relaxed">
                  Payment confirmed — <span className="font-semibold">KSh {amount.toLocaleString()}</span> has been added to your live account.
                </p>
              </div>
            )}

            {stkState === "failed" && (
              <div className="flex items-start gap-2.5 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2.5" data-testid="status-stk-failed">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-100 leading-relaxed">
                  Payment was cancelled or not completed. You can try again.
                </p>
              </div>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Withdraw Modal ─────────────────────────────────────────────────────────

const mpesaSchema = z.object({
  amount: z.coerce.number().min(1000, "Minimum withdrawal is KSh 1,000"),
  phoneNumber: z.string().regex(/^(?:\+?254|0)?[17]\d{8}$/, "Enter valid Kenyan number"),
});

const bankSchema = z.object({
  amount: z.coerce.number().min(1000, "Minimum bank withdrawal is KSh 1,000"),
  bankCode: z.string().min(1, "Select a bank"),
  accountNumber: z.string().min(8, "Invalid account number"),
});

interface WithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WithdrawModal({ open, onOpenChange }: WithdrawModalProps) {
  const { toast } = useToast();
  const { mutate: withdraw, isPending } = useWithdraw();

  const mpesaForm = useForm<z.infer<typeof mpesaSchema>>({
    resolver: zodResolver(mpesaSchema),
    defaultValues: { amount: 1000, phoneNumber: "" },
  });

  const bankForm = useForm<z.infer<typeof bankSchema>>({
    resolver: zodResolver(bankSchema),
    defaultValues: { amount: 1000, bankCode: "", accountNumber: "" },
  });

  const onMpesa = (data: z.infer<typeof mpesaSchema>) => {
    withdraw(
      { amount: data.amount, method: "mpesa", details: { phoneNumber: data.phoneNumber, accountNumber: data.phoneNumber } },
      {
        onSuccess: () => {
          toast({ title: "Withdrawal requested", description: "Funds will arrive on M-PESA shortly." });
          onOpenChange(false);
        },
        onError: (err: any) => toast({ title: "Withdrawal failed", description: err.message, variant: "destructive" }),
      }
    );
  };

  const onBank = (data: z.infer<typeof bankSchema>) => {
    withdraw(
      { amount: data.amount, method: "bank", details: { bankCode: data.bankCode, accountNumber: data.accountNumber } },
      {
        onSuccess: () => {
          toast({ title: "Withdrawal requested", description: "Bank transfer will be processed within 24h." });
          onOpenChange(false);
        },
        onError: (err: any) => toast({ title: "Withdrawal failed", description: err.message, variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-modal sm:max-w-md" data-testid="modal-withdraw">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">Withdraw Funds</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="mpesa" className="mt-2">
          <TabsList className="grid grid-cols-2 w-full bg-background/50">
            <TabsTrigger value="mpesa" data-testid="tab-mpesa">
              <Smartphone className="w-4 h-4 mr-2" /> M-PESA
            </TabsTrigger>
            <TabsTrigger value="bank" data-testid="tab-bank">
              <Building2 className="w-4 h-4 mr-2" /> Bank
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mpesa">
            <Form {...mpesaForm}>
              <form onSubmit={mpesaForm.handleSubmit(onMpesa)} className="space-y-4 mt-4">
                <FormField
                  control={mpesaForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (KES)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="500" {...field} className="bg-background/50 border-white/10 font-mono" data-testid="input-mpesa-amount" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={mpesaForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>M-PESA Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="07XXXXXXXX" {...field} className="bg-background/50 border-white/10 font-mono" data-testid="input-mpesa-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-11 font-bold bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isPending} data-testid="button-submit-mpesa">
                  {isPending ? "Processing..." : "Send to M-PESA"}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="bank">
            <Form {...bankForm}>
              <form onSubmit={bankForm.handleSubmit(onBank)} className="space-y-4 mt-4">
                <FormField
                  control={bankForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (KES)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1000" {...field} className="bg-background/50 border-white/10 font-mono" data-testid="input-bank-amount" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={bankForm.control}
                  name="bankCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full h-10 bg-background/50 border border-white/10 rounded-md px-3 text-sm"
                          data-testid="select-bank"
                        >
                          <option value="">Select your bank</option>
                          <option value="01">KCB Bank</option>
                          <option value="11">Equity Bank</option>
                          <option value="63">Cooperative Bank</option>
                          <option value="68">Standard Chartered</option>
                          <option value="03">Absa Bank Kenya</option>
                          <option value="07">NCBA Bank</option>
                          <option value="02">Stanbic Bank</option>
                          <option value="31">DTB Bank</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={bankForm.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input placeholder="0123456789" {...field} className="bg-background/50 border-white/10 font-mono" data-testid="input-account-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-11 font-bold bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isPending} data-testid="button-submit-bank">
                  {isPending ? "Processing..." : "Send to Bank"}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

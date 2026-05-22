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
import { Smartphone, Building2, Copy, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

// ── Deposit Modal ──────────────────────────────────────────────────────────

const confirmSchema = z.object({
  transactionId: z.string().min(6, "Enter a valid M-PESA transaction ID"),
  amount: z.coerce.number().min(100, "Minimum KSh 100"),
});

interface DepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail?: string;
}

const TILL_NUMBER = "5387520";
const KES_PER_USD = 130;

const QUICK_PICKS = [
  { kes: 1300, usd: 10 },
  { kes: 2600, usd: 20 },
  { kes: 6500, usd: 50 },
  { kes: 13000, usd: 100 },
  { kes: 26000, usd: 200 },
];

export function DepositModal({ open, onOpenChange }: DepositModalProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState(1300);
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const confirmForm = useForm<z.infer<typeof confirmSchema>>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { transactionId: "", amount },
  });

  const copyTill = () => {
    navigator.clipboard.writeText(TILL_NUMBER);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onConfirmSubmit = async (data: z.infer<typeof confirmSchema>) => {
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/deposit/mpesa-confirm", data);
      await queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      toast({
        title: "Balance credited!",
        description: `KSh ${data.amount.toLocaleString()} has been added to your live account.`,
      });
      confirmForm.reset();
      setShowConfirm(false);
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-modal sm:max-w-sm" data-testid="modal-deposit">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">Deposit Funds</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1 max-h-[75vh] overflow-y-auto pr-1">
          {/* Amount picker */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Amount (KES)</label>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(Math.max(1300, Number(e.target.value) || 0))}
              className="bg-background/50 border-white/10 focus:border-primary font-mono text-lg h-11"
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

          {/* M-PESA instructions */}
          <div className="rounded-xl border border-green-500/25 bg-green-500/5 p-4 space-y-3">
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-green-400" /> Pay via M-PESA Till
            </p>
            <ol className="text-sm text-muted-foreground space-y-1.5 list-none">
              <li><span className="text-white font-semibold">1.</span> Go to M-PESA → <span className="text-white">Lipa na M-PESA</span></li>
              <li><span className="text-white font-semibold">2.</span> Select <span className="text-white">Buy Goods & Services</span></li>
              <li>
                <span className="text-white font-semibold">3.</span> Enter Till No.{" "}
                <button
                  onClick={copyTill}
                  className="inline-flex items-center gap-1 font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded hover:bg-primary/20 transition-colors"
                  data-testid="button-copy-till"
                >
                  {TILL_NUMBER}
                  {copied ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  <span className="text-xs">{copied ? "Copied!" : "Copy"}</span>
                </button>
              </li>
              <li>
                <span className="text-white font-semibold">4.</span> Enter amount:{" "}
                <span className="font-mono font-bold text-primary">KSh {amount.toLocaleString()}</span>
              </li>
            </ol>
            <div className="flex items-center gap-2 pt-1 border-t border-green-500/20">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              <p className="text-xs text-green-400 font-semibold">
                Funds reflect on your account automatically after payment.
              </p>
            </div>
          </div>

          {/* Balance not reflecting collapsible */}
          <div className="rounded-xl border border-red-500/50 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-red-500/15 hover:bg-red-500/25 transition-colors"
              data-testid="button-toggle-confirm"
            >
              <span className="text-red-400 font-extrabold text-base tracking-wide">⚠ Balance not reflecting?</span>
              {showConfirm ? <ChevronUp className="w-5 h-5 text-red-400" /> : <ChevronDown className="w-5 h-5 text-red-400" />}
            </button>

            {showConfirm && (
              <div className="px-4 pb-4 border-t border-white/8 bg-background/30">
                <p className="text-xs text-muted-foreground mt-3 mb-3">
                  Submit your M-PESA transaction ID and our team will credit your account within minutes.
                </p>
                <Form {...confirmForm}>
                  <form onSubmit={confirmForm.handleSubmit(onConfirmSubmit)} className="space-y-3">
                    <FormField
                      control={confirmForm.control}
                      name="transactionId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">M-PESA Transaction ID</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. QHK7X2PLMN"
                              {...field}
                              className="bg-background/50 border-white/10 font-mono uppercase h-9 text-sm"
                              data-testid="input-mpesa-txn-id"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={confirmForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Amount Sent (KES)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="1000"
                              {...field}
                              className="bg-background/50 border-white/10 font-mono h-9 text-sm"
                              data-testid="input-confirm-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-9 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                      data-testid="button-submit-txn-id"
                    >
                      {submitting ? "Submitting..." : "Submit Transaction ID"}
                    </Button>
                  </form>
                </Form>
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
  phoneNumber: z.string().regex(/^(?:\+?254|0)?7\d{8}$/, "Enter valid Kenyan number"),
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

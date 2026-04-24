import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeposit, useWithdraw } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, Building2 } from "lucide-react";

// --- Deposit Modal ---

const depositSchema = z.object({
  amount: z.coerce.number().min(100, "Minimum deposit is KSh 100"),
  email: z.string().email("Invalid email address"),
});

interface DepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail?: string;
}

export function DepositModal({ open, onOpenChange, userEmail }: DepositModalProps) {
  const { toast } = useToast();
  const { mutate: deposit, isPending } = useDeposit();

  const form = useForm<z.infer<typeof depositSchema>>({
    resolver: zodResolver(depositSchema),
    defaultValues: { amount: 1000, email: userEmail || "" },
  });

  const onSubmit = (data: z.infer<typeof depositSchema>) => {
    deposit(data, {
      onSuccess: (res) => {
        window.location.href = res.authorization_url;
      },
      onError: (err: any) => {
        toast({ title: "Deposit Failed", description: err.message, variant: "destructive" });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-modal sm:max-w-md" data-testid="modal-deposit">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">Deposit Funds</DialogTitle>
          <DialogDescription>
            Top up your live trading wallet via Paystack (M-PESA, Card, Bank).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-2">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (KES)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="1000"
                      {...field}
                      className="bg-background/50 border-white/10 focus:border-primary font-mono text-lg"
                      data-testid="input-deposit-amount"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="you@example.com"
                      {...field}
                      className="bg-background/50 border-white/10 focus:border-primary"
                      data-testid="input-deposit-email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-2">
              {[500, 1000, 2500, 5000, 10000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => form.setValue("amount", v)}
                  className="px-3 py-1 text-xs font-bold rounded-md border border-white/10 hover:border-primary hover:text-primary text-muted-foreground"
                  data-testid={`button-quick-${v}`}
                >
                  KSh {v.toLocaleString()}
                </button>
              ))}
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-base font-bold bg-green-600 hover:bg-green-700 text-white"
              disabled={isPending}
              data-testid="button-submit-deposit"
            >
              {isPending ? "Processing..." : "Proceed to Pay"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- Withdraw Modal ---

const mpesaSchema = z.object({
  amount: z.coerce.number().min(100, "Minimum withdrawal is KSh 100"),
  phoneNumber: z.string().regex(/^(?:\+?254|0)?7\d{8}$/, "Enter valid Kenyan number"),
});

const bankSchema = z.object({
  amount: z.coerce.number().min(500, "Minimum bank withdrawal is KSh 500"),
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
    defaultValues: { amount: 500, phoneNumber: "" },
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
          <DialogDescription>Send your earnings to M-PESA or your bank.</DialogDescription>
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

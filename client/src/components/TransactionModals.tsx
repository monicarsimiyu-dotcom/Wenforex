import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDeposit, useWithdraw } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";

// --- Deposit Modal ---

const depositSchema = z.object({
  amount: z.coerce.number().min(100, "Minimum deposit is 100"),
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
    defaultValues: {
      amount: 1000,
      email: userEmail || "",
    },
  });

  const onSubmit = (data: z.infer<typeof depositSchema>) => {
    deposit(data, {
      onSuccess: (res) => {
        window.location.href = res.authorization_url; // Redirect to Paystack
      },
      onError: (err) => {
        toast({
          title: "Deposit Failed",
          description: err.message,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-modal sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">Deposit Funds</DialogTitle>
          <DialogDescription>Add funds to your trading wallet securely via Paystack.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 text-white"
              disabled={isPending}
            >
              {isPending ? "Processing..." : "Proceed to Payment"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- Withdraw Modal ---

const withdrawSchema = z.object({
  amount: z.coerce.number().min(100, "Minimum withdrawal is 100"),
  accountNumber: z.string().min(8, "Invalid account number"),
  bankCode: z.string().min(1, "Select a bank"),
});

interface WithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WithdrawModal({ open, onOpenChange }: WithdrawModalProps) {
  const { toast } = useToast();
  const { mutate: withdraw, isPending } = useWithdraw();

  const form = useForm<z.infer<typeof withdrawSchema>>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: {
      amount: 1000,
      accountNumber: "",
      bankCode: "",
    },
  });

  const onSubmit = (data: z.infer<typeof withdrawSchema>) => {
    withdraw(data, {
      onSuccess: () => {
        toast({
          title: "Withdrawal Initiated",
          description: "Your funds are on the way.",
        });
        onOpenChange(false);
        form.reset();
      },
      onError: (err) => {
        toast({
          title: "Withdrawal Failed",
          description: err.message,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-modal sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">Withdraw Funds</DialogTitle>
          <DialogDescription>Withdraw your winnings to your bank account.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (KES)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="bg-background/50 border-white/10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background/50 border-white/10">
                        <SelectValue placeholder="Select your bank" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* In a real app, fetch banks from API */}
                      <SelectItem value="044">Access Bank</SelectItem>
                      <SelectItem value="070">Fidelity Bank</SelectItem>
                      <SelectItem value="058">Guaranty Trust Bank</SelectItem>
                      <SelectItem value="033">United Bank for Africa</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl>
                    <Input placeholder="0123456789" {...field} className="bg-background/50 border-white/10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isPending}
            >
              {isPending ? "Processing..." : "Withdraw Funds"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

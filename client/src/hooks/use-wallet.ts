import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type DepositRequest, type WithdrawRequest } from "@shared/schema";

// Get wallet balance
export function useWallet() {
  return useQuery({
    queryKey: [api.wallet.get.path],
    queryFn: async () => {
      const res = await fetch(api.wallet.get.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch wallet");
      return api.wallet.get.responses[200].parse(await res.json());
    },
  });
}

// Get transactions history
export function useTransactions() {
  return useQuery({
    queryKey: [api.transactions.list.path],
    queryFn: async () => {
      const res = await fetch(api.transactions.list.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return api.transactions.list.responses[200].parse(await res.json());
    },
  });
}

// Deposit funds
export function useDeposit() {
  return useMutation({
    mutationFn: async (data: DepositRequest) => {
      const validated = api.transactions.deposit.input.parse(data);
      const res = await fetch(api.transactions.deposit.path, {
        method: api.transactions.deposit.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Deposit failed");
      }
      return api.transactions.deposit.responses[200].parse(await res.json());
    },
  });
}

// Withdraw funds
export function useWithdraw() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: WithdrawRequest) => {
      const validated = api.transactions.withdraw.input.parse(data);
      const res = await fetch(api.transactions.withdraw.path, {
        method: api.transactions.withdraw.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Withdrawal failed");
      }
      return api.transactions.withdraw.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.wallet.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
    },
  });
}

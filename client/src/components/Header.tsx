import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWallet } from "@/hooks/use-wallet";
import { useToggleAccount } from "@/hooks/use-toggle-account";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut, ArrowDownToLine, ArrowUpFromLine, LogIn, UserPlus } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface HeaderProps {
  onDeposit: () => void;
  onWithdraw: () => void;
}

export function Header({ onDeposit, onWithdraw }: HeaderProps) {
  const { user } = useAuth();
  const { data: wallet } = useWallet();
  const { mutate: toggle, isPending: toggling } = useToggleAccount();
  const queryClient = useQueryClient();
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");

  const isLive = user?.activeAccountType === "live";

  function handleLogout() {
    fetch("/api/local/logout", { method: "POST", credentials: "include" })
      .then(() => {
        queryClient.setQueryData(["/api/auth/user"], null);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      });
  }

  return (
    <header className="h-14 border-b border-border bg-card/60 backdrop-blur-md px-3 lg:px-5 flex items-center justify-between z-50 shrink-0">
      {/* Left: Brand */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2" data-testid="brand-logo">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-primary-foreground font-black text-sm shadow-md shadow-orange-900/30">
            W
          </div>
          <span className="text-lg font-extrabold tracking-tight text-white" data-testid="text-brand-name">
            wen<span className="text-primary">forex</span>
          </span>
        </div>
      </div>

      {/* Right: Account toggle, balance, deposit, menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {user && (
          <>
            {/* Account type toggle */}
            <div
              className="hidden sm:flex items-center bg-background/60 border border-white/10 rounded-lg p-0.5 text-xs font-bold"
              data-testid="account-toggle"
            >
              <button
                onClick={() => !isLive ? null : toggle({ type: "demo" })}
                disabled={toggling}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  !isLive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white"
                }`}
                data-testid="button-account-demo"
              >
                DEMO
              </button>
              <button
                onClick={() => isLive ? null : toggle({ type: "live" })}
                disabled={toggling}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  isLive ? "bg-green-600 text-white" : "text-muted-foreground hover:text-white"
                }`}
                data-testid="button-account-live"
              >
                LIVE
              </button>
            </div>

            {/* Balance */}
            <div
              className="flex items-center bg-background/60 border border-white/10 rounded-lg pl-2 pr-1 py-0.5 gap-1.5"
              data-testid="wallet-balance"
            >
              <div className="flex flex-col items-end leading-tight">
                <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {isLive ? "Live" : "Demo"}
                </span>
                <span className={`font-mono font-bold text-xs ${isLive ? "text-green-400" : "text-primary"}`}>
                  KSh {wallet?.balance ? Number(wallet.balance).toLocaleString("en-KE", { maximumFractionDigits: 2 }) : "0.00"}
                </span>
              </div>
              <Button
                size="sm"
                onClick={onDeposit}
                className="h-6 px-2 bg-green-600 hover:bg-green-700 text-white border-none text-[11px]"
                data-testid="button-deposit"
              >
                <ArrowDownToLine className="w-3 h-3 mr-1" /> Deposit
              </Button>
            </div>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full ring-2 ring-primary/20 hover:ring-primary/50 p-0"
                  data-testid="button-user-menu"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.profileImageUrl || ""} alt={user?.firstName || "User"} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-white" data-testid="text-user-name">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground" data-testid="text-user-email">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDeposit} className="cursor-pointer" data-testid="menu-deposit">
                  <ArrowDownToLine className="mr-2 h-4 w-4" />
                  <span>Deposit (KES)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onWithdraw} className="cursor-pointer" data-testid="menu-withdraw">
                  <ArrowUpFromLine className="mr-2 h-4 w-4" />
                  <span>Withdraw</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => toggle({ type: isLive ? "demo" : "live" })}
                  className="cursor-pointer sm:hidden"
                  data-testid="menu-toggle-account"
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  <span>Switch to {isLive ? "Demo" : "Live"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400" data-testid="menu-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        {!user && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setAuthTab("login");
                setAuthOpen(true);
              }}
              variant="outline"
              className="h-9 px-3 sm:px-4 border-white/20 bg-transparent hover:bg-white/5 text-white font-bold"
              data-testid="button-login"
            >
              <LogIn className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Login</span>
            </Button>
            <Button
              onClick={() => {
                setAuthTab("register");
                setAuthOpen(true);
              }}
              className="h-9 px-3 sm:px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              data-testid="button-register"
            >
              <UserPlus className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Register</span>
            </Button>
          </div>
        )}
      </div>
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} initialTab={authTab} />
    </header>
  );
}

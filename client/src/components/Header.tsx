import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut, User, Menu } from "lucide-react";
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
  const { user, logout } = useAuth();
  const { data: wallet } = useWallet();

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg group-hover:scale-105 transition-transform">
            B
          </div>
          <span className="text-xl font-bold tracking-tight text-white hidden sm:block">
            Binany<span className="text-primary">Clone</span>
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {/* Wallet Display */}
        <div className="hidden md:flex items-center bg-background/50 border border-white/5 rounded-lg px-3 py-1.5 gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Real Account</span>
            <span className="font-mono font-bold text-primary">
              ${wallet?.balance ? Number(wallet.balance).toFixed(2) : "0.00"}
            </span>
          </div>
          <Button size="sm" onClick={onDeposit} className="h-8 bg-green-600 hover:bg-green-700 text-white border-none shadow-md shadow-green-900/20">
            Deposit
          </Button>
        </div>

        {/* Mobile Wallet Icon */}
        <Button variant="ghost" size="icon" className="md:hidden text-primary" onClick={onDeposit}>
          <Wallet className="w-5 h-5" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-primary/20 hover:ring-primary/50 transition-all">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.profileImageUrl || ""} alt={user?.firstName || "User"} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user?.firstName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-white">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDeposit} className="cursor-pointer">
              <Wallet className="mr-2 h-4 w-4" />
              <span>Deposit</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onWithdraw} className="cursor-pointer">
              <Wallet className="mr-2 h-4 w-4" />
              <span>Withdraw</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-red-400 cursor-pointer focus:text-red-400">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

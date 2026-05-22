import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Phone, User as UserIcon, Loader2, Eye, EyeOff } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: "login" | "register";
}

export function AuthModal({ open, onOpenChange, initialTab = "login" }: AuthModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"login" | "register">(initialTab);

  // Login state
  const [loginId, setLoginId] = useState("");
  const [loginPwd, setLoginPwd] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  // Register state
  const [regMode, setRegMode] = useState<"username" | "phone">("phone");
  const [regUsername, setRegUsername] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPwd, setRegPwd] = useState("");
  const [regConfirmPwd, setRegConfirmPwd] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [showRegConfirmPwd, setShowRegConfirmPwd] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const res = await fetch("/api/local/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier: loginId, password: loginPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Welcome back!", description: "You are logged in." });
      onOpenChange(false);
      setLoginId("");
      setLoginPwd("");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (regPwd !== regConfirmPwd) {
      toast({ title: "Passwords do not match", description: "Please make sure both passwords are the same.", variant: "destructive" });
      return;
    }
    setRegLoading(true);
    try {
      const body: any = { password: regPwd };
      if (regMode === "username") body.username = regUsername;
      else body.phone = regPhone;

      const res = await fetch("/api/local/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Account created!",
        description: "Welcome to wenforex. Demo balance KSh 10,000 added.",
      });
      onOpenChange(false);
      setRegUsername("");
      setRegPhone("");
      setRegPwd("");
      setRegConfirmPwd("");
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally {
      setRegLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border" data-testid="auth-modal">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">
            wen<span className="text-primary">forex</span>
          </DialogTitle>
          <DialogDescription>
            {tab === "login" ? "Sign in to your trading account" : "Open a new trading account"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-2 w-full bg-background/40">
            <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
            <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
          </TabsList>

          {/* LOGIN TAB */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 pt-2">
              <div>
                <Label htmlFor="login-id" className="text-xs">Username or Phone</Label>
                <Input
                  id="login-id"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  required
                  placeholder="username or 0712345678"
                  data-testid="input-login-id"
                />
              </div>
              <div>
                <Label htmlFor="login-pwd" className="text-xs">Password</Label>
                <div className="relative">
                  <Input
                    id="login-pwd"
                    type={showLoginPwd ? "text" : "password"}
                    value={loginPwd}
                    onChange={(e) => setLoginPwd(e.target.value)}
                    required
                    className="pr-10"
                    data-testid="input-login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                    data-testid="toggle-login-password"
                  >
                    {showLoginPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                data-testid="button-submit-login"
              >
                {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Login"}
              </Button>
            </form>
          </TabsContent>

          {/* REGISTER TAB */}
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-3 pt-2">
              {/* Mode switch */}
              <div className="grid grid-cols-2 gap-2 bg-background/40 rounded-md p-1">
                <button
                  type="button"
                  onClick={() => setRegMode("phone")}
                  className={`flex items-center justify-center gap-1 h-9 rounded text-xs font-bold transition-colors ${
                    regMode === "phone" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                  data-testid="button-reg-mode-phone"
                >
                  <Phone className="w-3 h-3" /> Phone
                </button>
                <button
                  type="button"
                  onClick={() => setRegMode("username")}
                  className={`flex items-center justify-center gap-1 h-9 rounded text-xs font-bold transition-colors ${
                    regMode === "username" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                  data-testid="button-reg-mode-username"
                >
                  <UserIcon className="w-3 h-3" /> Username
                </button>
              </div>

              {regMode === "phone" ? (
                <div>
                  <Label htmlFor="reg-phone" className="text-xs">Phone Number</Label>
                  <Input
                    id="reg-phone"
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    required
                    placeholder="0712345678"
                    data-testid="input-reg-phone"
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="reg-username" className="text-xs">Username</Label>
                  <Input
                    id="reg-username"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    required
                    placeholder="trader_ke"
                    data-testid="input-reg-username"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="reg-pwd" className="text-xs">Password (min 6 chars)</Label>
                <div className="relative">
                  <Input
                    id="reg-pwd"
                    type={showRegPwd ? "text" : "password"}
                    value={regPwd}
                    onChange={(e) => setRegPwd(e.target.value)}
                    required
                    minLength={6}
                    className="pr-10"
                    data-testid="input-reg-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                    data-testid="toggle-reg-password"
                  >
                    {showRegPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="reg-confirm-pwd" className="text-xs">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="reg-confirm-pwd"
                    type={showRegConfirmPwd ? "text" : "password"}
                    value={regConfirmPwd}
                    onChange={(e) => setRegConfirmPwd(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Re-enter your password"
                    className="pr-10"
                    data-testid="input-reg-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                    data-testid="toggle-reg-confirm-password"
                  >
                    {showRegConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={regLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                data-testid="button-submit-register"
              >
                {regLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
              </Button>

              <p className="text-[10px] text-center text-muted-foreground">
                You'll get KSh 10,000 demo balance to practice trading.
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

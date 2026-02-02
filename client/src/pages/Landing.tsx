import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart2, Shield, Zap } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-border/40 backdrop-blur-md fixed w-full z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg">
              B
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Binany<span className="text-primary">Clone</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/api/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-white">Sign In</Button>
            </Link>
            <Link href="/api/login">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20">
                Start Trading
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/10 blur-[100px] rounded-full opacity-50 pointer-events-none" />
        
        <div className="container mx-auto px-6 relative z-10 text-center">
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            Professional Trading <br /> Made Simple
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Trade on real-time indexes with the fastest execution platform. 
            Secure deposits, instant withdrawals, and powerful charting tools.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/api/login">
              <Button size="lg" className="h-14 px-8 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-xl shadow-primary/25 hover:shadow-2xl hover:scale-105 transition-all">
                Open Free Account
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </a>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-white/10 hover:bg-white/5 text-white">
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Stats/Trust Bar */}
      <div className="border-y border-white/5 bg-white/[0.02]">
        <div className="container mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-white mb-1">100k+</div>
            <div className="text-sm text-muted-foreground">Active Traders</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white mb-1">$5M+</div>
            <div className="text-sm text-muted-foreground">Paid Out Daily</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white mb-1">0.1s</div>
            <div className="text-sm text-muted-foreground">Execution Speed</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white mb-1">24/7</div>
            <div className="text-sm text-muted-foreground">Support</div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <section className="py-24 bg-card/30">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-gradient-to-b from-white/5 to-transparent border border-white/5 hover:border-primary/30 transition-all group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Fast Execution</h3>
              <p className="text-muted-foreground leading-relaxed">
                Never miss a trade with our lightning-fast order matching engine built for high-frequency trading.
              </p>
            </div>
            
            <div className="p-8 rounded-2xl bg-gradient-to-b from-white/5 to-transparent border border-white/5 hover:border-primary/30 transition-all group">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart2 className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Advanced Charts</h3>
              <p className="text-muted-foreground leading-relaxed">
                Professional-grade technical analysis tools and indicators available right in your browser.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-gradient-to-b from-white/5 to-transparent border border-white/5 hover:border-primary/30 transition-all group">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Secure Payments</h3>
              <p className="text-muted-foreground leading-relaxed">
                Seamless deposits and withdrawals via Paystack. Your funds are kept in segregated accounts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 mt-auto">
        <div className="container mx-auto px-6 text-center text-muted-foreground text-sm">
          <p className="mb-4">© 2024 BinanyClone. All rights reserved.</p>
          <div className="flex justify-center gap-6">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-primary transition-colors">Risk Disclosure</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { Mail } from "lucide-react";

export function Footer() {
  return (
    <footer
      className="w-full border-t border-border/60 bg-card/40 py-5 px-4"
      data-testid="footer"
    >
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-primary-foreground font-black text-[10px]">
            W
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white">
            wen<span className="text-primary">forex</span>
          </span>
        </div>

        <a
          href="mailto:info@wenforex.com"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          data-testid="link-support-email"
        >
          <Mail className="w-3.5 h-3.5" />
          info@wenforex.com
        </a>

        <p
          className="text-xs text-muted-foreground"
          data-testid="text-copyright"
        >
          wenforex &copy;2026 All rights reserved
        </p>
      </div>
    </footer>
  );
}

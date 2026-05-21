export function Footer() {
  return (
    <footer
      className="w-full border-t border-border/60 bg-card/40 py-6 px-4"
      data-testid="footer"
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-primary-foreground font-black text-[10px]">
            W
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white">
            wen<span className="text-primary">forex</span>
          </span>
        </div>
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

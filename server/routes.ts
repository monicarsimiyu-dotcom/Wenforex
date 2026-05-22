import type { Express } from "express";
import { type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerLocalAuth } from "./local-auth";
import { z } from "zod";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";

// Multi-market state (simulated prices)
type MarketState = { price: number; basePrice: number };
const markets: Record<string, MarketState> = {
  "BTC/USD": { price: 65000, basePrice: 65000 },
  "ETH/USD": { price: 3200, basePrice: 3200 },
  "EUR/USD": { price: 1.085, basePrice: 1.085 },
  "GBP/USD": { price: 1.265, basePrice: 1.265 },
  "USD/JPY": { price: 156.5, basePrice: 156.5 },
  "GOLD": { price: 2350, basePrice: 2350 },
};

async function getActiveAccountType(userId: string): Promise<string> {
  const user = await storage.getUser(userId);
  return user?.activeAccountType || "demo";
}

async function ensureWallets(userId: string) {
  for (const t of ["demo", "live"]) {
    const w = await storage.getWallet(userId, t);
    if (!w) await storage.createWallet(userId, t);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  // Register local auth BEFORE replit auth routes so our /api/auth/user wins
  registerLocalAuth(app);
  registerAuthRoutes(app);

  // Ensure wallets exist for any authed user
  app.use(async (req, _res, next) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      const userId = (req.user as any).claims.sub;
      await ensureWallets(userId);
    }
    next();
  });

  // --- Auth: account toggle ---
  app.post(api.auth.toggleAccount.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.auth.toggleAccount.input.parse(req.body);
      const userId = (req.user as any).claims.sub;
      const updated = await storage.updateUserAccountType(userId, input.type);
      res.json({ activeAccountType: updated.activeAccountType });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Invalid input" });
    }
  });

  // --- Wallet ---
  app.get(api.wallet.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const acct = await getActiveAccountType(userId);
    const wallet = await storage.getWallet(userId, acct);
    res.json(wallet);
  });

  // --- Trades ---
  app.get(api.trades.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const acct = await getActiveAccountType(userId);
    const trades = await storage.getTrades(userId, acct);
    res.json(trades);
  });

  app.post(api.trades.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.trades.create.input.parse(req.body);
      const userId = (req.user as any).claims.sub;
      const acct = await getActiveAccountType(userId);

      const wallet = await storage.getWallet(userId, acct);
      if (!wallet || Number(wallet.balance) < input.amount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      const market = markets[input.market];
      if (!market) return res.status(400).json({ message: "Unknown market" });

      await storage.updateBalance(userId, acct, -input.amount);

      const trade = await storage.createTrade({
        userId,
        accountType: acct,
        market: input.market,
        direction: input.direction,
        amount: String(input.amount),
        entryPrice: String(market.price),
      });

      // Resolve trade after duration (seconds -> milliseconds)
      const ms = input.duration * 1000;
      setTimeout(async () => {
        const exitPrice = markets[input.market]?.price ?? market.price;
        const entryPrice = Number(trade.entryPrice);
        const isWin =
          (input.direction === "buy" && exitPrice > entryPrice) ||
          (input.direction === "sell" && exitPrice < entryPrice);

        let payout = 0;
        const status = isWin ? "won" : "lost";
        if (isWin) {
          payout = Math.round(input.amount * 1.82 * 100) / 100; // 82% profit + stake
          await storage.updateBalance(userId, acct, payout);
        }

        await storage.updateTradeStatus(
          trade.id,
          status,
          String(exitPrice),
          String(payout),
          new Date()
        );

        broadcastToUser(userId, {
          type: "tradeResult",
          payload: {
            tradeId: trade.id,
            result: status,
            payout,
            userId,
          },
        });
      }, ms);

      res.status(201).json(trade);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Trade create error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- Transactions ---
  app.get(api.transactions.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const acct = await getActiveAccountType(userId);
    const txs = await storage.getTransactions(userId, acct);
    res.json(txs);
  });

  // Deposit -- always credits LIVE wallet
  app.post(api.transactions.deposit.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.transactions.deposit.input.parse(req.body);
      const userId = (req.user as any).claims.sub;
      const reference = `WF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      await storage.createTransaction({
        userId,
        accountType: "live",
        type: "deposit",
        amount: String(input.amount),
        reference,
        paymentMethod: "paystack",
      });

      // Real Paystack initialization
      if (PAYSTACK_SECRET_KEY) {
        try {
          const proto = req.headers["x-forwarded-proto"] || "https";
          const host = req.headers.host;
          const callback_url = `${proto}://${host}/?paystack=callback&reference=${reference}`;

          const psRes = await fetch("https://api.paystack.co/transaction/initialize", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: input.email,
              amount: Math.round(input.amount * 100), // kobo / cents
              currency: "KES",
              reference,
              callback_url,
            }),
          });
          const data = await psRes.json();
          if (data?.status && data?.data?.authorization_url) {
            return res.json({
              authorization_url: data.data.authorization_url,
              reference,
            });
          }
          console.error("Paystack init failed:", data);
        } catch (e) {
          console.error("Paystack request error:", e);
        }
      }

      // Fallback / sandbox: simulate success after 8s and auto-credit
      setTimeout(async () => {
        try {
          await storage.updateTransactionStatus(reference, "success");
          await storage.updateBalance(userId, "live", input.amount);
        } catch (e) {
          console.error("Sim deposit error:", e);
        }
      }, 8000);

      res.json({
        authorization_url: `/?paystack=sandbox&reference=${reference}`,
        reference,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // M-PESA manual deposit confirmation (user submits transaction ID)
  app.post("/api/deposit/mpesa-confirm", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { transactionId, amount } = z.object({
        transactionId: z.string().min(6, "Invalid transaction ID"),
        amount: z.coerce.number().min(100, "Minimum KSh 100"),
      }).parse(req.body);
      const userId = (req.user as any).claims.sub;
      const reference = `MPESA-${transactionId.toUpperCase()}`;
      await storage.createTransaction({
        userId,
        accountType: "live",
        type: "deposit",
        amount: String(amount),
        reference,
        paymentMethod: "mpesa",
      });
      await storage.updateTransactionStatus(reference, "success");
      await storage.updateBalance(userId, "live", amount);
      res.json({ message: "Balance credited successfully!", amount });
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Paystack webhook / callback verification
  app.get("/api/paystack/verify", async (req, res) => {
    const reference = String(req.query.reference || "");
    if (!reference) return res.status(400).json({ message: "Missing reference" });
    if (!PAYSTACK_SECRET_KEY) {
      return res.json({ status: "pending", message: "No Paystack key configured" });
    }
    try {
      const r = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      });
      const data = await r.json();
      if (data?.data?.status === "success") {
        const tx = await storage.getTransactionByReference(reference);
        if (tx && tx.status !== "success") {
          await storage.updateTransactionStatus(reference, "success");
          await storage.updateBalance(tx.userId, "live", Number(tx.amount));
        }
        return res.json({ status: "success" });
      }
      res.json({ status: data?.data?.status || "failed" });
    } catch (e: any) {
      console.error("Verify error:", e);
      res.status(500).json({ message: "Verification error" });
    }
  });

  // Withdraw -- only on LIVE
  app.post(api.transactions.withdraw.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.transactions.withdraw.input.parse(req.body);
      const userId = (req.user as any).claims.sub;

      const wallet = await storage.getWallet(userId, "live");
      if (!wallet || Number(wallet.balance) < input.amount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      await storage.updateBalance(userId, "live", -input.amount);
      const tx = await storage.createTransaction({
        userId,
        accountType: "live",
        type: "withdrawal",
        amount: String(input.amount),
        reference: `WD-${Date.now()}`,
        paymentMethod: input.method === "mpesa" ? "mpesa" : "paystack",
      });

      res.json(tx);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // --- WebSocket & Market Simulation ---
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    // Send a snapshot of all current market prices on connect
    for (const [name, m] of Object.entries(markets)) {
      ws.send(
        JSON.stringify({
          type: "priceUpdate",
          payload: { market: name, price: m.price, timestamp: Date.now() },
        })
      );
    }
  });

  function broadcast(data: any) {
    const json = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send(json);
    });
  }

  function broadcastToUser(_userId: string, data: any) {
    // Simplified: broadcast to all; client filters by userId in payload
    broadcast(data);
  }

  // Market simulation
  setInterval(() => {
    for (const [name, m] of Object.entries(markets)) {
      const volatility = m.basePrice * 0.001; // 0.1% per tick
      const drift = (m.basePrice - m.price) * 0.02; // mean reversion
      m.price = m.price + (Math.random() - 0.5) * 2 * volatility + drift;
      broadcast({
        type: "priceUpdate",
        payload: { market: name, price: m.price, timestamp: Date.now() },
      });
    }
  }, 1000);

  return httpServer;
}

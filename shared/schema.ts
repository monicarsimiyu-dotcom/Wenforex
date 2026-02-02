import { pgTable, text, serial, integer, boolean, timestamp, numeric, doublePrecision } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import * as auth from "./models/auth";

export const users = auth.users;

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  market: text("market").notNull(), // e.g., "BTC/USD", "Volatility 100"
  direction: text("direction").notNull(), // "buy" (up/call) or "sell" (down/put)
  amount: numeric("amount").notNull(),
  entryPrice: numeric("entry_price").notNull(),
  exitPrice: numeric("exit_price"),
  status: text("status").notNull().default("active"), // active, won, lost
  payout: numeric("payout"), // Amount won (0 if lost)
  createdAt: timestamp("created_at").defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(), // deposit, withdrawal
  amount: numeric("amount").notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  reference: text("reference"), // Paystack reference
  createdAt: timestamp("created_at").defaultNow(),
});

export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  balance: numeric("balance").notNull().default("0"),
});

// Relations
export const tradesRelations = relations(trades, ({ one }) => ({
  user: one(users, {
    fields: [trades.userId],
    references: [users.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

export const walletsRelations = relations(wallets, ({ one }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
}));

// Schemas
export const insertTradeSchema = createInsertSchema(trades).omit({ 
  id: true, 
  createdAt: true, 
  closedAt: true,
  exitPrice: true,
  status: true,
  payout: true,
  userId: true // set by server
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ 
  id: true, 
  createdAt: true, 
  status: true,
  userId: true // set by server
});

// Types
export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Wallet = typeof wallets.$inferSelect;

export type User = typeof users.$inferSelect; // Re-export User type

// API Types
export type CreateTradeRequest = {
  market: string;
  direction: "buy" | "sell";
  amount: number;
  duration: number; // in seconds
};

export type DepositRequest = {
  amount: number;
  email: string;
};

export type WithdrawRequest = {
  amount: number;
  accountNumber: string;
  bankCode: string;
};

export type MarketData = {
  market: string;
  price: number;
  timestamp: number;
};

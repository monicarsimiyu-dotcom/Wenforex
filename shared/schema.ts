import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar, text, serial, numeric, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Auth Tables ---
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  activeAccountType: text("active_account_type").notNull().default("demo"), // "live" or "demo"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- Trading Tables ---
export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  market: text("market").notNull(),
  direction: text("direction").notNull(),
  amount: numeric("amount").notNull(),
  entryPrice: numeric("entry_price").notNull(),
  exitPrice: numeric("exit_price"),
  status: text("status").notNull().default("active"),
  payout: numeric("payout"),
  accountType: text("account_type").notNull().default("demo"), // demo or live
  createdAt: timestamp("created_at").defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  amount: numeric("amount").notNull(),
  status: text("status").notNull().default("pending"),
  reference: text("reference"),
  paymentMethod: text("payment_method").notNull().default("paystack"), // paystack, mpesa
  accountType: text("account_type").notNull().default("live"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  accountType: text("account_type").notNull().default("demo"), // demo or live
  balance: numeric("balance").notNull().default("0"),
});

// --- Relations ---
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

export const walletsRelations = relations(wallets, ({ many }) => ({
  wallets: many(wallets),
}));

export const userRelations = relations(users, ({ many }) => ({
  wallets: many(wallets),
}));

// --- Schemas & Types ---
export const insertTradeSchema = createInsertSchema(trades).omit({ 
  id: true, 
  createdAt: true, 
  closedAt: true,
  exitPrice: true,
  status: true,
  payout: true,
  userId: true 
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ 
  id: true, 
  createdAt: true, 
  status: true,
  userId: true 
});

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Wallet = typeof wallets.$inferSelect;
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

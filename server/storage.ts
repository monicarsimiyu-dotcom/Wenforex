import { db } from "./db";
import {
  users, trades, transactions, wallets,
  type User, type Trade, type Transaction, type Wallet,
  type InsertTrade, type InsertTransaction
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  updateUserAccountType(userId: string, type: string): Promise<User>;

  getWallet(userId: string, accountType: string): Promise<Wallet | undefined>;
  createWallet(userId: string, accountType: string): Promise<Wallet>;
  updateBalance(userId: string, accountType: string, amount: number): Promise<Wallet>;

  createTrade(trade: { userId: string; accountType: string; market: string; direction: string; amount: string; entryPrice: string }): Promise<Trade>;
  getTrades(userId: string, accountType: string): Promise<Trade[]>;
  updateTradeStatus(id: number, status: string, exitPrice: string, payout: string, closedAt: Date): Promise<Trade>;

  createTransaction(tx: { userId: string; accountType: string; type: string; amount: string; reference?: string; paymentMethod?: string }): Promise<Transaction>;
  getTransactions(userId: string, accountType: string): Promise<Transaction[]>;
  getTransactionByReference(reference: string): Promise<Transaction | undefined>;
  updateTransactionStatus(reference: string, status: string): Promise<Transaction>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async updateUserAccountType(userId: string, type: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ activeAccountType: type })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async getWallet(userId: string, accountType: string): Promise<Wallet | undefined> {
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.userId, userId), eq(wallets.accountType, accountType)));
    return wallet;
  }

  async createWallet(userId: string, accountType: string): Promise<Wallet> {
    const balance = accountType === "demo" ? "10000" : "0";
    const [wallet] = await db.insert(wallets).values({ userId, accountType, balance }).returning();
    return wallet;
  }

  async updateBalance(userId: string, accountType: string, amount: number): Promise<Wallet> {
    const wallet = await this.getWallet(userId, accountType);
    if (!wallet) throw new Error("Wallet not found");
    const newBalance = Number(wallet.balance) + amount;
    const [updated] = await db
      .update(wallets)
      .set({ balance: String(newBalance) })
      .where(and(eq(wallets.userId, userId), eq(wallets.accountType, accountType)))
      .returning();
    return updated;
  }

  async createTrade(trade: { userId: string; accountType: string; market: string; direction: string; amount: string; entryPrice: string }): Promise<Trade> {
    const [newTrade] = await db.insert(trades).values(trade).returning();
    return newTrade;
  }

  async getTrades(userId: string, accountType: string): Promise<Trade[]> {
    return db
      .select()
      .from(trades)
      .where(and(eq(trades.userId, userId), eq(trades.accountType, accountType)))
      .orderBy(desc(trades.createdAt));
  }

  async updateTradeStatus(id: number, status: string, exitPrice: string, payout: string, closedAt: Date): Promise<Trade> {
    const [updated] = await db
      .update(trades)
      .set({ status, exitPrice, payout, closedAt })
      .where(eq(trades.id, id))
      .returning();
    return updated;
  }

  async createTransaction(tx: { userId: string; accountType: string; type: string; amount: string; reference?: string; paymentMethod?: string }): Promise<Transaction> {
    const [newTx] = await db.insert(transactions).values(tx).returning();
    return newTx;
  }

  async getTransactions(userId: string, accountType: string): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.accountType, accountType)))
      .orderBy(desc(transactions.createdAt));
  }

  async getTransactionByReference(reference: string): Promise<Transaction | undefined> {
    const [tx] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.reference, reference));
    return tx;
  }

  async updateTransactionStatus(reference: string, status: string): Promise<Transaction> {
    const [updated] = await db
      .update(transactions)
      .set({ status })
      .where(eq(transactions.reference, reference))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();

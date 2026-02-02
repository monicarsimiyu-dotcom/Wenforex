import { db } from "./db";
import { 
  users, trades, transactions, wallets,
  type User, type Trade, type Transaction, type Wallet,
  type InsertTrade, type InsertTransaction 
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { authStorage } from "./replit_integrations/auth/storage";

export interface IStorage {
  // Auth (delegated to authStorage)
  getUser(id: string): Promise<User | undefined>;
  
  // Wallet
  getWallet(userId: string): Promise<Wallet | undefined>;
  createWallet(userId: string): Promise<Wallet>;
  updateBalance(userId: string, amount: number): Promise<Wallet>; // amount can be negative
  
  // Trades
  createTrade(trade: InsertTrade): Promise<Trade>;
  getTrades(userId: string): Promise<Trade[]>;
  getTrade(id: number): Promise<Trade | undefined>;
  updateTradeStatus(id: number, status: string, exitPrice: string, payout: string, closedAt: Date): Promise<Trade>;
  
  // Transactions
  createTransaction(tx: InsertTransaction): Promise<Transaction>;
  getTransactions(userId: string): Promise<Transaction[]>;
  updateTransactionStatus(reference: string, status: string): Promise<Transaction>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    return authStorage.getUser(id);
  }

  async getWallet(userId: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    return wallet;
  }

  async createWallet(userId: string): Promise<Wallet> {
    const [wallet] = await db.insert(wallets).values({ userId, balance: "10000" }).returning(); // Start with demo balance
    return wallet;
  }

  async updateBalance(userId: string, amount: number): Promise<Wallet> {
    const wallet = await this.getWallet(userId);
    if (!wallet) throw new Error("Wallet not found");
    
    const newBalance = Number(wallet.balance) + amount;
    const [updated] = await db.update(wallets)
      .set({ balance: String(newBalance) })
      .where(eq(wallets.userId, userId))
      .returning();
      
    return updated;
  }

  async createTrade(trade: InsertTrade): Promise<Trade> {
    const [newTrade] = await db.insert(trades).values(trade).returning();
    return newTrade;
  }

  async getTrades(userId: string): Promise<Trade[]> {
    return db.select().from(trades)
      .where(eq(trades.userId, userId))
      .orderBy(desc(trades.createdAt));
  }
  
  async getTrade(id: number): Promise<Trade | undefined> {
    const [trade] = await db.select().from(trades).where(eq(trades.id, id));
    return trade;
  }

  async updateTradeStatus(id: number, status: string, exitPrice: string, payout: string, closedAt: Date): Promise<Trade> {
    const [updated] = await db.update(trades)
      .set({ status, exitPrice, payout, closedAt })
      .where(eq(trades.id, id))
      .returning();
    return updated;
  }

  async createTransaction(tx: InsertTransaction): Promise<Transaction> {
    const [newTx] = await db.insert(transactions).values(tx).returning();
    return newTx;
  }

  async getTransactions(userId: string): Promise<Transaction[]> {
    return db.select().from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  async updateTransactionStatus(reference: string, status: string): Promise<Transaction> {
    const [updated] = await db.update(transactions)
      .set({ status })
      .where(eq(transactions.reference, reference))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();

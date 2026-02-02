import { z } from 'zod';
import { insertTradeSchema, insertTransactionSchema, trades, transactions, wallets } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  trades: {
    list: {
      method: 'GET' as const,
      path: '/api/trades',
      responses: {
        200: z.array(z.custom<typeof trades.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/trades',
      input: z.object({
        market: z.string(),
        direction: z.enum(["buy", "sell"]),
        amount: z.number().min(1),
        duration: z.number().min(5), // Minimum 5 seconds trade
      }),
      responses: {
        201: z.custom<typeof trades.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  wallet: {
    get: {
      method: 'GET' as const,
      path: '/api/wallet',
      responses: {
        200: z.custom<typeof wallets.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  transactions: {
    list: {
      method: 'GET' as const,
      path: '/api/transactions',
      responses: {
        200: z.array(z.custom<typeof transactions.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    deposit: {
      method: 'POST' as const,
      path: '/api/transactions/deposit',
      input: z.object({
        amount: z.number().min(100), // Minimum deposit
        email: z.string().email(),
      }),
      responses: {
        200: z.object({ authorization_url: z.string(), reference: z.string() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    withdraw: {
      method: 'POST' as const,
      path: '/api/transactions/withdraw',
      input: z.object({
        amount: z.number().min(100),
        accountNumber: z.string(),
        bankCode: z.string(),
      }),
      responses: {
        200: z.custom<typeof transactions.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// WebSocket Events
export const ws = {
  send: {
    subscribe: z.object({ market: z.string() }),
  },
  receive: {
    priceUpdate: z.object({ market: z.string(), price: z.number(), timestamp: z.number() }),
    tradeResult: z.object({ tradeId: z.number(), result: z.enum(["won", "lost"]), payout: z.number() }),
  },
};

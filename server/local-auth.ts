import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { users, wallets } from "@shared/schema";
import { eq, or } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(password, salt, 64)) as Buffer;
  return hashedBuf.length === suppliedBuf.length && timingSafeEqual(hashedBuf, suppliedBuf);
}

function normalizePhone(p: string): string {
  return p.replace(/\D/g, "");
}

export function registerLocalAuth(app: Express) {
  // Universal /api/auth/user — works for both Replit Auth and local auth.
  // This MUST be registered before registerAuthRoutes' strict version,
  // so Express prefers ours.
  app.get("/api/auth/user", async (req: Request, res: Response) => {
    if (!(req as any).isAuthenticated || !(req as any).isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const claims = (req.user as any)?.claims;
      const userId = claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      res.json(user);
    } catch (e) {
      console.error("auth/user error:", e);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Register
  app.post("/api/local/register", async (req: Request, res: Response) => {
    try {
      const { username, phone, password, firstName } = req.body || {};
      if (!password || password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      if (!username && !phone) {
        return res.status(400).json({ message: "Username or phone is required" });
      }

      const cleanPhone = phone ? normalizePhone(phone) : null;
      const cleanUser = username ? username.trim().toLowerCase() : null;

      // Check duplicates
      if (cleanUser) {
        const [existing] = await db.select().from(users).where(eq(users.username, cleanUser));
        if (existing) return res.status(400).json({ message: "Username already taken" });
      }
      if (cleanPhone) {
        const [existing] = await db.select().from(users).where(eq(users.phone, cleanPhone));
        if (existing) return res.status(400).json({ message: "Phone already registered" });
      }

      const passwordHash = await hashPassword(password);
      const [user] = await db
        .insert(users)
        .values({
          username: cleanUser,
          phone: cleanPhone,
          passwordHash,
          firstName: firstName || cleanUser || "Trader",
        })
        .returning();

      // Set session — mimic the passport user shape
      (req as any).login(
        { claims: { sub: user.id }, _local: true },
        (err: any) => {
          if (err) return res.status(500).json({ message: "Session error" });
          res.json({ id: user.id, username: user.username, phone: user.phone });
        }
      );
    } catch (e: any) {
      console.error("Register error:", e);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login
  app.post("/api/local/login", async (req: Request, res: Response) => {
    try {
      const { identifier, password } = req.body || {};
      if (!identifier || !password) {
        return res.status(400).json({ message: "Identifier and password required" });
      }

      const cleanId = String(identifier).trim().toLowerCase();
      const cleanPhone = normalizePhone(cleanId);

      const [user] = await db
        .select()
        .from(users)
        .where(or(eq(users.username, cleanId), eq(users.phone, cleanPhone)));

      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) return res.status(401).json({ message: "Invalid credentials" });

      (req as any).login(
        { claims: { sub: user.id }, _local: true },
        (err: any) => {
          if (err) return res.status(500).json({ message: "Session error" });
          res.json({ id: user.id, username: user.username, phone: user.phone });
        }
      );
    } catch (e: any) {
      console.error("Login error:", e);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout (works for both local and replit auth)
  app.post("/api/local/logout", (req: Request, res: Response) => {
    (req as any).logout((err: any) => {
      if (err) return res.status(500).json({ message: "Logout error" });
      res.json({ ok: true });
    });
  });
}

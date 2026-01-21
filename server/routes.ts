import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import MemoryStore from "memorystore";
import { users } from "@shared/schema";

const scryptAsync = promisify(scrypt);
const SessionStore = MemoryStore(session);

// --- Auth Helper Functions ---
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// --- Telegram Bot Helper (Stub) ---
async function sendTelegramAlert(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  // In a real scenario, we'd loop through admins with chat IDs
  // For now, we just log if token is missing
  if (!token) {
    console.log("[Telegram] Alert would be sent:", message);
    return;
  }
  
  // Implementation for node-telegram-bot-api would go here
  // For the MVP without keys, we just log.
  console.log(`[Telegram SENT] ${message}`);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // --- Auth Setup ---
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "rupp2025_secret",
      resave: false,
      saveUninitialized: false,
      store: new SessionStore({
        checkPeriod: 86400000,
      }),
      cookie: { secure: app.get("env") === "production" },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) return done(null, false);
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) return done(null, false);
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // --- Seed Data (Run once on startup) ---
  const seed = async () => {
    const existing = await storage.getUserByUsername("admin@ics.com");
    if (!existing) {
      const password = await hashPassword("rupp2025");
      await storage.createUser({ email: "admin@ics.com", name: "Admin User", password, role: "admin", telegramChatId: "" });
      await storage.createUser({ email: "manager@ics.com", name: "Manager User", password, role: "manager", telegramChatId: "" });
      await storage.createUser({ email: "stock1@ics.com", name: "Stock Controller 1", password, role: "stock_controller", telegramChatId: "" });
      await storage.createUser({ email: "viewer@ics.com", name: "Viewer User", password, role: "viewer", telegramChatId: "" });
      
      // Categories
      const cat1 = await storage.createCategory({ name: "Beverages" });
      const cat2 = await storage.createCategory({ name: "Snacks" });
      const cat3 = await storage.createCategory({ name: "Electronics" });

      // Suppliers
      await storage.createSupplier({ name: "Global Drinks Ltd", contact: "John Doe", email: "john@global.com", address: "123 Ind Park" });
      await storage.createSupplier({ name: "Tech Wholesalers", contact: "Jane Smith", email: "jane@tech.com", address: "456 Tech Ave" });

      // Products
      await storage.createProduct({ 
        name: "Cola 330ml", 
        categoryId: cat1.id, 
        minStockLevel: 20, 
        defaultPurchasePrice: "0.50", 
        defaultSellingPrice: "1.00",
        unit: "can"
      });
      await storage.createProduct({ 
        name: "Chips 50g", 
        categoryId: cat2.id, 
        minStockLevel: 15, 
        defaultPurchasePrice: "0.80", 
        defaultSellingPrice: "1.50",
        unit: "bag"
      });
      console.log("Database seeded!");
    }
  };
  seed();

  // --- API Routes ---

  // Auth
  app.post(api.auth.login.path, passport.authenticate("local"), (req, res) => {
    res.json(req.user);
  });

  app.post(api.auth.logout.path, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: "Logged out" });
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    res.json(req.user);
  });

  // Middleware to check auth
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: "Unauthorized" });
  };

  // Products
  app.get(api.products.list.path, requireAuth, async (req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.get(api.products.get.path, requireAuth, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Not found" });
    res.json(product);
  });

  app.post(api.products.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      const product = await storage.createProduct(input);
      res.status(201).json(product);
    } catch (e) {
      res.status(400).json({ message: "Validation error" });
    }
  });

  app.put(api.products.update.path, requireAuth, async (req, res) => {
    const product = await storage.updateProduct(Number(req.params.id), req.body);
    res.json(product);
  });

  app.delete(api.products.delete.path, requireAuth, async (req, res) => {
    await storage.deleteProduct(Number(req.params.id));
    res.status(204).send();
  });

  // Categories
  app.get(api.categories.list.path, requireAuth, async (req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });

  app.post(api.categories.create.path, requireAuth, async (req, res) => {
    const category = await storage.createCategory(req.body);
    res.status(201).json(category);
  });

  // Suppliers
  app.get(api.suppliers.list.path, requireAuth, async (req, res) => {
    const suppliers = await storage.getSuppliers();
    res.json(suppliers);
  });

  app.post(api.suppliers.create.path, requireAuth, async (req, res) => {
    const supplier = await storage.createSupplier(req.body);
    res.status(201).json(supplier);
  });

  // Inventory
  app.post(api.inventory.stockIn.path, requireAuth, async (req, res) => {
    const user = req.user as any;
    const input = { ...req.body, recordedBy: user.id };
    const stock = await storage.createStockIn(input);
    res.status(201).json(stock);
  });

  app.post(api.inventory.stockOut.path, requireAuth, async (req, res) => {
    const user = req.user as any;
    const input = { ...req.body, recordedBy: user.id };
    
    // Check stock level
    const product = await storage.getProduct(input.productId);
    if (!product || product.currentStock < input.quantity) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    const stock = await storage.createStockOut(input);

    // Check low stock alert after transaction
    const updatedProduct = await storage.getProduct(input.productId);
    if (updatedProduct && updatedProduct.currentStock <= updatedProduct.minStockLevel) {
      sendTelegramAlert(`LOW STOCK ALERT: ${updatedProduct.name} is down to ${updatedProduct.currentStock} ${updatedProduct.unit}. Min level: ${updatedProduct.minStockLevel}`);
    }

    res.status(201).json(stock);
  });

  app.get(api.inventory.transactions.path, requireAuth, async (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const type = req.query.type as 'in' | 'out' | 'all' || 'all';
    const txs = await storage.getTransactions(limit, type);
    res.json(txs);
  });

  // Reports
  app.get(api.reports.dashboard.path, requireAuth, async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  return httpServer;
}

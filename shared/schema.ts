import { pgTable, text, serial, integer, boolean, timestamp, decimal, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "stock_controller", "viewer"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("viewer"),
  telegramChatId: text("telegram_chat_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contact: text("contact"),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  active: boolean("active").default(true),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => categories.id),
  name: text("name").notNull(),
  barcode: text("barcode"),
  description: text("description"),
  minStockLevel: integer("min_stock_level").default(10).notNull(),
  defaultPurchasePrice: decimal("default_purchase_price", { precision: 10, scale: 2 }).default("0").notNull(),
  defaultSellingPrice: decimal("default_selling_price", { precision: 10, scale: 2 }).default("0").notNull(),
  unit: text("unit").default("pcs").notNull(),
  expiryDaysDefault: integer("expiry_days_default"),
  active: boolean("active").default(true),
});

export const stockIn = pgTable("stock_in", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  quantity: integer("quantity").notNull(),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  expiryDate: timestamp("expiry_date"),
  notes: text("notes"),
  recordedBy: integer("recorded_by").references(() => users.id).notNull(),
  fiscalYear: integer("fiscal_year").notNull().default(new Date().getFullYear()),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stockOut = pgTable("stock_out", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  reason: text("reason").notNull(),
  notes: text("notes"),
  recordedBy: integer("recorded_by").references(() => users.id).notNull(),
  fiscalYear: integer("fiscal_year").notNull().default(new Date().getFullYear()),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations (unchanged)
export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  stockIns: many(stockIn),
  stockOuts: many(stockOut),
}));

export const stockInRelations = relations(stockIn, ({ one }) => ({
  product: one(products, {
    fields: [stockIn.productId],
    references: [products.id],
  }),
  supplier: one(suppliers, {
    fields: [stockIn.supplierId],
    references: [suppliers.id],
  }),
  user: one(users, {
    fields: [stockIn.recordedBy],
    references: [users.id],
  }),
}));

export const stockOutRelations = relations(stockOut, ({ one }) => ({
  product: one(products, {
    fields: [stockOut.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [stockOut.recordedBy],
    references: [users.id],
  }),
}));

// Schemas with number coercion for decimal fields
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });

export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true });

export const insertProductSchema = createInsertSchema(products)
  .omit({ id: true })
  .extend({
    defaultPurchasePrice: z.coerce.number().min(0, "Purchase price must be positive"),
    defaultSellingPrice: z.coerce.number().min(0, "Selling price must be positive"),
    minStockLevel: z.number().int().min(0),
    categoryId: z.number().int().positive().optional(),
  });

export const insertStockInSchema = createInsertSchema(stockIn)
  .omit({ id: true, createdAt: true })
  .extend({
    purchasePrice: z.coerce.number().min(0, "Unit cost must be positive"),
    quantity: z.number()
      .int("Quantity must be a whole number")
      .min(1, "Quantity must be at least 1")
      .max(100000, "Cannot add more than 100,000 units at once"), // ← add this
    productId: z.number().int().positive("Product is required"),
    recordedBy: z.number().int().positive("User is required"),
    fiscalYear: z.number().int().positive(),
  });

export const insertStockOutSchema = createInsertSchema(stockOut)
  .omit({ id: true, createdAt: true })
  .extend({
    sellingPrice: z.coerce.number().min(0, "Selling price must be positive"),
    quantity: z.number()
      .int("Quantity must be a whole number")
      .min(1, "Quantity must be at least 1")
      .max(100000, "Cannot remove more than 100,000 units at once"), // ← add this
    productId: z.number().int().positive("Product is required"),
    recordedBy: z.number().int().positive("User is required"),
    fiscalYear: z.number().int().positive(),
  });

// Types (unchanged)
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type StockIn = typeof stockIn.$inferSelect;
export type StockOut = typeof stockOut.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type InsertStockIn = z.infer<typeof insertStockInSchema>;
export type InsertStockOut = z.infer<typeof insertStockOutSchema>;

// Derived Types
export interface ProductWithStock extends Product {
  categoryName?: string;
  currentStock: number;
}
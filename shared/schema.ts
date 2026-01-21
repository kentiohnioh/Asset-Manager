import { pgTable, text, serial, integer, boolean, timestamp, decimal, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "stock_controller", "viewer"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("viewer"), // admin, manager, stock_controller, viewer
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
  barcode: text("barcode"), // Optional
  description: text("description"),
  minStockLevel: integer("min_stock_level").default(10).notNull(),
  defaultPurchasePrice: decimal("default_purchase_price", { precision: 10, scale: 2 }).default("0").notNull(),
  defaultSellingPrice: decimal("default_selling_price", { precision: 10, scale: 2 }).default("0").notNull(),
  unit: text("unit").default("pcs").notNull(),
  expiryDaysDefault: integer("expiry_days_default"), // Optional
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
  createdAt: timestamp("created_at").defaultNow(),
});

export const stockOut = pgTable("stock_out", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  reason: text("reason").notNull(), // sale, return, damage, other
  notes: text("notes"),
  recordedBy: integer("recorded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
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

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertStockInSchema = createInsertSchema(stockIn).omit({ id: true, createdAt: true });
export const insertStockOutSchema = createInsertSchema(stockOut).omit({ id: true, createdAt: true });

// Types
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

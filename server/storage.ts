import { db } from "./db";
import { 
  users, products, suppliers, categories, stockIn, stockOut,
  type User, type InsertUser, 
  type Product, type InsertProduct,
  type Supplier, type InsertSupplier,
  type Category, type InsertCategory,
  type StockIn, type InsertStockIn,
  type StockOut, type InsertStockOut,
  type ProductWithStock
} from "@shared/schema";
import { eq, sql, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  deleteUser(id: number): Promise<void>;
  
  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: number): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier>;
  deleteSupplier(id: number): Promise<void>;

  // Products
  getProducts(): Promise<ProductWithStock[]>;
  getProduct(id: number): Promise<ProductWithStock | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  // Inventory
  createStockIn(stock: InsertStockIn): Promise<StockIn>;
  createStockOut(stock: InsertStockOut): Promise<StockOut>;
  getTransactions(limit?: number, type?: 'in' | 'out' | 'all'): Promise<any[]>;
  
  // Reports
  getDashboardStats(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.id);
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(insertCategory).returning();
    return category;
  }

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers);
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier;
  }

  async createSupplier(insertSupplier: InsertSupplier): Promise<Supplier> {
    const [supplier] = await db.insert(suppliers).values(insertSupplier).returning();
    return supplier;
  }

  async updateSupplier(id: number, updates: Partial<InsertSupplier>): Promise<Supplier> {
    const [supplier] = await db.update(suppliers).set(updates).where(eq(suppliers.id, id)).returning();
    return supplier;
  }

  async deleteSupplier(id: number): Promise<void> {
    await db.delete(suppliers).where(eq(suppliers.id, id));
  }

  // Products
  async getProducts(): Promise<ProductWithStock[]> {
    const allProducts = await db.select({
      product: products,
      categoryName: categories.name,
      totalIn: sql<number>`coalesce(sum(${stockIn.quantity}), 0)`,
      totalOut: sql<number>`coalesce(sum(${stockOut.quantity}), 0)`,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(stockIn, eq(products.id, stockIn.productId))
    .leftJoin(stockOut, eq(products.id, stockOut.productId))
    .groupBy(products.id, categories.name);

    // Grouping bug workaround or just logic adjustment: 
    // If I join both tables, I might get Cartesian product if not careful.
    // Better to fetch stock levels separately or use subqueries.
    // Let's use a cleaner approach: Fetch products, then fetch sums. 
    // OR use distinct subqueries.

    // Correct Approach with Subqueries for accurate sums
    const result = await db.execute(sql`
      SELECT 
        p.*,
        c.name as category_name,
        COALESCE((SELECT SUM(quantity) FROM stock_in WHERE product_id = p.id), 0) as total_in,
        COALESCE((SELECT SUM(quantity) FROM stock_out WHERE product_id = p.id), 0) as total_out
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.name ASC
    `);

    return result.rows.map((row: any) => ({
      ...row,
      categoryName: row.category_name,
      minStockLevel: row.min_stock_level,
      defaultPurchasePrice: row.default_purchase_price,
      defaultSellingPrice: row.default_selling_price,
      // Map other snake_case to camelCase manually if needed or rely on Drizzle if I mapped it right
      // Drizzle raw execute returns raw snake_case column names usually
      categoryId: row.category_id,
      expiryDaysDefault: row.expiry_days_default,
      currentStock: Number(row.total_in) - Number(row.total_out)
    })) as ProductWithStock[];
  }

  async getProduct(id: number): Promise<ProductWithStock | undefined> {
    const result = await db.execute(sql`
      SELECT 
        p.*,
        c.name as category_name,
        COALESCE((SELECT SUM(quantity) FROM stock_in WHERE product_id = p.id), 0) as total_in,
        COALESCE((SELECT SUM(quantity) FROM stock_out WHERE product_id = p.id), 0) as total_out
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ${id}
    `);

    if (result.rows.length === 0) return undefined;
    
    const row = result.rows[0];
    return {
      ...row,
      categoryName: row.category_name,
      categoryId: row.category_id,
      minStockLevel: row.min_stock_level,
      defaultPurchasePrice: row.default_purchase_price,
      defaultSellingPrice: row.default_selling_price,
      expiryDaysDefault: row.expiry_days_default,
      currentStock: Number(row.total_in) - Number(row.total_out)
    } as ProductWithStock;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    return product;
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product> {
    const [product] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return product;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // Inventory
  async createStockIn(insertStockIn: InsertStockIn): Promise<StockIn> {
    const fiscalYear = new Date(insertStockIn.date || new Date()).getFullYear();
    const [stock] = await db.insert(stockIn).values({ ...insertStockIn, fiscalYear }).returning();
    return stock;
  }

  async createStockOut(insertStockOut: InsertStockOut): Promise<StockOut> {
    const fiscalYear = new Date(insertStockOut.date || new Date()).getFullYear();
    const [stock] = await db.insert(stockOut).values({ ...insertStockOut, fiscalYear }).returning();
    return stock;
  }

  async getTransactions(limit: number = 50, type: 'in' | 'out' | 'all' = 'all'): Promise<any[]> {
    let query;
    // This is complex to combine efficiently with types, let's do two queries and merge if 'all'
    // Or just simple separate logic
    
    const ins = type === 'out' ? [] : await db.select({
      id: stockIn.id,
      productId: stockIn.productId,
      quantity: stockIn.quantity,
      date: stockIn.date,
      user: users.name,
      productName: products.name,
    }).from(stockIn)
      .leftJoin(users, eq(stockIn.recordedBy, users.id))
      .leftJoin(products, eq(stockIn.productId, products.id))
      .orderBy(desc(stockIn.date))
      .limit(limit);

    const outs = type === 'in' ? [] : await db.select({
      id: stockOut.id,
      productId: stockOut.productId,
      quantity: stockOut.quantity,
      date: stockOut.date,
      user: users.name,
      productName: products.name,
      reason: stockOut.reason
    }).from(stockOut)
      .leftJoin(users, eq(stockOut.recordedBy, users.id))
      .leftJoin(products, eq(stockOut.productId, products.id))
      .orderBy(desc(stockOut.date))
      .limit(limit);

    const formattedIns = ins.map(i => ({ ...i, type: 'in', details: 'Purchase' }));
    const formattedOuts = outs.map(o => ({ ...o, type: 'out', details: o.reason }));

    const all = [...formattedIns, ...formattedOuts]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
      
    return all;
  }

  async getDashboardStats(): Promise<any> {
    const productsList = await this.getProducts();
    const totalProducts = productsList.length;
    const lowStockCount = productsList.filter(p => p.currentStock <= p.minStockLevel).length;
    
    // Simple valuation: sum(stock * purchase_price)
    const totalValue = productsList.reduce((acc, p) => acc + (p.currentStock * Number(p.defaultPurchasePrice)), 0);

    const today = new Date();
    today.setHours(0,0,0,0);

    // Approximate today's stats (in a real app, use SQL range)
    const txs = await this.getTransactions(100, 'all');
    const todayIn = txs.filter(t => t.type === 'in' && new Date(t.date) >= today).reduce((acc, t) => acc + t.quantity, 0);
    const todayOut = txs.filter(t => t.type === 'out' && new Date(t.date) >= today).reduce((acc, t) => acc + t.quantity, 0);

    return {
      totalProducts,
      lowStockCount,
      totalValue,
      todayIn,
      todayOut
    };
  }
}

export const storage = new DatabaseStorage();

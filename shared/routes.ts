import { z } from 'zod';
import { 
  insertUserSchema, 
  insertProductSchema, 
  insertSupplierSchema, 
  insertStockInSchema, 
  insertStockOutSchema,
  insertCategorySchema,
  products,
  suppliers,
  stockIn,
  stockOut,
  users,
  categories
} from './schema';

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
  })
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout',
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products',
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect & { currentStock: number, categoryName: string | null }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/products/:id',
      responses: {
        200: z.custom<typeof products.$inferSelect & { currentStock: number }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/products',
      input: insertProductSchema,
      responses: {
        201: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/products/:id',
      input: insertProductSchema.partial(),
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  categories: {
    list: {
      method: 'GET' as const,
      path: '/api/categories',
      responses: {
        200: z.array(z.custom<typeof categories.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/categories',
      input: insertCategorySchema,
      responses: {
        201: z.custom<typeof categories.$inferSelect>(),
      },
    },
  },
  suppliers: {
    list: {
      method: 'GET' as const,
      path: '/api/suppliers',
      responses: {
        200: z.array(z.custom<typeof suppliers.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/suppliers',
      input: insertSupplierSchema,
      responses: {
        201: z.custom<typeof suppliers.$inferSelect>(),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/suppliers/:id',
      input: insertSupplierSchema.partial(),
      responses: {
        200: z.custom<typeof suppliers.$inferSelect>(),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/suppliers/:id',
      responses: {
        204: z.void(),
      },
    },
  },
  inventory: {
    stockIn: {
      method: 'POST' as const,
      path: '/api/inventory/stock-in',
      input: insertStockInSchema,
      responses: {
        201: z.custom<typeof stockIn.$inferSelect>(),
      },
    },
    stockOut: {
      method: 'POST' as const,
      path: '/api/inventory/stock-out',
      input: insertStockOutSchema,
      responses: {
        201: z.custom<typeof stockOut.$inferSelect>(),
        400: errorSchemas.validation, // For negative stock
      },
    },
    transactions: {
      method: 'GET' as const,
      path: '/api/inventory/transactions',
      input: z.object({
        limit: z.coerce.number().optional(),
        type: z.enum(['in', 'out', 'all']).optional(),
      }).optional(),
      responses: {
        200: z.array(z.object({
          id: z.number(),
          type: z.enum(['in', 'out']),
          productName: z.string(),
          quantity: z.number(),
          date: z.string(),
          user: z.string(),
          details: z.any(),
        })),
      },
    },
  },
  reports: {
    dashboard: {
      method: 'GET' as const,
      path: '/api/reports/dashboard',
      responses: {
        200: z.object({
          totalProducts: z.number(),
          lowStockCount: z.number(),
          totalValue: z.number(),
          todayIn: z.number(),
          todayOut: z.number(),
        }),
      },
    },
    lowStock: {
      method: 'GET' as const,
      path: '/api/reports/low-stock',
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect & { currentStock: number }>()),
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

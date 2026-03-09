import express from 'express';
import cors from 'cors';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import './telegram';
import { setupCronJobs } from './cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.BACKEND_PORT || 3001;

app.use(cors());
app.use(express.json());

// PostgreSQL connection using DATABASE_URL from your .env
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error connecting to PostgreSQL:', err.stack);
    } else {
        console.log('✅ Connected to PostgreSQL database: asset_manager');
        release();
    }
});

// API endpoint for product transactions - combining stock_in and stock_out
app.get('/api/products/:productId/transactions', async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);
        console.log(`📦 Fetching transactions for product ${productId}`);

        // Query to get stock_in records
        const stockInQuery = `
            SELECT 
                id,
                product_id as "productId",
                'in' as type,
                quantity,
                quantity as balance,
                date,
                notes,
                'Stock In' as reference
            FROM stock_in 
            WHERE product_id = $1
        `;

        // Query to get stock_out records
        const stockOutQuery = `
            SELECT 
                id,
                product_id as "productId",
                'out' as type,
                quantity,
                -quantity as balance,
                date,
                notes,
                reason as reference
            FROM stock_out 
            WHERE product_id = $1
        `;

        // Execute both queries
        const [stockInResult, stockOutResult] = await Promise.all([
            pool.query(stockInQuery, [productId]),
            pool.query(stockOutQuery, [productId])
        ]);

        // Combine and sort by date
        let transactions = [...stockInResult.rows, ...stockOutResult.rows];

        // Calculate running balance
        transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

        let runningBalance = 0;
        transactions = transactions.map(t => {
            if (t.type === 'in') {
                runningBalance += t.quantity;
            } else {
                runningBalance -= t.quantity;
            }
            return {
                ...t,
                balance: runningBalance
            };
        });

        // Sort by date descending for display
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        console.log(`✅ Found ${transactions.length} transactions for product ${productId}`);
        res.json(transactions);

    } catch (error) {
        console.error('❌ Database error:', error);
        res.status(500).json({
            error: 'Failed to fetch transactions',
            details: error.message
        });
    }
});

// API endpoint to get current stock balance
app.get('/api/products/:productId/balance', async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);

        // Calculate total stock in
        const stockInResult = await pool.query(
            'SELECT COALESCE(SUM(quantity), 0) as total_in FROM stock_in WHERE product_id = $1',
            [productId]
        );

        // Calculate total stock out
        const stockOutResult = await pool.query(
            'SELECT COALESCE(SUM(quantity), 0) as total_out FROM stock_out WHERE product_id = $1',
            [productId]
        );

        const totalIn = parseInt(stockInResult.rows[0].total_in);
        const totalOut = parseInt(stockOutResult.rows[0].total_out);
        const currentStock = totalIn - totalOut;

        res.json({
            productId,
            currentStock,
            totalIn,
            totalOut
        });

    } catch (error) {
        console.error('❌ Error fetching balance:', error);
        res.status(500).json({ error: 'Failed to fetch balance' });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const dbTest = await pool.query('SELECT NOW() as time');
        const tables = await pool.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
        );

        // Get counts from stock tables
        const stockInCount = await pool.query('SELECT COUNT(*) FROM stock_in');
        const stockOutCount = await pool.query('SELECT COUNT(*) FROM stock_out');

        res.json({
            status: 'OK',
            message: 'Server is running with real stock_in and stock_out data',
            database: {
                connected: true,
                time: dbTest.rows[0].time,
                tables: tables.rows.map(t => t.table_name),
                stats: {
                    stock_in_records: parseInt(stockInCount.rows[0].count),
                    stock_out_records: parseInt(stockOutCount.rows[0].count)
                }
            }
        });
    } catch (error) {
        res.json({
            status: 'OK',
            message: 'Server is running but database connection failed',
            database: {
                connected: false,
                error: error.message
            }
        });
    }
});

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`
🚀 Backend server is running with REAL stock_in and stock_out data!
📡 URL: http://localhost:${port}
📝 API endpoints:
   - GET http://localhost:${port}/api/products/:productId/transactions  (get all transactions)
   - GET http://localhost:${port}/api/products/:productId/balance       (get current stock)
   - GET http://localhost:${port}/api/health                            (health check)
   
📊 Database: PostgreSQL with tables:
   - stock_in: records stock additions
   - stock_out: records stock removals
  `);
});

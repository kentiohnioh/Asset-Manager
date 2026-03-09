// server/cron.ts
import cron from 'node-cron';
import { sendDailySummary } from './telegram';

export function setupCronJobs() {
    // Schedule daily summary at 8:00 AM every day
    cron.schedule('0 8 * * *', async () => {
        console.log('⏰ Running daily summary job...');
        await sendDailySummary();
    });

    // Run low stock check every 4 hours
    cron.schedule('0 */4 * * *', async () => {
        console.log('⏰ Running scheduled low stock check...');
        const { storage } = await import('./storage');
        const { sendLowStockAlert } = await import('./telegram');

        const products = await storage.getProducts();
        const lowStockItems = products.filter(p => p.currentStock <= p.minStockLevel);

        for (const product of lowStockItems) {
            await sendLowStockAlert(
                product.name,
                product.currentStock,
                product.minStockLevel,
                product.unit || 'units'
            );
        }
    });

    console.log('✅ Cron jobs scheduled');
}
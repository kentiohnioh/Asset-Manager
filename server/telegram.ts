// server/telegram.ts
import TelegramBot from 'node-telegram-bot-api';
import { storage } from './storage';

// Get tokens from environment
const token = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

let bot: TelegramBot | null = null;

// Store subscribed users (in production, use database)
const subscribers = new Set<string>();

if (token) {
    // Initialize bot
    bot = new TelegramBot(token, { polling: true });
    console.log('🤖 Telegram bot initialized successfully!');
    console.log('📱 Bot username: @ics_low_stock_alert_bot');

    // Add admin to subscribers if chat ID is provided
    if (adminChatId) {
        subscribers.add(adminChatId);
        console.log(`👑 Admin chat ID registered: ${adminChatId}`);
    }

    // Handle /start command
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id.toString();
        const userName = msg.from?.first_name || 'User';

        const welcomeMessage =
            `👋 *Welcome to ICS Inventory Bot, ${userName}!*\n\n` +
            `I'll help you monitor your inventory and alert you when stock is running low.\n\n` +
            `*🔔 Current Status:*\n` +
            `• Alerts: ${subscribers.has(chatId) ? '✅ Subscribed' : '❌ Not subscribed'}\n\n` +
            `*📋 Available Commands:*\n` +
            `/start - Show this welcome message\n` +
            `/help - Show all commands\n` +
            `/subscribe - Subscribe to low stock alerts\n` +
            `/unsubscribe - Unsubscribe from alerts\n` +
            `/lowstock - Check current low stock items\n` +
            `/stats - View inventory summary\n` +
            `/check - Manually check a specific product\n\n` +
            `*Example:* Send /lowstock to see all items below minimum level.`;

        await bot?.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    });

    // Handle /help command
    bot.onText(/\/help/, (msg) => {
        const chatId = msg.chat.id;

        const helpMessage =
            `📋 *ICS Bot Commands*\n\n` +
            `*Subscription:*\n` +
            `/subscribe - 🔔 Get low stock alerts\n` +
            `/unsubscribe - 🔕 Stop receiving alerts\n\n` +
            `*Inventory:*\n` +
            `/lowstock - ⚠️ Show all low stock items\n` +
            `/stats - 📊 Show inventory summary\n` +
            `/check [product] - 🔍 Check specific product\n\n` +
            `*Examples:*\n` +
            `• /check Monster\n` +
            `• /check Kiri Milk\n\n` +
            `*System:*\n` +
            `/status - Show bot status\n` +
            `/help - Show this message`;

        bot?.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    });

    // Handle /subscribe command
    bot.onText(/\/subscribe/, (msg) => {
        const chatId = msg.chat.id.toString();

        if (subscribers.has(chatId)) {
            bot?.sendMessage(chatId, '✅ You are already subscribed to alerts!');
        } else {
            subscribers.add(chatId);
            bot?.sendMessage(
                chatId,
                `🔔 *Successfully subscribed!*\n\nYou will now receive alerts when:\n` +
                `• Products fall below minimum stock level\n` +
                `• Products run out of stock (critical)\n` +
                `• Daily inventory summary (8:00 AM)`,
                { parse_mode: 'Markdown' }
            );
            console.log(`📢 New subscriber: ${chatId}`);
        }
    });

    // Handle /unsubscribe command
    bot.onText(/\/unsubscribe/, (msg) => {
        const chatId = msg.chat.id.toString();

        if (subscribers.has(chatId)) {
            subscribers.delete(chatId);
            bot?.sendMessage(chatId, '🔕 You have been unsubscribed from alerts.');
            console.log(`🚫 Unsubscribed: ${chatId}`);
        } else {
            bot?.sendMessage(chatId, '❌ You are not currently subscribed.');
        }
    });

    // Handle /lowstock command
    bot.onText(/\/lowstock/, async (msg) => {
        const chatId = msg.chat.id;

        try {
            const products = await storage.getProducts();
            const lowStockItems = products.filter(p => p.currentStock <= p.minStockLevel);

            if (lowStockItems.length === 0) {
                await bot?.sendMessage(
                    chatId,
                    '✅ *All stock levels are healthy!*\n\nNo items below minimum level.',
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            // Separate critical (0 stock) from warning (below min but >0)
            const critical = lowStockItems.filter(p => p.currentStock <= 0);
            const warning = lowStockItems.filter(p => p.currentStock > 0 && p.currentStock < p.minStockLevel);

            let message = `⚠️ *Low Stock Report* ⚠️\n\n`;

            if (critical.length > 0) {
                message += `🔴 *CRITICAL - Out of Stock*\n`;
                critical.forEach(p => {
                    message += `• *${p.name}*: ${p.currentStock}/${p.minStockLevel} ${p.unit}\n`;
                });
                message += `\n`;
            }

            if (warning.length > 0) {
                message += `🟠 *Low Stock*\n`;
                warning.forEach(p => {
                    const percent = Math.round((p.currentStock / p.minStockLevel) * 100);
                    message += `• *${p.name}*: ${p.currentStock}/${p.minStockLevel} ${p.unit} (${percent}%)\n`;
                });
            }

            message += `\n_Total: ${lowStockItems.length} items need attention_`;

            await bot?.sendMessage(chatId, message, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('Error fetching low stock:', error);
            await bot?.sendMessage(chatId, '❌ Error fetching low stock data. Please try again later.');
        }
    });

    // Handle /stats command
    bot.onText(/\/stats/, async (msg) => {
        const chatId = msg.chat.id;

        try {
            const products = await storage.getProducts();
            const stats = await storage.getDashboardStats();

            const totalStock = products.reduce((sum, p) => sum + p.currentStock, 0);
            const totalValue = products.reduce(
                (sum, p) => sum + (p.currentStock * Number(p.defaultPurchasePrice)),
                0
            );
            const lowStockCount = products.filter(p => p.currentStock <= p.minStockLevel).length;

            // Calculate today's date
            const today = new Date();
            const dateStr = today.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const message =
                `📊 *Inventory Summary*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `📅 *${dateStr}*\n\n` +
                `📦 *Overview*\n` +
                `• Total Products: ${products.length}\n` +
                `• Total Units: ${totalStock.toLocaleString()}\n` +
                `• Total Value: $${totalValue.toFixed(2)}\n\n` +
                `⚠️ *Alerts*\n` +
                `• Low Stock Items: ${lowStockCount}\n\n` +
                `📥 *Today's Activity*\n` +
                `• Stock In: ${stats.todayIn} units\n` +
                `• Stock Out: ${stats.todayOut} units\n\n` +
                `_Last updated: ${new Date().toLocaleTimeString()}_`;

            await bot?.sendMessage(chatId, message, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('Error fetching stats:', error);
            await bot?.sendMessage(chatId, '❌ Error fetching inventory stats.');
        }
    });

    // Handle /check command
    bot.onText(/\/check (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const searchTerm = match?.[1]?.toLowerCase().trim();

        if (!searchTerm) {
            await bot?.sendMessage(chatId, '❌ Please specify a product name. Example: `/check Monster`', { parse_mode: 'Markdown' });
            return;
        }

        try {
            const products = await storage.getProducts();
            const matches = products.filter(p =>
                p.name.toLowerCase().includes(searchTerm) ||
                p.barcode?.toLowerCase().includes(searchTerm)
            );

            if (matches.length === 0) {
                await bot?.sendMessage(chatId, `❌ No products found matching "${searchTerm}"`);
                return;
            }

            if (matches.length > 5) {
                await bot?.sendMessage(
                    chatId,
                    `🔍 Found ${matches.length} products. Please be more specific.`
                );
                return;
            }

            for (const product of matches) {
                const status = getStockStatus(product.currentStock, product.minStockLevel);
                const percentage = Math.round((product.currentStock / product.minStockLevel) * 100);

                const message =
                    `🔍 *${product.name}*\n` +
                    `━━━━━━━━━━━━━━━━\n` +
                    `• Category: ${product.categoryName || 'Uncategorized'}\n` +
                    `• Current Stock: ${product.currentStock} ${product.unit}\n` +
                    `• Minimum Level: ${product.minStockLevel} ${product.unit}\n` +
                    `• Status: ${status.emoji} ${status.text}\n` +
                    `• Level: ${percentage}% of minimum\n` +
                    `• Buy Price: $${Number(product.defaultPurchasePrice).toFixed(2)}\n` +
                    `• Sell Price: $${Number(product.defaultSellingPrice).toFixed(2)}`;

                await bot?.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            }

        } catch (error) {
            console.error('Error checking product:', error);
            await bot?.sendMessage(chatId, '❌ Error checking product.');
        }
    });

    // Handle /status command
    bot.onText(/\/status/, (msg) => {
        const chatId = msg.chat.id;

        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);

        const message =
            `🤖 *Bot Status*\n` +
            `━━━━━━━━━━━━━━━━\n\n` +
            `• Status: 🟢 Online\n` +
            `• Uptime: ${hours}h ${minutes}m\n` +
            `• Subscribers: ${subscribers.size}\n` +
            `• Version: 1.0.0\n\n` +
            `_Connected to ICS Inventory System_`;

        bot?.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    // Handle unknown commands
    bot.on('message', (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text || '';

        // Ignore if it's a command we handle
        if (text.startsWith('/')) {
            const command = text.split(' ')[0].toLowerCase();
            const handledCommands = ['/start', '/help', '/subscribe', '/unsubscribe', '/lowstock', '/stats', '/check', '/status'];

            if (!handledCommands.includes(command)) {
                bot?.sendMessage(
                    chatId,
                    `❌ Unknown command: ${command}\n\nType /help to see available commands.`
                );
            }
        }
    });

} else {
    console.log('⚠️ Telegram bot token not found. Alerts will be logged to console only.');
}

// Helper function to get stock status with emoji
function getStockStatus(current: number, min: number): { emoji: string; text: string } {
    if (current <= 0) return { emoji: '🔴', text: 'CRITICAL' };
    if (current < min) return { emoji: '🟠', text: 'LOW' };
    if (current === min) return { emoji: '🟡', text: 'WARNING' };
    return { emoji: '🟢', text: 'HEALTHY' };
}

// Send low stock alert to all subscribers
export async function sendLowStockAlert(
    productName: string,
    currentStock: number,
    minStockLevel: number,
    unit: string
): Promise<boolean> {

    // Always log to console
    console.log(`🔔 LOW STOCK ALERT: ${productName} - ${currentStock}/${minStockLevel} ${unit}`);

    if (!bot || !token) {
        console.log('📝 Alert logged (Telegram not configured)');
        return false;
    }

    try {
        const isCritical = currentStock <= 0;
        const isLow = currentStock < minStockLevel;

        let emoji = isCritical ? '🔴' : (isLow ? '🟠' : '🟡');
        let urgency = isCritical ? 'CRITICAL' : (isLow ? 'LOW' : 'WARNING');

        const message =
            `${emoji} *${urgency} STOCK ALERT* ${emoji}\n\n` +
            `*Product:* ${productName}\n` +
            `*Current Stock:* ${currentStock} ${unit}\n` +
            `*Minimum Level:* ${minStockLevel} ${unit}\n` +
            `*Status:* ${getStockStatus(currentStock, minStockLevel).emoji} ${getStockStatus(currentStock, minStockLevel).text}\n\n` +
            `🕐 ${new Date().toLocaleString()}\n\n` +
            `_Action required: Please restock soon._`;

        // Send to all subscribers
        let sentCount = 0;
        for (const chatId of subscribers) {
            try {
                await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                sentCount++;
            } catch (error) {
                console.error(`Failed to send to ${chatId}:`, error);
                // Remove invalid subscribers
                if (error.response?.body?.description?.includes('chat not found')) {
                    subscribers.delete(chatId);
                }
            }
        }

        console.log(`✅ Telegram alert sent to ${sentCount} subscribers for ${productName}`);
        return sentCount > 0;

    } catch (error) {
        console.error('❌ Failed to send Telegram alert:', error);
        return false;
    }
}

// Send daily summary to all subscribers
export async function sendDailySummary() {
    if (!bot || subscribers.size === 0) return;

    try {
        const products = await storage.getProducts();
        const stats = await storage.getDashboardStats();

        const lowStockItems = products.filter(p => p.currentStock <= p.minStockLevel);
        const criticalItems = lowStockItems.filter(p => p.currentStock <= 0);
        const warningItems = lowStockItems.filter(p => p.currentStock > 0 && p.currentStock < p.minStockLevel);

        const totalValue = products.reduce(
            (sum, p) => sum + (p.currentStock * Number(p.defaultPurchasePrice)),
            0
        );

        const today = new Date();
        const dateStr = today.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        let message =
            `📅 *Daily Inventory Summary*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📆 *${dateStr}*\n\n` +
            `📊 *Overview*\n` +
            `• Total Products: ${products.length}\n` +
            `• Total Value: $${totalValue.toFixed(2)}\n` +
            `• Total Units: ${products.reduce((sum, p) => sum + p.currentStock, 0).toLocaleString()}\n\n`;

        if (criticalItems.length > 0) {
            message += `🔴 *CRITICAL (Out of Stock)*\n`;
            criticalItems.forEach(p => {
                message += `  • ${p.name}: ${p.currentStock} ${p.unit}\n`;
            });
            message += `\n`;
        }

        if (warningItems.length > 0) {
            message += `🟠 *Low Stock*\n`;
            warningItems.forEach(p => {
                message += `  • ${p.name}: ${p.currentStock}/${p.minStockLevel} ${p.unit}\n`;
            });
            message += `\n`;
        }

        if (lowStockItems.length === 0) {
            message += `✅ *All stock levels are healthy!*\n\n`;
        }

        message += `📥 *Today's Activity*\n`;
        message += `• Stock In: ${stats.todayIn} units\n`;
        message += `• Stock Out: ${stats.todayOut} units\n\n`;
        message += `_Have a productive day!_`;

        // Send to all subscribers
        let sentCount = 0;
        for (const chatId of subscribers) {
            try {
                await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                sentCount++;
            } catch (error) {
                console.error(`Failed to send daily summary to ${chatId}:`, error);
            }
        }

        console.log(`✅ Daily summary sent to ${sentCount} subscribers`);

    } catch (error) {
        console.error('❌ Failed to send daily summary:', error);
    }
}

// Get subscriber count
export function getSubscriberCount(): number {
    return subscribers.size;
}

export default bot;
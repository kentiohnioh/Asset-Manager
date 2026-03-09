// src/hooks/use-stock-transactions.ts
import { useQuery } from "@tanstack/react-query";

export interface StockTransaction {
    id: number;
    productId: number;
    type: 'in' | 'out';
    quantity: number;
    balance: number;
    date: string;
    notes?: string;
    reference?: string;
}

export function useStockTransactions(productId?: number) {
    return useQuery<StockTransaction[]>({
        queryKey: ['stock-transactions', productId],
        queryFn: async () => {
            if (!productId) return [];

            // Try multiple possible URLs
            const urls = [
                `http://localhost:3001/api/products/${productId}/transactions`,
                `http://127.0.0.1:3001/api/products/${productId}/transactions`,
                `/api/products/${productId}/transactions` // Fallback to proxy
            ];

            for (const url of urls) {
                try {
                    console.log('📡 Trying URL:', url);
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                        },
                    });

                    if (response.ok) {
                        const data = await response.json();
                        console.log('✅ Success with URL:', url, data);
                        return data;
                    }
                } catch (error) {
                    console.log(`❌ URL ${url} failed:`, error);
                }
            }

            throw new Error('Failed to fetch from all URLs');
        },
        enabled: !!productId,
        retry: false,
    });
}
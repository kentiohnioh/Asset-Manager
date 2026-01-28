import { useDashboardStats, useProducts, useTransactions } from "@/hooks/use-inventory";
import { Sidebar } from "@/components/Sidebar";
import { StatCard } from "@/components/StatCard";
import { Package, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: products, isLoading: productsLoading } = useProducts(); // Reuse products
  const { data: transactions, isLoading: txLoading } = useTransactions();

  // Calculate low stock items locally
  const lowStockItems = products?.filter(p => p.currentStock <= p.minStockLevel) || [];

  const isLoading = statsLoading || productsLoading || txLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your inventory status</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Products"
          value={stats?.totalProducts || 0}
          icon={Package}
          className="border-blue-100 dark:border-blue-900/20"
        />
        <StatCard
          title="Low Stock Alerts"
          value={lowStockItems.length} // Use local count
          icon={AlertTriangle}
          description="Items below minimum level"
          className={
            lowStockItems.length > 0
              ? "border-red-200 bg-red-50/30 dark:bg-red-900/10 dark:border-red-900/30"
              : ""
          }
        />
        <StatCard
          title="Today's Stock In"
          value={stats?.todayIn || 0}
          icon={ArrowDownToLine}
          className="border-green-100 dark:border-green-900/20"
        />
        <StatCard
          title="Today's Stock Out"
          value={stats?.todayOut || 0}
          icon={ArrowUpFromLine}
          className="border-orange-100 dark:border-orange-900/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Transactions */}
        <Card className="lg:col-span-2 shadow-sm border-border/60">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.slice(0, 5).map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <Badge
                        variant={tx.type === 'in' ? "outline" : "secondary"}
                        className={
                          tx.type === 'in'
                            ? "border-green-500 text-green-600 bg-green-50"
                            : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                        }
                      >
                        {tx.type === 'in' ? 'Stock In' : 'Stock Out'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{tx.productName}</TableCell>
                    <TableCell>{tx.quantity}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(tx.date), "MMM d, h:mm a")}
                    </TableCell>
                    <TableCell className="text-sm">{tx.user}</TableCell>
                  </TableRow>
                ))}
                {!transactions?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      No recent transactions
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Low Stock Alert List */}
        <Card className="shadow-sm border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Items ({lowStockItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockItems.length > 0 ? (
                lowStockItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10"
                  >
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Min: {item.minStockLevel}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-destructive">{item.currentStock}</p>
                      <p className="text-xs text-muted-foreground">{item.unit || 'pcs'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-100 mb-2">
                    <Package className="h-5 w-5 text-green-600" />
                  </div>
                  <p>All stock levels healthy!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
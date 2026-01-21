import { useDashboardStats, useTransactions } from "@/hooks/use-inventory";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Reports() {
  const { data: transactions, isLoading } = useTransactions();
  const { data: stats } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Prepare chart data - group by date (last 7 days simplified)
  const chartData = transactions?.slice(0, 50).reduce((acc: any[], curr) => {
    const date = new Date(curr.date).toLocaleDateString();
    const existing = acc.find(item => item.date === date);
    
    if (existing) {
      if (curr.type === 'in') existing.in += curr.quantity;
      else existing.out += curr.quantity;
    } else {
      acc.push({
        date,
        in: curr.type === 'in' ? curr.quantity : 0,
        out: curr.type === 'out' ? curr.quantity : 0,
      });
    }
    return acc;
  }, []) || [];

  return (
    <div className="flex min-h-screen bg-muted/10">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 max-w-[calc(100vw-16rem)] overflow-x-hidden">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1">Detailed insights into inventory performance</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print Report
          </Button>
        </div>

        <Tabs defaultValue="movement" className="space-y-6">
          <TabsList>
            <TabsTrigger value="movement">Stock Movement</TabsTrigger>
            <TabsTrigger value="financial">Financial Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="movement">
            <Card className="shadow-sm border-border/60">
              <CardHeader>
                <CardTitle>Inventory Flow (Last 7 Days)</CardTitle>
                <CardDescription>Comparison of incoming vs outgoing stock volume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Legend />
                      <Bar dataKey="in" name="Stock In" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="out" name="Stock Out" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Total Inventory Value</CardTitle>
                  <CardDescription>Estimated valuation based on purchase price</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold font-display text-primary">
                    ${stats?.totalValue.toLocaleString() || "0.00"}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Potential Sales Value</CardTitle>
                  <CardDescription>Projected revenue from current stock</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold font-display text-green-600">
                    ${((stats?.totalValue || 0) * 1.3).toLocaleString()} 
                    {/* Mock calculation for demo */}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

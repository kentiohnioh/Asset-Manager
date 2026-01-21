import { useState } from "react";
import { useDashboardStats, useTransactions } from "@/hooks/use-inventory";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2, Printer, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Reports() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const { data: transactions, isLoading: isTxLoading } = useTransactions();
  const { data: stats } = useDashboardStats();
  const { data: users } = useQuery<any[]>({ queryKey: ["/api/users"] });

  if (isTxLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filter and group transactions
  const filteredTxs = transactions?.filter(tx => 
    selectedUser === "all" || tx.user === selectedUser
  );

  const getPeriodKey = (dateStr: string) => {
    const d = new Date(dateStr);
    if (period === "daily") return d.toLocaleDateString();
    if (period === "weekly") {
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - d.getDay());
      return `Week of ${startOfWeek.toLocaleDateString()}`;
    }
    return d.toLocaleString('default', { month: 'short', year: 'numeric' });
  };

  const chartData = filteredTxs?.reduce((acc: any[], curr) => {
    const key = getPeriodKey(curr.date);
    const existing = acc.find(item => item.key === key);
    
    if (existing) {
      if (curr.type === 'in') existing.in += curr.quantity;
      else existing.out += curr.quantity;
    } else {
      acc.push({
        key,
        in: curr.type === 'in' ? curr.quantity : 0,
        out: curr.type === 'out' ? curr.quantity : 0,
      });
    }
    return acc;
  }, []).slice(-10) || []; // Show last 10 periods

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Detailed insights into inventory performance</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print Report
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 bg-card p-4 rounded-xl border border-border/60">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="User" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {users?.map(u => (
              <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="movement" className="space-y-6">
        <TabsList>
          <TabsTrigger value="movement">Stock Movement</TabsTrigger>
          <TabsTrigger value="financial">Financial Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="movement">
          <Card className="shadow-sm border-border/60">
            <CardHeader>
              <CardTitle>Inventory Flow ({period.charAt(0).toUpperCase() + period.slice(1)})</CardTitle>
              <CardDescription>Comparison of incoming vs outgoing stock volume</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="key" />
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            <Card>
              <CardHeader>
                <CardTitle>Fiscal Year Summary</CardTitle>
                <CardDescription>Management summary for the current fiscal year</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Fiscal Year</p>
                    <p className="text-2xl font-bold">{new Date().getFullYear()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Transactions Logged</p>
                    <p className="text-2xl font-bold">{filteredTxs?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useProducts, useSuppliers, useStockIn } from "@/hooks/use-inventory";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertStockInSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, ArrowDownToLine, CheckCircle2 } from "lucide-react";

type StockInFormValues = z.infer<typeof insertStockInSchema>;

export default function StockIn() {
  const { data: products } = useProducts();
  const { data: suppliers } = useSuppliers();
  const stockInMutation = useStockIn();
  const { toast } = useToast();
  
  const form = useForm<StockInFormValues>({
    resolver: zodResolver(insertStockInSchema),
    defaultValues: {
      quantity: 1,
      purchasePrice: 0,
      notes: "",
    }
  });

  // Watch product ID to auto-fill price
  const selectedProductId = form.watch("productId");
  
  useEffect(() => {
    if (selectedProductId && products) {
      const product = products.find(p => p.id === selectedProductId);
      if (product) {
        form.setValue("purchasePrice", Number(product.defaultPurchasePrice));
      }
    }
  }, [selectedProductId, products, form]);

  const onSubmit = async (data: StockInFormValues) => {
    try {
      await stockInMutation.mutateAsync(data);
      toast({
        title: "Stock Received",
        description: "Inventory updated successfully",
      });
      form.reset({
        quantity: 1,
        purchasePrice: 0,
        notes: "",
        productId: undefined,
        supplierId: undefined,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/10">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-2xl">
          <div className="mb-6">
            <h1 className="text-3xl font-display font-bold">Receive Stock</h1>
            <p className="text-muted-foreground mt-1">Record incoming inventory from suppliers</p>
          </div>

          <Card className="shadow-lg border-border/60">
            <CardHeader className="bg-primary/5 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <ArrowDownToLine className="h-6 w-6 text-green-700" />
                </div>
                <div>
                  <CardTitle>Stock In Entry</CardTitle>
                  <CardDescription>Enter details of received goods</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="productId"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Product</FormLabel>
                          <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select product..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {products?.map((p) => (
                                <SelectItem key={p.id} value={p.id.toString()}>
                                  {p.name} (Curr: {p.currentStock} {p.unit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="supplierId"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Supplier</FormLabel>
                          <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select supplier..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {suppliers?.map((s) => (
                                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              className="h-11 font-medium text-lg" 
                              {...field} 
                              onChange={e => field.onChange(Number(e.target.value))} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="purchasePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Cost ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              className="h-11" 
                              {...field} 
                              onChange={e => field.onChange(Number(e.target.value))} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="e.g. Invoice #1234, received by John" 
                              className="resize-none" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all"
                    disabled={stockInMutation.isPending}
                  >
                    {stockInMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Confirm Stock In
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

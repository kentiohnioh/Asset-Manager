import { useState, useEffect } from "react";
import { useProducts, useStockOut } from "@/hooks/use-inventory";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertStockOutSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, ArrowUpFromLine, ShoppingCart } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type StockOutFormValues = z.infer<typeof insertStockOutSchema>;

export default function StockOut() {
  const { data: products } = useProducts();
  const stockOutMutation = useStockOut();
  const { toast } = useToast();

  const form = useForm<StockOutFormValues>({
    resolver: zodResolver(insertStockOutSchema),
    defaultValues: {
      quantity: 1,
      sellingPrice: 0,
      reason: "sale",
      notes: "",
    }
  });

  const selectedProductId = form.watch("productId");
  const quantity = form.watch("quantity");

  const selectedProduct = products?.find(p => p.id === selectedProductId);

  useEffect(() => {
    form.setValue("recordedBy", 1); // temporary - replace with real user.id from auth later
    form.setValue("fiscalYear", new Date().getFullYear());
  }, [form]);

  const isStockInsufficient = selectedProduct && quantity > selectedProduct.currentStock;

  const onSubmit = async (data: StockOutFormValues) => {
    try {
      await stockOutMutation.mutateAsync(data);
      toast({
        title: "Stock Out Recorded",
        description: "Inventory updated successfully",
      });
      form.reset({
        quantity: 1,
        sellingPrice: 0,
        reason: "sale",
        notes: "",
        productId: undefined,
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
    <div className="flex items-center justify-center min-h-full">
      <div className="w-full max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-display font-bold">Dispatch Stock</h1>
          <p className="text-muted-foreground mt-1">Record sales, usage, or damage</p>
        </div>

        <Card className="shadow-lg border-border/60">
          <CardHeader className="bg-primary/5 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <ArrowUpFromLine className="h-6 w-6 text-orange-700" />
              </div>
              <div>
                <CardTitle>Stock Out Entry</CardTitle>
                <CardDescription>Enter details of dispatched items</CardDescription>
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
                                {p.name} (Available: {p.currentStock} {p.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isStockInsufficient && (
                    <div className="col-span-2">
                      <Alert variant="destructive">
                        <AlertTitle>Insufficient Stock!</AlertTitle>
                        <AlertDescription>
                          You are trying to remove {quantity} units but only {selectedProduct?.currentStock} are available.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Reason</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select reason..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="sale">Sale</SelectItem>
                            <SelectItem value="usage">Internal Usage</SelectItem>
                            <SelectItem value="damage">Damage/Expired</SelectItem>
                            <SelectItem value="return">Return to Supplier</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
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
                    name="sellingPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Price ($)</FormLabel>
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
                            placeholder="e.g. Sold to Customer X"
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
                  variant="destructive"
                  className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all"
                  disabled={
                    stockOutMutation.isPending ||
                    !form.formState.isValid ||           // ← add this line (critical!)
                    isStockInsufficient
                  }
                >
                  {stockOutMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      Confirm Stock Out
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

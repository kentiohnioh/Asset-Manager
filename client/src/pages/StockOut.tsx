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
import { Loader2, ArrowUpFromLine, ShoppingCart, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const MAX_QUANTITY_PER_TRANSACTION = 100000;

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
    form.setValue("recordedBy", 1);
    form.setValue("fiscalYear", new Date().getFullYear());
  }, [form]);

  const isStockInsufficient = selectedProduct && quantity > selectedProduct.currentStock;
  const isQuantityTooHigh = quantity > MAX_QUANTITY_PER_TRANSACTION;
  const willBeLowStock = selectedProduct &&
    (selectedProduct.currentStock - quantity) <= selectedProduct.minStockLevel &&
    (selectedProduct.currentStock - quantity) > 0;
  const willEmptyStock = selectedProduct &&
    (selectedProduct.currentStock - quantity) === 0;

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
    <div className="flex h-screen bg-gray-50/50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="px-6 py-6 max-w-3xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Dispatch Stock</h1>
            <p className="text-muted-foreground mt-1">
              Record sales, usage, or damage
            </p>
          </div>

          {/* Form Card */}
          <Card>
            <CardHeader className="bg-orange-50/50 border-b py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <ArrowUpFromLine className="h-5 w-5 text-orange-700" />
                </div>
                <div>
                  <CardTitle className="text-lg">Stock Out Entry</CardTitle>
                  <CardDescription className="text-sm">Enter details of dispatched items</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {/* Product */}
                  <FormField
                    control={form.control}
                    name="productId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Product <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select product..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {products?.map((p) => (
                              <SelectItem key={p.id} value={p.id.toString()}>
                                <span>{p.name} (Available: {p.currentStock} {p.unit})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Warning Messages */}
                  {selectedProduct && !isStockInsufficient && willBeLowStock && (
                    <Alert variant="default" className="bg-yellow-50 border-yellow-400 py-3">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertTitle className="text-sm font-medium">Low Stock Warning!</AlertTitle>
                      <AlertDescription className="text-xs">
                        After this transaction, only {(selectedProduct.currentStock - quantity).toLocaleString()} {selectedProduct.unit} will remain.
                        {willEmptyStock && " This will completely empty the stock!"}
                      </AlertDescription>
                    </Alert>
                  )}

                  {selectedProduct && isStockInsufficient && (
                    <Alert variant="destructive" className="py-3">
                      <AlertTitle className="text-sm font-medium">Insufficient Stock!</AlertTitle>
                      <AlertDescription className="text-xs">
                        You are trying to remove {quantity} units but only {selectedProduct.currentStock} are available.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Reason and Quantity Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Reason <span className="text-red-500">*</span></FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-10">
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
                          <FormLabel className="text-sm font-medium">Quantity <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="1"
                              className="h-10"
                              {...field}
                              onChange={e => field.onChange(e.target.value ? Number(e.target.value) : 1)}
                              value={field.value}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Unit Price */}
                  <FormField
                    control={form.control}
                    name="sellingPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Unit Price ($) <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="h-10"
                            {...field}
                            onChange={e => {
                              const value = e.target.value === '' ? 0 : Number(e.target.value);
                              field.onChange(value);
                            }}
                            value={field.value === 0 && field.value !== undefined ? '' : field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g. Sold to Customer X"
                            className="resize-none min-h-[80px]"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="destructive"
                    className="w-full h-10 mt-2"
                    disabled={
                      stockOutMutation.isPending ||
                      !form.formState.isValid ||
                      isStockInsufficient ||
                      isQuantityTooHigh
                    }
                  >
                    {stockOutMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Confirm Stock Out
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
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
import { Loader2, ArrowDownToLine, CheckCircle2, Package, Truck } from "lucide-react";

type StockInFormValues = z.infer<typeof insertStockInSchema>;

export default function StockIn() {
  const { data: products = [], isLoading: isLoadingProducts } = useProducts();
  const {
    data: suppliers = [],
    isLoading: isLoadingSuppliers,
    error: suppliersError
  } = useSuppliers();

  const stockInMutation = useStockIn();
  const { toast } = useToast();

  const form = useForm<StockInFormValues>({
    resolver: zodResolver(insertStockInSchema),
    defaultValues: {
      quantity: 1,
      purchasePrice: 0,
      notes: "",
      productId: undefined,
      supplierId: undefined,
    },
  });

  useEffect(() => {
    form.setValue("fiscalYear", new Date().getFullYear());

    const userId = 1;
    if (userId) {
      form.setValue("recordedBy", userId);
    }
  }, [form]);

  const selectedProductId = form.watch("productId");

  useEffect(() => {
    if (selectedProductId && products.length > 0) {
      const product = products.find(p => p.id === selectedProductId);
      if (product) {
        form.setValue("purchasePrice", Number(product.defaultPurchasePrice) || 0);
      }
    }
  }, [selectedProductId, products, form]);

  const onSubmit = async (data: StockInFormValues) => {
    try {
      await stockInMutation.mutateAsync(data);
      toast({
        title: "Success",
        description: "Stock received successfully",
      });
      form.reset({
        quantity: 1,
        purchasePrice: 0,
        notes: "",
        productId: undefined,
        supplierId: undefined,
      });
    } catch (error: any) {
      const message = error?.response?.data?.message || error.message || "Failed to record stock in";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      console.error("Stock In error:", error);
    }
  };

  const isFormReady = !isLoadingProducts && !isLoadingSuppliers && products.length > 0 && suppliers.length > 0;

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">Stock In</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Record incoming inventory from suppliers
            </p>
          </div>

          {/* Main Card */}
          <Card className="border shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-b">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <ArrowDownToLine className="h-6 w-6 text-green-700 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-xl">Stock In Entry</CardTitle>
                  <CardDescription>Enter details of received goods</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {!isFormReady ? (
                <div className="text-center py-10 px-4">
                  {isLoadingProducts || isLoadingSuppliers ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Loading required data...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-amber-600 dark:text-amber-400 font-medium">
                        Missing products or suppliers.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Please add some products and suppliers first.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Product and Supplier - Side by side on tablet/desktop */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      {/* Product */}
                      <FormField
                        control={form.control}
                        name="productId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              Product <span className="text-red-500">*</span>
                            </FormLabel>
                            <Select
                              onValueChange={(val) => field.onChange(val ? Number(val) : undefined)}
                              value={field.value?.toString() || ""}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full h-11">
                                  <SelectValue placeholder="Select product..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {products.map((p) => (
                                  <SelectItem key={p.id} value={p.id.toString()}>
                                    <span className="flex items-center justify-between gap-2">
                                      <span>{p.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        (Stock: {p.currentStock} {p.unit})
                                      </span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Supplier */}
                      <FormField
                        control={form.control}
                        name="supplierId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-muted-foreground" />
                              Supplier <span className="text-red-500">*</span>
                            </FormLabel>

                            {suppliersError && (
                              <p className="text-sm text-red-500 mb-1">
                                Error: {suppliersError.message}
                              </p>
                            )}

                            <Select
                              onValueChange={(val) => field.onChange(val ? Number(val) : undefined)}
                              value={field.value?.toString() || ""}
                              disabled={isLoadingSuppliers || suppliers.length === 0}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full h-11">
                                  <SelectValue placeholder="Select supplier..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {suppliers.map((s) => (
                                  <SelectItem key={s.id} value={s.id.toString()}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {suppliers.length === 0 && !isLoadingSuppliers && !suppliersError && (
                              <p className="text-sm text-amber-600 mt-1">
                                No suppliers found. Add some in the Suppliers page.
                              </p>
                            )}

                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Quantity and Unit Cost - Side by side */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                      {/* Quantity */}
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="1"
                                className="h-11"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 1)}
                                value={field.value}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />


                      {/* Unit Cost */}
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
                                min="0"
                                placeholder="0"
                                className="h-11"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                value={field.value}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Notes - Full width */}
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="e.g. Invoice #1234, received by John"
                              className="resize-none min-h-[100px]"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                      disabled={
                        stockInMutation.isPending ||
                        !form.formState.isValid ||
                        isLoadingProducts ||
                        isLoadingSuppliers ||
                        products.length === 0 ||
                        suppliers.length === 0
                      }
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
              )}
            </CardContent>
          </Card>

          {/* Help Text - Optional */}
          <p className="text-xs text-center text-muted-foreground mt-4">
            Fields marked with <span className="text-red-500">*</span> are required
          </p>
        </div>
      </main>
    </div>
  );
}
import { useState, useEffect } from "react";
import { useProducts, useSuppliers, useStockIn } from "@/hooks/use-inventory";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    form.setValue("recordedBy", 1);
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
    }
  };

  const isFormReady = !isLoadingProducts && !isLoadingSuppliers && products.length > 0 && suppliers.length > 0;

  return (
    <div className="flex h-screen bg-gray-50/50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="px-6 py-6 max-w-3xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Stock In</h1>
            <p className="text-muted-foreground mt-1">
              Record incoming inventory from suppliers
            </p>
          </div>

          {/* Form Card */}
          <Card>
            <CardHeader className="bg-green-50/50 border-b py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <ArrowDownToLine className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <CardTitle className="text-lg">Stock In Entry</CardTitle>
                  <CardDescription className="text-sm">Enter details of received goods</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {!isFormReady ? (
                <div className="text-center py-10">
                  {isLoadingProducts || isLoadingSuppliers ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p>Loading required data...</p>
                    </div>
                  ) : (
                    <p className="text-amber-600">
                      Missing products or suppliers. Please add some first.
                    </p>
                  )}
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    {/* Product */}
                    <FormField
                      control={form.control}
                      name="productId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Product <span className="text-red-500">*</span></FormLabel>
                          <Select
                            onValueChange={(val) => field.onChange(val ? Number(val) : undefined)}
                            value={field.value?.toString() || ""}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select product..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {products.map((p) => (
                                <SelectItem key={p.id} value={p.id.toString()}>
                                  <span>{p.name} (Stock: {p.currentStock} {p.unit})</span>
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
                          <FormLabel className="text-sm font-medium">Supplier <span className="text-red-500">*</span></FormLabel>
                          {suppliersError && (
                            <p className="text-sm text-red-500">Error: {suppliersError.message}</p>
                          )}
                          <Select
                            onValueChange={(val) => field.onChange(val ? Number(val) : undefined)}
                            value={field.value?.toString() || ""}
                            disabled={isLoadingSuppliers || suppliers.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10">
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

                    {/* Quantity and Price Grid */}
                    <div className="grid grid-cols-2 gap-4">
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
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 1)}
                                value={field.value}
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
                            <FormLabel className="text-sm font-medium">Unit Cost ($) <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                className="h-10"
                                {...field}
                                onChange={(e) => {
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
                    </div>

                    {/* Notes */}
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="e.g. Invoice #1234, received by John"
                              className="resize-none min-h-[80px]"
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
                      className="w-full h-10 mt-2"
                      disabled={stockInMutation.isPending || !form.formState.isValid}
                    >
                      {stockInMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Confirm Stock In
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
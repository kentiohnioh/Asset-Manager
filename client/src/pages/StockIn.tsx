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
    // Auto-set fiscal year
    form.setValue("fiscalYear", new Date().getFullYear());

    // Auto-set recordedBy with logged-in user ID
    // Replace with your actual auth hook (useAuth/useUser/useSession etc.)
    const userId = 1; // temporary hard-coded admin ID (from DB)
    // const userId = useAuth().user?.id; // real version when auth is ready

    if (userId) {
      form.setValue("recordedBy", userId);
    }
  }, [form]);

  // Auto-fill purchase price when product is selected
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
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Stock In</h1>
          <p className="text-muted-foreground mb-6">
            Record incoming inventory from suppliers
          </p>

          <Card>
            <CardHeader className="bg-muted/40">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <ArrowDownToLine className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <CardTitle>Stock In Entry</CardTitle>
                  <CardDescription>Enter details of received goods</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
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
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      {/* Product */}
                      <FormField
                        control={form.control}
                        name="productId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product</FormLabel>
                            <Select
                              onValueChange={(val) => field.onChange(val ? Number(val) : undefined)}
                              value={field.value?.toString() || ""}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select product..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {products.map((p) => (
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

                      {/* Supplier */}
                      <FormField
                        control={form.control}
                        name="supplierId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Supplier</FormLabel>

                            {suppliersError && (
                              <p className="text-sm text-red-500 mb-1">
                                Error loading suppliers: {suppliersError.message}
                              </p>
                            )}

                            <Select
                              onValueChange={(val) => field.onChange(val ? Number(val) : undefined)}
                              value={field.value?.toString() || ""}
                              disabled={isLoadingSuppliers || suppliers.length === 0}
                            >
                              <FormControl>
                                <SelectTrigger>
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
                                className="h-11"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
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
                                className="h-11"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
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
                          <FormItem className="col-span-2">
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="e.g. Invoice #1234, received by John"
                                className="resize-none"
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 text-base font-semibold"
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
        </div>
      </main>
    </div>
  );
}
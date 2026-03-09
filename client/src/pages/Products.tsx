import { useQueryClient } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useCategories } from "@/hooks/use-inventory";
import { useStockTransactions } from "@/hooks/use-stock-transactions";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2, Loader2, Filter } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { insertProductSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

type ProductFormValues = z.infer<typeof insertProductSchema>;

// Delete Confirmation Modal
function DeleteProductWarning({ product, onClose, onConfirm, isDeleting }: {
  product: any;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <span className="text-2xl">⚠️</span> Delete Product
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
            <p className="font-medium">Are you sure you want to delete "{product?.name || 'this product'}"?</p>
            <p className="text-sm text-muted-foreground mt-1">
              This action cannot be undone. The product will be removed from the list but history will be kept.
            </p>
          </div>

          {product?.currentStock > 0 && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
              <h4 className="font-medium text-amber-800 mb-2">Warning:</h4>
              <p className="text-sm text-amber-700">
                This product has {product.currentStock} {product.unit} in stock.
                You should transfer or sell this stock before deleting.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Product'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Cannot Delete Warning Modal
function CannotDeleteProductWarning({ product, onClose, onViewStock }: {
  product: any;
  onClose: () => void;
  onViewStock: () => void;
}) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <span className="text-2xl">⚠️</span> Cannot Delete Product
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
            <p className="font-medium">"{product?.name || 'This product'}" cannot be deleted.</p>
            <p className="text-sm text-muted-foreground mt-1">
              This product has stock-in records and cannot be deleted.
            </p>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
            <h4 className="font-medium text-amber-800 mb-2">What to do:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-amber-700">
              <li>Remove all stock-in records for this product first</li>
              <li>Or reassign them to another product</li>
              <li>Try deleting again after removing the references</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onViewStock}>
            View Stock Records
          </Button>
          <Button variant="default" onClick={onClose}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Cannot Edit Warning Modal
function ProductEditWarning({ product, onClose, onViewStock }: {
  product: any;
  onClose: () => void;
  onViewStock: () => void;
}) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <span className="text-2xl">⚠️</span> Cannot Edit Product
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
            <p className="font-medium">"{product?.name || 'This product'}" cannot be edited.</p>
            <p className="text-sm text-muted-foreground mt-1">
              This product has stock-in records and cannot be modified.
            </p>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
            <h4 className="font-medium text-amber-800 mb-2">What to do:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-amber-700">
              <li>Remove all stock-in records for this product first</li>
              <li>Or create a new product with the updated information</li>
              <li>Transfer existing stock to the new product</li>
              <li>Try editing again after removing the stock references</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onViewStock}>
            View Stock Records
          </Button>
          <Button variant="default" onClick={onClose}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// In your products.tsx, update the StockHistoryModal:

function StockHistoryModal({ product, open, onClose }: {
  product: any;
  open: boolean;
  onClose: () => void;
}) {
  const { data: transactions, isLoading, error } = useStockTransactions(product?.id);

  useEffect(() => {
    if (product) {
      console.log('🔍 Loading stock history for:', product.name);
    }
  }, [product]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Stock History - {product?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/30 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Current Stock: <span className="font-medium text-foreground">{product?.currentStock} {product?.unit}</span>
            </p>
          </div>

          {/* Status indicators */}
          <div className="bg-blue-50 p-2 rounded text-xs">
            <p>🔵 Mode: REAL DATA</p>
            <p>📊 Product ID: {product?.id}</p>
            <p>📦 Transactions: {transactions?.length || 0}</p>
            <p>⏳ Loading: {isLoading ? 'Yes' : 'No'}</p>
            {error && <p className="text-red-500">❌ Error: {error.message}</p>}
          </div>

          {/* Stock History Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-destructive">
                      Error loading transactions: {error.message}
                    </TableCell>
                  </TableRow>
                ) : transactions && transactions.length > 0 ? (
                  transactions.map((transaction: any) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.type === 'in' ? 'default' : 'secondary'}>
                          {transaction.type === 'in' ? 'Stock In' : 'Stock Out'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{transaction.quantity} {product?.unit}</TableCell>
                      <TableCell className="text-right">{transaction.balance} {product?.unit}</TableCell>
                      <TableCell>{transaction.notes || '-'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No stock history found for this product
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Products() {
  const { user } = useAuth();
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const deleteProduct = useDeleteProduct();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [warningProduct, setWarningProduct] = useState<any>(null); // For edit warning
  const [deleteWarningProduct, setDeleteWarningProduct] = useState<any>(null); // For delete confirmation
  const [cannotDeleteProduct, setCannotDeleteProduct] = useState<any>(null); // For cannot delete warning
  const [stockHistoryProduct, setStockHistoryProduct] = useState<any>(null); // For stock history modal
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.categoryName?.toLowerCase().includes(search.toLowerCase())
  );

  // Check if product has stock records (for edit warning)
  const checkProductHasStockRecords = (product: any) => {
    // This checks if the product has any stock activity
    return product.hasStockRecords || product.totalStockIn > 0 || product.currentStock > 0;
  };

  // Check if product can be deleted (has no stock records)
  const canDeleteProduct = (product: any) => {
    // Product can be deleted only if it has no stock records and current stock is 0
    return !product.hasStockRecords && product.currentStock === 0;
  };

  // Handle edit click
  const handleEditClick = (product: any) => {
    if (checkProductHasStockRecords(product)) {
      setWarningProduct(product);
    } else {
      setEditingProduct(product);
    }
  };

  // Handle delete click
  const handleDeleteClick = (product: any) => {
    if (canDeleteProduct(product)) {
      setDeleteWarningProduct(product); // Show confirmation modal
    } else {
      setCannotDeleteProduct(product); // Show cannot delete modal
    }
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!deleteWarningProduct) return;

    setIsDeleting(true);
    try {
      await deleteProduct.mutateAsync(deleteWarningProduct.id);

      // Force refresh products list after successful delete
      queryClient.invalidateQueries({ queryKey: ['products'] });

      toast({
        title: "Product deleted successfully",
        description: "Removed from list (history kept)",
      });

      setDeleteWarningProduct(null);
    } catch (error: any) {
      const errMsg = error?.response?.data?.details || error?.message || "Server error";
      toast({
        title: "Failed to delete",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle view stock records
  const handleViewStockRecords = (product: any) => {
    // Close warning modals
    setCannotDeleteProduct(null);
    setWarningProduct(null);

    // Open stock history modal
    setStockHistoryProduct(product);

    // Optional: Show toast with additional info
    toast({
      title: "Viewing Stock Records",
      description: `Showing stock history for "${product?.name}"`,
    });
  };

  const getStockBadgeVariant = (current: number, min: number) => {
    if (current <= 0) return "destructive";
    if (current < min) return "outline";
    return "default";
  };

  const getStockBadgeClass = (current: number, min: number) => {
    if (current <= 0) return "";
    if (current < min) return "border-orange-500 text-orange-600 bg-orange-50";
    return "bg-green-600 hover:bg-green-700";
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold">Products</h1>
          <p className="text-muted-foreground mt-1">Manage inventory items</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/60 flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" /> Filter
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock Level</TableHead>
                <TableHead className="text-right">Price (In/Out)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredProducts?.map((product) => (
                <TableRow key={product.id} className="hover:bg-muted/20">
                  <TableCell className="font-medium">
                    <div>
                      {product.name}
                      <p className="text-xs text-muted-foreground">{product.barcode || 'No Barcode'}</p>
                    </div>
                  </TableCell>
                  <TableCell>{product.categoryName || '-'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={getStockBadgeVariant(product.currentStock, product.minStockLevel) as any}
                      className={getStockBadgeClass(product.currentStock, product.minStockLevel)}
                    >
                      {product.currentStock} {product.unit}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs">Buy: ${Number(product.defaultPurchasePrice).toFixed(2)}</span>
                      <span className="font-medium text-green-600">Sell: ${Number(product.defaultSellingPrice).toFixed(2)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {(user?.role === 'admin' || user?.role === 'manager') && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleEditClick(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteClick(product)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Warning Modal */}
      {warningProduct && (
        <ProductEditWarning
          product={warningProduct}
          onClose={() => setWarningProduct(null)}
          onViewStock={() => handleViewStockRecords(warningProduct)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteWarningProduct && (
        <DeleteProductWarning
          product={deleteWarningProduct}
          onClose={() => setDeleteWarningProduct(null)}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      )}

      {/* Cannot Delete Modal */}
      {cannotDeleteProduct && (
        <CannotDeleteProductWarning
          product={cannotDeleteProduct}
          onClose={() => setCannotDeleteProduct(null)}
          onViewStock={() => handleViewStockRecords(cannotDeleteProduct)}
        />
      )}

      {/* Stock History Modal */}
      {stockHistoryProduct && (
        <StockHistoryModal
          product={stockHistoryProduct}
          open={!!stockHistoryProduct}
          onClose={() => setStockHistoryProduct(null)}
        />
      )}

      <ProductDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        categories={categories || []}
      />

      {editingProduct && (
        <ProductDialog
          open={!!editingProduct}
          onOpenChange={(open) => !open && setEditingProduct(null)}
          product={editingProduct}
          categories={categories || []}
        />
      )}
    </div>
  );
}

function ProductDialog({ open, onOpenChange, product, categories }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: any;
  categories: any[];
}) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { toast } = useToast();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(insertProductSchema),
    defaultValues: product ? {
      ...product,
      categoryId: product.categoryId,
      defaultPurchasePrice: Number(product.defaultPurchasePrice),
      defaultSellingPrice: Number(product.defaultSellingPrice),
      minStockLevel: Number(product.minStockLevel),
    } : {
      name: "",
      description: "",
      barcode: "",
      unit: "pcs",
      minStockLevel: 10,
      defaultPurchasePrice: 0,
      defaultSellingPrice: 0,
    }
  });

  const onSubmit = async (data: ProductFormValues) => {
    try {
      if (product) {
        await updateProduct.mutateAsync({ id: product.id, ...data });
        toast({ title: "Product updated successfully" });
      } else {
        await createProduct.mutateAsync(data);
        toast({ title: "Product created successfully" });
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add New Product"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Wireless Mouse" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="pcs, kg, m" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultPurchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Price</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultSellingPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minStockLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Stock Alert</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barcode (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                {createProduct.isPending || updateProduct.isPending ? "Saving..." : "Save Product"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
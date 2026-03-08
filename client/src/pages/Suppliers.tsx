import { useState } from "react";
import { useSuppliers, useCreateSupplier, useDeleteSupplier } from "@/hooks/use-inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Truck, Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSupplierSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// SupplierDialog component (moved to top)
function SupplierDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createSupplier = useCreateSupplier();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertSupplierSchema),
    defaultValues: { name: "", contact: "", email: "", address: "", notes: "" }
  });

  const onSubmit = async (data: any) => {
    try {
      await createSupplier.mutateAsync(data);
      await queryClient.invalidateQueries({
        queryKey: [api.suppliers.list.path],
        exact: true
      });
      toast({
        title: "Success",
        description: "Supplier added successfully."
      });
      onOpenChange(false);
      form.reset();
    } catch (e: any) {
      console.error("Create error:", e);
      toast({
        title: "Error",
        description: e.response?.data?.message || "Failed to add supplier.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> Add Supplier
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Add New Supplier</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Global Supplies Co" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. John Doe" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="contact@company.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. 123 Business St" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Any additional information" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createSupplier.isPending}
              >
                {createSupplier.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Supplier"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Main Suppliers component
export default function Suppliers() {
  const { data: suppliers, isLoading } = useSuppliers();
  const deleteSupplier = useDeleteSupplier();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteErrorDialog, setShowDeleteErrorDialog] = useState(false);
  const [errorSupplierName, setErrorSupplierName] = useState("");
  const [errorDetails, setErrorDetails] = useState("");

  const handleDelete = async (id: number, supplierName: string) => {
    if (!confirm(`Are you sure you want to delete "${supplierName}"? This cannot be undone.`)) return;

    setDeletingId(id);
    try {
      await deleteSupplier.mutateAsync(id);
      await queryClient.invalidateQueries({
        queryKey: [api.suppliers.list.path],
        exact: true,
        refetchType: 'all'
      });

      // Don't show success toast, just invalidate and let UI update
    } catch (err: any) {
      console.error("Delete error:", err);

      // Check for the specific error from your backend
      const errorCode = err.response?.data?.code;
      const errorMessage = err.response?.data?.message || err.message;
      const errorDetails = err.response?.data?.details;

      if (errorCode === 'SUPPLIER_HAS_STOCK' ||
        err.response?.status === 400 ||
        errorMessage?.includes('Cannot delete supplier')) {

        // Show the cannot delete dialog
        setErrorSupplierName(supplierName);
        setErrorDetails(errorDetails || "This supplier has stock-in records and cannot be deleted.");
        setShowDeleteErrorDialog(true);

        // Don't show toast since we're showing the dialog
      } else {
        // Generic error toast for other errors
        toast({
          title: "Failed to delete supplier",
          description: errorMessage || "An error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading suppliers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Cannot Delete Alert Dialog */}
      <AlertDialog open={showDeleteErrorDialog} onOpenChange={setShowDeleteErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Cannot Delete Supplier
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-3">
              <p className="font-medium text-foreground">
                "{errorSupplierName}" cannot be deleted.
              </p>
              <p className="text-destructive/90">
                {errorDetails}
              </p>
              <div className="bg-muted p-3 rounded-md mt-2 text-sm">
                <p className="font-medium">What to do:</p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                  <li>Remove all stock-in records for this supplier first</li>
                  <li>Or reassign them to another supplier</li>
                  <li>Try deleting again after removing the references</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Got it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold">Suppliers</h1>
          <p className="text-muted-foreground mt-1">Manage vendor contacts</p>
        </div>
        <SupplierDialog open={open} onOpenChange={setOpen} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers && suppliers.length > 0 ? (
          suppliers.map((supplier) => (
            <Card key={supplier.id} className="shadow-sm hover:shadow-md transition-all relative group">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Truck className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{supplier.name}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(supplier.id, supplier.name)}
                  disabled={deletingId === supplier.id}
                >
                  {deletingId === supplier.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><span className="font-medium text-foreground">Contact:</span> {supplier.contact || '-'}</p>
                  <p><span className="font-medium text-foreground">Email:</span> {supplier.email || '-'}</p>
                  <p><span className="font-medium text-foreground">Address:</span> {supplier.address || '-'}</p>
                  {supplier.notes && (
                    <p className="pt-2 text-xs border-t mt-2 pt-2 italic">"{supplier.notes}"</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-16 text-muted-foreground bg-muted/20 rounded-xl border-2 border-dashed border-border">
            <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium">No suppliers found</p>
            <p className="text-sm mt-1">Add your first supplier to get started</p>
            <Button
              variant="outline"
              className="mt-4 gap-2"
              onClick={() => setOpen(true)}
            >
              <Plus className="h-4 w-4" /> Add Supplier
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState } from "react";
import { useSuppliers, useCreateSupplier, useDeleteSupplier } from "@/hooks/use-inventory";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSupplierSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Suppliers() {
  const { data: suppliers, isLoading } = useSuppliers();
  const deleteSupplier = useDeleteSupplier();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleDelete = async (id: number) => {
    if (confirm("Delete this supplier?")) {
      await deleteSupplier.mutateAsync(id);
      toast({ title: "Supplier deleted" });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold">Suppliers</h1>
          <p className="text-muted-foreground mt-1">Manage vendor contacts</p>
        </div>
        <SupplierDialog open={open} onOpenChange={setOpen} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers?.map((supplier) => (
          <Card key={supplier.id} className="shadow-sm hover:shadow-md transition-all">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Truck className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{supplier.name}</CardTitle>
              </div>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(supplier.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Contact:</span> {supplier.contact || '-'}</p>
                <p><span className="font-medium text-foreground">Email:</span> {supplier.email || '-'}</p>
                <p><span className="font-medium text-foreground">Address:</span> {supplier.address || '-'}</p>
                {supplier.notes && <p className="pt-2 italic">"{supplier.notes}"</p>}
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && suppliers?.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
            No suppliers found. Add your first one!
          </div>
        )}
      </div>
    </div>
  );
}

function SupplierDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createSupplier = useCreateSupplier();
  const { toast } = useToast();
  
  const form = useForm({
    resolver: zodResolver(insertSupplierSchema),
    defaultValues: { name: "", contact: "", email: "", address: "", notes: "" }
  });

  const onSubmit = async (data: any) => {
    try {
      await createSupplier.mutateAsync(data);
      toast({ title: "Supplier added" });
      onOpenChange(false);
      form.reset();
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-lg shadow-primary/20"><Plus className="h-4 w-4" /> Add Supplier</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add New Supplier</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="contact" render={({ field }) => (
              <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <Button type="submit" className="w-full" disabled={createSupplier.isPending}>Save Supplier</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

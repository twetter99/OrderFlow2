"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, PlusCircle, Edit, Trash2 } from "lucide-react";
import type { SupplierInvoice, Supplier, PurchaseOrder, Project } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { InvoiceForm } from '@/components/supplier-invoices/invoice-form';
import { Checkbox } from "@/components/ui/checkbox";
import { addSupplierInvoice, updateSupplierInvoice, deleteSupplierInvoice, deleteMultipleInvoices } from "./actions";

interface SupplierInvoicesClientPageProps {
  invoices: SupplierInvoice[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  projects: Project[];
}

export function SupplierInvoicesClientPage({
  invoices: initialInvoices,
  suppliers: initialSuppliers,
  purchaseOrders: initialPurchaseOrders,
  projects: initialProjects,
}: SupplierInvoicesClientPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const invoices = initialInvoices;
  const suppliers = initialSuppliers;
  const purchaseOrders = initialPurchaseOrders;
  const projects = initialProjects;

  const [filter, setFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<SupplierInvoice | null>(null);

  const enrichedInvoices = useMemo(() => {
    return invoices.map(invoice => {
        const supplier = suppliers.find(s => s.id === invoice.supplierId);
        return {
            ...invoice,
            supplierName: supplier?.name || 'Desconocido',
        }
    }).filter(invoice => 
        invoice.supplierName.toLowerCase().includes(filter.toLowerCase()) ||
        invoice.invoiceNumber.toLowerCase().includes(filter.toLowerCase())
    );
  }, [invoices, filter, suppliers]);
  
  const handleAddClick = () => {
    setSelectedInvoice(null);
    setIsModalOpen(true);
  };
  
  const handleEditClick = (invoice: SupplierInvoice) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  }

  const handleDeleteTrigger = (invoice: SupplierInvoice) => {
    setInvoiceToDelete(invoice);
    setIsDeleteDialogOpen(true);
  }
  
  const handleBulkDeleteClick = () => {
    setInvoiceToDelete(null);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    try {
      if (invoiceToDelete) {
        const result = await deleteSupplierInvoice(invoiceToDelete.id);
        if (!result.success) throw new Error(result.error);
        toast({ variant: "success", title: "Factura eliminada" });
      } else if (selectedRowIds.length > 0) {
        const result = await deleteMultipleInvoices(selectedRowIds);
        if (!result.success) throw new Error(result.message);
        toast({ variant: "success", title: "Eliminación exitosa", description: result.message });
      }
      router.refresh();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: (error as Error).message });
    }
    setIsDeleteDialogOpen(false);
    setInvoiceToDelete(null);
    setSelectedRowIds([]);
  };

  const handleSave = async (values: any) => {
    try {
      if (selectedInvoice) {
        const result = await updateSupplierInvoice(selectedInvoice.id, values, purchaseOrders);
        if (!result.success) throw new Error(result.error);
        toast({
          title: "Factura actualizada",
          description: `La factura ${values.invoiceNumber} se ha guardado correctamente.`,
        });
      } else {
        const result = await addSupplierInvoice(values, purchaseOrders);
        if (!result.success) throw new Error(result.error);
        toast({
            title: "Factura creada",
            description: `La factura ${values.invoiceNumber} se ha guardado correctamente.`,
        });
      }
      setIsModalOpen(false);
      router.refresh();
    } catch (error) {
       console.error("Error saving invoice:", error);
       toast({
         variant: "destructive",
         title: "Error",
         description: "No se pudo guardar la factura.",
       });
    }
  }

  const formatCurrency = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

  const getStatusBadgeVariant = (status: SupplierInvoice['status']) => {
    switch (status) {
      case 'Pagada': return 'default';
      case 'Pendiente de pago': return 'secondary';
      case 'Validada': return 'outline';
      case 'Pendiente de validar': return 'outline';
      case 'Disputada': return 'destructive';
      default: return 'outline';
    }
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedRowIds(enrichedInvoices.map(i => i.id));
    } else {
      setSelectedRowIds([]);
    }
  };

  const handleRowSelect = (rowId: string) => {
    setSelectedRowIds(prev => 
      prev.includes(rowId) 
        ? prev.filter(id => id !== rowId) 
        : [...prev, rowId]
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase">Facturas de Proveedor</h1>
          <p className="text-muted-foreground">
            Gestiona y valida las facturas recibidas de tus proveedores.
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Listado de Facturas</CardTitle>
              <CardDescription>
                Busca y gestiona todas las facturas de proveedores.
              </CardDescription>
            </div>
            {selectedRowIds.length > 0 ? (
                <Button variant="destructive" onClick={handleBulkDeleteClick}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar ({selectedRowIds.length})
                </Button>
            ) : (
                <Button onClick={handleAddClick}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Factura
                </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input 
                placeholder="Filtrar por proveedor o nº de factura..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                 <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedRowIds.length === enrichedInvoices.length && enrichedInvoices.length > 0 ? true : (selectedRowIds.length > 0 ? 'indeterminate' : false)}
                    onCheckedChange={(checked) => handleSelectAll(checked)}
                    aria-label="Seleccionar todo"
                  />
                </TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Nº Factura</TableHead>
                <TableHead>F. Factura</TableHead>
                <TableHead>F. Vencimiento</TableHead>
                <TableHead className="text-right">Base</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrichedInvoices.map((invoice) => (
                <TableRow key={invoice.id} data-state={selectedRowIds.includes(invoice.id) && "selected"}>
                   <TableCell>
                     <Checkbox
                      checked={selectedRowIds.includes(invoice.id)}
                      onCheckedChange={() => handleRowSelect(invoice.id)}
                      aria-label={`Seleccionar factura ${invoice.invoiceNumber}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{invoice.supplierName}</TableCell>
                  <TableCell>{invoice.invoiceNumber}</TableCell>
                  <TableCell>{new Date(invoice.emissionDate as string).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(invoice.dueDate as string).toLocaleDateString()}</TableCell>
                   <TableCell className="text-right">{formatCurrency(invoice.bases.reduce((acc, b) => acc + b.baseAmount, 0))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(invoice.vatAmount)}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(invoice.totalAmount)}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={getStatusBadgeVariant(invoice.status)}
                      className={cn(invoice.status === 'Pendiente de pago' && 'animate-pulse')}
                    >
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEditClick(invoice)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Ver / Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteTrigger(invoice)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {enrichedInvoices.length === 0 && (
                <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        No se encontraron facturas.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-6xl">
           <DialogHeader>
            <DialogTitle>{selectedInvoice ? "Editar Factura" : "Registrar Nueva Factura"}</DialogTitle>
          </DialogHeader>
          <InvoiceForm
            invoice={selectedInvoice}
            suppliers={suppliers}
            purchaseOrders={purchaseOrders || []}
            projects={projects || []}
            onSave={handleSave}
            onCancel={() => setIsModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
               Esta acción no se puede deshacer. Se eliminará permanentemente {invoiceToDelete ? ` la factura "${invoiceToDelete.invoiceNumber}".` : `las ${selectedRowIds.length} facturas seleccionadas.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

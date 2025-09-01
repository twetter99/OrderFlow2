
"use client";

import React, { useState, useMemo, useEffect } from 'react';
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
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, convertTimestampsToISO } from "@/lib/utils";
import { InvoiceForm } from '@/components/supplier-invoices/invoice-form';
import { Checkbox } from "@/components/ui/checkbox";
import { deleteMultipleInvoices } from "./actions";

export default function SupplierInvoicesPage() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<SupplierInvoice | null>(null);

  useEffect(() => {
    const unsubInvoices = onSnapshot(collection(db, "supplierInvoices"), (snapshot) => {
      setInvoices(snapshot.docs.map(doc => convertTimestampsToISO({ id: doc.id, ...doc.data() }) as SupplierInvoice));
      if(loading) setLoading(false);
    });
    const unsubSuppliers = onSnapshot(collection(db, "suppliers"), (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
    });
    const unsubPOs = onSnapshot(collection(db, "purchaseOrders"), (snapshot) => {
      setPurchaseOrders(snapshot.docs.map(doc => convertTimestampsToISO({ id: doc.id, ...doc.data() }) as PurchaseOrder));
    });
    const unsubProjects = onSnapshot(collection(db, "projects"), (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    });

    return () => {
      unsubInvoices();
      unsubSuppliers();
      unsubPOs();
      unsubProjects();
    };
  }, [loading]);

  const enrichedInvoices = useMemo(() => {
    if (loading) return [];
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
  }, [invoices, filter, suppliers, loading]);
  
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
    setInvoiceToDelete(null); // Ensure we are in bulk mode
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (invoiceToDelete) {
      await deleteDoc(doc(db, "supplierInvoices", invoiceToDelete.id));
      toast({ variant: "success", title: "Factura eliminada" });
    } else if (selectedRowIds.length > 0) {
      const result = await deleteMultipleInvoices(selectedRowIds);
      if (result.success) {
        toast({ variant: "success", title: "Eliminación exitosa", description: result.message });
      } else {
        toast({ variant: "destructive", title: "Error", description: result.message });
      }
    }
    setIsDeleteDialogOpen(false);
    setInvoiceToDelete(null);
    setSelectedRowIds([]);
  };

  const handleSave = async (values: any) => {
    const { bases, ...rest } = values;
    
    const vatAmount = bases.reduce((acc: number, item: { baseAmount: number; vatRate: number; }) => {
        const base = Number(item.baseAmount) || 0;
        const rate = Number(item.vatRate) || 0;
        return acc + (base * rate);
    }, 0);
    const totalAmount = bases.reduce((acc: number, item: { baseAmount: number; vatRate: number; }) => {
        const base = Number(item.baseAmount) || 0;
        const rate = Number(item.vatRate) || 0;
        return acc + base + (base * rate);
    }, 0);

    const poTotal = (values.purchaseOrderIds || []).reduce((acc: number, poId: string) => {
        const order = purchaseOrders.find(po => po.id === poId);
        return acc + (order?.total || 0);
    }, 0);

    const difference = totalAmount - poTotal;

    const finalValues = {
        ...rest,
        bases,
        vatAmount,
        totalAmount,
        totalAmountDifference: difference,
    };

    try {
      if (selectedInvoice) {
        const docRef = doc(db, "supplierInvoices", selectedInvoice.id);
        await updateDoc(docRef, finalValues);
        toast({
          title: "Factura actualizada",
          description: `La factura ${values.invoiceNumber} se ha guardado correctamente.`,
        });
      } else {
        await addDoc(collection(db, "supplierInvoices"), finalValues);
        toast({
            title: "Factura creada",
            description: `La factura ${values.invoiceNumber} se ha guardado correctamente.`,
        });
      }
      setIsModalOpen(false);
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
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center">Cargando...</TableCell></TableRow>
              ) : enrichedInvoices.map((invoice) => (
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
              {!loading && enrichedInvoices.length === 0 && (
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

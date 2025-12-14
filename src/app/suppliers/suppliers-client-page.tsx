"use client";

import React, { useState, useMemo } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Star, History } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import type { Supplier } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { addSupplier, updateSupplier, deleteSupplier, deleteSuppliers } from "./actions";

interface SuppliersClientPageProps {
  initialSuppliers: Supplier[];
}

export function SuppliersClientPage({ initialSuppliers }: SuppliersClientPageProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  React.useEffect(() => {
    setSuppliers(initialSuppliers);
  }, [initialSuppliers]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(filter.toLowerCase()) ||
      supplier.contactPerson.toLowerCase().includes(filter.toLowerCase())
    );
  }, [suppliers, filter]);

  const handleAddClick = () => {
    setSelectedSupplier(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleDeleteTrigger = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setIsDeleteDialogOpen(true);
  };

  const handleBulkDeleteClick = () => {
    setSupplierToDelete(null);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setLoading(true);
    if (supplierToDelete) {
      const result = await deleteSupplier(supplierToDelete.id);
      if (result.success) {
        toast({ title: "Proveedor eliminado", description: `El proveedor "${supplierToDelete.name}" ha sido eliminado.` });
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.message });
      }
    } else if (selectedRowIds.length > 0) {
      const result = await deleteSuppliers(selectedRowIds);
      if (result.success) {
        toast({ title: "Proveedores eliminados", description: `Se eliminaron ${selectedRowIds.length} proveedores.` });
        setSelectedRowIds([]);
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.message });
      }
    }
    setLoading(false);
    setIsDeleteDialogOpen(false);
    setSupplierToDelete(null);
  };

  const handleSave = async (values: any) => {
    setLoading(true);
    let result;
    if (selectedSupplier) {
      result = await updateSupplier(selectedSupplier.id, values);
      if (result.success) {
        toast({ title: "Proveedor actualizado", description: `El proveedor "${values.name}" se ha actualizado correctamente.` });
      }
    } else {
      result = await addSupplier(values);
      if (result.success) {
        toast({ title: "Proveedor creado", description: `El proveedor "${values.name}" se ha creado correctamente.` });
      }
    }
    if (result.success) {
      setIsModalOpen(false);
      router.refresh();
    } else {
      toast({ variant: "destructive", title: "Error", description: result.message || "No se pudo guardar el proveedor." });
    }
    setLoading(false);
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedRowIds(filteredSuppliers.map(s => s.id));
    } else {
      setSelectedRowIds([]);
    }
  };

  const handleRowSelect = (rowId: string) => {
    setSelectedRowIds(prev => prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase">Proveedores</h1>
          <p className="text-muted-foreground">Gestiona la información y el rendimiento de tus proveedores.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Listado de Proveedores</CardTitle>
              <CardDescription>Busca y gestiona tus proveedores.</CardDescription>
            </div>
            {selectedRowIds.length > 0 ? (
              <Button variant="destructive" onClick={handleBulkDeleteClick}>
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar ({selectedRowIds.length})
              </Button>
            ) : (
              <Button onClick={handleAddClick}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Proveedor
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input placeholder="Filtrar por nombre o contacto..." value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedRowIds.length === filteredSuppliers.length && filteredSuppliers.length > 0 ? true : (selectedRowIds.length > 0 ? 'indeterminate' : false)}
                    onCheckedChange={(checked) => handleSelectAll(checked)}
                    aria-label="Seleccionar todo"
                  />
                </TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Cal. Entrega</TableHead>
                <TableHead>Cal. Calidad</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id} data-state={selectedRowIds.includes(supplier.id) && "selected"}>
                  <TableCell>
                    <Checkbox checked={selectedRowIds.includes(supplier.id)} onCheckedChange={() => handleRowSelect(supplier.id)} aria-label={`Seleccionar proveedor ${supplier.name}`} />
                  </TableCell>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.contactPerson}</TableCell>
                  <TableCell>{supplier.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">{supplier.deliveryRating.toFixed(1)} <Star className="h-4 w-4 text-yellow-400" /></div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">{supplier.qualityRating.toFixed(1)} <Star className="h-4 w-4 text-yellow-400" /></div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem asChild><Link href={`/suppliers/${supplier.id}`}><History className="mr-2 h-4 w-4" />Ver Historial</Link></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditClick(supplier)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteTrigger(supplier)}><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSuppliers.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No se encontraron proveedores.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedSupplier ? "Editar Proveedor" : "Crear Nuevo Proveedor"}</DialogTitle></DialogHeader>
          <SupplierForm supplier={selectedSupplier} onSave={handleSave} onCancel={() => setIsModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. {supplierToDelete ? `Se eliminará permanentemente el proveedor "${supplierToDelete.name}".` : `Se eliminarán los ${selectedRowIds.length} proveedores seleccionados.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={loading}>{loading ? "Eliminando..." : "Eliminar"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

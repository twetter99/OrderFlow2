
"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MoreHorizontal, Printer, Eye, History, ArrowUp, ArrowDown, ArrowUpDown, Archive, Trash2 } from "lucide-react";
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
  DialogDescription,
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
import type { PurchaseOrder, Supplier, Project, Location, InventoryItem, SupplierInvoice } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { collection, onSnapshot, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { OrderStatusHistory } from "@/components/purchasing/order-status-history";
import { convertPurchaseOrderTimestamps, convertTimestampsToISO } from "@/lib/utils";
import { PurchasingForm } from "@/components/purchasing/purchasing-form";
import { Checkbox } from "@/components/ui/checkbox";
import { deleteMultiplePurchaseOrders } from "@/app/purchasing/actions";


type SortDescriptor = {
    column: keyof PurchaseOrder | 'projectName' | 'invoicingStatus';
    direction: 'ascending' | 'descending';
};

export default function CompletedOrdersPage() {
  const { toast } = useToast();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    orderNumber: '',
    supplier: '',
    project: '',
  });

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(null);

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
      column: 'date',
      direction: 'descending',
  });
  
  useEffect(() => {
    const unsubPO = onSnapshot(collection(db, "purchaseOrders"), (snapshot) => {
        const ordersData = snapshot.docs.map(doc => convertPurchaseOrderTimestamps({ id: doc.id, ...doc.data() }));
        setPurchaseOrders(ordersData);
        if (loading) setLoading(false);
    });
    const unsubProjects = onSnapshot(collection(db, "projects"), (snapshot) => setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project))));
    const unsubSuppliers = onSnapshot(collection(db, "suppliers"), (snapshot) => setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier))));
    const unsubLocations = onSnapshot(collection(db, "locations"), (snapshot) => setLocations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location))));
    const unsubInventory = onSnapshot(collection(db, "inventory"), (snapshot) => setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem))));
    const unsubInvoices = onSnapshot(collection(db, "supplierInvoices"), (snapshot) => {
      setInvoices(snapshot.docs.map(doc => convertTimestampsToISO({ id: doc.id, ...doc.data() }) as SupplierInvoice));
    });

    return () => {
        unsubPO();
        unsubProjects();
        unsubSuppliers();
        unsubLocations();
        unsubInventory();
        unsubInvoices();
    };
  }, [loading]);

  const completedOrders = useMemo(() => {
    if (loading) return [];
    
    const projectMap = new Map(projects.map(p => [p.id, p.name]));
    const invoicedPoIds = new Set(invoices.flatMap(inv => inv.purchaseOrderIds));
    
    let filteredOrders = purchaseOrders
        .filter(order => order.status === 'Recibida')
        .map(order => ({
            ...order,
            projectName: projectMap.get(order.project) || order.project,
            invoicingStatus: invoicedPoIds.has(order.id) ? 'Facturada' : 'Pendiente de facturar',
        }))
        .filter(order => {
            return (
                (order.orderNumber || order.id).toLowerCase().includes(filters.orderNumber.toLowerCase()) &&
                order.supplier.toLowerCase().includes(filters.supplier.toLowerCase()) &&
                (order.projectName || '').toLowerCase().includes(filters.project.toLowerCase())
            )
        });

    return filteredOrders.sort((a, b) => {
        const first = a[sortDescriptor.column as keyof typeof a];
        const second = b[sortDescriptor.column as keyof typeof b];
        let cmp = 0;

        if (first === undefined || first === null) cmp = -1;
        else if (second === undefined || second === null) cmp = 1;
        else if (sortDescriptor.column === 'total') {
            cmp = Number(first) - Number(second);
        } else if (sortDescriptor.column === 'date') {
            cmp = new Date(first as string).getTime() - new Date(second as string).getTime();
        } else {
             cmp = String(first).localeCompare(String(second));
        }

        return sortDescriptor.direction === 'descending' ? -cmp : cmp;
    });
  }, [purchaseOrders, projects, invoices, sortDescriptor, filters, loading]);


  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };
  
  const handleHistoryClick = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setIsHistoryModalOpen(true);
  };
  
  const handleDetailsClick = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  }

  const handleDeleteTrigger = (order: PurchaseOrder) => {
    setOrderToDelete(order);
    setIsDeleteDialogOpen(true);
  };

  const handleBulkDeleteClick = () => {
    setOrderToDelete(null); // Ensure we are in bulk mode
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    let result;
    if (orderToDelete) {
        // This is a single delete, which shouldn't happen from this page, but as a fallback
        const batch = writeBatch(db);
        batch.delete(doc(db, "purchaseOrders", orderToDelete.id));
        await batch.commit();
        result = { success: true, message: "Orden eliminada."};
    } else if (selectedRowIds.length > 0) {
        result = await deleteMultiplePurchaseOrders(selectedRowIds);
    } else {
        return;
    }

    if (result.success) {
        toast({ variant: "success", title: "Eliminación exitosa", description: result.message });
    } else {
        toast({ variant: "destructive", title: "Error", description: result.message });
    }
    
    setIsDeleteDialogOpen(false);
    setOrderToDelete(null);
    setSelectedRowIds([]);
  };

  const handlePrintClick = (order: PurchaseOrder) => {
    const projectDetails = projects.find(p => p.id === order.project);
    const supplierDetails = suppliers.find(s => s.name === order.supplier);
    const deliveryLocationDetails = locations.find(l => l.id === order.deliveryLocationId);
    
    const enrichedOrder = { ...order, projectDetails, supplierDetails, deliveryLocationDetails };

    try {
        localStorage.setItem(`print_order_${order.id}`, JSON.stringify(enrichedOrder));
        window.open(`/purchasing/${order.id}/print`, '_blank');
    } catch (e) {
        console.error("Could not save to localStorage", e);
        toast({
            variant: "destructive",
            title: "Error de Impresión",
            description: "No se pudo preparar la orden para imprimir. Inténtalo de nuevo."
        })
    }
  };

  const onSortChange = (column: SortDescriptor['column']) => {
    if (sortDescriptor.column === column) {
        setSortDescriptor({
            ...sortDescriptor,
            direction: sortDescriptor.direction === 'ascending' ? 'descending' : 'ascending',
        });
    } else {
        setSortDescriptor({ column, direction: 'ascending' });
    }
  };

  const getSortIcon = (column: SortDescriptor['column']) => {
    if (sortDescriptor.column === column) {
      return sortDescriptor.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
    }
    return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
  };

   const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedRowIds(completedOrders.map(o => o.id));
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
          <h1 className="text-3xl font-bold font-headline uppercase flex items-center gap-2"><Archive />Órdenes Completadas</h1>
          <p className="text-muted-foreground">
            Consulta el historial de todas las órdenes de compra que han sido completadas y archivadas.
          </p>
        </div>
        {selectedRowIds.length > 0 && (
            <Button variant="destructive" onClick={handleBulkDeleteClick}>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar ({selectedRowIds.length})
            </Button>
        )}
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>Historial de Pedidos</CardTitle>
            <CardDescription>Busca y filtra entre todos los pedidos completados.</CardDescription>
        </CardHeader>
        <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="filter-id">ID de Orden</Label>
              <Input id="filter-id" placeholder="Buscar por ID..." value={filters.orderNumber} onChange={(e) => handleFilterChange('orderNumber', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-supplier">Proveedor</Label>
              <Input id="filter-supplier" placeholder="Buscar por proveedor..." value={filters.supplier} onChange={(e) => handleFilterChange('supplier', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-project">Proyecto</Label>
              <Input id="filter-project" placeholder="Buscar por proyecto..." value={filters.project} onChange={(e) => handleFilterChange('project', e.target.value)} />
            </div>
        </div>
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedRowIds.length === completedOrders.length && completedOrders.length > 0 ? true : (selectedRowIds.length > 0 ? 'indeterminate' : false)}
                    onCheckedChange={(checked) => handleSelectAll(checked)}
                    aria-label="Seleccionar todo"
                  />
                </TableHead>
                <TableHead>
                    <Button variant="ghost" className="px-1" onClick={() => onSortChange('orderNumber')}>
                        ID de Orden {getSortIcon('orderNumber')}
                    </Button>
                </TableHead>
                 <TableHead>
                    <Button variant="ghost" className="px-1" onClick={() => onSortChange('date')}>
                        F. Creación {getSortIcon('date')}
                    </Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" className="px-1" onClick={() => onSortChange('supplier')}>
                        Proveedor {getSortIcon('supplier')}
                    </Button>
                </TableHead>
                 <TableHead>
                    <Button variant="ghost" className="px-1" onClick={() => onSortChange('projectName')}>
                        Proyecto {getSortIcon('projectName')}
                    </Button>
                </TableHead>
                 <TableHead>
                    <Button variant="ghost" className="px-1" onClick={() => onSortChange('invoicingStatus')}>
                      Estado Facturación {getSortIcon('invoicingStatus')}
                    </Button>
                </TableHead>
                <TableHead className="text-right">
                    <Button variant="ghost" className="px-1" onClick={() => onSortChange('total')}>
                        Total {getSortIcon('total')}
                    </Button>
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedOrders.map((order) => (
                <TableRow key={order.id} data-state={selectedRowIds.includes(order.id) && "selected"}>
                   <TableCell>
                    <Checkbox
                      checked={selectedRowIds.includes(order.id)}
                      onCheckedChange={() => handleRowSelect(order.id)}
                      aria-label={`Seleccionar orden ${order.orderNumber}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{order.orderNumber || order.id}</TableCell>
                  <TableCell>{new Date(order.date as string).toLocaleDateString()}</TableCell>
                  <TableCell>{order.supplier}</TableCell>
                  <TableCell>{order.projectName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={order.invoicingStatus === 'Facturada' ? 'default' : 'secondary'}
                      className={cn(
                        order.invoicingStatus === 'Facturada' && 'bg-green-100 text-green-800',
                        order.invoicingStatus === 'Pendiente de facturar' && 'bg-orange-100 text-orange-800'
                      )}
                    >
                      {order.invoicingStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(order.total)}
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
                          <DropdownMenuSeparator />
                           <DropdownMenuItem onClick={() => handleDetailsClick(order)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Detalles
                            </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleHistoryClick(order)}>
                            <History className="mr-2 h-4 w-4"/>
                            Ver Trazabilidad
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePrintClick(order)}>
                            <Printer className="mr-2 h-4 w-4"/>
                            Imprimir Orden
                          </DropdownMenuItem>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteTrigger(order)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                </TableRow>
              ))}
              {loading && (
                <TableRow><TableCell colSpan={8} className="text-center">Cargando...</TableCell></TableRow>
              )}
              {!loading && completedOrders.length === 0 && (
                <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No se encontraron órdenes de compra completadas.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </TooltipProvider>
        </CardContent>
      </Card>
      
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Trazabilidad del Pedido {selectedOrder?.orderNumber}</DialogTitle>
                <DialogDescription>
                    Historial de todos los cambios de estado para este pedido.
                </DialogDescription>
            </DialogHeader>
            {selectedOrder && <OrderStatusHistory history={selectedOrder.statusHistory || []} />}
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsModalOpen} onOpenChange={(isOpen) => {
        setIsDetailsModalOpen(isOpen);
        if (!isOpen) setSelectedOrder(null);
      }}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Detalles del Pedido {selectedOrder?.orderNumber}</DialogTitle>
            <DialogDescription>
              Información completa de la orden de compra archivada.
            </DialogDescription>
          </DialogHeader>
          <PurchasingForm
            order={selectedOrder}
            onSave={() => {}} // No-op, es solo vista
            onCancel={() => setIsDetailsModalOpen(false)}
            suppliers={suppliers}
            recentSupplierIds={[]}
            inventoryItems={inventory}
            projects={projects}
            locations={locations}
          />
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
               Esta acción no se puede deshacer. Se eliminará permanentemente {orderToDelete ? ` la orden "${orderToDelete.orderNumber}".` : `las ${selectedRowIds.length} órdenes seleccionadas.`}
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
  )
}

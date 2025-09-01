
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from 'next/navigation';
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
import { cn, convertPurchaseOrderTimestamps } from "@/lib/utils";
import { MoreHorizontal, PlusCircle, MessageSquareWarning, Bot, Loader2, Wand2, Mail, Printer, Eye, ChevronRight, Trash2, History, ArrowUp, ArrowDown, ArrowUpDown, Anchor, Edit, Link2, AlertCircle, Copy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { PurchasingForm } from "@/components/purchasing/purchasing-form";
import type { PurchaseOrder, PurchaseOrderItem, Supplier, InventoryItem, Project, User, Location, DeliveryNoteAttachment } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { generatePurchaseOrder } from "@/ai/flows/generate-purchase-order";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { differenceInDays, isPast, isToday } from "date-fns";
import { collection, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, updatePurchaseOrderStatus, deleteMultiplePurchaseOrders, linkDeliveryNoteToPurchaseOrder } from "@/app/purchasing/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { OrderStatusHistory } from "@/components/purchasing/order-status-history";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

const LOGGED_IN_USER_ID = 'WF-USER-001'; // Simula el Admin
const APPROVAL_PIN = '0707';

const ALL_STATUSES: PurchaseOrder['status'][] = ["Pendiente de Aprobación", "Aprobada", "Enviada al Proveedor", "Recibida Parcialmente", "Rechazado"];

// Lógica de la máquina de estados
const validTransitions: { [key in PurchaseOrder['status']]: PurchaseOrder['status'][] } = {
    'Pendiente de Aprobación': ['Aprobada', 'Rechazado'],
    'Aprobada': ['Enviada al Proveedor', 'Pendiente de Aprobación'], // Permitir revertir a pendiente
    'Rechazado': ['Pendiente de Aprobación'], // Permitir re-evaluar un rechazo
    'Enviada al Proveedor': ['Recibida', 'Recibida Parcialmente'],
    'Recibida': [], // Estado final
    'Recibida Parcialmente': ['Recibida', 'Recibida Parcialmente'], // Puede recibir más partes
};

type SortDescriptor = {
    column: keyof PurchaseOrder | 'projectName';
    direction: 'ascending' | 'descending';
};

export function PurchasingClientPage() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    orderNumber: '',
    supplier: '',
    project: '',
    status: 'all',
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isReceptionAlertOpen, setIsReceptionAlertOpen] = useState(false);
  const [isAiClarificationOpen, setIsAiClarificationOpen] = useState(false);
  const [aiClarification, setAiClarification] = useState("");
  const [pinValue, setPinValue] = useState('');
  
  const [orderToProcess, setOrderToProcess] = useState<{ id: string; status: PurchaseOrder['status'] } | null>(null);
  
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | Partial<PurchaseOrder> | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(null);
  const [orderToDuplicate, setOrderToDuplicate] = useState<PurchaseOrder | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [isStateTransitionAlertOpen, setIsStateTransitionAlertOpen] = useState(false);
  const [stateTransitionAlertMessage, setStateTransitionAlertMessage] = useState({ title: "", description: ""});


  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
      column: 'date',
      direction: 'descending',
  });
  
  useEffect(() => {
    if (!user || authLoading) {
        if (!authLoading) setLoading(false);
        return;
    }

    const unsubs: (() => void)[] = [];
    unsubs.push(onSnapshot(collection(db, "purchaseOrders"), (snapshot) => {
        setPurchaseOrders(snapshot.docs.map(doc => convertPurchaseOrderTimestamps({ id: doc.id, ...doc.data() })));
        if (loading) setLoading(false);
    }));
    unsubs.push(onSnapshot(collection(db, "suppliers"), (snapshot) => setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)))));
    unsubs.push(onSnapshot(collection(db, "inventory"), (snapshot) => setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)))));
    unsubs.push(onSnapshot(collection(db, "projects"), (snapshot) => setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)))));
    unsubs.push(onSnapshot(collection(db, "users"), (snapshot) => setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)))));
    unsubs.push(onSnapshot(collection(db, "locations"), (snapshot) => setLocations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)))));

    return () => unsubs.forEach(unsub => unsub());

  }, [user, authLoading, loading]);

  const { orderedSuppliers, recentSupplierIds } = useMemo(() => {
    if (suppliers.length === 0 || purchaseOrders.length === 0) {
      return { orderedSuppliers: suppliers.sort((a,b) => a.name.localeCompare(b.name)), recentSupplierIds: [] };
    }

    const supplierFrequency = purchaseOrders.reduce((acc, order) => {
      acc[order.supplier] = (acc[order.supplier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sortedByFrequency = Object.entries(supplierFrequency)
      .sort(([, aCount], [, bCount]) => bCount - aCount)
      .map(([supplierName]) => supplierName);

    const recentSuppliersList = suppliers.filter(s => sortedByFrequency.slice(0, 5).includes(s.name));
    const recentIds = recentSuppliersList.map(s => s.id);

    const otherSuppliers = suppliers
      .filter(s => !recentIds.includes(s.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      orderedSuppliers: [...recentSuppliersList, ...otherSuppliers],
      recentSupplierIds: recentIds,
    };
  }, [suppliers, purchaseOrders]);

  
  const activePurchaseOrders = useMemo(() => {
    
    const projectMap = new Map(projects.map(p => [p.id, p.name]));
    
    let filteredOrders = purchaseOrders
        .filter(order => order.status !== 'Recibida')
        .map(order => {
            // Only look up the project name if it doesn't already exist on the order.
            if (!order.projectName && order.project) {
              return {
                ...order,
                projectName: projectMap.get(order.project) || `Proyecto: ${order.project}`
              };
            }
            return order;
        })
        .filter(order => {
            return (
                (order.orderNumber || order.id).toLowerCase().includes(filters.orderNumber.toLowerCase()) &&
                order.supplier.toLowerCase().includes(filters.supplier.toLowerCase()) &&
                (order.projectName || '').toLowerCase().includes(filters.project.toLowerCase()) &&
                (filters.status === 'all' || order.status === filters.status)
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
            } else if (sortDescriptor.column === 'estimatedDeliveryDate' || sortDescriptor.column === 'date') {
                cmp = new Date(first as string).getTime() - new Date(second as string).getTime();
            } else {
                 cmp = String(first).localeCompare(String(second));
            }

            return sortDescriptor.direction === 'descending' ? -cmp : cmp;
        });
  }, [purchaseOrders, projects, sortDescriptor, filters]);


  const currentUser = users.find(u => u.uid === LOGGED_IN_USER_ID);
  const canApprove = currentUser?.role === 'Administrador';

  useEffect(() => {
    const project = searchParams.get('project');
    const supplier = searchParams.get('supplier');
    const itemsStr = searchParams.get('items');
    
    if (project && supplier && itemsStr) {
      try {
        const items = JSON.parse(itemsStr) as PurchaseOrderItem[];
        const newOrder: Partial<PurchaseOrder> = {
          project,
          supplier,
          items,
          status: 'Pendiente de Aprobación',
        };
        handleAddClick(newOrder);
      } catch (error) {
        console.error("Error parsing items from query params", error);
      }
    }
  }, [searchParams]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleAddClick = (initialData: Partial<PurchaseOrder> | null = null) => {
    setSelectedOrder(initialData);
    setIsModalOpen(true);
  };

  const handleEditClick = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };
  
  const handleHistoryClick = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setIsHistoryModalOpen(true);
  };

  const handleDeleteTrigger = (order: PurchaseOrder) => {
    setOrderToDelete(order);
    setIsDeleteDialogOpen(true);
  };

  const handleDuplicateClick = (order: PurchaseOrder) => {
    setOrderToDuplicate(order);
    setIsDuplicateDialogOpen(true);
  };
  
  const handleBulkDeleteClick = () => {
    setOrderToDelete(null);
    setIsDeleteDialogOpen(true);
  };

  const handlePrintClick = (order: PurchaseOrder) => {
    const projectDetails = projects.find(p => p.id === order.project);
    const supplierDetails = suppliers.find(s => s.name === order.supplier);
    const deliveryLocationDetails = locations.find(l => l.id === order.deliveryLocationId);

    const enrichedOrder = {
        ...order,
        items: order.items.map(item => {
            const inventoryItem = inventory.find(i => i.id === item.itemId);
            return {
                ...item,
                supplierProductCode: inventoryItem?.supplierProductCode,
            };
        }),
        projectDetails,
        supplierDetails,
        deliveryLocationDetails,
    };

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

  const handleEmailClick = (order: PurchaseOrder) => {
    const supplierInfo = suppliers.find(s => s.name === order.supplier);
    if (!supplierInfo) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se encontró la información del proveedor.' });
      return;
    }

    const subject = `Orden de Compra ${order.orderNumber} de WINFIN`;
    const body = `Hola ${supplierInfo.contactPerson},\n\nAdjuntamos la orden de compra ${order.orderNumber}.\n\nPor favor, confirma la recepción y la fecha de entrega estimada.\n\nGracias,\nEl equipo de WINFIN`;
    
    window.location.href = `mailto:${supplierInfo.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  
  const handleStatusChange = async (id: string, currentStatus: PurchaseOrder['status'], newStatus: PurchaseOrder['status']) => {
    if (validTransitions[currentStatus] && !validTransitions[currentStatus].includes(newStatus)) {
        setStateTransitionAlertMessage({
            title: "⚠️ Flujo de Proceso",
            description: `No puedes cambiar el estado de "${currentStatus}" a "${newStatus}". Para continuar, debes seguir el orden lógico de los estados.`,
        })
        setIsStateTransitionAlertOpen(true);
        return;
    }

    if (newStatus === 'Recibida' || newStatus === 'Recibida Parcialmente') {
        setIsReceptionAlertOpen(true);
        return;
    }
    
    if (newStatus === 'Aprobada') {
        setOrderToProcess({ id, status: newStatus });
        setIsPinModalOpen(true);
        return;
    }

    const result = await updatePurchaseOrderStatus(id, newStatus);
    if (result.success) {
      toast({ title: 'Estado Actualizado', description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  };


  const handleGenerateWithAI = async () => {
    if (!aiPrompt) {
      toast({ variant: "destructive", title: "Prompt vacío", description: "Por favor, escribe lo que necesitas pedir." });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generatePurchaseOrder({ prompt: aiPrompt });
      if (result.clarificationNeeded) {
        setAiClarification(result.clarificationNeeded);
        setIsAiClarificationOpen(true);
      } else if (result && result.items.length > 0) {
        const newOrder: Partial<PurchaseOrder> = {
          supplier: result.supplier,
          items: result.items,
          status: 'Pendiente de Aprobación',
        };
        handleAddClick(newOrder);
      } else {
        toast({ variant: "destructive", title: "Error de IA", description: "No se pudo generar el pedido. Revisa el prompt o los datos del proveedor/artículo." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error de IA", description: `Ocurrió un error: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (values: any) => {
    const result = selectedOrder && 'id' in selectedOrder
      ? await updatePurchaseOrder(selectedOrder.id as string, values)
      : await addPurchaseOrder(values);
      
    if (result.success) {
      toast({ 
          title: result.warning ? "Operación con Advertencia" : (selectedOrder && 'id' in selectedOrder ? "Pedido actualizado" : "Pedido creado"),
          description: result.message,
          variant: result.warning ? "default" : "success",
      });
      setIsModalOpen(false);
    } else {
      toast({ variant: "destructive", title: "Error", description: result.message });
    }
  };

  const confirmDelete = async () => {
    let result;
    if (orderToDelete) {
        result = await deletePurchaseOrder(orderToDelete.id);
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

  const confirmDuplicate = () => {
    if (!orderToDuplicate) return;

    // Create a new order object, omitting read-only/generated fields
    const newOrderData: Partial<PurchaseOrder> = {
        ...orderToDuplicate,
        status: 'Pendiente de Aprobación', // New status
    };

    // Delete fields that should not be copied
    delete newOrderData.id;
    delete newOrderData.orderNumber;
    delete newOrderData.date;
    delete newOrderData.statusHistory;
    delete newOrderData.rejectionReason;
    delete newOrderData.receptionNotes;
    delete newOrderData.deliveryNotes;
    delete newOrderData.hasDeliveryNotes;
    delete newOrderData.lastDeliveryNoteUpload;
    delete newOrderData.originalOrderId;
    delete newOrderData.backorderIds;
    
    // Use the existing handleAddClick to open the form with pre-filled data
    handleAddClick(newOrderData);

    setIsDuplicateDialogOpen(false);
    setOrderToDuplicate(null);
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedRowIds(activePurchaseOrders.map(p => p.id));
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

  const getDeliveryStatus = (order: PurchaseOrder) => {
    if (order.status === 'Recibida' || order.status === 'Recibida Parcialmente') {
        return { text: 'Entregado', color: 'bg-green-100 text-green-800 border-green-200' };
    }
    const deliveryDate = new Date(order.estimatedDeliveryDate as string);
    if (isPast(deliveryDate) && !isToday(deliveryDate)) {
        return { text: 'Retrasado', color: 'bg-destructive/20 text-destructive border-destructive/20' };
    }
    const daysUntilDelivery = differenceInDays(deliveryDate, new Date());
    if (daysUntilDelivery <= 5) {
        return { text: `Vence en ${daysUntilDelivery + 1} días`, color: 'bg-orange-100 text-orange-800 border-orange-200' };
    }
    return { text: 'En Plazo', color: 'bg-green-100 text-green-800 border-green-200' };
  };

  const handlePinSubmit = async () => {
      if (pinValue === APPROVAL_PIN && orderToProcess) {
        const { id, status } = orderToProcess;
        const result = await updatePurchaseOrderStatus(id, status);
        if (result.success) {
          toast({ title: 'Pedido Aprobado', description: result.message });
        } else {
          toast({ variant: 'destructive', title: 'Error', description: result.message });
        }
        setIsPinModalOpen(false);
        setPinValue('');
        setOrderToProcess(null);
      } else {
        toast({ variant: 'destructive', title: 'PIN Incorrecto', description: 'El PIN introducido no es válido.' });
        setPinValue('');
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
  
  const getModalTitle = () => {
    if (!selectedOrder) return "Crear Nuevo Pedido de Compra";
    const orderNumber = 'orderNumber' in selectedOrder ? selectedOrder.orderNumber : '';
    const isEditable = !('id' in selectedOrder) || selectedOrder.status === 'Pendiente de Aprobación' || selectedOrder.status === 'Aprobada';

    if ('id' in selectedOrder && isEditable) {
        return `Editar Pedido ${orderNumber}`;
    }
    if ('id' in selectedOrder) {
        return `Detalles del Pedido ${orderNumber}`;
    }
    return "Crear Nuevo Pedido de Compra";
  }

  if (loading || authLoading) {
      return (
        <div className="flex h-[80vh] w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase">Compras</h1>
          <p className="text-muted-foreground">
            Crea y rastrea todas tus órdenes de compra activas. Las órdenes completadas se archivan.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wand2 className="text-primary"/>Creación Rápida con IA</CardTitle>
          <CardDescription>
            Escribe lo que necesitas y deja que la IA genere un borrador del pedido de compra por ti.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Label htmlFor="ai-prompt">Tu Solicitud</Label>
            <div className="flex gap-2">
              <Input 
                id="ai-prompt" 
                placeholder="Ej: Pedir 20 soportes de montaje pequeños de MetalWorks Ltd." 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateWithAI()}
                disabled={isGenerating}
              />
              <Button onClick={handleGenerateWithAI} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <Bot className="mr-2" />}
                Generar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Órdenes de Compra Activas</CardTitle>
                    <CardDescription>Visualiza y gestiona todas tus solicitudes de compra en curso.</CardDescription>
                </div>
                {selectedRowIds.length > 0 ? (
                    <Button variant="destructive" onClick={handleBulkDeleteClick}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar ({selectedRowIds.length})
                    </Button>
                ) : (
                    <Button onClick={() => handleAddClick()}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Pedido Manualmente
                    </Button>
                )}
            </div>
        </CardHeader>
        <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
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
            <div className="space-y-2">
              <Label htmlFor="filter-status">Estado</Label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger id="filter-status">
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Estados</SelectItem>
                  {ALL_STATUSES.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
        </div>
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead padding="checkbox" className="w-[50px]">
                  <Checkbox
                    checked={selectedRowIds.length === activePurchaseOrders.length && activePurchaseOrders.length > 0 ? true : (selectedRowIds.length > 0 ? 'indeterminate' : false)}
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
                    <Button variant="ghost" className="px-1" onClick={() => onSortChange('status')}>
                        Estado {getSortIcon('status')}
                    </Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" className="px-1" onClick={() => onSortChange('estimatedDeliveryDate')}>
                        Entrega Estimada {getSortIcon('estimatedDeliveryDate')}
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
              {activePurchaseOrders.map((order) => {
                const deliveryStatus = getDeliveryStatus(order);
                const isEditable = order.status === 'Pendiente de Aprobación' || order.status === 'Aprobada';
                return (
                <TableRow key={order.id} data-state={selectedRowIds.includes(order.id) ? "selected" : ""} className={cn(order.status === "Pendiente de Aprobación" && "bg-orange-50 dark:bg-orange-900/20")}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedRowIds.includes(order.id)}
                      onCheckedChange={() => handleRowSelect(order.id)}
                      aria-label={`Seleccionar orden ${order.orderNumber}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                        <span>{order.orderNumber || order.id}</span>
                        {order.originalOrderId && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link2 className="h-4 w-4 text-muted-foreground"/>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Pendiente de la orden {order.originalOrderId}</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(order.date as string).toLocaleDateString()}</TableCell>
                  <TableCell>{order.supplier}</TableCell>
                  <TableCell>{order.projectName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "capitalize",
                          order.status === "Aprobada" && "bg-green-100 text-green-800 border-green-200",
                          order.status === "Pendiente de Aprobación" && "bg-orange-100 text-orange-800 border-orange-200 animate-pulse",
                          order.status === "Enviada al Proveedor" && "bg-blue-100 text-blue-800 border-blue-200",
                          order.status === "Recibida Parcialmente" && "bg-yellow-100 text-yellow-800 border-yellow-200",
                          order.status === "Recibida" && "bg-purple-100 text-purple-800 border-purple-200",
                          order.status === "Rechazado" && "bg-destructive/20 text-destructive border-destructive/20"
                        )}
                      >
                        {order.status}
                      </Badge>
                      {order.status === 'Rechazado' && order.rejectionReason && (
                        <Tooltip>
                            <TooltipTrigger>
                                <MessageSquareWarning className="h-4 w-4 text-destructive" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{order.rejectionReason}</p>
                            </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                        <span>{new Date(order.estimatedDeliveryDate as string).toLocaleDateString()}</span>
                        <Badge variant="outline" className={cn("capitalize w-fit", deliveryStatus.color)}>
                            {deliveryStatus.text}
                        </Badge>
                    </div>
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
                          <DropdownMenuItem onClick={() => handleEditClick(order)}>
                            <Eye className="mr-2 h-4 w-4"/>
                            Ver Detalles
                          </DropdownMenuItem>
                          {isEditable && (
                            <DropdownMenuItem onClick={() => handleEditClick(order)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDuplicateClick(order)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicar Orden
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleHistoryClick(order)}>
                            <History className="mr-2 h-4 w-4"/>
                            Trazabilidad
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <ChevronRight className="mr-2 h-4 w-4" />
                              <span>Cambiar Estado</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                {ALL_STATUSES.map(status => (
                                    <DropdownMenuItem 
                                        key={status} 
                                        onClick={() => handleStatusChange(order.id, order.status, status)}
                                        disabled={order.status === status}
                                    >
                                        {status}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handlePrintClick(order)}>
                            <Printer className="mr-2 h-4 w-4"/>
                            Imprimir Orden
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEmailClick(order)}>
                            <Mail className="mr-2 h-4 w-4"/>
                            Enviar por Email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteTrigger(order)}
                          >
                             <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                </TableRow>
              )})}
              {!loading && activePurchaseOrders.length === 0 && (
                <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No se encontraron órdenes de compra que coincidan con los filtros.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </TooltipProvider>
        </CardContent>
      </Card>
      
      <Dialog open={isModalOpen} onOpenChange={(isOpen) => {
        setIsModalOpen(isOpen);
        if (!isOpen) {
          setSelectedOrder(null);
        }
      }}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>
                {getModalTitle()}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder && 'id' in selectedOrder
                ? "Revisa o modifica la información del pedido de compra."
                : "Rellena los detalles para crear un nuevo pedido."}
            </DialogDescription>
          </DialogHeader>
          <PurchasingForm
            order={selectedOrder}
            onSave={handleSave}
            onCancel={() => {
              setIsModalOpen(false);
              setSelectedOrder(null);
            }}
            canApprove={canApprove}
            suppliers={orderedSuppliers}
            recentSupplierIds={recentSupplierIds}
            inventoryItems={inventory}
            projects={projects}
            locations={locations}
          />
        </DialogContent>
      </Dialog>
      
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
      
      <Dialog open={isPinModalOpen} onOpenChange={setIsPinModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Verificación Requerida</DialogTitle>
            <DialogDescription>
              Introduce el PIN de 4 dígitos para aprobar este pedido.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center gap-4 py-4">
            <InputOTP maxLength={4} value={pinValue} onChange={setPinValue} pattern={REGEXP_ONLY_DIGITS}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
            <Button type="button" onClick={handlePinSubmit} disabled={pinValue.length < 4}>Confirmar Aprobación</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isReceptionAlertOpen} onOpenChange={setIsReceptionAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Anchor className="h-5 w-5 text-primary"/>Proceso de Recepción</AlertDialogTitle>
            <AlertDialogDescription>
              Para garantizar un control de stock preciso, las recepciones de material deben realizarse desde el módulo específico de "Recepciones". ¿Deseas ir ahora?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push('/receptions')}>
              Ir a Recepciones
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isStateTransitionAlertOpen} onOpenChange={setIsStateTransitionAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-orange-500" />
                {stateTransitionAlertMessage.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {stateTransitionAlertMessage.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsStateTransitionAlertOpen(false)}>Entendido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isAiClarificationOpen} onOpenChange={setIsAiClarificationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
                <Bot className="h-6 w-6 text-primary" />
                La IA necesita más información
            </AlertDialogTitle>
            <AlertDialogDescription>
              {aiClarification}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              setAiPrompt(aiClarification);
              setIsAiClarificationOpen(false);
            }}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicar Orden de Compra</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Crear una nueva orden usando los datos de esta? La nueva orden se creará con estado "Pendiente de Aprobación".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDuplicate}>
              Sí
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente
               {orderToDelete ? ` el pedido "${orderToDelete.orderNumber}".` : (selectedRowIds.length > 1 ? ` los ${selectedRowIds.length} pedidos seleccionados.` : " el pedido seleccionado.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

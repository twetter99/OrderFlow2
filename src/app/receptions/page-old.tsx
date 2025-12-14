
"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
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
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Anchor, Link2, UploadCloud, FileText, Loader2, CheckCircle, Info, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { InventoryItem, PurchaseOrder, InventoryLocation, Location, PurchaseOrderItem, DeliveryNoteAttachment } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { ReceptionChecklist } from "@/components/receptions/reception-checklist";
import { collection, onSnapshot, doc, writeBatch, Timestamp, getDocs, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createPurchaseOrder, linkDeliveryNoteToPurchaseOrder } from "@/app/purchasing/actions";
import { createInventoryHistoryFromOrder } from "@/app/price-intelligence/actions";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { convertPurchaseOrderTimestamps } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

const MAX_FILE_SIZE = 900 * 1024; // 900KB

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

function AttachDeliveryNoteDialog({
    orderId,
    isOpen,
    onClose,
}: {
    orderId: string | null;
    isOpen: boolean;
    onClose: () => void;
}) {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleAttachClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0 || !orderId) return;

        setIsUploading(true);
        
        try {
            const deliveryNotes: DeliveryNoteAttachment[] = [];

            for (const file of Array.from(files)) {
                if (file.size > MAX_FILE_SIZE) {
                    toast({
                        variant: "destructive",
                        title: "Archivo Demasiado Grande",
                        description: `El archivo "${file.name}" supera el límite de 900KB.`,
                    });
                    continue; // Skip this file
                }
                const base64Data = await fileToBase64(file);
                deliveryNotes.push({
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    data: base64Data,
                    uploadedAt: new Date().toISOString(),
                });
            }

            if (deliveryNotes.length > 0) {
                const result = await linkDeliveryNoteToPurchaseOrder(orderId, deliveryNotes);
                
                if (result.success) {
                    toast({
                        title: "Albarán Adjuntado",
                        description: `Se ha vinculado ${deliveryNotes.length} albarán(es) a la orden de compra.`,
                    });
                } else {
                     toast({
                        variant: "destructive",
                        title: "Error al Vincular",
                        description: result.message,
                    });
                }
            }
            onClose();
        } catch (error: any) {
            console.error("Error attaching file: ", error);
             toast({
                variant: "destructive",
                title: "Error de Subida",
                description: error.message || "No se pudo procesar y subir el albarán."
            });
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Adjuntar Albarán del Proveedor</DialogTitle>
                    <DialogDescription>
                        Sube un archivo (PDF, JPG, PNG) para adjuntarlo a esta orden. Límite de 900KB por archivo.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 text-center">
                    <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                </div>
                <DialogFooter className="sm:justify-center">
                     <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        style={{ display: 'none' }}
                        disabled={isUploading}
                    />
                    <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
                        Omitir
                    </Button>
                    <Button type="button" onClick={handleAttachClick} disabled={isUploading}>
                        {isUploading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <UploadCloud className="mr-2 h-4 w-4" />
                        )}
                        {isUploading ? "Procesando..." : "Adjuntar Albarán"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function ReceptionsPage() {
  const { toast } = useToast();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [orderForAttachment, setOrderForAttachment] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);


  useEffect(() => {
    const unsubPO = onSnapshot(collection(db, 'purchaseOrders'), (snapshot) => {
        const ordersData = snapshot.docs.map(doc => convertPurchaseOrderTimestamps({ id: doc.id, ...doc.data() }));
        setPurchaseOrders(ordersData);
        setLoading(false);
    });
     const unsubLocations = onSnapshot(collection(db, 'locations'), (snapshot) => {
        setLocations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)));
    });
    return () => {
        unsubPO();
        unsubLocations();
    }
  }, []);

  const ordersToReceive = useMemo(() => {
    return purchaseOrders.filter(o => 
      o.status === 'Enviada al Proveedor' && o.items.some(item => item.type === 'Material')
    );
  }, [purchaseOrders]);

  const handleVerifyClick = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setIsChecklistOpen(true);
  };
  
  const handleUpdateOrderStatus = async (
    orderId: string, 
    receivingLocationId: string, 
    receivedItems: { itemId: string; quantity: number }[],
    receptionNotes: string,
    isPartial: boolean
  ) => {
    const orderDocRef = doc(db, "purchaseOrders", orderId);
    const orderSnap = await getDoc(orderDocRef);

    if (!orderSnap.exists()) {
        toast({ variant: "destructive", title: "Error", description: "No se encontró la orden de compra original."});
        return;
    }
    
    const originalOrder = convertPurchaseOrderTimestamps(orderSnap.data());

    const batch = writeBatch(db);
    const poRef = doc(db, "purchaseOrders", orderId);
    let newStatus: PurchaseOrder['status'] = isPartial ? 'Recibida Parcialmente' : 'Recibida';

    // 1. Update Inventory in the selected location
    const inventoryUpdates = receivedItems.map(async (itemToReceive) => {
        if(itemToReceive.quantity === 0) return;
        const q = collection(db, "inventoryLocations");
        const querySnapshot = await getDocs(q); 
        const docToUpdate = querySnapshot.docs.find(d => d.data().itemId === itemToReceive.itemId && d.data().locationId === receivingLocationId);

        if (docToUpdate) {
            const newQuantity = docToUpdate.data().quantity + itemToReceive.quantity;
            batch.update(docToUpdate.ref, { quantity: newQuantity });
        } else {
            const newDocRef = doc(collection(db, "inventoryLocations"));
            batch.set(newDocRef, { 
                itemId: itemToReceive.itemId,
                locationId: receivingLocationId,
                quantity: itemToReceive.quantity 
            });
        }
    });
    
    await Promise.all(inventoryUpdates);

    let backorderId: string | undefined = undefined;

    // 2. If partial, create a backorder
    if (isPartial) {
        const pendingItems: PurchaseOrderItem[] = [];
        originalOrder.items.forEach(originalItem => {
            const received = receivedItems.find(r => r.itemId === originalItem.itemId);
            const receivedQty = received ? received.quantity : 0;
            if (receivedQty < originalItem.quantity) {
                pendingItems.push({
                    ...originalItem,
                    quantity: originalItem.quantity - receivedQty,
                });
            }
        });
        
        if (pendingItems.length > 0) {
            
             const backorderData: Partial<PurchaseOrder> = {
                ...originalOrder,
                status: 'Enviada al Proveedor', 
                originalOrderId: orderId,
                items: pendingItems,
                date: typeof originalOrder.date === 'string' ? originalOrder.date : new Date(originalOrder.date as any).toISOString(),
                estimatedDeliveryDate: typeof originalOrder.estimatedDeliveryDate === 'string' ? originalOrder.estimatedDeliveryDate : new Date(originalOrder.estimatedDeliveryDate as any).toISOString(),
                total: pendingItems.reduce((acc, item) => acc + (item.quantity * item.price), 0),
                statusHistory: [{ 
                    status: 'Enviada al Proveedor', 
                    date: new Date().toISOString(),
                    comment: `Backorder de la orden ${originalOrder.orderNumber}. Notas originales: ${receptionNotes}` 
                }]
            };
            delete backorderData.id;
            delete backorderData.orderNumber;
            delete backorderData.backorderIds;

            const newBackorder = await createPurchaseOrder(backorderData);
            backorderId = newBackorder.id;
        }
    }

    // 3. Update original Purchase Order
    const historyComment = isPartial 
      ? `Recepción parcial. Backorder ${backorderId} creado. Notas: ${receptionNotes}`
      : `Recepción completa. Notas: ${receptionNotes}`;

    const newHistoryEntry = { status: newStatus, date: new Date(), comment: historyComment };
    const updateData: Partial<PurchaseOrder> = {
      status: newStatus,
      receptionNotes,
      statusHistory: arrayUnion(newHistoryEntry) as any,
    };
    if (backorderId) {
        updateData.backorderIds = arrayUnion(backorderId) as any;
    }
    batch.update(poRef, updateData);

    try {
        await batch.commit();
        
        // 4. Crear historial de precios para inteligencia de precios
        const itemsWithQuantity = receivedItems.filter(item => item.quantity > 0);
        if (itemsWithQuantity.length > 0) {
          await createInventoryHistoryFromOrder(orderId, itemsWithQuantity);
        }
        
        setIsChecklistOpen(false);
        setOrderForAttachment(orderId); // Trigger attachment dialog
        
    } catch (error) {
        console.error("Error receiving order: ", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo procesar la recepción."
        })
    }
  }

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedRowIds(ordersToReceive.map(o => o.id));
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

  if (loading) {
    return <div>Cargando recepciones...</div>
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Recepciones de Mercancía</h1>
          <p className="text-muted-foreground">
            Verifica y recibe los pedidos de compra entrantes en un almacén específico.
          </p>
        </div>
      </div>
      <Card>
         <CardHeader>
            <CardTitle>Pedidos Pendientes de Recepción</CardTitle>
            <CardDescription>
                Lista de órdenes de compra que han sido enviadas por el proveedor y están listas para ser verificadas y almacenadas.
            </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedRowIds.length === ordersToReceive.length && ordersToReceive.length > 0 ? true : (selectedRowIds.length > 0 ? 'indeterminate' : false)}
                    onCheckedChange={(checked) => handleSelectAll(checked)}
                    aria-label="Seleccionar todo"
                  />
                </TableHead>
                <TableHead>ID de Orden</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha de Entrega Estimada</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersToReceive.map((order) => (
                <TableRow key={order.id} data-state={selectedRowIds.includes(order.id) && "selected"}>
                  <TableCell>
                     <Checkbox
                      checked={selectedRowIds.includes(order.id)}
                      onCheckedChange={() => handleRowSelect(order.id)}
                      aria-label={`Seleccionar orden ${order.orderNumber}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                     <div className="flex items-center gap-2">
                        <span>{order.orderNumber}</span>
                         {order.hasDeliveryNotes && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-blue-500"/>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Esta orden tiene albaranes adjuntos.</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        {order.originalOrderId && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link2 className="h-4 w-4 text-muted-foreground"/>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Material pendiente de la orden {order.originalOrderId}</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                  </TableCell>
                  <TableCell>{order.supplier}</TableCell>
                  <TableCell>{new Date(order.estimatedDeliveryDate as string).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("capitalize bg-blue-100 text-blue-800 border-blue-200")}
                    >
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleVerifyClick(order)}>
                        <Anchor className="mr-2 h-4 w-4" />
                        Verificar Recepción
                      </Button>
                    </TableCell>
                </TableRow>
              ))}
               {ordersToReceive.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No hay pedidos de material pendientes de recibir.
                    </TableCell>
                </TableRow>
               )}
            </TableBody>
          </Table>
          </TooltipProvider>
        </CardContent>
      </Card>
      
      <Dialog open={isChecklistOpen} onOpenChange={setIsChecklistOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
                Verificar Recepción: {selectedOrder?.orderNumber}
            </DialogTitle>
            <DialogDescription>
                Selecciona un almacén y verifica la mercancía recibida contra la orden de compra.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <ReceptionChecklist 
                order={selectedOrder}
                locations={locations}
                onConfirmReception={handleUpdateOrderStatus}
                onCancel={() => setIsChecklistOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

       <AttachDeliveryNoteDialog
            orderId={orderForAttachment}
            isOpen={!!orderForAttachment}
            onClose={() => setOrderForAttachment(null)}
        />
    </div>
  )
}

"use client";

import React, { useState, useMemo, useRef } from "react";
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
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Anchor, Link2, UploadCloud, FileText, Loader2, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PurchaseOrder, Location, DeliveryNoteAttachment } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { ReceptionChecklist } from "@/components/receptions/reception-checklist";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { confirmReception, attachDeliveryNoteToPurchaseOrder } from "./actions";
import { createInventoryHistoryFromOrder } from "@/app/price-intelligence/actions";

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
  onSuccess,
}: {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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
          continue;
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
        const result = await attachDeliveryNoteToPurchaseOrder(orderId, deliveryNotes);

        if (result.success) {
          toast({
            title: "Albarán Adjuntado",
            description: `Se ha vinculado ${deliveryNotes.length} albarán(es) a la orden de compra.`,
          });
          onSuccess();
        } else {
          toast({
            variant: "destructive",
            title: "Error al Vincular",
            description: result.error,
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
  );
}

interface ReceptionsClientPageProps {
  purchaseOrders: PurchaseOrder[];
  locations: Location[];
}

export function ReceptionsClientPage({
  purchaseOrders: initialPurchaseOrders,
  locations: initialLocations,
}: ReceptionsClientPageProps) {
  const router = useRouter();
  const { toast } = useToast();

  const purchaseOrders = initialPurchaseOrders;
  const locations = initialLocations;

  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [orderForAttachment, setOrderForAttachment] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

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
    try {
      const result = await confirmReception(
        orderId,
        receivingLocationId,
        receivedItems,
        receptionNotes,
        isPartial
      );

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "No se pudo procesar la recepción."
        });
        return;
      }

      // Create price history for price intelligence
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
      });
    }
  };

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
                              <Info className="h-4 w-4 text-blue-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Esta orden tiene albaranes adjuntos.</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {order.originalOrderId && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link2 className="h-4 w-4 text-muted-foreground" />
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
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}

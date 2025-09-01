

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Check, AlertTriangle, QrCode, FileWarning, PackageCheck, Anchor, Warehouse } from "lucide-react";
import type { PurchaseOrder, Location } from '@/lib/types';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type ItemStatus = 'pending' | 'ok' | 'discrepancy' | 'extra';

interface ChecklistItem {
    id: string; // This is now itemId for materials
    sku: string;
    name: string;
    expected: number;
    received: number;
    status: ItemStatus;
    type: 'Material' | 'Servicio';
}

interface ReceptionChecklistProps {
    order: PurchaseOrder;
    locations: Location[];
    onConfirmReception: (orderId: string, receivingLocationId: string, receivedItems: { itemId: string; quantity: number }[], receptionNotes: string, isPartial: boolean) => void;
    onCancel: () => void;
}

export function ReceptionChecklist({ order, locations, onConfirmReception, onCancel }: ReceptionChecklistProps) {
    const itemsForReception = useMemo(() => 
        order.items
            .filter(item => item.type === 'Material' && item.itemId)
            .map(item => ({
                id: item.itemId!,
                sku: item.itemSku || 'N/A',
                name: item.itemName,
                expected: item.quantity,
                received: 0,
                status: 'pending' as ItemStatus,
                type: item.type,
            })),
        [order.items]
    );
    
    const [items, setItems] = useState<ChecklistItem[]>(itemsForReception);
    const [receptionNotes, setReceptionNotes] = useState('');
    const [receivingLocationId, setReceivingLocationId] = useState<string>("");

    const updateItemStatus = (item: ChecklistItem): ItemStatus => {
        if (item.received === item.expected) return 'ok';
        if (item.received > 0) return 'discrepancy';
        return 'pending';
    }
    
    const handleManualChange = (itemId: string, value: string) => {
         const receivedQty = parseInt(value, 10);
         if (isNaN(receivedQty)) return;

         setItems(prevItems => prevItems.map(item => {
            if (item.id === itemId) {
                const updatedItem = { ...item, received: receivedQty };
                return { ...updatedItem, status: updateItemStatus(updatedItem) };
            }
            return item;
        }));
    }

    const isPartialReception = items.some(item => item.received < item.expected && item.received >= 0);

    const getStatusIcon = (status: ItemStatus) => {
        switch (status) {
            case 'ok': return <Check className="text-green-500" />;
            case 'discrepancy': return <AlertTriangle className="text-yellow-500" />;
            default: return <div className="w-4 h-4 rounded-full bg-gray-300" />;
        }
    };

    const handleConfirm = () => {
        const receivedItemsForUpdate = items
            .map(item => ({ itemId: item.id, quantity: item.received }));

        onConfirmReception(order.id, receivingLocationId, receivedItemsForUpdate, receptionNotes, isPartialReception);
    }
    
    const canConfirm = !!receivingLocationId && items.length > 0;
    const allItemsOk = items.every(item => item.status === 'ok');

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Warehouse className="h-5 w-5"/> Almacén de Destino</CardTitle>
                        <CardDescription>Selecciona el almacén donde se guardará esta mercancía.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Select onValueChange={setReceivingLocationId} value={receivingLocationId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un almacén..." />
                            </SelectTrigger>
                            <SelectContent>
                                {locations.map(loc => (
                                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Lista de Verificación de Artículos</CardTitle>
                        <CardDescription>Verifica las cantidades recibidas. Los servicios no se muestran aquí.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {items.length > 0 ? items.map(item => (
                            <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                                <div className="flex-none w-8 h-8 flex items-center justify-center">
                                    {getStatusIcon(item.status)}
                                </div>
                                <div className="flex-grow">
                                    <p className="font-medium">{item.name}</p>
                                    <p className="text-sm text-muted-foreground font-mono">{item.sku}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      value={item.received}
                                      onChange={(e) => handleManualChange(item.id, e.target.value)}
                                      onFocus={(e) => e.target.select()}
                                      className="w-20 text-center"
                                      disabled={!receivingLocationId}
                                    />
                                    <span className="text-muted-foreground">/ {item.expected}</span>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <Anchor className="mx-auto h-8 w-8 mb-2" />
                                <p>No hay materiales físicos en este pedido para recibir.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Resumen y Acciones</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div>
                            <Label htmlFor="notes">Notas de Recepción</Label>
                            <Textarea 
                                id="notes" 
                                placeholder="Añade cualquier observación sobre la entrega (ej. caja dañada, motivo de la discrepancia, etc.)"
                                value={receptionNotes}
                                onChange={(e) => setReceptionNotes(e.target.value)}
                            />
                       </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button className="w-full" disabled={!canConfirm || !isPartialReception}>
                                    <FileWarning className="mr-2 h-4 w-4" />
                                    Recibir Parcialmente
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Recepción Parcial</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Se registrará una recepción parcial. El stock se actualizará con las cantidades introducidas y se generará una nueva orden de compra (backorder) con los artículos pendientes. ¿Deseas continuar?
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleConfirm}>
                                    Confirmar y Recibir
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button className="w-full" disabled={!canConfirm || !allItemsOk}>
                                    <PackageCheck className="mr-2 h-4 w-4" />
                                    Confirmar Recepción Completa
                                </Button>
                            </AlertDialogTrigger>
                             <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Recepción Completa</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Todos los artículos coinciden. El inventario en {locations.find(l => l.id === receivingLocationId)?.name || 'el almacén seleccionado'} se actualizará y la orden se marcará como "Recibida". ¿Estás seguro?
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleConfirm}>
                                    Confirmar
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <Button variant="ghost" className="w-full" onClick={onCancel}>
                            Cancelar
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

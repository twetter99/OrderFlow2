
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, ExternalLink } from "lucide-react";
import { Badge } from "../ui/badge";
import { getData } from "@/lib/data";
import type { Supplier, PurchaseOrder } from "@/lib/types";

export function SupplierPerformanceReport() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const [supData, poData] = await Promise.all([
                getData<Supplier>('suppliers', []),
                getData<PurchaseOrder>('purchaseOrders', [])
            ]);
            setSuppliers(supData);
            setPurchaseOrders(poData);
        }
        fetchData();
    }, []);

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

    const supplierData = suppliers.map(supplier => {
        const relatedPOs = purchaseOrders.filter(po => po.supplier === supplier.name);
        const totalValue = relatedPOs.reduce((acc, order) => acc + order.total, 0);
        const orderCount = relatedPOs.length;

        return {
            ...supplier,
            orderCount,
            totalValue,
            relatedPOs,
        };
    }).sort((a, b) => b.totalValue - a.totalValue);

    return (
      <Card>
        <CardHeader>
            <CardTitle>Informe de Rendimiento de Proveedores</CardTitle>
            <CardDescription>Análisis de pedidos y valor total por cada proveedor. Expande para ver el historial de compras.</CardDescription>
        </CardHeader>
        <CardContent>
             <Accordion type="multiple" className="w-full">
                {supplierData.map((supplier) => (
                    <AccordionItem value={supplier.id} key={supplier.id}>
                         <AccordionTrigger className="hover:no-underline">
                            <Table className="w-full">
                                <TableBody>
                                    <TableRow className="border-none hover:bg-transparent">
                                        <TableCell className="font-medium w-[30%]">{supplier.name}</TableCell>
                                        <TableCell className="text-center w-[15%] font-bold">{supplier.orderCount}</TableCell>
                                        <TableCell className="text-right w-[20%] font-bold">{formatCurrency(supplier.totalValue)}</TableCell>
                                        <TableCell className="text-center w-[17.5%]">
                                            <div className="flex items-center justify-center gap-1">
                                                {supplier.deliveryRating.toFixed(1)} <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center w-[17.5%]">
                                            <div className="flex items-center justify-center gap-1">
                                                {supplier.qualityRating.toFixed(1)} <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                         </AccordionTrigger>
                         <AccordionContent>
                           <div className="px-4 py-2 bg-muted/50 rounded-md mx-4 mb-2">
                             {supplier.relatedPOs.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nº Orden</TableHead>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {supplier.relatedPOs.map(po => (
                                            <TableRow key={po.id}>
                                                <TableCell>
                                                    <Link 
                                                        href={`/purchasing?order=${po.orderNumber || po.id}`}
                                                        className="text-primary hover:underline flex items-center gap-1"
                                                    >
                                                        {po.orderNumber || po.id}
                                                        <ExternalLink className="h-3 w-3" />
                                                    </Link>
                                                </TableCell>
                                                <TableCell>{new Date(po.date as string).toLocaleDateString()}</TableCell>
                                                <TableCell><Badge variant="outline">{po.status}</Badge></TableCell>
                                                <TableCell className="text-right">{formatCurrency(po.total)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                             ) : (
                                <p className="text-sm text-muted-foreground text-center p-4">No hay órdenes de compra registradas para este proveedor.</p>
                             )}
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
             </Accordion>
        </CardContent>
      </Card>
    );
}

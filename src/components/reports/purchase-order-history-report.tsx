
"use client";

import { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { getData } from "@/lib/data";
import type { PurchaseOrder } from "@/lib/types";
  
export function PurchaseOrderHistoryReport() {
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const data = await getData<PurchaseOrder>('purchaseOrders', []);
            setPurchaseOrders(data);
        }
        fetchData();
    }, []);

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

    // Sort by most recent date
    const sortedOrders = [...purchaseOrders].sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());

    return (
      <Card>
        <CardHeader>
            <CardTitle>Historial Completo de Órdenes de Compra</CardTitle>
            <CardDescription>Una lista de todas las órdenes de compra, ordenadas por fecha más reciente.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Orden</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>{new Date(order.date as string).toLocaleDateString()}</TableCell>
                  <TableCell>{order.supplier}</TableCell>
                  <TableCell>{order.project}</TableCell>
                  <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "capitalize",
                          order.status === "Aprobado" && "bg-green-100 text-green-800 border-green-200",
                          order.status === "Pendiente" && "bg-yellow-100 text-yellow-800 border-yellow-200",
                          order.status === "Enviado" && "bg-blue-100 text-blue-800 border-blue-200",
                          order.status === "Recibido" && "bg-primary/10 text-primary border-primary/20",
                          order.status === "Rechazado" && "bg-red-100 text-red-800 border-red-200"
                        )}
                      >
                        {order.status}
                      </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(order.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
}

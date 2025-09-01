
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { PurchaseOrder } from "@/lib/types";
import { cn } from "@/lib/utils"

export function RecentOrdersTable({ purchaseOrders }: { purchaseOrders: PurchaseOrder[] }) {
  // Sort by date descending to get the most recent orders
  const recentOrders = [...purchaseOrders].sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline uppercase">Órdenes Recientes</CardTitle>
        <CardDescription>
          Una lista de las últimas 5 órdenes de compra.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID de Orden</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentOrders.slice(0, 5).map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.orderNumber || order.id}</TableCell>
                <TableCell>{order.supplier}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "capitalize",
                      order.status === "Aprobada" && "bg-green-100 text-green-800 border-green-200",
                      order.status === "Pendiente de Aprobación" && "bg-orange-100 text-orange-800 border-orange-200",
                      order.status === "Enviada al Proveedor" && "bg-blue-100 text-blue-800 border-blue-200",
                      order.status === "Recibida" && "bg-purple-100 text-purple-800 border-purple-200",
                      order.status === "Almacenada" && "bg-primary/10 text-primary border-primary/20",
                      order.status === "Rechazado" && "bg-destructive/20 text-destructive border-destructive/20"
                    )}
                  >
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(order.total)}
                </TableCell>
              </TableRow>
            ))}
             {recentOrders.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No hay órdenes de compra recientes.
                    </TableCell>
                </TableRow>
             )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

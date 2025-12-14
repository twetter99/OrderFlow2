"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { InventoryHistoryEntry } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PriceHistoryTableProps {
  history: InventoryHistoryEntry[];
  avgPrice?: number;
}

type SortColumn = 'date' | 'unitPrice' | 'quantity' | 'totalPrice' | 'supplierName';
type SortDirection = 'asc' | 'desc';

export function PriceHistoryTable({ history, avgPrice }: PriceHistoryTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'date':
          comparison = new Date(a.date as string).getTime() - new Date(b.date as string).getTime();
          break;
        case 'unitPrice':
          comparison = a.unitPrice - b.unitPrice;
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
        case 'totalPrice':
          comparison = a.totalPrice - b.totalPrice;
          break;
        case 'supplierName':
          comparison = a.supplierName.localeCompare(b.supplierName);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [history, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-1 h-3 w-3" /> 
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const getPriceVariant = (price: number) => {
    if (!avgPrice) return 'default';
    const diff = ((price - avgPrice) / avgPrice) * 100;
    if (diff < -10) return 'success'; // Más de 10% por debajo del promedio
    if (diff > 10) return 'destructive'; // Más de 10% por encima del promedio
    return 'default';
  };

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de Compras</CardTitle>
          <CardDescription>No hay registros de compra para este artículo</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          Selecciona un artículo para ver su historial de compras
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Compras</CardTitle>
        <CardDescription>
          Detalle de todas las transacciones registradas ({history.length} compras)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="px-0 hover:bg-transparent"
                    onClick={() => handleSort('date')}
                  >
                    Fecha {getSortIcon('date')}
                  </Button>
                </TableHead>
                <TableHead>Orden de Compra</TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="px-0 hover:bg-transparent"
                    onClick={() => handleSort('supplierName')}
                  >
                    Proveedor {getSortIcon('supplierName')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button 
                    variant="ghost" 
                    className="px-0 hover:bg-transparent"
                    onClick={() => handleSort('quantity')}
                  >
                    Cantidad {getSortIcon('quantity')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button 
                    variant="ghost" 
                    className="px-0 hover:bg-transparent"
                    onClick={() => handleSort('unitPrice')}
                  >
                    Precio Unit. {getSortIcon('unitPrice')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button 
                    variant="ghost" 
                    className="px-0 hover:bg-transparent"
                    onClick={() => handleSort('totalPrice')}
                  >
                    Total {getSortIcon('totalPrice')}
                  </Button>
                </TableHead>
                <TableHead>Proyecto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedHistory.map((entry) => {
                const priceVariant = getPriceVariant(entry.unitPrice);
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {format(new Date(entry.date as string), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Link 
                        href={`/purchasing?order=${entry.purchaseOrderId}`}
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        {entry.orderNumber}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {entry.supplierName}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.quantity.toLocaleString('es-ES')} {entry.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "font-medium",
                        priceVariant === 'success' && "text-green-600",
                        priceVariant === 'destructive' && "text-red-600"
                      )}>
                        {formatCurrency(entry.unitPrice)}
                      </span>
                      {priceVariant !== 'default' && avgPrice && (
                        <span className={cn(
                          "ml-1 text-xs",
                          priceVariant === 'success' && "text-green-600",
                          priceVariant === 'destructive' && "text-red-600"
                        )}>
                          ({priceVariant === 'success' ? '↓' : '↑'}
                          {Math.abs(((entry.unitPrice - avgPrice) / avgPrice) * 100).toFixed(0)}%)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(entry.totalPrice)}
                    </TableCell>
                    <TableCell>
                      {entry.projectName ? (
                        <span className="text-sm text-muted-foreground">{entry.projectName}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

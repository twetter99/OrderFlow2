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
import { Trophy, Medal, Award, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type SupplierData = {
  supplierId: string;
  supplierName: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  purchaseCount: number;
  lastPrice: number;
};

interface SupplierComparisonTableProps {
  data: SupplierData[];
  avgPrice?: number;
}

export function SupplierComparisonTable({ data, avgPrice }: SupplierComparisonTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 text-center font-medium text-muted-foreground">{index + 1}</span>;
    }
  };

  const getPriceComparisonBadge = (price: number) => {
    if (!avgPrice) return null;
    
    const diff = ((price - avgPrice) / avgPrice) * 100;
    
    if (diff < -5) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <TrendingDown className="h-3 w-3 mr-1" />
          {Math.abs(diff).toFixed(0)}% mejor
        </Badge>
      );
    }
    if (diff > 5) {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <TrendingUp className="h-3 w-3 mr-1" />
          {diff.toFixed(0)}% más caro
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
        <Minus className="h-3 w-3 mr-1" />
        Similar
      </Badge>
    );
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparativa de Proveedores</CardTitle>
          <CardDescription>No hay datos de proveedores para este artículo</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          Selecciona un artículo para ver la comparativa entre proveedores
        </CardContent>
      </Card>
    );
  }

  // El mejor proveedor (primer lugar por precio promedio más bajo)
  const bestSupplier = data[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparativa de Proveedores</CardTitle>
        <CardDescription>
          Análisis de precios por proveedor, ordenado del mejor al más caro. 
          {bestSupplier && (
            <span className="block mt-1">
              <span className="font-medium text-green-600">{bestSupplier.supplierName}</span> ofrece el mejor precio promedio.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Rank</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">Precio Promedio</TableHead>
                <TableHead className="text-right">Mejor Precio</TableHead>
                <TableHead className="text-right">Precio Más Alto</TableHead>
                <TableHead className="text-right">Último Precio</TableHead>
                <TableHead className="text-center">Compras</TableHead>
                <TableHead>Comparativa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((supplier, index) => (
                <TableRow 
                  key={supplier.supplierId}
                  className={cn(
                    index === 0 && "bg-green-50/50 dark:bg-green-950/20"
                  )}
                >
                  <TableCell>
                    <div className="flex items-center justify-center">
                      {getRankIcon(index)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "font-medium",
                      index === 0 && "text-green-700 dark:text-green-400"
                    )}>
                      {supplier.supplierName}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn(
                      "font-semibold",
                      index === 0 && "text-green-600"
                    )}>
                      {formatCurrency(supplier.avgPrice)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(supplier.minPrice)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(supplier.maxPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(supplier.lastPrice)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">
                      {supplier.purchaseCount}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getPriceComparisonBadge(supplier.avgPrice)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Resumen */}
        {data.length > 1 && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">💡 Recomendación</h4>
            <p className="text-sm text-muted-foreground">
              Podrías ahorrar hasta{' '}
              <span className="font-semibold text-green-600">
                {formatCurrency(data[data.length - 1].avgPrice - data[0].avgPrice)}
              </span>
              {' '}por unidad comprando a{' '}
              <span className="font-medium">{data[0].supplierName}</span>
              {' '}en lugar de{' '}
              <span className="font-medium">{data[data.length - 1].supplierName}</span>.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { InventoryHistoryEntry, PriceMetrics } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PriceEvolutionChartProps {
  history: InventoryHistoryEntry[];
  metrics: PriceMetrics | null;
  itemName: string;
}

export function PriceEvolutionChart({ history, metrics, itemName }: PriceEvolutionChartProps) {
  const chartData = useMemo(() => {
    return history.map(entry => ({
      date: format(new Date(entry.date as string), "dd/MM/yy", { locale: es }),
      fullDate: format(new Date(entry.date as string), "PPP", { locale: es }),
      precio: entry.unitPrice,
      cantidad: entry.quantity,
      proveedor: entry.supplierName,
      orden: entry.orderNumber,
    }));
  }, [history]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3 min-w-[200px]">
          <p className="font-semibold text-sm mb-2">{data.fullDate}</p>
          <div className="space-y-1 text-sm">
            <p className="flex justify-between">
              <span className="text-muted-foreground">Precio:</span>
              <span className="font-medium text-primary">{formatCurrency(data.precio)}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Cantidad:</span>
              <span className="font-medium">{data.cantidad}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Proveedor:</span>
              <span className="font-medium">{data.proveedor}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Orden:</span>
              <span className="font-medium text-xs">{data.orden}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolución de Precios</CardTitle>
          <CardDescription>No hay datos históricos para mostrar</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          Selecciona un artículo para ver su evolución de precios
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Evolución de Precios
        </CardTitle>
        <CardDescription>
          Histórico de precios de compra para <span className="font-medium text-foreground">{itemName}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              tickFormatter={(value) => `${value}€`}
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Línea de referencia para el precio promedio */}
            {metrics && (
              <ReferenceLine 
                y={metrics.avgPrice} 
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                label={{ 
                  value: `Promedio: ${formatCurrency(metrics.avgPrice)}`,
                  position: 'insideTopRight',
                  fontSize: 11,
                  fill: 'hsl(var(--muted-foreground))'
                }}
              />
            )}
            
            <Line
              type="monotone"
              dataKey="precio"
              name="Precio Unitario"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Package, Loader2, Search } from "lucide-react";
import type { InventoryItem, MaterialDashboardData, AnalyticsDateRange } from "@/lib/types";
import type { GroupBy } from "@/app/inventory-analytics/actions";
import { DateRangeFilter } from "./date-range-filter";
import { cn } from "@/lib/utils";

const fmt = (v: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);
const fmtNum = (v: number) => Number(v).toLocaleString("es-ES", { maximumFractionDigits: 2 });

interface Props {
  items: InventoryItem[];
  data: MaterialDashboardData | null;
  isLoading: boolean;
  selectedItemId: string;
  dateRange: AnalyticsDateRange;
  groupBy: GroupBy;
  onDateRangeChange: (r: AnalyticsDateRange) => void;
  onGroupByChange: (g: GroupBy) => void;
  onItemChange: (id: string) => void;
}

function TrendBadge({ pct }: { pct: number }) {
  if (Math.abs(pct) < 0.5) return <Badge variant="outline" className="gap-1"><Minus className="h-3 w-3" />Sin cambio</Badge>;
  return pct > 0
    ? <Badge variant="destructive" className="gap-1"><TrendingUp className="h-3 w-3" />+{pct.toFixed(1)}%</Badge>
    : <Badge variant="secondary" className="gap-1 text-green-700"><TrendingDown className="h-3 w-3" />{pct.toFixed(1)}%</Badge>;
}

export function MaterialDashboardView({ items, data, isLoading, selectedItemId, dateRange, groupBy, onDateRangeChange, onGroupByChange, onItemChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* Selector */}
      <Card>
        <CardContent className="pt-5 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Material</span>
            <Select value={selectedItemId || "none"} onValueChange={(v) => v !== "none" && onItemChange(v)}>
              <SelectTrigger className="w-72 h-8 text-sm">
                <SelectValue placeholder="Selecciona un material..." />
              </SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.sku} – {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DateRangeFilter
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
            groupBy={groupBy}
            onGroupByChange={onGroupByChange}
            showGroupBy
          />
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
          <Loader2 className="h-6 w-6 animate-spin" /> Calculando dashboard...
        </div>
      )}

      {!isLoading && !data && !selectedItemId && (
        <Card className="flex items-center justify-center py-20 text-muted-foreground">
          <div className="text-center">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Selecciona un material para ver su dashboard.</p>
          </div>
        </Card>
      )}

      {!isLoading && data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Gasto actual</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{fmt(data.currentPeriodSpent)}</p>
                <TrendBadge pct={data.spentChangePercent} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Cantidad comprada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{fmtNum(data.currentPeriodQty)} <span className="text-sm font-normal">{data.unit}</span></p>
                <TrendBadge pct={data.qtyChangePercent} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">PMP (periodo)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{fmt(data.weightedAvgPrice)}<span className="text-sm font-normal">/{data.unit}</span></p>
                <p className="text-xs text-muted-foreground">Precio medio ponderado</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Último precio</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{fmt(data.lastPrice)}<span className="text-sm font-normal">/{data.unit}</span></p>
                <p className="text-xs text-muted-foreground">Última recepción</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Gasto por periodo</CardTitle>
                <CardDescription>{data.itemName}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
                    <Tooltip formatter={(v: number) => [fmt(v), "Gasto"]} />
                    <Bar dataKey="totalSpent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cantidad comprada por periodo</CardTitle>
                <CardDescription>{data.unit}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [`${fmtNum(v)} ${data.unit}`, "Cantidad"]} />
                    <Line type="monotone" dataKey="totalQuantity" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Rankings */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top proyectos por gasto</CardTitle>
              </CardHeader>
              <CardContent>
                {data.topProjects.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Sin datos de proyecto</p>
                ) : (
                  <div className="space-y-3">
                    {data.topProjects.map((p, i) => {
                      const maxSpent = data.topProjects[0]?.totalSpent ?? 1;
                      return (
                        <div key={p.projectId} className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="truncate max-w-[220px]" title={p.projectName}>
                              <span className="text-muted-foreground mr-2">#{i + 1}</span>{p.projectName}
                            </span>
                            <span className="font-semibold ml-2 whitespace-nowrap">{fmt(p.totalSpent)}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${(p.totalSpent / maxSpent) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top proveedores por gasto</CardTitle>
              </CardHeader>
              <CardContent>
                {data.topSuppliers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Sin datos de proveedor</p>
                ) : (
                  <div className="space-y-3">
                    {data.topSuppliers.map((s, i) => {
                      const maxSpent = data.topSuppliers[0]?.totalSpent ?? 1;
                      return (
                        <div key={s.supplierId} className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="truncate max-w-[220px]" title={s.supplierName}>
                              <span className="text-muted-foreground mr-2">#{i + 1}</span>{s.supplierName}
                            </span>
                            <span className="font-semibold ml-2 whitespace-nowrap">{fmt(s.totalSpent)}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full">
                            <div className="h-full bg-chart-2 rounded-full" style={{ width: `${(s.totalSpent / maxSpent) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

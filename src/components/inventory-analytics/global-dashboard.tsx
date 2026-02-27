"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell,
} from "recharts";
import { TrendingUp, AlertTriangle, Zap, RefreshCw, ExternalLink, Loader2 } from "lucide-react";
import type { GlobalDashboardData, AnalyticsDateRange } from "@/lib/types";
import type { GroupBy } from "@/app/inventory-analytics/actions";
import { DateRangeFilter } from "./date-range-filter";

const fmt = (v: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);
const fmtNum = (v: number) => Number(v).toLocaleString("es-ES", { maximumFractionDigits: 2 });

const COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))",
];

interface Props {
  data: GlobalDashboardData;
  isLoading: boolean;
  dateRange: AnalyticsDateRange;
  groupBy: GroupBy;
  onDateRangeChange: (r: AnalyticsDateRange) => void;
  onGroupByChange: (g: GroupBy) => void;
  onRefresh: () => void;
  onViewMaterial: (itemId: string) => void;
}

export function GlobalDashboardView({ data, isLoading, dateRange, groupBy, onDateRangeChange, onGroupByChange, onRefresh, onViewMaterial }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <Card>
        <CardContent className="pt-5 flex flex-wrap gap-3 items-end justify-between">
          <DateRangeFilter
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
            groupBy={groupBy}
            onGroupByChange={onGroupByChange}
            showGroupBy
          />
          <Button onClick={onRefresh} variant="outline" disabled={isLoading} className="h-8">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Actualizar
          </Button>
        </CardContent>
      </Card>

      {/* Alertas */}
      {data.priceAlerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/40 dark:border-orange-900 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400 text-base">
              <AlertTriangle className="h-4 w-4" /> Alertas de precio — subida &gt;15% vs periodo anterior
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.priceAlerts.map((a) => (
                <div key={a.itemId} className="p-3 bg-background border border-orange-200 dark:border-orange-900 rounded-lg min-w-[200px]">
                  <p className="font-medium text-sm truncate">{a.itemName}</p>
                  <p className="text-xs text-muted-foreground">{a.itemSku}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{fmt(a.previousAvgPrice)} → {fmt(a.currentAvgPrice)}</span>
                    <Badge variant="destructive" className="text-xs">+{a.changePercent.toFixed(0)}%</Badge>
                  </div>
                  <Button size="sm" variant="ghost" className="h-6 text-xs mt-1 p-0" onClick={() => onViewMaterial(a.itemId)}>
                    <ExternalLink className="h-3 w-3 mr-1" /> Ver dashboard
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas consumo anómalo */}
      {data.consumptionAlerts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/30 dark:border-yellow-900 dark:bg-yellow-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 text-base">
              <Zap className="h-4 w-4" /> Consumo anómalo — desviación &gt;2σ vs periodos anteriores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.consumptionAlerts.map((a) => (
                <div key={a.itemId} className="p-3 bg-background border border-yellow-200 dark:border-yellow-900 rounded-lg min-w-[180px]">
                  <p className="font-medium text-sm truncate">{a.itemName}</p>
                  <p className="text-xs text-muted-foreground">{a.itemSku}</p>
                  <p className="text-xs mt-1">Actual: <strong>{fmtNum(a.currentQty)}</strong> — Media: {fmtNum(a.avgQty)}</p>
                  <Badge variant="outline" className="text-xs mt-1">{a.deviationFactor.toFixed(1)}σ</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico tendencia global */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tendencia de gasto</CardTitle>
          <CardDescription>Gasto total de compras por periodo</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.spendTimeSeries}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
              <Tooltip formatter={(v: number) => [fmt(v), "Gasto total"]} />
              <Line type="monotone" dataKey="totalSpent" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top 2 rankings */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top 10 materiales por gasto</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.topMaterialsBySpend} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
                <YAxis type="category" dataKey="itemSku" tick={{ fontSize: 10 }} width={60} />
                <Tooltip formatter={(v: number) => [fmt(v), "Gasto"]} labelFormatter={(l) => {
                  const item = data.topMaterialsBySpend.find(i => i.itemSku === l);
                  return item?.itemName ?? l;
                }} />
                <Bar dataKey="totalSpent" radius={[0, 4, 4, 0]}>
                  {data.topMaterialsBySpend.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1">
              {data.topMaterialsBySpend.map((item, i) => (
                <div key={item.itemId} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 max-w-[250px]">
                    <span className="text-muted-foreground w-4">#{i + 1}</span>
                    <span className="truncate" title={item.itemName}>{item.itemName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{fmt(item.totalSpent)}</span>
                    <Button size="sm" variant="ghost" className="h-5 text-xs p-0 px-1" onClick={() => onViewMaterial(item.itemId)}>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top 10 materiales por unidades</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.topMaterialsByQuantity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="itemSku" tick={{ fontSize: 10 }} width={60} />
                <Tooltip formatter={(v: number) => [fmtNum(v), "Unidades"]} labelFormatter={(l) => {
                  const item = data.topMaterialsByQuantity.find(i => i.itemSku === l);
                  return item?.itemName ?? l;
                }} />
                <Bar dataKey="totalQuantity" radius={[0, 4, 4, 0]}>
                  {data.topMaterialsByQuantity.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1">
              {data.topMaterialsByQuantity.map((item, i) => (
                <div key={item.itemId} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 max-w-[250px]">
                    <span className="text-muted-foreground w-4">#{i + 1}</span>
                    <span className="truncate" title={item.itemName}>{item.itemName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{fmtNum(item.totalQuantity)} {item.unit}</span>
                    <Button size="sm" variant="ghost" className="h-5 text-xs p-0 px-1" onClick={() => onViewMaterial(item.itemId)}>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

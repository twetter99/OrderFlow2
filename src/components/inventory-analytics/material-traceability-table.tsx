"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Download, Loader2, ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, RefreshCw } from "lucide-react";
import type { InventoryItem, Supplier, Project, TraceabilityMovement, AnalyticsDateRange, InventoryMovementType } from "@/lib/types";
import { DateRangeFilter } from "./date-range-filter";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const fmt = (v: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);
const fmtNum = (v: number, d = 2) => Number(v).toLocaleString("es-ES", { maximumFractionDigits: d });

const TYPE_CONFIG: Record<InventoryMovementType, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ReactNode }> = {
  reception: { label: "Recepción", variant: "default", icon: <ArrowDownToLine className="h-3 w-3" /> },
  consumption: { label: "Consumo", variant: "secondary", icon: <ArrowUpFromLine className="h-3 w-3" /> },
  adjustment: { label: "Ajuste", variant: "outline", icon: <SlidersHorizontal className="h-3 w-3" /> },
  transfer: { label: "Transferencia", variant: "outline", icon: <RefreshCw className="h-3 w-3" /> },
};

interface Props {
  items: InventoryItem[];
  suppliers: Supplier[];
  projects: Project[];
  data: TraceabilityMovement[];
  isLoading: boolean;
  dateRange: AnalyticsDateRange;
  onDateRangeChange: (r: AnalyticsDateRange) => void;
  selectedItemId: string;
  onItemChange: (id: string) => void;
  selectedSupplierIds: string[];
  onSupplierChange: (ids: string[]) => void;
  selectedProjectIds: string[];
  onProjectChange: (ids: string[]) => void;
  onSearch: () => void;
  onExport: () => void;
}

export function MaterialTraceabilityTable({
  items, suppliers, projects, data, isLoading, dateRange, onDateRangeChange,
  selectedItemId, onItemChange, selectedSupplierIds, onSupplierChange,
  selectedProjectIds, onProjectChange, onSearch, onExport,
}: Props) {
  const [typeFilter, setTypeFilter] = useState<InventoryMovementType | "all">("all");
  const [textSearch, setTextSearch] = useState("");

  const filtered = data
    .filter((m) => typeFilter === "all" || m.type === typeFilter)
    .filter((m) => !textSearch || m.itemName.toLowerCase().includes(textSearch.toLowerCase()) || (m.supplierName ?? "").toLowerCase().includes(textSearch.toLowerCase()) || (m.projectName ?? "").toLowerCase().includes(textSearch.toLowerCase()) || (m.orderNumber ?? "").toLowerCase().includes(textSearch.toLowerCase()));

  const totalSpent = filtered.filter(m => m.type === "reception").reduce((s, m) => s + m.totalPrice, 0);
  const totalQty = filtered.filter(m => m.type === "reception").reduce((s, m) => s + m.quantity, 0);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros de trazabilidad</CardTitle>
          <CardDescription>Consulta el historial completo de movimientos de inventario.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <DateRangeFilter dateRange={dateRange} onDateRangeChange={onDateRangeChange} />
          <div className="flex flex-wrap gap-2 items-end">
            {/* Material */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Material</span>
              <Select value={selectedItemId || "all"} onValueChange={(v) => onItemChange(v === "all" ? "" : v)}>
                <SelectTrigger className="w-52 h-8 text-sm">
                  <SelectValue placeholder="Todos los materiales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los materiales</SelectItem>
                  {items.map((i) => <SelectItem key={i.id} value={i.id}>{i.sku} – {i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Proveedor */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Proveedor</span>
              <Select
                value={selectedSupplierIds[0] || "all"}
                onValueChange={(v) => onSupplierChange(v === "all" ? [] : [v])}
              >
                <SelectTrigger className="w-44 h-8 text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Proyecto */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Proyecto</span>
              <Select
                value={selectedProjectIds[0] || "all"}
                onValueChange={(v) => onProjectChange(v === "all" ? [] : [v])}
              >
                <SelectTrigger className="w-44 h-8 text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Tipo */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Tipo</span>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="reception">Recepciones</SelectItem>
                  <SelectItem value="consumption">Consumos</SelectItem>
                  <SelectItem value="adjustment">Ajustes</SelectItem>
                  <SelectItem value="transfer">Transferencias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Buscar texto */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Texto libre</span>
              <div className="relative">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Material, proveedor, Nº orden..." value={textSearch} onChange={e => setTextSearch(e.target.value)} className="pl-7 h-8 text-sm w-52" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={onSearch} disabled={isLoading} className="h-8">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                Buscar
              </Button>
              <Button onClick={onExport} variant="outline" className="h-8" disabled={data.length === 0}>
                <Download className="h-4 w-4 mr-2" /> CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {data.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>{filtered.length} movimientos</CardTitle>
                <CardDescription>
                  Recepciones: <strong>{fmt(totalSpent)}</strong> · <strong>{fmtNum(totalQty)}</strong> unidades
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Nº Orden</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">P.Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Usuario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => {
                    const cfg = TYPE_CONFIG[m.type] ?? TYPE_CONFIG.reception;
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(parseISO(m.date), "dd/MM/yyyy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={cfg.variant} className="gap-1 text-xs">
                            {cfg.icon} {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{m.itemSku}</TableCell>
                        <TableCell className="max-w-[160px] truncate text-sm" title={m.itemName}>{m.itemName}</TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate" title={m.supplierName}>{m.supplierName ?? "—"}</TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate" title={m.projectName}>{m.projectName ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{m.orderNumber ?? "—"}</TableCell>
                        <TableCell className={cn("text-right font-mono text-sm", m.type === "consumption" ? "text-red-600" : "text-green-700")}>
                          {m.type === "consumption" ? "-" : "+"}{fmtNum(Math.abs(m.quantity))} {m.unit}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmt(m.unitPrice)}</TableCell>
                        <TableCell className="text-right font-semibold text-sm">{fmt(m.totalPrice)}</TableCell>
                        <TableCell className="text-xs">{m.userName ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="text-center">
            <ArrowDownToLine className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Define los filtros y pulsa <strong>Buscar</strong> para ver los movimientos.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

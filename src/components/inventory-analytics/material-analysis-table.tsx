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
import { Search, ExternalLink, BarChart2, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { InventoryItem, Supplier, Project, MaterialAnalysis, AnalyticsDateRange } from "@/lib/types";
import type { MaterialAnalysisFilters } from "@/app/inventory-analytics/actions";
import { DateRangeFilter } from "./date-range-filter";
import { cn } from "@/lib/utils";

const fmt = (v: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);
const fmtNum = (v: number, d = 2) => Number(v).toLocaleString("es-ES", { maximumFractionDigits: d });

interface Props {
  items: InventoryItem[];
  suppliers: Supplier[];
  projects: Project[];
  data: MaterialAnalysis[];
  isLoading: boolean;
  dateRange: AnalyticsDateRange;
  onDateRangeChange: (r: AnalyticsDateRange) => void;
  onSearch: (filters?: Partial<MaterialAnalysisFilters>) => void;
  onViewTraceability: (itemId: string) => void;
  onViewDashboard: (itemId: string) => void;
}

type SortField = "itemName" | "totalSpent" | "totalPurchased" | "weightedAvgPrice" | "minPrice" | "maxPrice";
type SortDir = "asc" | "desc";

export function MaterialAnalysisTable({
  items, suppliers, projects, data, isLoading, dateRange, onDateRangeChange, onSearch, onViewTraceability, onViewDashboard,
}: Props) {
  const [searchText, setSearchText] = useState("");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("totalSpent");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const families = Array.from(new Set(items.map((i) => (i as any).family).filter(Boolean))).sort();

  const filtered = data
    .filter((d) => !searchText || d.itemName.toLowerCase().includes(searchText.toLowerCase()) || d.itemSku.toLowerCase().includes(searchText.toLowerCase()))
    .filter((d) => familyFilter === "all" || d.family === familyFilter)
    .sort((a, b) => {
      const va = a[sortField as keyof MaterialAnalysis] as number;
      const vb = b[sortField as keyof MaterialAnalysis] as number;
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const totalGasto = filtered.reduce((s, d) => s + d.totalSpent, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros de análisis</CardTitle>
          <CardDescription>Selecciona el rango de fechas y aplica los filtros para calcular el análisis.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <DateRangeFilter dateRange={dateRange} onDateRangeChange={onDateRangeChange} />
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Familia</span>
              <Select value={familyFilter} onValueChange={setFamilyFilter}>
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las familias</SelectItem>
                  {families.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Buscar material</span>
              <div className="relative">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="SKU o nombre..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-7 h-8 text-sm w-48"
                />
              </div>
            </div>
            <Button onClick={() => onSearch()} disabled={isLoading} className="h-8">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Calcular análisis
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      {data.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Resultados — {filtered.length} materiales</CardTitle>
                <CardDescription>Gasto total mostrado: <strong>{fmt(totalGasto)}</strong></CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">SKU</TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("itemName")} className="flex items-center gap-1 hover:text-foreground">
                        Material <SortIcon field="itemName" />
                      </button>
                    </TableHead>
                    <TableHead>Familia</TableHead>
                    <TableHead className="text-right">
                      <button onClick={() => handleSort("totalPurchased")} className="flex items-center gap-1 hover:text-foreground ml-auto">
                        Comprado <SortIcon field="totalPurchased" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button onClick={() => handleSort("totalSpent")} className="flex items-center gap-1 hover:text-foreground ml-auto">
                        Gasto Total <SortIcon field="totalSpent" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button onClick={() => handleSort("weightedAvgPrice")} className="flex items-center gap-1 hover:text-foreground ml-auto">
                        PMP <SortIcon field="weightedAvgPrice" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button onClick={() => handleSort("minPrice")} className="flex items-center gap-1 hover:text-foreground ml-auto">
                        Mín <SortIcon field="minPrice" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button onClick={() => handleSort("maxPrice")} className="flex items-center gap-1 hover:text-foreground ml-auto">
                        Máx <SortIcon field="maxPrice" />
                      </button>
                    </TableHead>
                    <TableHead>Top Proveedor</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.itemId}>
                      <TableCell className="font-mono text-xs">{row.itemSku}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate" title={row.itemName}>{row.itemName}</TableCell>
                      <TableCell>
                        {row.family && <Badge variant="outline" className="text-xs">{row.family}</Badge>}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmtNum(row.totalPurchased)} {row.unit}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(row.totalSpent)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(row.weightedAvgPrice)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">{fmt(row.minPrice)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">{fmt(row.maxPrice)}</TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate" title={row.topSuppliers[0]?.supplierName}>
                        {row.topSuppliers[0]?.supplierName ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onViewTraceability(row.itemId)}>
                            <ExternalLink className="h-3 w-3 mr-1" /> Traza
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onViewDashboard(row.itemId)}>
                            <BarChart2 className="h-3 w-3 mr-1" /> Dashboard
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="text-center">
            <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Selecciona un rango de fechas y pulsa <strong>Calcular análisis</strong></p>
          </div>
        </Card>
      )}
    </div>
  );
}

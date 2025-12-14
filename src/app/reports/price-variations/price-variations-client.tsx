"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  TrendingUp,
  Euro,
  Package,
  Search,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Filter,
  Users,
  ArrowUpDown,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { PriceVariationsData, PriceVariationItem, PurchaseDetail } from "./actions";

interface PriceVariationsClientProps {
  initialData: PriceVariationsData;
}

type SortField = "impactEuros" | "variationPercent" | "totalAmount" | "uniquePrices" | "itemName";
type SortDirection = "asc" | "desc";

export function PriceVariationsClient({ initialData }: PriceVariationsClientProps) {
  const [data] = useState<PriceVariationsData>(initialData);
  const [search, setSearch] = useState("");
  const [minVariation, setMinVariation] = useState<number>(0);
  const [minImpact, setMinImpact] = useState<number>(0);
  const [sortField, setSortField] = useState<SortField>("impactEuros");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedItem, setSelectedItem] = useState<PriceVariationItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, "dd/MM/yyyy", { locale: es });
  };

  // Filtrar y ordenar items
  const filteredItems = useMemo(() => {
    let items = [...data.items];

    // Filtro de búsqueda
    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter(
        (item) =>
          item.itemName.toLowerCase().includes(searchLower) ||
          item.itemSku.toLowerCase().includes(searchLower)
      );
    }

    // Filtro de variación mínima
    if (minVariation > 0) {
      items = items.filter((item) => item.variationPercent >= minVariation);
    }

    // Filtro de impacto mínimo
    if (minImpact > 0) {
      items = items.filter((item) => item.impactEuros >= minImpact);
    }

    // Ordenar
    items.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "impactEuros":
          comparison = a.impactEuros - b.impactEuros;
          break;
        case "variationPercent":
          comparison = a.variationPercent - b.variationPercent;
          break;
        case "totalAmount":
          comparison = a.totalAmount - b.totalAmount;
          break;
        case "uniquePrices":
          comparison = a.uniquePrices - b.uniquePrices;
          break;
        case "itemName":
          comparison = a.itemName.localeCompare(b.itemName);
          break;
      }
      return sortDirection === "desc" ? -comparison : comparison;
    });

    return items;
  }, [data.items, search, minVariation, minImpact, sortField, sortDirection]);

  // KPIs calculados sobre items filtrados
  const kpis = useMemo(() => {
    const totalImpact = filteredItems.reduce((acc, item) => acc + item.impactEuros, 0);
    const avgVariation =
      filteredItems.length > 0
        ? filteredItems.reduce((acc, item) => acc + item.variationPercent, 0) / filteredItems.length
        : 0;
    const highVariationCount = filteredItems.filter((item) => item.variationPercent > 50).length;
    const totalSpend = filteredItems.reduce((acc, item) => acc + item.totalAmount, 0);

    return { totalImpact, avgVariation, highVariationCount, totalSpend };
  }, [filteredItems]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    return sortDirection === "desc" ? (
      <ChevronDown className="ml-1 h-3 w-3" />
    ) : (
      <ChevronUp className="ml-1 h-3 w-3" />
    );
  };

  const getVariationBadge = (variation: number) => {
    if (variation >= 100) {
      return <Badge variant="destructive">+{variation.toFixed(0)}%</Badge>;
    } else if (variation >= 50) {
      return <Badge className="bg-orange-500 hover:bg-orange-600">+{variation.toFixed(0)}%</Badge>;
    } else if (variation >= 20) {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">+{variation.toFixed(0)}%</Badge>;
    } else {
      return <Badge variant="secondary">+{variation.toFixed(0)}%</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Variación de Precios por Producto</h1>
          <p className="text-muted-foreground">
            Detecta productos con múltiples precios de compra y oportunidades de ahorro
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impacto Total</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(kpis.totalImpact)}</div>
            <p className="text-xs text-muted-foreground">
              Ahorro potencial comprando siempre al mínimo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variación Media</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.avgVariation.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Entre precio mínimo y máximo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alta Variación</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{kpis.highVariationCount}</div>
            <p className="text-xs text-muted-foreground">Productos con variación &gt; 50%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Analizados</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredItems.length}</div>
            <p className="text-xs text-muted-foreground">
              Gasto total: {formatCurrency(kpis.totalSpend)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filtros</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? "Ocultar" : "Mostrar"}
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Buscar artículo</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nombre o SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Variación mínima (%)</Label>
              <Select
                value={String(minVariation)}
                onValueChange={(v) => setMinVariation(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Todas</SelectItem>
                  <SelectItem value="10">&gt; 10%</SelectItem>
                  <SelectItem value="20">&gt; 20%</SelectItem>
                  <SelectItem value="50">&gt; 50%</SelectItem>
                  <SelectItem value="100">&gt; 100%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Impacto mínimo (€)</Label>
              <Select
                value={String(minImpact)}
                onValueChange={(v) => setMinImpact(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Todos</SelectItem>
                  <SelectItem value="10">&gt; 10 €</SelectItem>
                  <SelectItem value="50">&gt; 50 €</SelectItem>
                  <SelectItem value="100">&gt; 100 €</SelectItem>
                  <SelectItem value="500">&gt; 500 €</SelectItem>
                  <SelectItem value="1000">&gt; 1.000 €</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Tabla principal */}
      <Card>
        <CardHeader>
          <CardTitle>Variación de Precio por Producto</CardTitle>
          <CardDescription>
            Haz clic en una fila para ver el detalle de compras
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">
                    <button
                      className="flex items-center hover:text-primary"
                      onClick={() => handleSort("itemName")}
                    >
                      Artículo
                      <SortIcon field="itemName" />
                    </button>
                  </TableHead>
                  <TableHead className="text-center">
                    <button
                      className="flex items-center justify-center hover:text-primary"
                      onClick={() => handleSort("uniquePrices")}
                    >
                      Precios
                      <SortIcon field="uniquePrices" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Mín</TableHead>
                  <TableHead className="text-right">Máx</TableHead>
                  <TableHead className="text-center">
                    <button
                      className="flex items-center justify-center hover:text-primary"
                      onClick={() => handleSort("variationPercent")}
                    >
                      Variación
                      <SortIcon field="variationPercent" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Precio Medio</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">
                    <button
                      className="flex items-center justify-end hover:text-primary"
                      onClick={() => handleSort("totalAmount")}
                    >
                      Importe Total
                      <SortIcon field="totalAmount" />
                    </button>
                  </TableHead>
                  <TableHead className="text-center">Proveedores</TableHead>
                  <TableHead className="text-right">Último Precio</TableHead>
                  <TableHead className="text-right">
                    <button
                      className="flex items-center justify-end hover:text-primary"
                      onClick={() => handleSort("impactEuros")}
                    >
                      Impacto €
                      <SortIcon field="impactEuros" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No se encontraron productos con variación de precios
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow
                      key={item.itemId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedItem(item)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.itemName}</div>
                          <div className="text-xs text-muted-foreground">{item.itemSku}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{item.uniquePrices}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        {formatCurrency(item.minPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-600">
                        {formatCurrency(item.maxPrice)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getVariationBadge(item.variationPercent)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.weightedAvgPrice)}
                      </TableCell>
                      <TableCell className="text-right">{item.totalQuantity}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.totalAmount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{item.suppliersCount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-right">
                          <div className="font-mono">{formatCurrency(item.lastPrice)}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[100px]">
                            {item.lastSupplier}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-red-600">
                        {formatCurrency(item.impactEuros)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de detalle */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {selectedItem.itemName}
                </DialogTitle>
                <DialogDescription>
                  SKU: {selectedItem.itemSku} | {selectedItem.purchases.length} compras registradas
                </DialogDescription>
              </DialogHeader>

              {/* Resumen del producto */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Precio Mínimo</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(selectedItem.minPrice)}
                  </div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Precio Máximo</div>
                  <div className="text-lg font-bold text-red-600">
                    {formatCurrency(selectedItem.maxPrice)}
                  </div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Variación</div>
                  <div className="text-lg font-bold text-blue-600">
                    +{selectedItem.variationPercent.toFixed(1)}%
                  </div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Impacto</div>
                  <div className="text-lg font-bold text-orange-600">
                    {formatCurrency(selectedItem.impactEuros)}
                  </div>
                </div>
              </div>

              {/* Info de proveedores */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Info className="h-4 w-4" />
                <span>
                  Proveedores: {selectedItem.suppliers.join(", ")}
                </span>
              </div>

              {/* Tabla de compras */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>OC</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Proyecto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedItem.purchases.map((purchase, idx) => {
                      const isMin = purchase.unitPrice === selectedItem.minPrice;
                      const isMax = purchase.unitPrice === selectedItem.maxPrice;
                      
                      return (
                        <TableRow
                          key={purchase.id || idx}
                          className={
                            isMin
                              ? "bg-green-50"
                              : isMax
                              ? "bg-red-50"
                              : ""
                          }
                        >
                          <TableCell>{formatDate(purchase.date)}</TableCell>
                          <TableCell>{purchase.supplierName}</TableCell>
                          <TableCell>
                            {purchase.orderNumber !== "-" ? (
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`/purchasing?order=${purchase.orderNumber}`, "_blank");
                                }}
                              >
                                {purchase.orderNumber}
                                <ExternalLink className="ml-1 h-3 w-3" />
                              </Button>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right">{purchase.quantity}</TableCell>
                          <TableCell
                            className={`text-right font-mono ${
                              isMin ? "text-green-600 font-bold" : isMax ? "text-red-600 font-bold" : ""
                            }`}
                          >
                            {formatCurrency(purchase.unitPrice)}
                            {isMin && <span className="ml-1">✓</span>}
                            {isMax && <span className="ml-1">⚠</span>}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(purchase.totalPrice)}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {purchase.projectName}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Recomendación */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Recomendación</h4>
                <p className="text-sm text-blue-800">
                  El mejor precio conseguido es <strong>{formatCurrency(selectedItem.minPrice)}</strong>.
                  Si todas las compras se hubieran realizado a este precio, habrías ahorrado{" "}
                  <strong>{formatCurrency(selectedItem.impactEuros)}</strong>.
                  Considera fijar este como precio objetivo para futuras compras.
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Package, 
  Building2, 
  Receipt, 
  TrendingUp,
  TrendingDown,
  Euro,
  Calendar,
  FileDown,
  Search,
  BarChart3,
  ShoppingCart,
  Clock,
  Car,
  Plane,
  RefreshCw
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { es } from "date-fns/locale";
import type { ProjectConsumptionData, MaterialConsumption } from "../actions";
import { revalidateProjectTracking } from "../actions";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Props {
  data: ProjectConsumptionData;
}

export function ProjectConsumptionClient({ data }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [filter, setFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"amount" | "quantity" | "name">("amount");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calcular tiempo desde última actualización
  const getTimeSinceUpdate = useCallback(() => {
    if (!data.cachedAt) return "";
    const cached = new Date(data.cachedAt);
    const now = new Date();
    const diffMs = now.getTime() - cached.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "hace menos de 1 min";
    if (diffMins === 1) return "hace 1 min";
    if (diffMins < 60) return `hace ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return "hace 1 hora";
    return `hace ${diffHours} horas`;
  }, [data.cachedAt]);

  // Función para forzar actualización
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await revalidateProjectTracking();
      toast({
        title: "Datos actualizados",
        description: "Refrescando desde Firestore...",
      });
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron actualizar los datos",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtrar y ordenar materiales
  const filteredMaterials = useMemo(() => {
    let result = [...data.materials];
    
    // Filtrar por texto
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(m => 
        m.itemName.toLowerCase().includes(lowerFilter) ||
        m.itemSku.toLowerCase().includes(lowerFilter)
      );
    }
    
    // Ordenar
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "amount":
          cmp = a.totalAmount - b.totalAmount;
          break;
        case "quantity":
          cmp = a.totalQuantity - b.totalQuantity;
          break;
        case "name":
          cmp = a.itemName.localeCompare(b.itemName);
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    
    return result;
  }, [data.materials, filter, sortBy, sortDir]);

  const handlePeriodChange = (value: string) => {
    setPeriodFilter(value);
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    switch (value) {
      case "month":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case "quarter":
        startDate = startOfQuarter(now);
        endDate = endOfQuarter(now);
        break;
      case "year":
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case "last3months":
        startDate = subMonths(now, 3);
        endDate = now;
        break;
      default:
        // "all" - sin filtro
        router.push(`/project-tracking/${data.project.id}`);
        return;
    }
    
    router.push(
      `/project-tracking/${data.project.id}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: es });
    } catch {
      return "-";
    }
  };

  const handleSort = (column: "amount" | "quantity" | "name") => {
    if (sortBy === column) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortBy(column);
      setSortDir("desc");
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return null;
    return sortDir === "desc" ? "↓" : "↑";
  };

  // Calcular porcentaje respecto al budget si existe (usando total proyectado)
  const budgetPercentage = data.project.budget && data.project.budget > 0
    ? (data.summary.totalProjected / data.project.budget) * 100
    : null;

  // Función para exportar a Excel
  const handleExportExcel = useCallback(() => {
    const workbook = XLSX.utils.book_new();
    
    // Hoja 1: Resumen
    const resumenData = [
      ["INFORME DE CONSUMO - PROYECTO"],
      [],
      ["Proyecto:", data.project.name],
      ["Cliente:", data.project.client || "-"],
      ["Presupuesto:", data.project.budget ? `${data.project.budget.toFixed(2)} €` : "No definido"],
      [],
      ["RESUMEN DE GASTOS"],
      [],
      ["Concepto", "Importe", "Detalle"],
      ["Materiales Recibidos", `${data.summary.materialsReceived.toFixed(2)} €`, `${data.summary.uniqueItems} artículos`],
      ["Materiales Pendientes", `${data.summary.materialsCommitted.toFixed(2)} €`, `${data.summary.pendingOrdersCount} órdenes`],
      ["Viajes Aprobados", `${data.summary.travelApproved.toFixed(2)} €`, `${data.summary.travelReportsCount} informes`],
      ["Viajes Pendientes", `${data.summary.travelPending.toFixed(2)} €`, `${data.summary.travelPendingCount} informes`],
      [],
      ["TOTALES"],
      ["Total Gastado", `${data.summary.totalSpent.toFixed(2)} €`, "Materiales + Viajes aprobados"],
      ["Total Comprometido", `${data.summary.totalCommitted.toFixed(2)} €`, "Pendiente de recepción/aprobación"],
      ["Total Proyectado", `${data.summary.totalProjected.toFixed(2)} €`, "Gastado + Comprometido"],
      [],
      budgetPercentage !== null ? ["% Presupuesto", `${budgetPercentage.toFixed(1)}%`, ""] : [],
    ].filter(row => row.length > 0);
    
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    wsResumen["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(workbook, wsResumen, "Resumen");
    
    // Hoja 2: Materiales
    const materialesHeader = ["Artículo", "SKU", "Cantidad", "Compras", "Importe Total", "Precio Medio", "Precio Mín", "Precio Máx", "Última Compra", "Proveedor", "Nº Proveedores"];
    const materialesData = data.materials.map(m => [
      m.itemName,
      m.itemSku,
      m.totalQuantity,
      m.transactionCount,
      m.totalAmount,
      m.avgPrice,
      m.minPrice,
      m.maxPrice,
      m.lastPurchase.date ? format(new Date(m.lastPurchase.date), "dd/MM/yyyy", { locale: es }) : "-",
      m.lastPurchase.supplier,
      m.supplierCount,
    ]);
    const wsMateriales = XLSX.utils.aoa_to_sheet([materialesHeader, ...materialesData]);
    wsMateriales["!cols"] = [{ wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, wsMateriales, "Materiales");
    
    // Hoja 3: Órdenes Pendientes
    if (data.pendingOrders && data.pendingOrders.length > 0) {
      const ordenesHeader = ["Nº Orden", "Fecha", "Proveedor", "Estado", "Items", "Total"];
      const ordenesData = data.pendingOrders.map(o => [
        o.orderNumber,
        o.date ? format(new Date(o.date), "dd/MM/yyyy", { locale: es }) : "-",
        o.supplier,
        o.status,
        o.itemCount,
        o.total,
      ]);
      const wsOrdenes = XLSX.utils.aoa_to_sheet([ordenesHeader, ...ordenesData]);
      wsOrdenes["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 8 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, wsOrdenes, "Órdenes Pendientes");
    }
    
    // Hoja 4: Viajes
    if (data.travelReports && data.travelReports.length > 0) {
      const viajesHeader = ["Código", "Técnico", "Fecha Inicio", "Fecha Fin", "Descripción", "Estado", "Total"];
      const viajesData = data.travelReports.map(v => [
        v.codigo_informe,
        v.tecnico_name,
        v.fecha_inicio ? format(new Date(v.fecha_inicio), "dd/MM/yyyy", { locale: es }) : "-",
        v.fecha_fin ? format(new Date(v.fecha_fin), "dd/MM/yyyy", { locale: es }) : "-",
        v.descripcion_viaje || "-",
        v.estado,
        v.total_informe,
      ]);
      const wsViajes = XLSX.utils.aoa_to_sheet([viajesHeader, ...viajesData]);
      wsViajes["!cols"] = [{ wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(workbook, wsViajes, "Viajes");
    }
    
    // Hoja 5: Evolución Mensual
    if (data.monthlyEvolution && data.monthlyEvolution.length > 0) {
      const evolucionHeader = ["Mes", "Importe"];
      const evolucionData = data.monthlyEvolution.map(m => {
        const [year, monthNum] = m.month.split("-");
        const monthName = format(new Date(parseInt(year), parseInt(monthNum) - 1), "MMMM yyyy", { locale: es });
        return [monthName, m.amount];
      });
      const wsEvolucion = XLSX.utils.aoa_to_sheet([evolucionHeader, ...evolucionData]);
      wsEvolucion["!cols"] = [{ wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, wsEvolucion, "Evolución Mensual");
    }
    
    // Generar y descargar el archivo
    const fileName = `Consumo_${data.project.name.replace(/[^a-zA-Z0-9]/g, "_")}_${format(new Date(), "yyyyMMdd")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }, [data, budgetPercentage]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/project-tracking">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-headline uppercase">
              {data.project.name}
            </h1>
            {data.project.client && (
              <p className="text-muted-foreground">{data.project.client}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data.cachedAt && (
            <span className="text-xs text-muted-foreground">
              {getTimeSinceUpdate()}
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? '...' : 'Actualizar'}
          </Button>
          <Select value={periodFilter} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el historial</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="quarter">Este trimestre</SelectItem>
              <SelectItem value="year">Este año</SelectItem>
              <SelectItem value="last3months">Últimos 3 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileDown className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPIs Summary - Desglosado por Materiales y Viajes */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Fila 1: Materiales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">📦 Materiales Recibidos</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(data.summary.materialsReceived)}</div>
            <p className="text-xs text-muted-foreground">{data.summary.uniqueItems} artículos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">📦 Materiales Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{formatCurrency(data.summary.materialsCommitted)}</div>
            <p className="text-xs text-muted-foreground">{data.summary.pendingOrdersCount} órdenes</p>
          </CardContent>
        </Card>
        {/* Fila 2: Viajes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">🚗 Viajes Aprobados</CardTitle>
            <Car className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(data.summary.travelApproved)}</div>
            <p className="text-xs text-muted-foreground">{data.summary.travelReportsCount} informes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">🚗 Viajes Pendientes</CardTitle>
            <Plane className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-500">{formatCurrency(data.summary.travelPending)}</div>
            <p className="text-xs text-muted-foreground">{data.summary.travelPendingCount} informes</p>
          </CardContent>
        </Card>
      </div>

      {/* Totales consolidados */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">💚 Total Gastado</CardTitle>
            <Euro className="h-4 w-4 text-green-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(data.summary.totalSpent)}</div>
            <p className="text-xs text-muted-foreground">Materiales + Viajes aprobados</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">💛 Total Comprometido</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(data.summary.totalCommitted)}</div>
            <p className="text-xs text-muted-foreground">Pendiente de recepción/aprobación</p>
          </CardContent>
        </Card>
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">📊 Total Proyectado</CardTitle>
            <Receipt className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(data.summary.totalProjected)}</div>
            {budgetPercentage !== null && (
              <p className={`text-xs ${budgetPercentage > 100 ? "text-red-500 font-semibold" : budgetPercentage > 80 ? "text-orange-500" : "text-muted-foreground"}`}>
                {budgetPercentage.toFixed(1)}% del presupuesto ({formatCurrency(data.project.budget!)})
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs de contenido */}
      <Tabs defaultValue="materials" className="space-y-4">
        <TabsList>
          <TabsTrigger value="materials" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Materiales ({data.materials.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pendiente ({data.pendingOrders?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="travel" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Viajes ({data.travelReports?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="top-amount" className="flex items-center gap-2">
            <Euro className="h-4 w-4" />
            Top por €
          </TabsTrigger>
          <TabsTrigger value="top-quantity" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Top por Uds.
          </TabsTrigger>
          <TabsTrigger value="evolution" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Evolución
          </TabsTrigger>
        </TabsList>

        {/* Tab: Materiales */}
        <TabsContent value="materials">
          <Card>
            <CardHeader>
              <CardTitle>Materiales Consumidos</CardTitle>
              <CardDescription>
                Detalle de todos los materiales adquiridos para este proyecto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o SKU..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSort("name")}
                      >
                        Artículo {getSortIcon("name")}
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted"
                        onClick={() => handleSort("quantity")}
                      >
                        Cantidad {getSortIcon("quantity")}
                      </TableHead>
                      <TableHead className="text-center">Compras</TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted"
                        onClick={() => handleSort("amount")}
                      >
                        Importe Total {getSortIcon("amount")}
                      </TableHead>
                      <TableHead className="text-right">Precio Medio</TableHead>
                      <TableHead className="text-center">Mín / Máx</TableHead>
                      <TableHead>Última Compra</TableHead>
                      <TableHead className="text-center">Proveedores</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaterials.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No se encontraron materiales
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMaterials.map((material) => (
                        <TableRow key={material.itemId}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{material.itemName}</p>
                              <p className="text-xs text-muted-foreground font-mono">{material.itemSku}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {material.totalQuantity.toLocaleString("es-ES")}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{material.transactionCount}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {formatCurrency(material.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(material.avgPrice)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1 text-xs">
                              <span className="text-green-600">{formatCurrency(material.minPrice)}</span>
                              <span>/</span>
                              <span className="text-red-600">{formatCurrency(material.maxPrice)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{formatDate(material.lastPurchase.date)}</p>
                              <p className="text-xs text-muted-foreground">
                                {material.lastPurchase.supplier} - {formatCurrency(material.lastPurchase.price)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{material.supplierCount}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Top por € */}
        <TabsContent value="top-amount">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-red-500" />
                Top 10 Materiales por Importe
              </CardTitle>
              <CardDescription>
                Los materiales que más impacto económico tienen en el proyecto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.topByAmount.map((material, index) => {
                  const percentage = (material.totalAmount / data.summary.totalSpent) * 100;
                  return (
                    <div key={material.itemId} className="flex items-center gap-4">
                      <div className="w-8 text-center font-bold text-lg text-muted-foreground">
                        #{index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className="font-medium">{material.itemName}</span>
                            <span className="text-xs text-muted-foreground ml-2">{material.itemSku}</span>
                          </div>
                          <span className="font-mono font-bold">{formatCurrency(material.totalAmount)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-red-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                          <span>{percentage.toFixed(1)}% del total</span>
                          <span>{material.totalQuantity.toLocaleString("es-ES")} uds.</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Top por Unidades */}
        <TabsContent value="top-quantity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-blue-500" />
                Top 10 Materiales por Cantidad
              </CardTitle>
              <CardDescription>
                Los materiales que más se "mueven" en el proyecto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.topByQuantity.map((material, index) => {
                  const maxQty = data.topByQuantity[0]?.totalQuantity || 1;
                  const percentage = (material.totalQuantity / maxQty) * 100;
                  return (
                    <div key={material.itemId} className="flex items-center gap-4">
                      <div className="w-8 text-center font-bold text-lg text-muted-foreground">
                        #{index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className="font-medium">{material.itemName}</span>
                            <span className="text-xs text-muted-foreground ml-2">{material.itemSku}</span>
                          </div>
                          <span className="font-mono font-bold">
                            {material.totalQuantity.toLocaleString("es-ES")} uds.
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                          <span>{material.transactionCount} compras</span>
                          <span>{formatCurrency(material.totalAmount)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Evolución */}
        <TabsContent value="evolution">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-500" />
                Evolución Mensual del Gasto
              </CardTitle>
              <CardDescription>
                Cómo ha evolucionado el gasto en el proyecto mes a mes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.monthlyEvolution.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay datos de evolución disponibles
                </div>
              ) : (
                <div className="space-y-3">
                  {data.monthlyEvolution.map((month) => {
                    const maxAmount = Math.max(...data.monthlyEvolution.map(m => m.amount));
                    const percentage = maxAmount > 0 ? (month.amount / maxAmount) * 100 : 0;
                    const [year, monthNum] = month.month.split("-");
                    const monthName = format(new Date(parseInt(year), parseInt(monthNum) - 1), "MMMM yyyy", { locale: es });
                    
                    return (
                      <div key={month.month} className="flex items-center gap-4">
                        <div className="w-32 text-sm font-medium capitalize">
                          {monthName}
                        </div>
                        <div className="flex-1">
                          <div className="h-6 bg-muted rounded overflow-hidden">
                            <div 
                              className="h-full bg-green-500 rounded flex items-center justify-end pr-2"
                              style={{ width: `${Math.max(percentage, 5)}%` }}
                            >
                              {percentage > 30 && (
                                <span className="text-xs text-white font-medium">
                                  {formatCurrency(month.amount)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {percentage <= 30 && (
                          <div className="w-24 text-right font-mono text-sm">
                            {formatCurrency(month.amount)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Total acumulado:</span>
                      <span className="font-mono font-bold text-lg">
                        {formatCurrency(data.monthlyEvolution.reduce((sum, m) => sum + m.amount, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Pendiente de Recibir */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Órdenes Pendientes de Recibir
              </CardTitle>
              <CardDescription>
                Material comprometido (aprobado o enviado) aún no recibido en almacén
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!data.pendingOrders || data.pendingOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay órdenes pendientes de recibir para este proyecto</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº Orden</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-center">Items</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.pendingOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {order.orderNumber}
                          </TableCell>
                          <TableCell>
                            {order.date ? format(new Date(order.date), "dd/MM/yyyy", { locale: es }) : "-"}
                          </TableCell>
                          <TableCell>{order.supplier}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={order.status === "Enviada al Proveedor" ? "default" : "secondary"}
                              className={order.status === "Enviada al Proveedor" ? "bg-blue-500" : "bg-green-500"}
                            >
                              {order.status === "Enviada al Proveedor" ? "Enviada" : "Aprobada"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{order.itemCount}</TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {formatCurrency(order.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {data.pendingOrders.length} orden{data.pendingOrders.length !== 1 ? "es" : ""} pendiente{data.pendingOrders.length !== 1 ? "s" : ""}
                      </span>
                      <div className="text-right">
                        <span className="text-sm text-muted-foreground mr-2">Total comprometido:</span>
                        <span className="font-mono font-bold text-lg text-orange-600">
                          {formatCurrency(data.summary.materialsCommitted || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Viajes */}
        <TabsContent value="travel">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-blue-500" />
                Informes de Viaje
              </CardTitle>
              <CardDescription>
                Viajes y desplazamientos imputados al proyecto
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!data.travelReports || data.travelReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Car className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay informes de viaje para este proyecto</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Técnico</TableHead>
                        <TableHead>Fechas</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.travelReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium font-mono">
                            {report.codigo_informe}
                          </TableCell>
                          <TableCell>{report.tecnico_name}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {report.fecha_inicio ? format(new Date(report.fecha_inicio), "dd/MM/yy", { locale: es }) : "-"}
                              {report.fecha_fin && report.fecha_inicio !== report.fecha_fin && (
                                <> → {format(new Date(report.fecha_fin), "dd/MM/yy", { locale: es })}</>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={report.descripcion_viaje}>
                            {report.descripcion_viaje || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={report.estado === "Aprobado" ? "default" : "secondary"}
                              className={
                                report.estado === "Aprobado" 
                                  ? "bg-green-500" 
                                  : report.estado === "Rechazado"
                                  ? "bg-red-500"
                                  : "bg-yellow-500"
                              }
                            >
                              {report.estado === "Pendiente de Aprobación" ? "Pendiente" : report.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {formatCurrency(report.total_informe)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  <div className="pt-4 border-t grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Viajes aprobados:</span>
                      <span className="font-mono font-bold text-green-600">
                        {formatCurrency(data.summary.travelApproved)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Viajes pendientes:</span>
                      <span className="font-mono font-bold text-yellow-600">
                        {formatCurrency(data.summary.travelPending)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

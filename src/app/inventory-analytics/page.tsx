import { getAnalyticsInventoryItems, getAnalyticsSuppliers, getAnalyticsProjects, getGlobalDashboard } from "./actions";
import { InventoryAnalyticsClient } from "@/components/inventory-analytics/inventory-analytics-client";
import { BarChart3, TrendingUp, Package, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, subMonths, startOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

export default async function InventoryAnalyticsPage() {
  const defaultTo = format(new Date(), "yyyy-MM-dd");
  const defaultFrom = format(subMonths(startOfMonth(new Date()), 2), "yyyy-MM-dd");

  const [inventoryItems, suppliers, projects, globalData] = await Promise.all([
    getAnalyticsInventoryItems(),
    getAnalyticsSuppliers(),
    getAnalyticsProjects(),
    getGlobalDashboard({ from: defaultFrom, to: defaultTo }, "month"),
  ]);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase flex items-center gap-3">
            <BarChart3 className="h-8 w-8" />
            Análisis y Trazabilidad de Inventario
          </h1>
          <p className="text-muted-foreground mt-1">
            Analiza el gasto, precio medio ponderado, trazabilidad y tendencias de consumo de materiales.
          </p>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Gasto total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(globalData.totalSpent)}</p>
            <p className="text-xs text-muted-foreground mt-1">Últimos 3 meses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" /> Materiales activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{globalData.topMaterialsBySpend.length > 0 ? inventoryItems.length : 0}</p>
            <p className="text-xs text-muted-foreground mt-1">En el catálogo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Movimientos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{globalData.totalMovements}</p>
            <p className="text-xs text-muted-foreground mt-1">Últimos 3 meses</p>
          </CardContent>
        </Card>
        <Card className={globalData.priceAlerts.length > 0 ? "border-orange-200 bg-orange-50/40 dark:border-orange-900 dark:bg-orange-950/20" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium flex items-center gap-2 ${globalData.priceAlerts.length > 0 ? "text-orange-700 dark:text-orange-400" : "text-muted-foreground"}`}>
              <AlertTriangle className="h-4 w-4" /> Alertas de precio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{globalData.priceAlerts.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Subidas &gt;15%</p>
          </CardContent>
        </Card>
      </div>

      {/* Componente cliente principal */}
      <InventoryAnalyticsClient
        inventoryItems={inventoryItems}
        suppliers={suppliers}
        projects={projects}
        initialGlobalData={globalData}
        defaultDateRange={{ from: defaultFrom, to: defaultTo }}
      />
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { ItemSearch } from "./item-search";
import { PriceEvolutionChart } from "./price-evolution-chart";
import { PriceMetricsCards } from "./price-metrics-cards";
import { PriceHistoryTable } from "./price-history-table";
import { SupplierComparisonTable } from "./supplier-comparison-table";
import { 
  getItemPriceHistory, 
  getItemPricesBySupplier, 
  migrateExistingOrdersToHistory,
  getItemsBySupplier,
  getItemsByProject,
  type ItemWithHistory
} from "@/app/price-intelligence/actions";
import type { InventoryItem, InventoryHistoryEntry, PriceMetrics } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  TrendingUp, 
  History, 
  Users, 
  Database, 
  CheckCircle2,
  Building2,
  FolderKanban,
  Package,
  ArrowLeft,
  Euro,
  ShoppingCart
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface PriceIntelligenceClientProps {
  inventoryItems: InventoryItem[];
}

type SupplierComparison = {
  supplierId: string;
  supplierName: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  purchaseCount: number;
  lastPrice: number;
};

type SearchContext = {
  type: 'item' | 'supplier' | 'project';
  id: string;
  name: string;
};

export function PriceIntelligenceClient({ inventoryItems }: PriceIntelligenceClientProps) {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [history, setHistory] = useState<InventoryHistoryEntry[]>([]);
  const [metrics, setMetrics] = useState<PriceMetrics | null>(null);
  const [supplierComparison, setSupplierComparison] = useState<SupplierComparison[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);
  const { toast } = useToast();

  // Nuevo estado para búsqueda por proveedor/proyecto
  const [searchContext, setSearchContext] = useState<SearchContext | null>(null);
  const [contextItems, setContextItems] = useState<ItemWithHistory[]>([]);

  const handleMigration = async () => {
    setIsMigrating(true);
    try {
      const result = await migrateExistingOrdersToHistory();
      
      if (result.success) {
        toast({
          title: "Migración completada",
          description: result.message,
        });
        setMigrationDone(true);
      } else {
        toast({
          variant: "destructive",
          title: "Error en migración",
          description: result.message,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error inesperado durante la migración.",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleItemSelect = (item: InventoryItem) => {
    setSelectedItem(item);
    setSearchContext({ type: 'item', id: item.id, name: item.name });
    setContextItems([]);
    
    startTransition(async () => {
      // Obtener historial de precios
      const { history: priceHistory, metrics: priceMetrics } = await getItemPriceHistory(item.id);
      setHistory(priceHistory);
      setMetrics(priceMetrics);

      // Obtener comparación por proveedor
      const supplierData = await getItemPricesBySupplier(item.id);
      setSupplierComparison(supplierData);
    });
  };

  const handleSupplierSelect = (supplierId: string, supplierName: string) => {
    setSelectedItem(null);
    setSearchContext({ type: 'supplier', id: supplierId, name: supplierName });
    setHistory([]);
    setMetrics(null);
    setSupplierComparison([]);

    startTransition(async () => {
      const items = await getItemsBySupplier(supplierId, supplierName);
      setContextItems(items);
    });
  };

  const handleProjectSelect = (projectId: string, projectName: string) => {
    setSelectedItem(null);
    setSearchContext({ type: 'project', id: projectId, name: projectName });
    setHistory([]);
    setMetrics(null);
    setSupplierComparison([]);

    startTransition(async () => {
      const items = await getItemsByProject(projectId, projectName);
      setContextItems(items);
    });
  };

  const handleSelectItemFromContext = (item: ItemWithHistory) => {
    const inventoryItem = inventoryItems.find(i => i.id === item.id) || {
      id: item.id,
      sku: item.sku,
      name: item.name,
      unitCost: item.unitCost,
      unit: item.unit,
      type: item.type,
    } as InventoryItem;

    handleItemSelect(inventoryItem);
  };

  const handleClearContext = () => {
    setSelectedItem(null);
    setSearchContext(null);
    setContextItems([]);
    setHistory([]);
    setMetrics(null);
    setSupplierComparison([]);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Buscador */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Análisis de Precios
              </CardTitle>
              <CardDescription>
                Busca un artículo para ver su evolución de precios, métricas y comparativa entre proveedores.
              </CardDescription>
            </div>
            {/* Botón de migración */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant={migrationDone ? "outline" : "default"}
                  disabled={isMigrating}
                  className="gap-2"
                >
                  {isMigrating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Migrando...
                    </>
                  ) : migrationDone ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Migración Completada
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4" />
                      Importar Historial
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Importar Historial de Precios</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      <p>
                        Esta acción importará el historial de precios desde todas las órdenes de compra existentes 
                        con estado <strong>Recibida</strong>, <strong>Recibida Parcialmente</strong> o <strong>Enviada al Proveedor</strong>.
                      </p>
                      <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm">
                        <p className="font-semibold text-green-800 mb-1">✅ Proceso 100% Seguro</p>
                        <ul className="text-green-700 space-y-1 text-xs">
                          <li>• <strong>No modifica</strong> las órdenes de compra existentes</li>
                          <li>• <strong>No modifica</strong> el inventario, proveedores ni proyectos</li>
                          <li>• Solo <strong>lee</strong> de estas colecciones y <strong>escribe</strong> en una nueva colección independiente</li>
                          <li>• Los duplicados se ignoran automáticamente</li>
                        </ul>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Este proceso puede tardar unos segundos dependiendo del volumen de órdenes.
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleMigration}>
                    Iniciar Importación
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent>
          <ItemSearch 
            items={inventoryItems} 
            onItemSelect={handleItemSelect}
            onSupplierSelect={handleSupplierSelect}
            onProjectSelect={handleProjectSelect}
            selectedItemId={selectedItem?.id}
            selectedContext={searchContext || undefined}
          />
        </CardContent>
      </Card>

      {/* Loading state */}
      {isPending && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Cargando datos...</span>
        </div>
      )}

      {/* Resultados por Proveedor o Proyecto */}
      {!isPending && searchContext && (searchContext.type === 'supplier' || searchContext.type === 'project') && contextItems.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  searchContext.type === 'supplier' ? "bg-purple-100" : "bg-green-100"
                )}>
                  {searchContext.type === 'supplier' 
                    ? <Building2 className="h-5 w-5 text-purple-600" />
                    : <FolderKanban className="h-5 w-5 text-green-600" />
                  }
                </div>
                <div>
                  <CardTitle>
                    {searchContext.type === 'supplier' ? 'Artículos del Proveedor' : 'Artículos del Proyecto'}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{searchContext.name}</span>
                    <Badge variant="secondary">{contextItems.length} artículos</Badge>
                  </CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleClearContext}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Nueva búsqueda
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Resumen */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Artículos</p>
                <p className="text-2xl font-bold">{contextItems.length}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Compras</p>
                <p className="text-2xl font-bold">
                  {contextItems.reduce((a, b) => a + b.purchaseCount, 0)}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Gasto Total</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(contextItems.reduce((a, b) => a + b.totalSpent, 0))}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Precio Promedio</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    contextItems.reduce((a, b) => a + b.avgPrice, 0) / contextItems.length
                  )}
                </p>
              </div>
            </div>

            {/* Tabla de artículos */}
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artículo</TableHead>
                    <TableHead className="text-center">Compras</TableHead>
                    <TableHead className="text-right">Precio Prom.</TableHead>
                    <TableHead className="text-right">Último Precio</TableHead>
                    <TableHead className="text-right">Gasto Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contextItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-md">
                            <Package className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground font-mono">{item.sku}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="gap-1">
                          <ShoppingCart className="h-3 w-3" />
                          {item.purchaseCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.avgPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "font-medium",
                          item.lastPrice > item.avgPrice && "text-red-600",
                          item.lastPrice < item.avgPrice && "text-green-600"
                        )}>
                          {formatCurrency(item.lastPrice)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatCurrency(item.totalSpent)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSelectItemFromContext(item)}
                        >
                          <TrendingUp className="h-4 w-4 mr-1" />
                          Ver detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensaje cuando no hay artículos */}
      {!isPending && searchContext && (searchContext.type === 'supplier' || searchContext.type === 'project') && contextItems.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              {searchContext.type === 'supplier' 
                ? <Building2 className="h-8 w-8 text-muted-foreground" />
                : <FolderKanban className="h-8 w-8 text-muted-foreground" />
              }
            </div>
            <h3 className="text-lg font-semibold mb-2">Sin historial de compras</h3>
            <p className="text-muted-foreground max-w-md">
              No se encontraron compras registradas para <strong>{searchContext.name}</strong>.
              <br />
              Asegúrate de haber importado el historial usando el botón "Importar Historial".
            </p>
            <Button variant="outline" className="mt-4" onClick={handleClearContext}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Nueva búsqueda
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Resultados por Artículo */}
      {!isPending && selectedItem && searchContext?.type === 'item' && (
        <>
          {/* Métricas */}
          <PriceMetricsCards metrics={metrics} />

          {/* Tabs para gráfico, historial y proveedores */}
          <Tabs defaultValue="chart" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="chart" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Gráfico
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Historial
              </TabsTrigger>
              <TabsTrigger value="suppliers" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Proveedores
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chart">
              <PriceEvolutionChart 
                history={history} 
                metrics={metrics}
                itemName={selectedItem.name}
              />
            </TabsContent>

            <TabsContent value="history">
              <PriceHistoryTable 
                history={history}
                avgPrice={metrics?.avgPrice}
              />
            </TabsContent>

            <TabsContent value="suppliers">
              <SupplierComparisonTable 
                data={supplierComparison}
                avgPrice={metrics?.avgPrice}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Estado vacío */}
      {!isPending && !searchContext && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Selecciona un artículo, proveedor o proyecto</h3>
            <p className="text-muted-foreground max-w-md">
              Utiliza el buscador para encontrar:
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                <Package className="h-3 w-3" />
                Artículos por nombre o SKU
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1">
                <Building2 className="h-3 w-3" />
                Proveedores
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                <FolderKanban className="h-3 w-3" />
                Proyectos
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { getInventoryItems, getTopPriceVariations } from "./actions";
import { PriceIntelligenceClient } from "@/components/price-intelligence";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertTriangle, Package } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PriceIntelligencePage() {
  // Cargar datos iniciales en el servidor
  const [inventoryItems, topVariations] = await Promise.all([
    getInventoryItems(),
    getTopPriceVariations(5),
  ]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase flex items-center gap-3">
            <TrendingUp className="h-8 w-8" />
            Inteligencia de Precios
          </h1>
          <p className="text-muted-foreground">
            Analiza la evolución de precios, identifica tendencias y compara proveedores para optimizar tus compras.
          </p>
        </div>
      </div>

      {/* Alertas de variación de precios */}
      {topVariations.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <AlertTriangle className="h-5 w-5" />
              Artículos con Mayor Variación de Precio
            </CardTitle>
            <CardDescription>
              Estos artículos han mostrado la mayor variabilidad en precios. Revísalos para negociar mejores condiciones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              {topVariations.map((item) => (
                <div 
                  key={item.itemId}
                  className="p-3 bg-background rounded-lg border border-orange-200 dark:border-orange-900 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-1.5 bg-orange-100 dark:bg-orange-900/50 rounded">
                      <Package className="h-4 w-4 text-orange-600" />
                    </div>
                    <Badge variant="outline" className="text-orange-700 border-orange-300">
                      {item.priceVariation.toFixed(0)}% var.
                    </Badge>
                  </div>
                  <p className="font-medium text-sm truncate" title={item.itemName}>
                    {item.itemName}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono mb-2">
                    {item.itemSku}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {item.purchaseCount} compras
                    </span>
                    <span className="font-medium">
                      {formatCurrency(item.avgPrice)} prom.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Componente cliente principal */}
      <PriceIntelligenceClient inventoryItems={inventoryItems} />
    </div>
  );
}

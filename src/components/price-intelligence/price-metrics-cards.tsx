"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, DollarSign, ShoppingCart, Package, Percent, Calendar, Activity } from "lucide-react";
import type { PriceMetrics } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface PriceMetricsCardsProps {
  metrics: PriceMetrics | null;
}

export function PriceMetricsCards({ metrics }: PriceMetricsCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  if (!metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-4 w-4 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-muted rounded mb-1" />
              <div className="h-3 w-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Precio Mínimo",
      value: formatCurrency(metrics.minPrice),
      description: "Mejor precio conseguido",
      icon: TrendingDown,
      iconColor: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/30",
    },
    {
      title: "Precio Máximo",
      value: formatCurrency(metrics.maxPrice),
      description: "Precio más alto pagado",
      icon: TrendingUp,
      iconColor: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950/30",
    },
    {
      title: "Precio Promedio",
      value: formatCurrency(metrics.avgPrice),
      description: `Basado en ${metrics.totalPurchases} compras`,
      icon: DollarSign,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: "Variación de Precio",
      value: `${metrics.priceVariation.toFixed(1)}%`,
      description: metrics.priceVariation > 20 
        ? "⚠️ Alta variabilidad" 
        : metrics.priceVariation > 10 
          ? "Variabilidad moderada" 
          : "Precio estable",
      icon: Percent,
      iconColor: metrics.priceVariation > 20 
        ? "text-orange-600" 
        : metrics.priceVariation > 10 
          ? "text-yellow-600" 
          : "text-green-600",
      bgColor: metrics.priceVariation > 20 
        ? "bg-orange-50 dark:bg-orange-950/30" 
        : metrics.priceVariation > 10 
          ? "bg-yellow-50 dark:bg-yellow-950/30" 
          : "bg-green-50 dark:bg-green-950/30",
    },
  ];

  const additionalCards = [
    {
      title: "Total Compras",
      value: metrics.totalPurchases.toString(),
      description: "Número de transacciones",
      icon: ShoppingCart,
      iconColor: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
    },
    {
      title: "Cantidad Total",
      value: metrics.totalQuantity.toLocaleString('es-ES'),
      description: "Unidades adquiridas",
      icon: Package,
      iconColor: "text-indigo-600",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
    },
    {
      title: "Gasto Total",
      value: formatCurrency(metrics.totalSpent),
      description: "Inversión acumulada",
      icon: Activity,
      iconColor: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      title: "Último Precio",
      value: formatCurrency(metrics.lastPrice),
      description: format(new Date(metrics.lastPurchaseDate), "d MMM yyyy", { locale: es }),
      icon: Calendar,
      iconColor: "text-cyan-600",
      bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className={cn("transition-all hover:shadow-md", card.bgColor)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={cn("h-4 w-4", card.iconColor)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Métricas secundarias */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {additionalCards.map((card) => (
          <Card key={card.title} className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={cn("p-2 rounded-full", card.bgColor)}>
                <card.icon className={cn("h-4 w-4", card.iconColor)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

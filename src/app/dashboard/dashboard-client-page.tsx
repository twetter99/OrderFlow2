"use client";

import { useMemo } from 'react';
import { StatsCard } from "@/components/dashboard/stats-card";
import { ActiveProjectsList } from "@/components/dashboard/active-projects-list";
import { RecentOrdersTable } from "@/components/dashboard/recent-orders-table";
import { Package, FolderKanban, AlertTriangle, BadgeEuro } from 'lucide-react';
import type { Project, PurchaseOrder, InventoryItem, InventoryLocation } from '@/lib/types';

interface DashboardClientPageProps {
  initialProjects: Project[];
  initialPurchaseOrders: PurchaseOrder[];
  initialInventory: InventoryItem[];
  initialInventoryLocations: InventoryLocation[];
}

export function DashboardClientPage({
  initialProjects,
  initialPurchaseOrders,
  initialInventory,
  initialInventoryLocations,
}: DashboardClientPageProps) {
  const stats = useMemo(() => {
    const totalInventoryValue = initialInventory.reduce((acc, item) => {
      if (item.type === 'service') return acc;
      const totalStock = initialInventoryLocations
        .filter(loc => loc.itemId === item.id)
        .reduce((sum, loc) => sum + loc.quantity, 0);
      return acc + (totalStock * (item.unitCost || 0));
    }, 0);

    const activeProjectsCount = initialProjects.filter(p => p.status === 'En Progreso').length;

    const lowStockCount = initialInventory.filter(item => {
      if (item.type !== 'simple') return false;
      const totalStock = initialInventoryLocations
        .filter(loc => loc.itemId === item.id)
        .reduce((sum, loc) => sum + loc.quantity, 0);
      return totalStock < (item.minThreshold || 0);
    }).length;

    const pendingValue = initialPurchaseOrders
      .filter(p => p.status === 'Pendiente de Aprobación')
      .reduce((acc, p) => acc + p.total, 0);

    return {
      inventoryValue: totalInventoryValue,
      activeProjects: activeProjectsCount,
      lowStockAlerts: lowStockCount,
      pendingPOsValue: pendingValue,
    };
  }, [initialProjects, initialPurchaseOrders, initialInventory, initialInventoryLocations]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase">Panel de Control</h1>
          <p className="text-muted-foreground">
            Una vista general de las operaciones de tu empresa.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Valor del Inventario"
          value={formatCurrency(stats.inventoryValue)}
          icon={Package}
          description="Valor total de todos los artículos en stock"
        />
        <StatsCard
          title="Proyectos Activos"
          value={String(stats.activeProjects)}
          icon={FolderKanban}
          description="Proyectos actualmente en estado 'En Progreso'"
        />
        <StatsCard
          title="Alertas de Stock Bajo"
          value={String(stats.lowStockAlerts)}
          icon={AlertTriangle}
          isAlert={stats.lowStockAlerts > 0}
          description="Artículos por debajo del umbral mínimo"
        />
        <StatsCard
          title="Pedidos Pendientes de Aprobación"
          value={formatCurrency(stats.pendingPOsValue)}
          icon={BadgeEuro}
          description="Valor total de las órdenes de compra pendientes"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <ActiveProjectsList projects={initialProjects} />
        <RecentOrdersTable purchaseOrders={initialPurchaseOrders} />
      </div>
    </div>
  );
}

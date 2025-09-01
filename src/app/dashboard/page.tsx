
"use client";

import { useMemo, useState, useEffect } from 'react';
import { StatsCard } from "@/components/dashboard/stats-card";
import { ActiveProjectsList } from "@/components/dashboard/active-projects-list";
import { RecentOrdersTable } from "@/components/dashboard/recent-orders-table";
import { Package, FolderKanban, AlertTriangle, BadgeDollarSign, Loader2 } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Project, PurchaseOrder, InventoryItem, InventoryLocation } from '@/lib/types';
import { useAuth } from '@/context/auth-context';

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<Project[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [inventoryLocations, setInventoryLocations] = useState<InventoryLocation[]>([]);

    useEffect(() => {
        if (!user || authLoading) {
          if (!authLoading) setLoading(false);
          return;
        };

        const unsubs: (() => void)[] = [];
        unsubs.push(onSnapshot(collection(db, "projects"), (snap) => setProjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)))));
        unsubs.push(onSnapshot(collection(db, "purchaseOrders"), (snap) => setPurchaseOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder)))));
        unsubs.push(onSnapshot(collection(db, "inventory"), (snap) => setInventory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)))));
        unsubs.push(onSnapshot(collection(db, "inventoryLocations"), (snap) => {
            setInventoryLocations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryLocation)));
            setLoading(false);
        }));

        return () => unsubs.forEach(unsub => unsub());

    }, [user, authLoading]);

    const stats = useMemo(() => {
        if (loading) return {
            inventoryValue: 0,
            activeProjects: 0,
            lowStockAlerts: 0,
            pendingPOsValue: 0,
        };

        const totalInventoryValue = inventory.reduce((acc, item) => {
            if (item.type === 'service') return acc;
            const totalStock = inventoryLocations
                .filter(loc => loc.itemId === item.id)
                .reduce((sum, loc) => sum + loc.quantity, 0);
            return acc + (totalStock * (item.unitCost || 0));
        }, 0);

        const activeProjectsCount = projects.filter(p => p.status === 'En Progreso').length;
        
        const lowStockCount = inventory.filter(item => {
             if (item.type !== 'simple') return false;
             const totalStock = inventoryLocations
                .filter(loc => loc.itemId === item.id)
                .reduce((sum, loc) => sum + loc.quantity, 0);
            return totalStock < (item.minThreshold || 0);
        }).length;

        const pendingValue = purchaseOrders
            .filter(p => p.status === 'Pendiente de Aprobación')
            .reduce((acc, p) => acc + p.total, 0);

        return {
            inventoryValue: totalInventoryValue,
            activeProjects: activeProjectsCount,
            lowStockAlerts: lowStockCount,
            pendingPOsValue: pendingValue,
        };
    }, [projects, purchaseOrders, inventory, inventoryLocations, loading]);

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

    if (loading || authLoading) {
        return (
            <div className="flex h-[80vh] w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

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
                    icon={BadgeDollarSign}
                    description="Valor total de las órdenes de compra pendientes"
                />
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                <ActiveProjectsList projects={projects} />
                <RecentOrdersTable purchaseOrders={purchaseOrders} />
            </div>
        </div>
    )
}

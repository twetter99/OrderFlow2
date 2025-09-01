
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectCostReport } from "@/components/reports/project-cost-report";
import { InventoryAnalysisReport } from "@/components/reports/inventory-analysis-report";
import { SupplierPerformanceReport } from "@/components/reports/supplier-performance-report";
import { PurchaseOrderHistoryReport } from "@/components/reports/purchase-order-history-report";

export default function ReportsPage() {
    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <div>
                <h1 className="text-3xl font-bold font-headline uppercase">Reportes</h1>
                <p className="text-muted-foreground">
                    Analiza los datos clave de tu operación.
                </p>
                </div>
            </div>

            <Tabs defaultValue="project_costs" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="project_costs">Costos de Proyectos</TabsTrigger>
                    <TabsTrigger value="inventory_analysis">Análisis de Inventario</TabsTrigger>
                    <TabsTrigger value="supplier_performance">Rendimiento de Proveedores</TabsTrigger>
                    <TabsTrigger value="po_history">Historial de Compras</TabsTrigger>
                </TabsList>
                <TabsContent value="project_costs" className="mt-4">
                    <ProjectCostReport />
                </TabsContent>
                <TabsContent value="inventory_analysis" className="mt-4">
                    <InventoryAnalysisReport />
                </TabsContent>
                <TabsContent value="supplier_performance" className="mt-4">
                    <SupplierPerformanceReport />
                </TabsContent>
                <TabsContent value="po_history" className="mt-4">
                    <PurchaseOrderHistoryReport />
                </TabsContent>
            </Tabs>
        </div>
    );
}

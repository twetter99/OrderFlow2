"use client";

import { useState, useTransition } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, List, Search, LayoutDashboard } from "lucide-react";
import type { InventoryItem, Supplier, Project, GlobalDashboardData, AnalyticsDateRange } from "@/lib/types";
import type { MaterialAnalysisFilters, TraceabilityFilters, GroupBy } from "@/app/inventory-analytics/actions";
import {
  getMaterialAnalysis,
  getMaterialTraceability,
  getMaterialDashboard,
  getGlobalDashboard,
  exportTraceabilityToExcel,
} from "@/app/inventory-analytics/actions";
import { DateRangeFilter } from "./date-range-filter";
import { MaterialAnalysisTable } from "./material-analysis-table";
import { MaterialTraceabilityTable } from "./material-traceability-table";
import { MaterialDashboardView } from "./material-dashboard";
import { GlobalDashboardView } from "./global-dashboard";
import { useToast } from "@/hooks/use-toast";
import type { MaterialDashboardData, TraceabilityMovement, MaterialAnalysis } from "@/lib/types";

interface Props {
  inventoryItems: InventoryItem[];
  suppliers: Supplier[];
  projects: Project[];
  initialGlobalData: GlobalDashboardData;
  defaultDateRange: AnalyticsDateRange;
}

export function InventoryAnalyticsClient({ inventoryItems, suppliers, projects, initialGlobalData, defaultDateRange }: Props) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("analysis");

  // Date range shared
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>(defaultDateRange);
  const [groupBy, setGroupBy] = useState<GroupBy>("month");

  // Analysis tab state
  const [analysisData, setAnalysisData] = useState<MaterialAnalysis[]>([]);
  const [analysisLoaded, setAnalysisLoaded] = useState(false);

  // Traceability tab state
  const [traceData, setTraceData] = useState<TraceabilityMovement[]>([]);
  const [traceLoaded, setTraceLoaded] = useState(false);
  const [traceItemId, setTraceItemId] = useState<string>("");
  const [traceSupplierIds, setTraceSupplierIds] = useState<string[]>([]);
  const [traceProjectIds, setTraceProjectIds] = useState<string[]>([]);

  // Material dashboard state
  const [matDashboardItemId, setMatDashboardItemId] = useState<string>("");
  const [matDashboardData, setMatDashboardData] = useState<MaterialDashboardData | null>(null);
  const [matDashboardLoaded, setMatDashboardLoaded] = useState(false);

  // Global dashboard state
  const [globalData, setGlobalData] = useState<GlobalDashboardData>(initialGlobalData);
  const [globalLoaded, setGlobalLoaded] = useState(true);

  // ─── Loaders ─────────────────────────────────────────────────────────────

  const loadAnalysis = (filters?: Partial<MaterialAnalysisFilters>) => {
    startTransition(async () => {
      const data = await getMaterialAnalysis({ dateRange, ...filters });
      setAnalysisData(data);
      setAnalysisLoaded(true);
    });
  };

  const loadTraceability = (filters?: Partial<TraceabilityFilters>) => {
    startTransition(async () => {
      const data = await getMaterialTraceability({
        dateRange,
        itemId: traceItemId || undefined,
        supplierIds: traceSupplierIds.length ? traceSupplierIds : undefined,
        projectIds: traceProjectIds.length ? traceProjectIds : undefined,
        ...filters,
      });
      setTraceData(data);
      setTraceLoaded(true);
    });
  };

  const loadMaterialDashboard = (itemId: string) => {
    if (!itemId) return;
    setMatDashboardItemId(itemId);
    startTransition(async () => {
      const data = await getMaterialDashboard(itemId, dateRange, groupBy);
      setMatDashboardData(data);
      setMatDashboardLoaded(true);
    });
  };

  const loadGlobalDashboard = () => {
    startTransition(async () => {
      const data = await getGlobalDashboard(dateRange, groupBy);
      setGlobalData(data);
      setGlobalLoaded(true);
    });
  };

  const handleExport = async () => {
    try {
      const result = await exportTraceabilityToExcel({
        dateRange,
        itemId: traceItemId || undefined,
        supplierIds: traceSupplierIds.length ? traceSupplierIds : undefined,
        projectIds: traceProjectIds.length ? traceProjectIds : undefined,
      });
      // Trigger download
      const link = document.createElement("a");
      link.href = `data:text/csv;base64,${result.base64}`;
      link.download = result.filename;
      link.click();
      toast({ title: "Exportación completada", description: result.filename });
    } catch {
      toast({ title: "Error al exportar", variant: "destructive" });
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "analysis" && !analysisLoaded) loadAnalysis();
    if (tab === "traceability" && !traceLoaded) loadTraceability();
    if (tab === "global" && !globalLoaded) loadGlobalDashboard();
  };

  return (
    <Tabs defaultValue="analysis" onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="analysis" className="gap-2">
          <BarChart3 className="h-4 w-4" /> Análisis
        </TabsTrigger>
        <TabsTrigger value="traceability" className="gap-2">
          <List className="h-4 w-4" /> Trazabilidad
        </TabsTrigger>
        <TabsTrigger value="material-dashboard" className="gap-2">
          <Search className="h-4 w-4" /> Por Material
        </TabsTrigger>
        <TabsTrigger value="global" className="gap-2">
          <LayoutDashboard className="h-4 w-4" /> Dashboard Global
        </TabsTrigger>
      </TabsList>

      {/* A) Análisis por material */}
      <TabsContent value="analysis" className="mt-6">
        <MaterialAnalysisTable
          items={inventoryItems}
          suppliers={suppliers}
          projects={projects}
          data={analysisData}
          isLoading={isPending}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onSearch={loadAnalysis}
          onViewTraceability={(itemId) => {
            setTraceItemId(itemId);
            setActiveTab("traceability");
            loadTraceability({ itemId });
          }}
          onViewDashboard={(itemId) => {
            setActiveTab("material-dashboard");
            loadMaterialDashboard(itemId);
          }}
        />
      </TabsContent>

      {/* B) Trazabilidad */}
      <TabsContent value="traceability" className="mt-6">
        <MaterialTraceabilityTable
          items={inventoryItems}
          suppliers={suppliers}
          projects={projects}
          data={traceData}
          isLoading={isPending}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          selectedItemId={traceItemId}
          onItemChange={setTraceItemId}
          selectedSupplierIds={traceSupplierIds}
          onSupplierChange={setTraceSupplierIds}
          selectedProjectIds={traceProjectIds}
          onProjectChange={setTraceProjectIds}
          onSearch={() => loadTraceability()}
          onExport={handleExport}
        />
      </TabsContent>

      {/* C1) Dashboard por material */}
      <TabsContent value="material-dashboard" className="mt-6">
        <MaterialDashboardView
          items={inventoryItems}
          data={matDashboardData}
          isLoading={isPending}
          selectedItemId={matDashboardItemId}
          dateRange={dateRange}
          groupBy={groupBy}
          onDateRangeChange={(range) => { setDateRange(range); if (matDashboardItemId) loadMaterialDashboard(matDashboardItemId); }}
          onGroupByChange={(g) => { setGroupBy(g); if (matDashboardItemId) loadMaterialDashboard(matDashboardItemId); }}
          onItemChange={loadMaterialDashboard}
        />
      </TabsContent>

      {/* C2) Dashboard global */}
      <TabsContent value="global" className="mt-6">
        <GlobalDashboardView
          data={globalData}
          isLoading={isPending}
          dateRange={dateRange}
          groupBy={groupBy}
          onDateRangeChange={(range) => { setDateRange(range); loadGlobalDashboard(); }}
          onGroupByChange={(g) => { setGroupBy(g); loadGlobalDashboard(); }}
          onRefresh={loadGlobalDashboard}
          onViewMaterial={(itemId) => {
            setActiveTab("material-dashboard");
            loadMaterialDashboard(itemId);
          }}
        />
      </TabsContent>
    </Tabs>
  );
}

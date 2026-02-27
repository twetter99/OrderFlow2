"use server";

import { db } from "@/lib/firebase-admin";
import type {
  InventoryHistoryEntry,
  InventoryItem,
  Supplier,
  Project,
  MaterialAnalysis,
  TraceabilityMovement,
  AnalyticsDateRange,
  SupplierSummary,
  ProjectSummary,
  MaterialDashboardData,
  GlobalDashboardData,
  TimeSeriesPoint,
  InventoryMovementType,
} from "@/lib/types";
import { format, subDays, startOfWeek, startOfMonth, parseISO, isWithinInterval, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
import { sanitizeForClient } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

const PRICE_ALERT_THRESHOLD = 0.15; // 15% de subida dispara alerta
const CONSUMPTION_ANOMALY_SIGMA = 2; // desviación estándar para alerta de consumo

function toDate(value: unknown): Date {
  if (!value) return new Date(0);
  if (value && typeof (value as any).toDate === "function") return (value as any).toDate();
  if (typeof value === "string") return parseISO(value);
  return new Date(value as number);
}

function toIso(value: unknown): string {
  return toDate(value).toISOString();
}

function isInRange(dateValue: unknown, from: Date, to: Date): boolean {
  const d = toDate(dateValue);
  return isWithinInterval(d, { start: from, end: to });
}

function safeEntry(doc: FirebaseFirestore.DocumentSnapshot): InventoryHistoryEntry {
  const data = doc.data()!;
  return {
    id: doc.id,
    itemId: data.itemId ?? "",
    itemSku: data.itemSku ?? "",
    itemName: data.itemName ?? "",
    supplierId: data.supplierId ?? "",
    supplierName: data.supplierName ?? "",
    purchaseOrderId: data.purchaseOrderId ?? "",
    orderNumber: data.orderNumber ?? "",
    quantity: Number(data.quantity ?? 0),
    unitPrice: Number(data.unitPrice ?? data.unitCost ?? 0),
    unitCost: Number(data.unitCost ?? data.unitPrice ?? 0),
    totalPrice: Number(data.totalPrice ?? 0),
    unit: data.unit ?? "",
    date: data.date,
    projectId: data.projectId,
    projectName: data.projectName,
    locationId: data.locationId,
    type: (data.type as InventoryMovementType) ?? "reception",
    userId: data.userId,
    userName: data.userName,
    notes: data.notes,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// CARGA BASE DE DATOS
// ──────────────────────────────────────────────────────────────────────────────

export async function getAnalyticsInventoryItems(): Promise<InventoryItem[]> {
  const snap = await db.collection("inventory").get();
  return snap.docs.map((d) => sanitizeForClient({ id: d.id, ...d.data() }) as InventoryItem);
}

export async function getAnalyticsSuppliers(): Promise<Supplier[]> {
  const snap = await db.collection("suppliers").get();
  return snap.docs.map((d) => sanitizeForClient({ id: d.id, ...d.data() }) as Supplier);
}

export async function getAnalyticsProjects(): Promise<Project[]> {
  const snap = await db.collection("projects").get();
  return snap.docs.map((d) => sanitizeForClient({ id: d.id, ...d.data() }) as Project);
}

// ──────────────────────────────────────────────────────────────────────────────
// A) ANÁLISIS POR MATERIAL
// ──────────────────────────────────────────────────────────────────────────────

export type MaterialAnalysisFilters = {
  dateRange: AnalyticsDateRange;
  itemIds?: string[];
  supplierIds?: string[];
  projectIds?: string[];
  families?: string[];
};

export async function getMaterialAnalysis(
  filters: MaterialAnalysisFilters
): Promise<MaterialAnalysis[]> {
  const { dateRange, itemIds, supplierIds, projectIds } = filters;
  const from = parseISO(dateRange.from);
  const to = new Date(parseISO(dateRange.to));
  to.setHours(23, 59, 59, 999);

  const snap = await db.collection("inventory_history").get();
  const inventorySnap = await db.collection("inventory").get();

  const inventoryMap = new Map<string, InventoryItem>();
  inventorySnap.docs.forEach((d) => inventoryMap.set(d.id, { id: d.id, ...d.data() } as InventoryItem));

  // Filtrar entradas en rango
  const entries = snap.docs
    .map(safeEntry)
    .filter((e) => isInRange(e.date, from, to))
    .filter((e) => !itemIds?.length || itemIds.includes(e.itemId))
    .filter((e) => !supplierIds?.length || supplierIds.includes(e.supplierId))
    .filter((e) => !projectIds?.length || (e.projectId && projectIds.includes(e.projectId)));

  // Agrupar por itemId
  const byItem = new Map<string, InventoryHistoryEntry[]>();
  for (const entry of entries) {
    if (!byItem.has(entry.itemId)) byItem.set(entry.itemId, []);
    byItem.get(entry.itemId)!.push(entry);
  }

  const result: MaterialAnalysis[] = [];

  for (const [itemId, movements] of byItem) {
    const item = inventoryMap.get(itemId);
    if (!item) continue;

    const receptions = movements.filter((m) => !m.type || m.type === "reception");
    const consumptions = movements.filter((m) => m.type === "consumption");

    const totalPurchased = receptions.reduce((s, m) => s + Math.abs(m.quantity), 0);
    const totalConsumed = consumptions.reduce((s, m) => s + Math.abs(m.quantity), 0);

    // Precio medio ponderado (solo recepciones)
    const totalSpent = receptions.reduce((s, m) => s + (Math.abs(m.quantity) * m.unitPrice), 0);
    const weightedAvgPrice = totalPurchased > 0 ? totalSpent / totalPurchased : 0;

    const prices = receptions.map((m) => m.unitPrice).filter((p) => p > 0);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;

    // Última compra
    const sorted = [...receptions].sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime());
    const lastPrice = sorted[0]?.unitPrice ?? 0;
    const lastPurchaseDate = sorted[0] ? toIso(sorted[0].date) : "";

    // Top proveedores por gasto
    const supplierMap = new Map<string, SupplierSummary>();
    for (const m of receptions) {
      if (!m.supplierId) continue;
      const existing = supplierMap.get(m.supplierId) ?? {
        supplierId: m.supplierId,
        supplierName: m.supplierName,
        totalSpent: 0,
        totalQuantity: 0,
        purchaseCount: 0,
        avgPrice: 0,
      };
      existing.totalSpent += Math.abs(m.quantity) * m.unitPrice;
      existing.totalQuantity += Math.abs(m.quantity);
      existing.purchaseCount += 1;
      supplierMap.set(m.supplierId, existing);
    }
    const topSuppliers = [...supplierMap.values()]
      .map((s) => ({ ...s, avgPrice: s.totalQuantity > 0 ? s.totalSpent / s.totalQuantity : 0 }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // Top proyectos por gasto
    const projectMap = new Map<string, ProjectSummary>();
    for (const m of receptions) {
      if (!m.projectId) continue;
      const existing = projectMap.get(m.projectId) ?? {
        projectId: m.projectId,
        projectName: m.projectName ?? m.projectId,
        totalSpent: 0,
        totalQuantity: 0,
        receptionCount: 0,
      };
      existing.totalSpent += Math.abs(m.quantity) * m.unitPrice;
      existing.totalQuantity += Math.abs(m.quantity);
      existing.receptionCount += 1;
      projectMap.set(m.projectId, existing);
    }
    const topProjects = [...projectMap.values()]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    result.push({
      itemId,
      itemSku: item.sku ?? "",
      itemName: item.name,
      family: (item as any).family,
      unit: item.unit ?? movements[0]?.unit ?? "",
      totalPurchased,
      totalConsumed,
      totalSpent,
      weightedAvgPrice,
      minPrice,
      maxPrice,
      lastPrice,
      lastPurchaseDate,
      topSuppliers,
      topProjects,
      movementCount: movements.length,
    });
  }

  return result.sort((a, b) => b.totalSpent - a.totalSpent);
}

// ──────────────────────────────────────────────────────────────────────────────
// B) TRAZABILIDAD POR MATERIAL
// ──────────────────────────────────────────────────────────────────────────────

export type TraceabilityFilters = {
  dateRange: AnalyticsDateRange;
  itemId?: string;
  supplierIds?: string[];
  projectIds?: string[];
  types?: InventoryMovementType[];
};

export async function getMaterialTraceability(
  filters: TraceabilityFilters
): Promise<TraceabilityMovement[]> {
  const { dateRange, itemId, supplierIds, projectIds, types } = filters;
  const from = parseISO(dateRange.from);
  const to = new Date(parseISO(dateRange.to));
  to.setHours(23, 59, 59, 999);

  const snap = await db.collection("inventory_history").get();

  const entries = snap.docs
    .map(safeEntry)
    .filter((e) => isInRange(e.date, from, to))
    .filter((e) => !itemId || e.itemId === itemId)
    .filter((e) => !supplierIds?.length || supplierIds.includes(e.supplierId))
    .filter((e) => !projectIds?.length || (e.projectId && projectIds.includes(e.projectId)))
    .filter((e) => !types?.length || types.includes(e.type ?? "reception"));

  return entries
    .map((e) => ({
      id: e.id,
      date: toIso(e.date),
      type: e.type ?? "reception",
      itemId: e.itemId,
      itemSku: e.itemSku,
      itemName: e.itemName,
      supplierId: e.supplierId,
      supplierName: e.supplierName,
      projectId: e.projectId,
      projectName: e.projectName,
      locationId: e.locationId,
      orderNumber: e.orderNumber,
      purchaseOrderId: e.purchaseOrderId,
      quantity: e.quantity,
      unitPrice: e.unitPrice,
      totalPrice: e.totalPrice || Math.abs(e.quantity) * e.unitPrice,
      unit: e.unit,
      userId: e.userId,
      userName: e.userName,
      notes: e.notes,
    } as TraceabilityMovement))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ──────────────────────────────────────────────────────────────────────────────
// C1) DASHBOARD POR MATERIAL
// ──────────────────────────────────────────────────────────────────────────────

export type GroupBy = "day" | "week" | "month";

function getPeriodKey(date: Date, groupBy: GroupBy): string {
  if (groupBy === "day") return format(date, "yyyy-MM-dd");
  if (groupBy === "week") return format(startOfWeek(date, { locale: es }), "yyyy-MM-dd");
  return format(startOfMonth(date), "yyyy-MM");
}

function getPeriodLabel(key: string, groupBy: GroupBy): string {
  if (groupBy === "day") return format(parseISO(key), "dd MMM", { locale: es });
  if (groupBy === "week") return `Sem ${format(parseISO(key), "dd MMM", { locale: es })}`;
  return format(parseISO(key + "-01"), "MMM yyyy", { locale: es });
}

export async function getMaterialDashboard(
  itemId: string,
  dateRange: AnalyticsDateRange,
  groupBy: GroupBy = "month"
): Promise<MaterialDashboardData | null> {
  const from = parseISO(dateRange.from);
  const to = new Date(parseISO(dateRange.to));
  to.setHours(23, 59, 59, 999);

  // Periodo anterior de igual duración
  const days = differenceInCalendarDays(to, from) + 1;
  const prevTo = subDays(from, 1);
  const prevFrom = subDays(from, days);

  const itemSnap = await db.collection("inventory").doc(itemId).get();
  if (!itemSnap.exists) return null;
  const item = { id: itemSnap.id, ...itemSnap.data() } as InventoryItem;

  const snap = await db.collection("inventory_history")
    .where("itemId", "==", itemId)
    .get();

  const allEntries = snap.docs.map(safeEntry);

  const currentEntries = allEntries.filter((e) => isInRange(e.date, from, to));
  const prevEntries = allEntries.filter((e) => isInRange(e.date, prevFrom, prevTo));

  const calcSpent = (entries: InventoryHistoryEntry[]) =>
    entries
      .filter((e) => !e.type || e.type === "reception")
      .reduce((s, e) => s + Math.abs(e.quantity) * e.unitPrice, 0);

  const calcQty = (entries: InventoryHistoryEntry[]) =>
    entries
      .filter((e) => !e.type || e.type === "reception")
      .reduce((s, e) => s + Math.abs(e.quantity), 0);

  const currentSpent = calcSpent(currentEntries);
  const previousSpent = calcSpent(prevEntries);
  const currentQty = calcQty(currentEntries);
  const previousQty = calcQty(prevEntries);

  const spentChangePercent = previousSpent > 0 ? ((currentSpent - previousSpent) / previousSpent) * 100 : 0;
  const qtyChangePercent = previousQty > 0 ? ((currentQty - previousQty) / previousQty) * 100 : 0;

  // Serie temporal
  const periodMap = new Map<string, TimeSeriesPoint>();
  for (const e of currentEntries) {
    const d = toDate(e.date);
    const key = getPeriodKey(d, groupBy);
    const existing = periodMap.get(key) ?? {
      period: getPeriodLabel(key, groupBy),
      date: key,
      totalSpent: 0,
      totalQuantity: 0,
      receptionCount: 0,
      consumptionCount: 0,
    };
    if (!e.type || e.type === "reception") {
      existing.totalSpent += Math.abs(e.quantity) * e.unitPrice;
      existing.totalQuantity += Math.abs(e.quantity);
      existing.receptionCount += 1;
    } else if (e.type === "consumption") {
      existing.consumptionCount += 1;
    }
    periodMap.set(key, existing);
  }
  const timeSeries = [...periodMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);

  // Top proyectos
  const projectMap = new Map<string, ProjectSummary>();
  for (const e of currentEntries.filter((e) => !e.type || e.type === "reception")) {
    if (!e.projectId) continue;
    const ex = projectMap.get(e.projectId) ?? { projectId: e.projectId, projectName: e.projectName ?? "", totalSpent: 0, totalQuantity: 0, receptionCount: 0 };
    ex.totalSpent += Math.abs(e.quantity) * e.unitPrice;
    ex.totalQuantity += Math.abs(e.quantity);
    ex.receptionCount += 1;
    projectMap.set(e.projectId, ex);
  }
  const topProjects = [...projectMap.values()].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

  // Top proveedores
  const supplierMap = new Map<string, SupplierSummary>();
  for (const e of currentEntries.filter((e) => !e.type || e.type === "reception")) {
    if (!e.supplierId) continue;
    const ex = supplierMap.get(e.supplierId) ?? { supplierId: e.supplierId, supplierName: e.supplierName, totalSpent: 0, totalQuantity: 0, purchaseCount: 0, avgPrice: 0 };
    ex.totalSpent += Math.abs(e.quantity) * e.unitPrice;
    ex.totalQuantity += Math.abs(e.quantity);
    ex.purchaseCount += 1;
    supplierMap.set(e.supplierId, ex);
  }
  const topSuppliers = [...supplierMap.values()]
    .map((s) => ({ ...s, avgPrice: s.totalQuantity > 0 ? s.totalSpent / s.totalQuantity : 0 }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  const receptions = currentEntries.filter((e) => !e.type || e.type === "reception");
  const sorted = [...receptions].sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime());

  return {
    itemId,
    itemSku: item.sku ?? "",
    itemName: item.name,
    unit: item.unit ?? receptions[0]?.unit ?? "",
    currentPeriodSpent: currentSpent,
    previousPeriodSpent: previousSpent,
    spentChangePercent,
    currentPeriodQty: currentQty,
    previousPeriodQty: previousQty,
    qtyChangePercent,
    timeSeries,
    topProjects,
    topSuppliers,
    weightedAvgPrice: currentQty > 0 ? currentSpent / currentQty : 0,
    lastPrice: sorted[0]?.unitPrice ?? 0,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// C2) DASHBOARD GLOBAL
// ──────────────────────────────────────────────────────────────────────────────

export async function getGlobalDashboard(
  dateRange: AnalyticsDateRange,
  groupBy: GroupBy = "month"
): Promise<GlobalDashboardData> {
  const from = parseISO(dateRange.from);
  const to = new Date(parseISO(dateRange.to));
  to.setHours(23, 59, 59, 999);

  const days = differenceInCalendarDays(to, from) + 1;
  const prevFrom = subDays(from, days);
  const prevTo = subDays(from, 1);

  const snap = await db.collection("inventory_history").get();
  const allEntries = snap.docs.map(safeEntry);

  const current = allEntries.filter((e) => isInRange(e.date, from, to) && (!e.type || e.type === "reception"));
  const prev = allEntries.filter((e) => isInRange(e.date, prevFrom, prevTo) && (!e.type || e.type === "reception"));

  const totalSpent = current.reduce((s, e) => s + Math.abs(e.quantity) * e.unitPrice, 0);
  const totalMovements = allEntries.filter((e) => isInRange(e.date, from, to)).length;

  // Agrupar por material
  const byItemCurrent = new Map<string, { spent: number; qty: number; sku: string; name: string; unit: string }>();
  for (const e of current) {
    const ex = byItemCurrent.get(e.itemId) ?? { spent: 0, qty: 0, sku: e.itemSku, name: e.itemName, unit: e.unit };
    ex.spent += Math.abs(e.quantity) * e.unitPrice;
    ex.qty += Math.abs(e.quantity);
    byItemCurrent.set(e.itemId, ex);
  }

  const itemList = [...byItemCurrent.entries()].map(([id, v]) => ({
    itemId: id,
    itemSku: v.sku,
    itemName: v.name,
    totalSpent: v.spent,
    totalQuantity: v.qty,
    unit: v.unit,
  }));

  const topMaterialsBySpend = [...itemList].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);
  const topMaterialsByQuantity = [...itemList].sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 10);

  // Serie temporal global
  const periodMap = new Map<string, TimeSeriesPoint>();
  for (const e of current) {
    const d = toDate(e.date);
    const key = getPeriodKey(d, groupBy);
    const ex = periodMap.get(key) ?? { period: getPeriodLabel(key, groupBy), date: key, totalSpent: 0, totalQuantity: 0, receptionCount: 0, consumptionCount: 0 };
    ex.totalSpent += Math.abs(e.quantity) * e.unitPrice;
    ex.totalQuantity += Math.abs(e.quantity);
    ex.receptionCount += 1;
    periodMap.set(key, ex);
  }
  const spendTimeSeries = [...periodMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);

  // Alertas de precio
  const byItemPrev = new Map<string, { spent: number; qty: number }>();
  for (const e of prev) {
    const ex = byItemPrev.get(e.itemId) ?? { spent: 0, qty: 0 };
    ex.spent += Math.abs(e.quantity) * e.unitPrice;
    ex.qty += Math.abs(e.quantity);
    byItemPrev.set(e.itemId, ex);
  }

  const priceAlerts: GlobalDashboardData["priceAlerts"] = [];
  for (const [itemId, cur] of byItemCurrent) {
    const pv = byItemPrev.get(itemId);
    if (!pv || pv.qty === 0 || cur.qty === 0) continue;
    const curAvg = cur.spent / cur.qty;
    const pvAvg = pv.spent / pv.qty;
    const change = (curAvg - pvAvg) / pvAvg;
    if (change > PRICE_ALERT_THRESHOLD) {
      priceAlerts.push({
        itemId,
        itemSku: byItemCurrent.get(itemId)!.sku,
        itemName: byItemCurrent.get(itemId)!.name,
        changePercent: change * 100,
        currentAvgPrice: curAvg,
        previousAvgPrice: pvAvg,
      });
    }
  }

  // Alertas de consumo (variación respecto a periodos anteriores - simplificado)
  const consumptionAlerts: GlobalDashboardData["consumptionAlerts"] = [];
  // Dividimos el histórico en 3 periodos anteriores iguales para comparar
  const historicalEntries = allEntries.filter(
    (e) => (!e.type || e.type === "reception") && toDate(e.date) < from && toDate(e.date) >= subDays(from, days * 3)
  );
  const historicalByItem = new Map<string, number[]>();
  // Split in 3 equal periods
  for (let i = 0; i < 3; i++) {
    const pFrom = subDays(from, days * (i + 1));
    const pTo = subDays(from, days * i + 1);
    const period = historicalEntries.filter((e) => isInRange(e.date, pFrom, pTo));
    const qtyByItem = new Map<string, number>();
    for (const e of period) {
      qtyByItem.set(e.itemId, (qtyByItem.get(e.itemId) ?? 0) + Math.abs(e.quantity));
    }
    for (const [id, qty] of qtyByItem) {
      if (!historicalByItem.has(id)) historicalByItem.set(id, []);
      historicalByItem.get(id)!.push(qty);
    }
  }
  for (const [itemId, cur] of byItemCurrent) {
    const hist = historicalByItem.get(itemId);
    if (!hist || hist.length < 2) continue;
    const mean = hist.reduce((a, b) => a + b, 0) / hist.length;
    const variance = hist.reduce((s, v) => s + (v - mean) ** 2, 0) / hist.length;
    const stddev = Math.sqrt(variance);
    if (stddev === 0) continue;
    const deviation = Math.abs(cur.qty - mean) / stddev;
    if (deviation > CONSUMPTION_ANOMALY_SIGMA) {
      consumptionAlerts.push({
        itemId,
        itemSku: cur.sku,
        itemName: cur.name,
        currentQty: cur.qty,
        avgQty: mean,
        deviationFactor: deviation,
      });
    }
  }

  return {
    totalSpent,
    totalMovements,
    topMaterialsBySpend,
    topMaterialsByQuantity,
    spendTimeSeries,
    priceAlerts: priceAlerts.sort((a, b) => b.changePercent - a.changePercent).slice(0, 10),
    consumptionAlerts: consumptionAlerts.sort((a, b) => b.deviationFactor - a.deviationFactor).slice(0, 10),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// D) EXPORTACIÓN CSV
// ──────────────────────────────────────────────────────────────────────────────

export async function exportTraceabilityToExcel(
  filters: TraceabilityFilters
): Promise<{ base64: string; filename: string }> {
  const movements = await getMaterialTraceability(filters);

  // Build CSV (sin dependencia adicional, xlsx ya está en el proyecto pero como servidor action es más simple)
  const headers = [
    "Fecha", "Tipo", "SKU", "Artículo", "Proveedor", "Proyecto", "Almacén",
    "Nº Orden", "Cantidad", "Precio Unitario", "Total", "Unidad", "Usuario", "Notas"
  ];

  const typeLabel: Record<InventoryMovementType, string> = {
    reception: "Recepción",
    consumption: "Consumo",
    adjustment: "Ajuste",
    transfer: "Transferencia",
  };

  const rows = movements.map((m) => [
    format(parseISO(m.date), "dd/MM/yyyy HH:mm"),
    typeLabel[m.type] ?? m.type,
    m.itemSku,
    m.itemName,
    m.supplierName ?? "",
    m.projectName ?? "",
    m.locationId ?? "",
    m.orderNumber ?? "",
    m.quantity,
    m.unitPrice,
    m.totalPrice,
    m.unit,
    m.userName ?? "",
    m.notes ?? "",
  ]);

  const csvLines = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const base64 = Buffer.from("\uFEFF" + csvLines, "utf-8").toString("base64");
  const filename = `trazabilidad-${filters.itemId ?? "todos"}-${filters.dateRange.from}-${filters.dateRange.to}.csv`;

  return { base64, filename };
}

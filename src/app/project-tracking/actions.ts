"use server";

import { revalidateTag } from "next/cache";
import { db } from "@/lib/firebase-admin";
import type { Project, PurchaseOrder } from "@/lib/types";

// Acción para forzar revalidación del caché
export async function revalidateProjectTracking() {
  revalidateTag("project-tracking");
  revalidateTag("project-consumption");
  return { success: true, revalidatedAt: new Date().toISOString() };
}

// Tipos para el informe de consumo
export interface MaterialConsumption {
  itemId: string;
  itemName: string;
  itemSku: string;
  totalQuantity: number;
  transactionCount: number;
  totalAmount: number;
  avgPrice: number; // Precio medio ponderado
  minPrice: number;
  maxPrice: number;
  lastPurchase: {
    date: string;
    supplier: string;
    price: number;
    orderNumber: string;
  };
  suppliers: string[]; // Lista de proveedores usados
  supplierCount: number;
}

// Tipo para órdenes pendientes de recibir
export interface PendingOrderSummary {
  id: string;
  orderNumber: string;
  date: string;
  supplier: string;
  status: string;
  itemCount: number;
  total: number;
  estimatedDeliveryDate: string;
}

// Tipo para informes de viaje
export interface TravelReportSummary {
  id: string;
  codigo_informe: string;
  tecnico_name: string;
  fecha_inicio: string;
  fecha_fin: string;
  descripcion_viaje: string;
  estado: string;
  total_informe: number;
  gastos: {
    tipo: string;
    concepto: string;
    importe: number;
  }[];
}

export interface ProjectConsumptionData {
  project: {
    id: string;
    name: string;
    client?: string;
    budget?: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    // Materiales
    materialsReceived: number;      // Material recibido (inventory_history)
    materialsCommitted: number;     // Material aprobado pero no recibido (purchaseOrders)
    // Viajes
    travelApproved: number;         // Viajes aprobados (gastado)
    travelPending: number;          // Viajes pendientes de aprobación (comprometido)
    // Totales
    totalSpent: number;             // materialsReceived + travelApproved
    totalCommitted: number;         // materialsCommitted + travelPending
    totalProjected: number;         // totalSpent + totalCommitted
    // Conteos
    uniqueItems: number;
    uniqueSuppliers: number;
    totalTransactions: number;
    pendingOrdersCount: number;
    travelReportsCount: number;
    travelPendingCount: number;
  };
  materials: MaterialConsumption[];
  topByAmount: MaterialConsumption[]; // Top 10 por €
  topByQuantity: MaterialConsumption[]; // Top 10 por unidades
  monthlyEvolution: {
    month: string;
    amount: number;
  }[];
  pendingOrders: PendingOrderSummary[]; // Órdenes pendientes de recibir
  travelReports: TravelReportSummary[]; // Informes de viaje (aprobados + pendientes)
  cachedAt?: string; // Timestamp de caché
}

/**
 * Obtiene el análisis de consumo de materiales para un proyecto
 */
export async function getProjectConsumption(
  projectId: string,
  startDate?: string,
  endDate?: string
): Promise<ProjectConsumptionData | null> {
  try {
    // 1. Obtener info del proyecto
    const projectDoc = await db.collection("projects").doc(projectId).get();
    if (!projectDoc.exists) {
      return null;
    }
    const projectData = projectDoc.data()!;
    
    // 2. Obtener historial de inventory_history para este proyecto
    let query = db.collection("inventory_history")
      .where("projectId", "==", projectId);
    
    const historySnapshot = await query.get();
    
    // Si no hay datos por projectId, intentar por projectName
    let entries = historySnapshot.docs;
    if (entries.length === 0) {
      const byNameSnapshot = await db.collection("inventory_history")
        .where("projectName", "==", projectData.name)
        .get();
      entries = byNameSnapshot.docs;
    }
    
    // Filtrar por fechas si se especifican
    let filteredEntries = entries.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];
    
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();
    
    filteredEntries = filteredEntries.filter(entry => {
      const entryDate = entry.date?._seconds 
        ? new Date(entry.date._seconds * 1000)
        : new Date(entry.date);
      return entryDate >= start && entryDate <= end;
    });
    
    // 3. Agregar por artículo
    const materialsMap = new Map<string, {
      itemId: string;
      itemName: string;
      itemSku: string;
      totalQuantity: number;
      transactionCount: number;
      totalAmount: number;
      prices: number[];
      suppliers: Set<string>;
      lastEntry: any;
    }>();
    
    const allSuppliers = new Set<string>();
    const monthlyAmounts = new Map<string, number>();
    
    filteredEntries.forEach(entry => {
      const itemId = entry.itemId || 'unknown';
      const existing = materialsMap.get(itemId);
      
      // Extraer fecha
      const entryDate = entry.date?._seconds 
        ? new Date(entry.date._seconds * 1000)
        : new Date(entry.date);
      const monthKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Acumular por mes
      monthlyAmounts.set(monthKey, (monthlyAmounts.get(monthKey) || 0) + (entry.totalPrice || 0));
      
      // Acumular proveedores globales
      if (entry.supplierName) {
        allSuppliers.add(entry.supplierName);
      }
      
      if (existing) {
        existing.totalQuantity += entry.quantity || 0;
        existing.transactionCount += 1;
        existing.totalAmount += entry.totalPrice || 0;
        existing.prices.push(entry.unitPrice || 0);
        if (entry.supplierName) {
          existing.suppliers.add(entry.supplierName);
        }
        // Actualizar última entrada si es más reciente
        const existingDate = existing.lastEntry.date?._seconds 
          ? new Date(existing.lastEntry.date._seconds * 1000)
          : new Date(existing.lastEntry.date);
        if (entryDate > existingDate) {
          existing.lastEntry = entry;
        }
      } else {
        materialsMap.set(itemId, {
          itemId,
          itemName: entry.itemName || 'Sin nombre',
          itemSku: entry.itemSku || '',
          totalQuantity: entry.quantity || 0,
          transactionCount: 1,
          totalAmount: entry.totalPrice || 0,
          prices: [entry.unitPrice || 0],
          suppliers: new Set(entry.supplierName ? [entry.supplierName] : []),
          lastEntry: entry,
        });
      }
    });
    
    // 4. Convertir a array de MaterialConsumption
    const materials: MaterialConsumption[] = Array.from(materialsMap.values()).map(item => {
      const lastDate = item.lastEntry.date?._seconds 
        ? new Date(item.lastEntry.date._seconds * 1000).toISOString()
        : item.lastEntry.date;
      
      return {
        itemId: item.itemId,
        itemName: item.itemName,
        itemSku: item.itemSku,
        totalQuantity: item.totalQuantity,
        transactionCount: item.transactionCount,
        totalAmount: item.totalAmount,
        avgPrice: item.totalQuantity > 0 ? item.totalAmount / item.totalQuantity : 0,
        minPrice: Math.min(...item.prices.filter(p => p > 0)),
        maxPrice: Math.max(...item.prices),
        lastPurchase: {
          date: lastDate,
          supplier: item.lastEntry.supplierName || '',
          price: item.lastEntry.unitPrice || 0,
          orderNumber: item.lastEntry.orderNumber || '',
        },
        suppliers: Array.from(item.suppliers),
        supplierCount: item.suppliers.size,
      };
    });
    
    // Ordenar por importe total descendente
    materials.sort((a, b) => b.totalAmount - a.totalAmount);
    
    // 5. Crear tops
    const topByAmount = [...materials].slice(0, 10);
    const topByQuantity = [...materials]
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);
    
    // 6. Evolución mensual (ordenada)
    const monthlyEvolution = Array.from(monthlyAmounts.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    // 7. Obtener órdenes pendientes de recibir (Aprobadas o Enviadas)
    const pendingOrdersSnapshot = await db.collection("purchaseOrders")
      .where("project", "==", projectId)
      .get();
    
    // Filtrar solo las que están en estado Aprobada o Enviada al Proveedor
    const pendingStatuses = ['Aprobada', 'Enviada al Proveedor'];
    const pendingOrders: PendingOrderSummary[] = pendingOrdersSnapshot.docs
      .filter(doc => {
        const data = doc.data();
        return pendingStatuses.includes(data.status);
      })
      .map(doc => {
        const data = doc.data();
        // Convertir fechas
        let dateStr = '';
        if (data.date?._seconds) {
          dateStr = new Date(data.date._seconds * 1000).toISOString();
        } else if (data.date?.toDate) {
          dateStr = data.date.toDate().toISOString();
        } else if (typeof data.date === 'string') {
          dateStr = data.date;
        }
        
        let estimatedDeliveryStr = '';
        if (data.estimatedDeliveryDate?._seconds) {
          estimatedDeliveryStr = new Date(data.estimatedDeliveryDate._seconds * 1000).toISOString();
        } else if (data.estimatedDeliveryDate?.toDate) {
          estimatedDeliveryStr = data.estimatedDeliveryDate.toDate().toISOString();
        } else if (typeof data.estimatedDeliveryDate === 'string') {
          estimatedDeliveryStr = data.estimatedDeliveryDate;
        }
        
        return {
          id: doc.id,
          orderNumber: data.orderNumber || doc.id,
          date: dateStr,
          supplier: data.supplier || data.supplierName || '',
          status: data.status,
          itemCount: data.items?.length || 0,
          total: data.total || 0,
          estimatedDeliveryDate: estimatedDeliveryStr,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Más recientes primero
    
    const materialsCommitted = pendingOrders.reduce((sum, o) => sum + o.total, 0);
    const materialsReceived = materials.reduce((sum, m) => sum + m.totalAmount, 0);
    
    // 8. Obtener informes de viaje para este proyecto
    const travelReportsSnapshot = await db.collection("travelReports")
      .where("proyecto_id", "==", projectId)
      .get();
    
    const travelReports: TravelReportSummary[] = travelReportsSnapshot.docs.map(doc => {
      const data = doc.data();
      // Convertir fechas
      const convertDate = (val: any) => {
        if (!val) return '';
        if (val._seconds !== undefined) return new Date(val._seconds * 1000).toISOString();
        if (val.toDate) return val.toDate().toISOString();
        return val;
      };
      
      return {
        id: doc.id,
        codigo_informe: data.codigo_informe || doc.id,
        tecnico_name: data.tecnico_name || '',
        fecha_inicio: convertDate(data.fecha_inicio),
        fecha_fin: convertDate(data.fecha_fin),
        descripcion_viaje: data.descripcion_viaje || '',
        estado: data.estado || '',
        total_informe: data.total_informe || 0,
        gastos: (data.gastos || []).map((g: any) => ({
          tipo: g.tipo || '',
          concepto: g.concepto || '',
          importe: g.importe || 0,
        })),
      };
    }).sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime());
    
    // Calcular totales de viajes
    const travelApproved = travelReports
      .filter(r => r.estado === 'Aprobado')
      .reduce((sum, r) => sum + r.total_informe, 0);
    const travelPending = travelReports
      .filter(r => r.estado === 'Pendiente de Aprobación')
      .reduce((sum, r) => sum + r.total_informe, 0);
    const travelPendingCount = travelReports.filter(r => r.estado === 'Pendiente de Aprobación').length;
    
    // Totales globales
    const totalSpent = materialsReceived + travelApproved;
    const totalCommitted = materialsCommitted + travelPending;
    
    // 9. Construir respuesta
    return {
      project: {
        id: projectId,
        name: projectData.name || '',
        client: projectData.client || projectData.clientId || '',
        budget: projectData.budget,
      },
      period: {
        startDate: startDate || '',
        endDate: endDate || new Date().toISOString(),
      },
      summary: {
        // Materiales
        materialsReceived,
        materialsCommitted,
        // Viajes
        travelApproved,
        travelPending,
        // Totales
        totalSpent,
        totalCommitted,
        totalProjected: totalSpent + totalCommitted,
        // Conteos
        uniqueItems: materials.length,
        uniqueSuppliers: allSuppliers.size,
        totalTransactions: filteredEntries.length,
        pendingOrdersCount: pendingOrders.length,
        travelReportsCount: travelReports.filter(r => r.estado === 'Aprobado').length,
        travelPendingCount,
      },
      materials,
      topByAmount,
      topByQuantity,
      monthlyEvolution,
      pendingOrders,
      travelReports,
    };
  } catch (error) {
    console.error("Error getting project consumption:", error);
    return null;
  }
}

/**
 * Obtiene la lista de proyectos con sus totales de consumo
 */
export async function getProjectsWithConsumption(): Promise<{
  id: string;
  name: string;
  client?: string;
  totalSpent: number;
  itemCount: number;
}[]> {
  try {
    // Obtener proyectos
    const projectsSnapshot = await db.collection("projects").get();
    const projects = projectsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];
    
    // Obtener historial
    const historySnapshot = await db.collection("inventory_history").get();
    
    // Agrupar por proyecto
    const projectTotals = new Map<string, { spent: number; items: Set<string> }>();
    
    historySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const projectId = data.projectId;
      const projectName = data.projectName;
      
      // Buscar el proyecto correspondiente
      const project = projects.find(p => 
        p.id === projectId || p.name === projectName
      );
      
      if (project) {
        const existing = projectTotals.get(project.id) || { spent: 0, items: new Set() };
        existing.spent += data.totalPrice || 0;
        if (data.itemId) existing.items.add(data.itemId);
        projectTotals.set(project.id, existing);
      }
    });
    
    return projects.map(project => {
      const totals = projectTotals.get(project.id);
      return {
        id: project.id,
        name: project.name,
        client: project.client,
        totalSpent: totals?.spent || 0,
        itemCount: totals?.items.size || 0,
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  } catch (error) {
    console.error("Error getting projects with consumption:", error);
    return [];
  }
}

"use server";

import { db } from "@/lib/firebase-admin";
import type { Project } from "@/lib/types";

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
    totalSpent: number;
    uniqueItems: number;
    uniqueSuppliers: number;
    totalTransactions: number;
  };
  materials: MaterialConsumption[];
  topByAmount: MaterialConsumption[]; // Top 10 por €
  topByQuantity: MaterialConsumption[]; // Top 10 por unidades
  monthlyEvolution: {
    month: string;
    amount: number;
  }[];
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
    
    // 7. Construir respuesta
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
        totalSpent: materials.reduce((sum, m) => sum + m.totalAmount, 0),
        uniqueItems: materials.length,
        uniqueSuppliers: allSuppliers.size,
        totalTransactions: filteredEntries.length,
      },
      materials,
      topByAmount,
      topByQuantity,
      monthlyEvolution,
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

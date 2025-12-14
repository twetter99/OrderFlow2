"use server";

import { db } from "@/lib/firebase-admin";
import type { InventoryHistoryEntry, PriceMetrics, InventoryItem, Supplier, Project } from "@/lib/types";

// Tipos para búsqueda avanzada
export type SearchMode = 'item' | 'supplier' | 'project';

export type SearchResult = {
  type: 'item' | 'supplier' | 'project';
  id: string;
  name: string;
  subtitle?: string;
  itemCount?: number;
  lastPurchase?: string;
};

export type ItemWithHistory = InventoryItem & {
  purchaseCount: number;
  avgPrice: number;
  lastPrice: number;
  lastPurchaseDate: string;
  totalSpent: number;
};

/**
 * Obtiene todos los artículos del inventario para el buscador
 */
export async function getInventoryItems(): Promise<InventoryItem[]> {
  try {
    const snapshot = await db.collection("inventory").get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as InventoryItem[];
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    return [];
  }
}

/**
 * Obtiene todos los proveedores
 */
export async function getSuppliers(): Promise<Supplier[]> {
  try {
    const snapshot = await db.collection("suppliers").get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Supplier[];
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return [];
  }
}

/**
 * Obtiene todos los proyectos
 */
export async function getProjects(): Promise<Project[]> {
  try {
    const snapshot = await db.collection("projects").get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Project[];
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
}

/**
 * Búsqueda inteligente unificada - busca en artículos, proveedores y proyectos
 */
export async function smartSearch(query: string): Promise<SearchResult[]> {
  if (query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  try {
    // 1. Buscar en inventory_history para obtener proveedores y proyectos con historial real
    const historySnapshot = await db.collection("inventory_history").get();
    
    // Mapear proveedores con historial
    const suppliersWithHistory = new Map<string, { 
      name: string; 
      itemCount: Set<string>; 
      lastDate: string 
    }>();
    
    // Mapear proyectos con historial
    const projectsWithHistory = new Map<string, { 
      name: string;
      id: string;
      itemCount: Set<string>; 
      lastDate: string 
    }>();

    // Mapear artículos con historial
    const itemsWithHistory = new Map<string, {
      name: string;
      sku: string;
      lastDate: string;
    }>();

    historySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const date = data.date?.toDate?.() 
        ? data.date.toDate().toISOString() 
        : (data.date || '');

      // Proveedores
      if (data.supplierName) {
        const key = data.supplierId || data.supplierName;
        const existing = suppliersWithHistory.get(key);
        if (existing) {
          existing.itemCount.add(data.itemId);
          if (date > existing.lastDate) existing.lastDate = date;
        } else {
          suppliersWithHistory.set(key, {
            name: data.supplierName,
            itemCount: new Set([data.itemId]),
            lastDate: date,
          });
        }
      }

      // Proyectos - Agrupar por nombre para evitar duplicados visuales
      if (data.projectName || data.projectId) {
        const name = data.projectName || data.projectId;
        // Usar el nombre como clave para agrupar proyectos con el mismo nombre
        const key = name;
        const existing = projectsWithHistory.get(key);
        if (existing) {
          existing.itemCount.add(data.itemId);
          if (date > existing.lastDate) existing.lastDate = date;
          // Guardar el projectId más reciente si existe
          if (data.projectId) existing.id = data.projectId;
        } else {
          projectsWithHistory.set(key, {
            name: name,
            id: data.projectId || name,
            itemCount: new Set([data.itemId]),
            lastDate: date,
          });
        }
      }

      // Artículos
      if (data.itemId) {
        const existing = itemsWithHistory.get(data.itemId);
        if (!existing || date > existing.lastDate) {
          itemsWithHistory.set(data.itemId, {
            name: data.itemName,
            sku: data.itemSku || '',
            lastDate: date,
          });
        }
      }
    });

    // 2. Buscar artículos que coincidan
    const inventorySnapshot = await db.collection("inventory").get();
    inventorySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const name = (data.name || '').toLowerCase();
      const sku = (data.sku || '').toLowerCase();
      
      if (name.includes(lowerQuery) || sku.includes(lowerQuery)) {
        const historyInfo = itemsWithHistory.get(doc.id);
        results.push({
          type: 'item',
          id: doc.id,
          name: data.name,
          subtitle: data.sku,
          itemCount: historyInfo ? 1 : 0,
          lastPurchase: historyInfo?.lastDate,
        });
      }
    });

    // 3. Buscar proveedores que coincidan
    suppliersWithHistory.forEach((value, key) => {
      if (value.name.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'supplier',
          id: key,
          name: value.name,
          subtitle: `${value.itemCount.size} artículos`,
          itemCount: value.itemCount.size,
          lastPurchase: value.lastDate,
        });
      }
    });

    // 4. Buscar proyectos que coincidan
    projectsWithHistory.forEach((value, key) => {
      if (value.name.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'project',
          id: value.id, // Usar el ID guardado, no la clave del Map
          name: value.name,
          subtitle: `${value.itemCount.size} artículos`,
          itemCount: value.itemCount.size,
          lastPurchase: value.lastDate,
        });
      }
    });

    // Ordenar: primero items, luego proveedores, luego proyectos
    // Dentro de cada grupo, por relevancia (los que tienen historial primero)
    results.sort((a, b) => {
      const typeOrder = { item: 0, supplier: 1, project: 2 };
      if (typeOrder[a.type] !== typeOrder[b.type]) {
        return typeOrder[a.type] - typeOrder[b.type];
      }
      // Dentro del mismo tipo, los que tienen historial primero
      return (b.itemCount || 0) - (a.itemCount || 0);
    });

    return results.slice(0, 15); // Limitar resultados
  } catch (error) {
    console.error("Error in smart search:", error);
    return [];
  }
}

/**
 * Obtiene todos los artículos comprados a un proveedor específico
 */
export async function getItemsBySupplier(supplierId: string, supplierName?: string): Promise<ItemWithHistory[]> {
  try {
    // Buscar en inventory_history por proveedor
    let historySnapshot;
    
    if (supplierId) {
      historySnapshot = await db
        .collection("inventory_history")
        .where("supplierId", "==", supplierId)
        .get();
    }
    
    // Si no hay resultados por ID, buscar por nombre
    if (!historySnapshot || historySnapshot.empty) {
      const allHistory = await db.collection("inventory_history").get();
      const matchingDocs = allHistory.docs.filter(doc => {
        const data = doc.data();
        return data.supplierId === supplierId || 
               (supplierName && data.supplierName === supplierName);
      });
      historySnapshot = { docs: matchingDocs, empty: matchingDocs.length === 0 };
    }

    if (historySnapshot.empty) return [];

    // Agrupar por itemId
    const itemsMap = new Map<string, {
      entries: InventoryHistoryEntry[];
      name: string;
      sku: string;
    }>();

    historySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const existing = itemsMap.get(data.itemId);
      const entry: InventoryHistoryEntry = {
        id: doc.id,
        itemId: data.itemId,
        itemSku: data.itemSku,
        itemName: data.itemName,
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        purchaseOrderId: data.purchaseOrderId,
        orderNumber: data.orderNumber,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalPrice: data.totalPrice,
        unit: data.unit,
        date: data.date?.toDate?.() ? data.date.toDate().toISOString() : data.date,
        projectId: data.projectId,
        projectName: data.projectName,
      };

      if (existing) {
        existing.entries.push(entry);
      } else {
        itemsMap.set(data.itemId, {
          entries: [entry],
          name: data.itemName,
          sku: data.itemSku || '',
        });
      }
    });

    // Obtener info completa de los artículos del inventario
    const itemIds = Array.from(itemsMap.keys());
    const inventoryItems = new Map<string, InventoryItem>();
    
    // Firestore tiene límite de 10 en "in" queries, así que hacemos múltiples
    for (let i = 0; i < itemIds.length; i += 10) {
      const batch = itemIds.slice(i, i + 10);
      const inventorySnapshot = await db.collection("inventory")
        .where("__name__", "in", batch)
        .get();
      
      inventorySnapshot.docs.forEach(doc => {
        inventoryItems.set(doc.id, { id: doc.id, ...doc.data() } as InventoryItem);
      });
    }

    // Construir resultado
    const result: ItemWithHistory[] = [];
    
    itemsMap.forEach((value, itemId) => {
      const entries = value.entries;
      const prices = entries.map(e => e.unitPrice);
      const sorted = entries.sort((a, b) => 
        new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
      );
      const lastEntry = sorted[sorted.length - 1];
      
      const inventoryItem = inventoryItems.get(itemId);
      
      result.push({
        id: itemId,
        sku: inventoryItem?.sku || value.sku,
        name: inventoryItem?.name || value.name,
        unitCost: inventoryItem?.unitCost || lastEntry.unitPrice,
        unit: (inventoryItem?.unit || lastEntry.unit || 'ud') as 'ud' | 'ml',
        type: inventoryItem?.type || 'simple',
        family: inventoryItem?.family,
        purchaseCount: entries.length,
        avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
        lastPrice: lastEntry.unitPrice,
        lastPurchaseDate: lastEntry.date as string,
        totalSpent: entries.reduce((a, b) => a + b.totalPrice, 0),
      });
    });

    // Ordenar por cantidad de compras descendente
    return result.sort((a, b) => b.purchaseCount - a.purchaseCount);
  } catch (error) {
    console.error("Error getting items by supplier:", error);
    return [];
  }
}

/**
 * Obtiene todos los artículos comprados para un proyecto específico
 */
export async function getItemsByProject(projectId: string, projectName?: string): Promise<ItemWithHistory[]> {
  try {
    // Buscar en inventory_history por proyecto
    let historySnapshot;
    
    if (projectId) {
      historySnapshot = await db
        .collection("inventory_history")
        .where("projectId", "==", projectId)
        .get();
    }
    
    // Si no hay resultados por ID, buscar por nombre
    if (!historySnapshot || historySnapshot.empty) {
      const allHistory = await db.collection("inventory_history").get();
      const matchingDocs = allHistory.docs.filter(doc => {
        const data = doc.data();
        return data.projectId === projectId || 
               (projectName && data.projectName === projectName);
      });
      historySnapshot = { docs: matchingDocs, empty: matchingDocs.length === 0 };
    }

    if (historySnapshot.empty) return [];

    // Agrupar por itemId
    const itemsMap = new Map<string, {
      entries: InventoryHistoryEntry[];
      name: string;
      sku: string;
    }>();

    historySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const existing = itemsMap.get(data.itemId);
      const entry: InventoryHistoryEntry = {
        id: doc.id,
        itemId: data.itemId,
        itemSku: data.itemSku,
        itemName: data.itemName,
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        purchaseOrderId: data.purchaseOrderId,
        orderNumber: data.orderNumber,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalPrice: data.totalPrice,
        unit: data.unit,
        date: data.date?.toDate?.() ? data.date.toDate().toISOString() : data.date,
        projectId: data.projectId,
        projectName: data.projectName,
      };

      if (existing) {
        existing.entries.push(entry);
      } else {
        itemsMap.set(data.itemId, {
          entries: [entry],
          name: data.itemName,
          sku: data.itemSku || '',
        });
      }
    });

    // Obtener info completa de los artículos del inventario
    const itemIds = Array.from(itemsMap.keys());
    const inventoryItems = new Map<string, InventoryItem>();
    
    for (let i = 0; i < itemIds.length; i += 10) {
      const batch = itemIds.slice(i, i + 10);
      const inventorySnapshot = await db.collection("inventory")
        .where("__name__", "in", batch)
        .get();
      
      inventorySnapshot.docs.forEach(doc => {
        inventoryItems.set(doc.id, { id: doc.id, ...doc.data() } as InventoryItem);
      });
    }

    // Construir resultado
    const result: ItemWithHistory[] = [];
    
    itemsMap.forEach((value, itemId) => {
      const entries = value.entries;
      const prices = entries.map(e => e.unitPrice);
      const sorted = entries.sort((a, b) => 
        new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
      );
      const lastEntry = sorted[sorted.length - 1];
      
      const inventoryItem = inventoryItems.get(itemId);
      
      result.push({
        id: itemId,
        sku: inventoryItem?.sku || value.sku,
        name: inventoryItem?.name || value.name,
        unitCost: inventoryItem?.unitCost || lastEntry.unitPrice,
        unit: (inventoryItem?.unit || lastEntry.unit || 'ud') as 'ud' | 'ml',
        type: inventoryItem?.type || 'simple',
        family: inventoryItem?.family,
        purchaseCount: entries.length,
        avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
        lastPrice: lastEntry.unitPrice,
        lastPurchaseDate: lastEntry.date as string,
        totalSpent: entries.reduce((a, b) => a + b.totalPrice, 0),
      });
    });

    // Ordenar por gasto total descendente
    return result.sort((a, b) => b.totalSpent - a.totalSpent);
  } catch (error) {
    console.error("Error getting items by project:", error);
    return [];
  }
}

/**
 * Busca artículos por nombre o SKU (para autocompletado) - LEGACY
 */
export async function searchItems(query: string): Promise<InventoryItem[]> {
  try {
    const snapshot = await db.collection("inventory").get();
    const lowerQuery = query.toLowerCase();
    
    const items = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as InventoryItem[];
    
    return items.filter(item => 
      item.name.toLowerCase().includes(lowerQuery) ||
      item.sku.toLowerCase().includes(lowerQuery)
    ).slice(0, 10); // Limitar a 10 resultados
  } catch (error) {
    console.error("Error searching items:", error);
    return [];
  }
}

/**
 * Obtiene el historial de precios de un artículo específico
 */
export async function getItemPriceHistory(itemId: string): Promise<{
  history: InventoryHistoryEntry[];
  metrics: PriceMetrics | null;
  itemInfo: InventoryItem | null;
}> {
  try {
    // Obtener información del artículo
    const itemDoc = await db.collection("inventory").doc(itemId).get();
    const itemInfo = itemDoc.exists 
      ? { id: itemDoc.id, ...itemDoc.data() } as InventoryItem 
      : null;

    // Obtener historial de precios (sin orderBy para evitar necesidad de índice compuesto)
    // El ordenamiento se hará en el cliente
    const historySnapshot = await db
      .collection("inventory_history")
      .where("itemId", "==", itemId)
      .get();

    if (historySnapshot.empty) {
      return { history: [], metrics: null, itemInfo };
    }

    const history: InventoryHistoryEntry[] = historySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        itemId: data.itemId,
        itemSku: data.itemSku,
        itemName: data.itemName,
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        purchaseOrderId: data.purchaseOrderId,
        orderNumber: data.orderNumber,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalPrice: data.totalPrice,
        unit: data.unit,
        date: data.date?.toDate?.() ? data.date.toDate().toISOString() : data.date,
        projectId: data.projectId,
        projectName: data.projectName,
      };
    });

    // Ordenar por fecha ascendente (se hace en cliente para evitar índice compuesto)
    history.sort((a, b) => 
      new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
    );

    // Calcular métricas
    const prices = history.map(h => h.unitPrice);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const totalQuantity = history.reduce((a, b) => a + b.quantity, 0);
    const totalSpent = history.reduce((a, b) => a + b.totalPrice, 0);
    const priceVariation = avgPrice > 0 ? ((maxPrice - minPrice) / avgPrice) * 100 : 0;
    
    const lastEntry = history[history.length - 1];

    const metrics: PriceMetrics = {
      minPrice,
      maxPrice,
      avgPrice,
      totalPurchases: history.length,
      totalQuantity,
      totalSpent,
      priceVariation,
      lastPrice: lastEntry.unitPrice,
      lastPurchaseDate: lastEntry.date as string,
    };

    return { history, metrics, itemInfo };
  } catch (error) {
    console.error("Error fetching price history for itemId:", itemId, error);
    // Log adicional para depuración
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    return { history: [], metrics: null, itemInfo: null };
  }
}

/**
 * Obtiene un resumen de los artículos con mayor variación de precio
 */
export async function getTopPriceVariations(limit: number = 10): Promise<{
  itemId: string;
  itemName: string;
  itemSku: string;
  priceVariation: number;
  lastPrice: number;
  avgPrice: number;
  purchaseCount: number;
}[]> {
  try {
    // Obtener todo el historial
    const historySnapshot = await db.collection("inventory_history").get();
    
    if (historySnapshot.empty) return [];

    // Agrupar por itemId
    const groupedByItem = new Map<string, InventoryHistoryEntry[]>();
    
    historySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const entry: InventoryHistoryEntry = {
        id: doc.id,
        itemId: data.itemId,
        itemSku: data.itemSku,
        itemName: data.itemName,
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        purchaseOrderId: data.purchaseOrderId,
        orderNumber: data.orderNumber,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalPrice: data.totalPrice,
        unit: data.unit,
        date: data.date?.toDate?.() ? data.date.toDate().toISOString() : data.date,
        projectId: data.projectId,
        projectName: data.projectName,
      };

      const existing = groupedByItem.get(data.itemId) || [];
      existing.push(entry);
      groupedByItem.set(data.itemId, existing);
    });

    // Calcular variación para cada artículo
    const variations = Array.from(groupedByItem.entries()).map(([itemId, entries]) => {
      const prices = entries.map(e => e.unitPrice);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const priceVariation = avgPrice > 0 ? ((maxPrice - minPrice) / avgPrice) * 100 : 0;
      
      // Ordenar por fecha para obtener el último precio
      const sorted = entries.sort((a, b) => 
        new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
      );
      const lastEntry = sorted[sorted.length - 1];

      return {
        itemId,
        itemName: lastEntry.itemName,
        itemSku: lastEntry.itemSku,
        priceVariation,
        lastPrice: lastEntry.unitPrice,
        avgPrice,
        purchaseCount: entries.length,
      };
    });

    // Ordenar por variación de precio descendente y limitar
    return variations
      .filter(v => v.purchaseCount >= 2) // Solo artículos con al menos 2 compras
      .sort((a, b) => b.priceVariation - a.priceVariation)
      .slice(0, limit);
  } catch (error) {
    console.error("Error fetching top price variations:", error);
    return [];
  }
}

/**
 * Obtiene el historial de un artículo agrupado por proveedor
 */
export async function getItemPricesBySupplier(itemId: string): Promise<{
  supplierId: string;
  supplierName: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  purchaseCount: number;
  lastPrice: number;
}[]> {
  try {
    const historySnapshot = await db
      .collection("inventory_history")
      .where("itemId", "==", itemId)
      .get();

    if (historySnapshot.empty) return [];

    // Agrupar por proveedor
    const bySupplier = new Map<string, InventoryHistoryEntry[]>();
    
    historySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const entry: InventoryHistoryEntry = {
        id: doc.id,
        itemId: data.itemId,
        itemSku: data.itemSku,
        itemName: data.itemName,
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        purchaseOrderId: data.purchaseOrderId,
        orderNumber: data.orderNumber,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalPrice: data.totalPrice,
        unit: data.unit,
        date: data.date?.toDate?.() ? data.date.toDate().toISOString() : data.date,
        projectId: data.projectId,
        projectName: data.projectName,
      };

      const existing = bySupplier.get(data.supplierId) || [];
      existing.push(entry);
      bySupplier.set(data.supplierId, existing);
    });

    return Array.from(bySupplier.entries()).map(([supplierId, entries]) => {
      const prices = entries.map(e => e.unitPrice);
      const sorted = entries.sort((a, b) => 
        new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
      );
      
      return {
        supplierId,
        supplierName: entries[0].supplierName,
        avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        purchaseCount: entries.length,
        lastPrice: sorted[sorted.length - 1].unitPrice,
      };
    }).sort((a, b) => a.avgPrice - b.avgPrice); // Ordenar por precio promedio ascendente
  } catch (error) {
    console.error("Error fetching prices by supplier:", error);
    return [];
  }
}

/**
 * Migra las órdenes de compra existentes a inventory_history
 * Solo procesa órdenes con status: Recibida, Recibida Parcialmente, Enviada al Proveedor
 * 
 * ⚠️ PROCESO SEGURO E INDEPENDIENTE:
 * - Este proceso es de SOLO LECTURA para las colecciones: purchaseOrders, suppliers, projects
 * - NUNCA modifica, actualiza o elimina documentos de estas colecciones
 * - SOLO ESCRIBE en la colección 'inventory_history' (nueva colección dedicada)
 * - Los registros existentes en inventory_history NO se duplican (se verifica antes de insertar)
 * - Las bases de datos originales permanecen completamente intactas
 */
export async function migrateExistingOrdersToHistory(): Promise<{
  success: boolean;
  message: string;
  details: {
    ordersProcessed: number;
    itemsCreated: number;
    skipped: number;
    errors: string[];
  };
}> {
  const errors: string[] = [];
  let ordersProcessed = 0;
  let itemsCreated = 0;
  let skipped = 0;

  try {
    // ==========================================
    // FASE 1: LECTURA DE DATOS (SOLO LECTURA)
    // ==========================================
    
    // 1. Obtener todas las órdenes con los status que queremos migrar (SOLO LECTURA)
    const ordersSnapshot = await db.collection("purchaseOrders").get();
    
    const validStatuses = ['Recibida', 'Recibida Parcialmente', 'Enviada al Proveedor'];
    const ordersToMigrate = ordersSnapshot.docs.filter(doc => {
      const status = doc.data().status;
      return validStatuses.includes(status);
    });

    if (ordersToMigrate.length === 0) {
      return {
        success: true,
        message: "No hay órdenes para migrar.",
        details: { ordersProcessed: 0, itemsCreated: 0, skipped: 0, errors: [] }
      };
    }

    // 2. Obtener proveedores para mapear nombres a IDs (SOLO LECTURA)
    const suppliersSnapshot = await db.collection("suppliers").get();
    const supplierNameToId = new Map<string, string>();
    suppliersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      supplierNameToId.set(data.name, doc.id);
    });

    // 3. Obtener proyectos para mapear IDs a nombres (SOLO LECTURA)
    const projectsSnapshot = await db.collection("projects").get();
    const projectIdToName = new Map<string, string>();
    projectsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      projectIdToName.set(doc.id, data.name || data.codigo_proyecto || doc.id);
    });

    // 4. Verificar qué combinaciones ya existen en inventory_history (SOLO LECTURA)
    // Esto previene duplicados - si ya existe el registro, se salta
    const existingHistorySnapshot = await db.collection("inventory_history").get();
    const existingKeys = new Set<string>();
    existingHistorySnapshot.docs.forEach(doc => {
      const data = doc.data();
      // Clave única: purchaseOrderId + itemId
      existingKeys.add(`${data.purchaseOrderId}_${data.itemId}`);
    });

    // ==========================================
    // FASE 2: ESCRITURA SOLO EN inventory_history
    // ==========================================
    
    // 5. Procesar cada orden - SOLO ESCRIBE EN inventory_history
    const batch = db.batch();
    let batchCount = 0;
    const MAX_BATCH_SIZE = 400; // Firestore permite 500, dejamos margen

    for (const orderDoc of ordersToMigrate) {
      const order = orderDoc.data();
      const orderId = orderDoc.id;
      const orderNumber = order.orderNumber || orderId;

      // Obtener fecha de la orden
      let orderDate: string;
      if (order.date?.toDate) {
        orderDate = order.date.toDate().toISOString();
      } else if (typeof order.date === 'string') {
        orderDate = order.date;
      } else {
        orderDate = new Date().toISOString();
      }

      // Procesar cada item de la orden
      const items = order.items || [];
      for (const item of items) {
        // Solo procesar materiales con itemId
        if (item.type !== 'Material' || !item.itemId) continue;

        // Verificar si ya existe - PREVIENE DUPLICADOS
        const key = `${orderId}_${item.itemId}`;
        if (existingKeys.has(key)) {
          skipped++;
          continue;
        }

        // Buscar ID del proveedor por nombre (usando datos en memoria, no consulta)
        const supplierId = supplierNameToId.get(order.supplier) || '';

        // Obtener nombre del proyecto (usando datos en memoria, no consulta)
        const projectName = order.projectName || projectIdToName.get(order.project) || order.project || '';

        // Crear registro de historial - SOLO SE ESCRIBE EN inventory_history
        const historyEntry = {
          itemId: item.itemId,
          itemSku: item.itemSku || '',
          itemName: item.itemName,
          supplierId: supplierId,
          supplierName: order.supplier || '',
          purchaseOrderId: orderId,
          orderNumber: orderNumber,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.quantity * item.price,
          unit: item.unit || 'ud',
          date: orderDate,
          projectId: order.project || '',
          projectName: projectName,
          migratedAt: new Date().toISOString(),
        };

        // ÚNICA OPERACIÓN DE ESCRITURA: inventory_history
        const newDocRef = db.collection("inventory_history").doc();
        batch.set(newDocRef, historyEntry);
        batchCount++;
        itemsCreated++;

        // Si alcanzamos el límite del batch, hacer commit y crear nuevo
        if (batchCount >= MAX_BATCH_SIZE) {
          await batch.commit();
          batchCount = 0;
        }
      }

      ordersProcessed++;
    }

    // Commit final si hay operaciones pendientes
    if (batchCount > 0) {
      await batch.commit();
    }

    return {
      success: true,
      message: `Migración completada. ${ordersProcessed} órdenes procesadas, ${itemsCreated} registros creados, ${skipped} omitidos (ya existían).`,
      details: { ordersProcessed, itemsCreated, skipped, errors }
    };

  } catch (error) {
    console.error("Error en migración:", error);
    return {
      success: false,
      message: `Error durante la migración: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      details: { ordersProcessed, itemsCreated, skipped, errors: [...errors, String(error)] }
    };
  }
}

/**
 * Crea registros en inventory_history para una orden específica
 * Usado cuando se recibe mercancía nueva
 * 
 * ⚠️ PROCESO SEGURO E INDEPENDIENTE:
 * - Este proceso es de SOLO LECTURA para las colecciones: purchaseOrders, suppliers, projects
 * - NUNCA modifica, actualiza o elimina documentos de estas colecciones
 * - SOLO ESCRIBE en la colección 'inventory_history'
 */
export async function createInventoryHistoryFromOrder(
  orderId: string,
  receivedItems: { itemId: string; quantity: number }[]
): Promise<{ success: boolean; message: string }> {
  try {
    // ==========================================
    // FASE 1: LECTURA DE DATOS (SOLO LECTURA)
    // ==========================================
    
    // Obtener la orden (SOLO LECTURA)
    const orderDoc = await db.collection("purchaseOrders").doc(orderId).get();
    if (!orderDoc.exists) {
      return { success: false, message: "Orden no encontrada" };
    }

    const order = orderDoc.data()!;
    const orderNumber = order.orderNumber || orderId;

    // Obtener fecha
    let orderDate: string;
    if (order.date?.toDate) {
      orderDate = order.date.toDate().toISOString();
    } else if (typeof order.date === 'string') {
      orderDate = order.date;
    } else {
      orderDate = new Date().toISOString();
    }

    // Obtener ID del proveedor (SOLO LECTURA)
    const suppliersSnapshot = await db.collection("suppliers")
      .where("name", "==", order.supplier)
      .limit(1)
      .get();
    const supplierId = suppliersSnapshot.empty ? '' : suppliersSnapshot.docs[0].id;

    // Obtener nombre del proyecto (SOLO LECTURA)
    let projectName = order.projectName || '';
    if (!projectName && order.project) {
      const projectDoc = await db.collection("projects").doc(order.project).get();
      if (projectDoc.exists) {
        const projectData = projectDoc.data()!;
        projectName = projectData.name || projectData.codigo_proyecto || order.project;
      }
    }

    // ==========================================
    // FASE 2: ESCRITURA SOLO EN inventory_history
    // ==========================================
    
    // Crear registros solo para items recibidos - SOLO ESCRIBE EN inventory_history
    const batch = db.batch();
    const orderItems = order.items || [];

    for (const receivedItem of receivedItems) {
      if (receivedItem.quantity === 0) continue;

      // Buscar info del item en la orden (datos en memoria, no consulta)
      const orderItem = orderItems.find((i: any) => i.itemId === receivedItem.itemId);
      if (!orderItem || orderItem.type !== 'Material') continue;

      const historyEntry = {
        itemId: receivedItem.itemId,
        itemSku: orderItem.itemSku || '',
        itemName: orderItem.itemName,
        supplierId: supplierId,
        supplierName: order.supplier || '',
        purchaseOrderId: orderId,
        orderNumber: orderNumber,
        quantity: receivedItem.quantity,
        unitPrice: orderItem.price,
        totalPrice: receivedItem.quantity * orderItem.price,
        unit: orderItem.unit || 'ud',
        date: new Date().toISOString(), // Fecha de recepción real
        projectId: order.project || '',
        projectName: projectName,
      };

      // ÚNICA OPERACIÓN DE ESCRITURA: inventory_history
      const newDocRef = db.collection("inventory_history").doc();
      batch.set(newDocRef, historyEntry);
    }

    await batch.commit();

    return { success: true, message: "Historial de precios actualizado" };
  } catch (error) {
    console.error("Error creating inventory history:", error);
    return { 
      success: false, 
      message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}` 
    };
  }
}

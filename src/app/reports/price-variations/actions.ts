"use server";

import { unstable_noStore as noStore } from "next/cache";
import { db } from "@/lib/firebase-admin";

export interface PurchaseDetail {
  id: string;
  date: Date;
  supplierId: string;
  supplierName: string;
  orderNumber: string;
  orderId: string;
  orderStatus: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  projectId: string;
  projectName: string;
}

export interface PriceVariationItem {
  itemId: string;
  itemName: string;
  itemSku: string;
  uniquePrices: number;
  minPrice: number;
  maxPrice: number;
  variationPercent: number;
  weightedAvgPrice: number;
  totalQuantity: number;
  totalAmount: number;
  suppliersCount: number;
  suppliers: string[];
  lastPrice: number;
  lastSupplier: string;
  lastDate: Date;
  impactEuros: number; // Cuánto se habría ahorrado comprando siempre al mínimo
  purchases: PurchaseDetail[];
}

export interface PriceVariationsData {
  items: PriceVariationItem[];
  totalItems: number;
  totalImpact: number;
  avgVariation: number;
}

export async function getPriceVariations(
  startDate?: string,
  endDate?: string,
  minVariation: number = 0,
  minImpact: number = 0
): Promise<PriceVariationsData> {
  noStore();

  try {
    // Obtener todos los registros de inventory_history (son compras)
    let query: FirebaseFirestore.Query = db.collection("inventory_history");

    // Filtrar por fecha si se proporciona
    if (startDate) {
      query = query.where("date", ">=", new Date(startDate));
    }
    if (endDate) {
      query = query.where("date", "<=", new Date(endDate));
    }

    const snapshot = await query.get();

    // Obtener todas las órdenes de compra para conocer su estado actual
    const purchaseOrdersSnapshot = await db.collection("purchaseOrders").get();
    const orderStatusMap = new Map<string, { status: string; id: string }>();
    purchaseOrdersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      // Mapear por orderNumber y por id
      if (data.orderNumber) {
        orderStatusMap.set(data.orderNumber, { status: data.status || 'Desconocido', id: doc.id });
      }
      orderStatusMap.set(doc.id, { status: data.status || 'Desconocido', id: doc.id });
    });

    // Agrupar por itemId
    const itemsMap = new Map<string, {
      itemId: string;
      itemName: string;
      itemSku: string;
      prices: Set<number>;
      purchases: PurchaseDetail[];
      totalQuantity: number;
      totalAmount: number;
      suppliers: Set<string>;
      supplierNames: Map<string, string>;
      lastPurchase: { date: Date; price: number; supplier: string } | null;
    }>();

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const itemId = data.itemId;
      
      if (!itemId) return;

      const unitPrice = data.unitPrice || 0;
      const quantity = data.quantity || 0;
      const totalPrice = data.totalPrice || (unitPrice * quantity);
      const purchaseDate = data.date?.toDate ? data.date.toDate() : new Date(data.date);

      // Obtener el estado de la orden
      const orderRef = data.orderNumber || data.purchaseOrderId || "";
      const orderInfo = orderStatusMap.get(orderRef) || { status: 'Desconocido', id: orderRef };

      const purchase: PurchaseDetail = {
        id: doc.id,
        date: purchaseDate,
        supplierId: data.supplierId || "",
        supplierName: data.supplierName || "Sin proveedor",
        orderNumber: data.orderNumber || data.purchaseOrderId || "-",
        orderId: orderInfo.id,
        orderStatus: orderInfo.status,
        quantity,
        unitPrice,
        totalPrice,
        projectId: data.projectId || "",
        projectName: data.projectName || "Sin proyecto",
      };

      if (!itemsMap.has(itemId)) {
        itemsMap.set(itemId, {
          itemId,
          itemName: data.itemName || "Sin nombre",
          itemSku: data.itemSku || "-",
          prices: new Set(),
          purchases: [],
          totalQuantity: 0,
          totalAmount: 0,
          suppliers: new Set(),
          supplierNames: new Map(),
          lastPurchase: null,
        });
      }

      const item = itemsMap.get(itemId)!;
      
      if (unitPrice > 0) {
        item.prices.add(unitPrice);
      }
      
      item.purchases.push(purchase);
      item.totalQuantity += quantity;
      item.totalAmount += totalPrice;
      
      if (data.supplierId) {
        item.suppliers.add(data.supplierId);
        item.supplierNames.set(data.supplierId, data.supplierName || "Sin nombre");
      }

      // Actualizar última compra
      if (!item.lastPurchase || purchaseDate > item.lastPurchase.date) {
        item.lastPurchase = {
          date: purchaseDate,
          price: unitPrice,
          supplier: data.supplierName || "Sin proveedor",
        };
      }
    });

    // Convertir a array y calcular métricas
    let items: PriceVariationItem[] = [];

    itemsMap.forEach((item) => {
      // Solo incluir items con más de 1 precio único (hay variación)
      if (item.prices.size < 2) return;

      const pricesArray = Array.from(item.prices);
      const minPrice = Math.min(...pricesArray);
      const maxPrice = Math.max(...pricesArray);
      const variationPercent = minPrice > 0 ? ((maxPrice - minPrice) / minPrice) * 100 : 0;
      const weightedAvgPrice = item.totalQuantity > 0 ? item.totalAmount / item.totalQuantity : 0;

      // Calcular impacto: cuánto se habría ahorrado comprando siempre al mínimo
      const impactEuros = item.purchases.reduce((acc, p) => {
        if (p.unitPrice > minPrice) {
          return acc + (p.unitPrice - minPrice) * p.quantity;
        }
        return acc;
      }, 0);

      // Ordenar compras por fecha descendente
      const sortedPurchases = item.purchases.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      items.push({
        itemId: item.itemId,
        itemName: item.itemName,
        itemSku: item.itemSku,
        uniquePrices: item.prices.size,
        minPrice,
        maxPrice,
        variationPercent,
        weightedAvgPrice,
        totalQuantity: item.totalQuantity,
        totalAmount: item.totalAmount,
        suppliersCount: item.suppliers.size,
        suppliers: Array.from(item.supplierNames.values()),
        lastPrice: item.lastPurchase?.price || 0,
        lastSupplier: item.lastPurchase?.supplier || "-",
        lastDate: item.lastPurchase?.date || new Date(),
        impactEuros,
        purchases: sortedPurchases,
      });
    });

    // Aplicar filtros
    if (minVariation > 0) {
      items = items.filter(item => item.variationPercent >= minVariation);
    }
    if (minImpact > 0) {
      items = items.filter(item => item.impactEuros >= minImpact);
    }

    // Ordenar por impacto descendente por defecto
    items.sort((a, b) => b.impactEuros - a.impactEuros);

    const totalImpact = items.reduce((acc, item) => acc + item.impactEuros, 0);
    const avgVariation = items.length > 0 
      ? items.reduce((acc, item) => acc + item.variationPercent, 0) / items.length 
      : 0;

    // Serializar fechas para cliente
    const serializedItems = items.map(item => ({
      ...item,
      lastDate: item.lastDate.toISOString(),
      purchases: item.purchases.map(p => ({
        ...p,
        date: p.date instanceof Date ? p.date.toISOString() : p.date,
      })),
    }));

    return {
      items: serializedItems as unknown as PriceVariationItem[],
      totalItems: items.length,
      totalImpact,
      avgVariation,
    };
  } catch (error) {
    console.error("Error fetching price variations:", error);
    return {
      items: [],
      totalItems: 0,
      totalImpact: 0,
      avgVariation: 0,
    };
  }
}

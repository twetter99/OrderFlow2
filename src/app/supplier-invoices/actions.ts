"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase-admin";
import type { SupplierInvoice, PurchaseOrder } from "@/lib/types";

export async function addSupplierInvoice(data: Omit<SupplierInvoice, "id">, purchaseOrders: PurchaseOrder[]) {
  try {
    const { bases, ...rest } = data as any;
    
    const vatAmount = bases.reduce((acc: number, item: { baseAmount: number; vatRate: number; }) => {
      const base = Number(item.baseAmount) || 0;
      const rate = Number(item.vatRate) || 0;
      return acc + (base * rate);
    }, 0);
    
    const totalAmount = bases.reduce((acc: number, item: { baseAmount: number; vatRate: number; }) => {
      const base = Number(item.baseAmount) || 0;
      const rate = Number(item.vatRate) || 0;
      return acc + base + (base * rate);
    }, 0);

    const poTotal = (rest.purchaseOrderIds || []).reduce((acc: number, poId: string) => {
      const order = purchaseOrders.find(po => po.id === poId);
      return acc + (order?.total || 0);
    }, 0);

    const difference = totalAmount - poTotal;

    const finalValues = {
      ...rest,
      bases,
      vatAmount,
      totalAmount,
      totalAmountDifference: difference,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("supplierInvoices").add(finalValues);
    revalidatePath("/supplier-invoices");
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding supplier invoice:", error);
    return { success: false, error: "No se pudo crear la factura" };
  }
}

export async function updateSupplierInvoice(id: string, data: Partial<SupplierInvoice>, purchaseOrders: PurchaseOrder[]) {
  try {
    const { bases, ...rest } = data as any;
    
    const vatAmount = bases.reduce((acc: number, item: { baseAmount: number; vatRate: number; }) => {
      const base = Number(item.baseAmount) || 0;
      const rate = Number(item.vatRate) || 0;
      return acc + (base * rate);
    }, 0);
    
    const totalAmount = bases.reduce((acc: number, item: { baseAmount: number; vatRate: number; }) => {
      const base = Number(item.baseAmount) || 0;
      const rate = Number(item.vatRate) || 0;
      return acc + base + (base * rate);
    }, 0);

    const poTotal = (rest.purchaseOrderIds || []).reduce((acc: number, poId: string) => {
      const order = purchaseOrders.find(po => po.id === poId);
      return acc + (order?.total || 0);
    }, 0);

    const difference = totalAmount - poTotal;

    const finalValues = {
      ...rest,
      bases,
      vatAmount,
      totalAmount,
      totalAmountDifference: difference,
      updatedAt: new Date().toISOString(),
    };

    await db.collection("supplierInvoices").doc(id).update(finalValues);
    revalidatePath("/supplier-invoices");
    return { success: true };
  } catch (error) {
    console.error("Error updating supplier invoice:", error);
    return { success: false, error: "No se pudo actualizar la factura" };
  }
}

export async function deleteSupplierInvoice(id: string) {
  try {
    await db.collection("supplierInvoices").doc(id).delete();
    revalidatePath("/supplier-invoices");
    return { success: true };
  } catch (error) {
    console.error("Error deleting supplier invoice:", error);
    return { success: false, error: "No se pudo eliminar la factura" };
  }
}

export async function deleteMultipleInvoices(ids: string[]) {
  if (ids.length === 0) {
    return { success: false, message: "No se seleccionaron facturas para eliminar." };
  }

  try {
    const batch = db.batch();
    ids.forEach(id => {
      const docRef = db.collection("supplierInvoices").doc(id);
      batch.delete(docRef);
    });
    await batch.commit();
    revalidatePath("/supplier-invoices");
    return { success: true, message: `${ids.length} factura(s) eliminada(s).` };
  } catch(error) {
    console.error("Error deleting multiple invoices: ", error);
    return { success: false, message: "No se pudieron eliminar las facturas." };
  }
}

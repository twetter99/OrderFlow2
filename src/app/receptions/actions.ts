"use server";

import { db } from "@/lib/firebase-admin";
import { admin } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import type { PurchaseOrder, PurchaseOrderItem, DeliveryNoteAttachment } from "@/lib/types";

export async function confirmReception(
  orderId: string,
  receivingLocationId: string,
  receivedItems: { itemId: string; quantity: number }[],
  receptionNotes: string,
  isPartial: boolean
) {
  try {
    const orderDoc = await db.collection("purchaseOrders").doc(orderId).get();
    if (!orderDoc.exists) {
      return { success: false, error: "No se encontró la orden de compra original." };
    }

    const originalOrder = { id: orderDoc.id, ...orderDoc.data() } as PurchaseOrder;
    const batch = db.batch();
    
    let newStatus: PurchaseOrder['status'] = isPartial ? 'Recibida Parcialmente' : 'Recibida';

    // 1. Update Inventory in the selected location
    for (const itemToReceive of receivedItems) {
      if (itemToReceive.quantity === 0) continue;
      
      const invLocSnapshot = await db.collection("inventoryLocations")
        .where("itemId", "==", itemToReceive.itemId)
        .where("locationId", "==", receivingLocationId)
        .get();

      if (!invLocSnapshot.empty) {
        const docToUpdate = invLocSnapshot.docs[0];
        const newQuantity = docToUpdate.data().quantity + itemToReceive.quantity;
        batch.update(docToUpdate.ref, { quantity: newQuantity });
      } else {
        const newDocRef = db.collection("inventoryLocations").doc();
        batch.set(newDocRef, {
          itemId: itemToReceive.itemId,
          locationId: receivingLocationId,
          quantity: itemToReceive.quantity,
        });
      }
    }

    let backorderId: string | undefined = undefined;

    // 2. If partial, create a backorder
    if (isPartial) {
      const pendingItems: PurchaseOrderItem[] = [];
      originalOrder.items.forEach((originalItem: any) => {
        const received = receivedItems.find(r => r.itemId === originalItem.itemId);
        const receivedQty = received ? received.quantity : 0;
        if (receivedQty < originalItem.quantity) {
          pendingItems.push({
            ...originalItem,
            quantity: originalItem.quantity - receivedQty,
          });
        }
      });

      if (pendingItems.length > 0) {
        // Generate new order number
        const countDoc = await db.collection("counters").doc("purchaseOrders").get();
        let nextNumber = 1;
        if (countDoc.exists) {
          nextNumber = (countDoc.data()?.count || 0) + 1;
          await db.collection("counters").doc("purchaseOrders").update({ count: nextNumber });
        } else {
          await db.collection("counters").doc("purchaseOrders").set({ count: 1 });
        }
        const orderNumber = `OC-${String(nextNumber).padStart(5, '0')}`;

        const backorderData: any = {
          supplier: originalOrder.supplier,
          supplierId: originalOrder.supplierId,
          projectId: originalOrder.projectId,
          projectName: originalOrder.projectName,
          status: 'Enviada al Proveedor',
          originalOrderId: orderId,
          items: pendingItems,
          orderNumber,
          date: originalOrder.date,
          estimatedDeliveryDate: originalOrder.estimatedDeliveryDate,
          total: pendingItems.reduce((acc, item) => acc + (item.quantity * item.price), 0),
          statusHistory: [{
            status: 'Enviada al Proveedor',
            date: new Date().toISOString(),
            comment: `Backorder de la orden ${originalOrder.orderNumber}. Notas originales: ${receptionNotes}`
          }],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const newBackorderRef = db.collection("purchaseOrders").doc();
        batch.set(newBackorderRef, backorderData);
        backorderId = newBackorderRef.id;
      }
    }

    // 3. Update original Purchase Order
    const historyComment = isPartial
      ? `Recepción parcial. Backorder ${backorderId} creado. Notas: ${receptionNotes}`
      : `Recepción completa. Notas: ${receptionNotes}`;

    const updateData: any = {
      status: newStatus,
      receptionNotes,
      statusHistory: admin.firestore.FieldValue.arrayUnion({
        status: newStatus,
        date: new Date().toISOString(),
        comment: historyComment
      }),
    };
    
    if (backorderId) {
      updateData.backorderIds = admin.firestore.FieldValue.arrayUnion(backorderId);
    }
    
    batch.update(db.collection("purchaseOrders").doc(orderId), updateData);

    await batch.commit();

    revalidatePath("/receptions");
    return { success: true, backorderId };
  } catch (error) {
    console.error("Error confirming reception:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function attachDeliveryNoteToPurchaseOrder(
  orderId: string,
  deliveryNotes: DeliveryNoteAttachment[]
) {
  try {
    await db.collection("purchaseOrders").doc(orderId).update({
      deliveryNotes: admin.firestore.FieldValue.arrayUnion(...deliveryNotes),
      hasDeliveryNotes: true,
    });
    
    revalidatePath("/receptions");
    return { success: true };
  } catch (error) {
    console.error("Error attaching delivery note:", error);
    return { success: false, error: (error as Error).message };
  }
}

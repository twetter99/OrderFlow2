"use server";

import { db } from "@/lib/firebase-admin";
import { admin } from "@/lib/firebase-admin";
import { revalidatePath, revalidateTag } from "next/cache";
import type { PurchaseOrder, PurchaseOrderItem, DeliveryNoteAttachment, Project } from "@/lib/types";

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

    // Crear un mapa de items originales para acceder a precios
    const originalItemsMap = new Map<string, PurchaseOrderItem>();
    (originalOrder.items || []).forEach((item: PurchaseOrderItem) => {
      if (item.itemId) {
        originalItemsMap.set(item.itemId, item);
      }
    });

    // Obtener fecha de la orden para el historial
    let orderDate: string;
    if (originalOrder.date && typeof originalOrder.date === 'object' && '_seconds' in originalOrder.date) {
      orderDate = new Date((originalOrder.date as any)._seconds * 1000).toISOString();
    } else if (originalOrder.date && typeof originalOrder.date === 'object' && 'toDate' in originalOrder.date) {
      orderDate = (originalOrder.date as any).toDate().toISOString();
    } else {
      orderDate = originalOrder.date as string || new Date().toISOString();
    }

    // 1. Update Inventory in the selected location AND create inventory_history
    for (const itemToReceive of receivedItems) {
      if (itemToReceive.quantity === 0) continue;
      
      // Actualizar inventoryLocations
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

      // Crear registro en inventory_history para tracking de costes
      const originalItem = originalItemsMap.get(itemToReceive.itemId);
      if (originalItem) {
        const historyRef = db.collection("inventory_history").doc();
        batch.set(historyRef, {
          itemId: itemToReceive.itemId,
          itemSku: originalItem.itemSku || '',
          itemName: originalItem.itemName,
          supplierId: originalOrder.supplierId || '',
          supplierName: originalOrder.supplierName || originalOrder.supplier || '',
          purchaseOrderId: orderId,
          orderNumber: originalOrder.orderNumber || orderId,
          quantity: itemToReceive.quantity,
          unitPrice: originalItem.price,
          unitCost: originalItem.price, // Alias para compatibilidad
          totalPrice: itemToReceive.quantity * originalItem.price,
          unit: originalItem.unit || 'ud',
          date: orderDate,
          projectId: originalOrder.project || '',
          projectName: originalOrder.projectName || '',
          locationId: receivingLocationId,
          receivedAt: new Date().toISOString(),
          type: 'reception',
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

    // 4. Actualizar totales pre-calculados en el proyecto
    if (originalOrder.project) {
      try {
        // Calcular el total de materiales recibidos en esta operación
        let receivedTotal = 0;
        for (const itemToReceive of receivedItems) {
          if (itemToReceive.quantity === 0) continue;
          const originalItem = originalItemsMap.get(itemToReceive.itemId);
          if (originalItem) {
            receivedTotal += itemToReceive.quantity * originalItem.price;
          }
        }

        // Calcular cuánto se mueve de comprometido a recibido
        // Si la orden estaba en Aprobada/Enviada al Proveedor, el total estaba en committed
        const wasCommitted = ['Aprobada', 'Enviada al Proveedor'].includes(originalOrder.status);
        
        const projectRef = db.collection("projects").doc(originalOrder.project);
        await db.runTransaction(async (transaction) => {
          const projectDoc = await transaction.get(projectRef);
          if (!projectDoc.exists) {
            console.warn(`⚠️ Proyecto ${originalOrder.project} no encontrado`);
            return;
          }

          const projectData = projectDoc.data() as Project;
          const currentMaterialsReceived = projectData.materialsReceived || 0;
          const currentMaterialsCommitted = projectData.materialsCommitted || 0;

          const updateData: Partial<Project> = {
            materialsReceived: currentMaterialsReceived + receivedTotal,
          };

          // Si estaba comprometido, reducir el comprometido por lo recibido
          if (wasCommitted) {
            updateData.materialsCommitted = Math.max(0, currentMaterialsCommitted - receivedTotal);
          }

          transaction.update(projectRef, updateData);
          console.log(`✅ Proyecto ${originalOrder.project} actualizado: materialsReceived +${receivedTotal}€`);
        });
      } catch (projectError) {
        console.error("❌ Error actualizando totales del proyecto:", projectError);
        // No fallamos la recepción, solo logueamos el error
      }
    }

    revalidatePath("/receptions");
    revalidateTag("project-tracking");
    revalidateTag(`project-${originalOrder.project}`);
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

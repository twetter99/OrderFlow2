"use server";

import { db, admin } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import type { DeliveryNote, InventoryItem } from "@/lib/types";

export async function addDeliveryNote(data: Omit<DeliveryNote, "id">, inventoryItems: InventoryItem[]) {
  const batch = db.batch();

  try {
    // 1. Create the delivery note document
    const newNoteRef = db.collection("deliveryNotes").doc();
    batch.set(newNoteRef, {
      ...data,
      date: admin.firestore.FieldValue.serverTimestamp(),
      status: 'Completado'
    });

    // 2. Update stock for each item
    for (const item of data.items || []) {
      const inventoryItem = inventoryItems.find(i => i.id === item.itemId);
      if (!inventoryItem) throw new Error(`Item with ID ${item.itemId} not found.`);

      if (inventoryItem.type === 'composite') {
        // Deduct components for a kit
        for (const component of inventoryItem.components || []) {
          const componentLocationSnapshot = await db.collection("inventoryLocations")
            .where("itemId", "==", component.itemId)
            .where("locationId", "==", data.locationId)
            .get();
          
          if (componentLocationSnapshot.empty) {
            throw new Error(`Component ${component.itemId} not found in location ${data.locationId}`);
          }
          const docToUpdate = componentLocationSnapshot.docs[0];
          const currentQuantity = docToUpdate.data().quantity || 0;
          const quantityToDeduct = component.quantity * item.quantity;
          batch.update(docToUpdate.ref, { quantity: currentQuantity - quantityToDeduct });
        }
      } else {
        // Deduct a simple item
        const itemLocationSnapshot = await db.collection("inventoryLocations")
          .where("itemId", "==", item.itemId)
          .where("locationId", "==", data.locationId)
          .get();
        
        if (itemLocationSnapshot.empty) {
          throw new Error(`Item ${item.itemId} not found in location ${data.locationId}`);
        }
        const docToUpdate = itemLocationSnapshot.docs[0];
        const currentQuantity = docToUpdate.data().quantity || 0;
        batch.update(docToUpdate.ref, { quantity: currentQuantity - item.quantity });
      }
    }

    await batch.commit();
    revalidatePath("/despatches");
    return { success: true, id: newNoteRef.id };
  } catch (error) {
    console.error("Error creating despatch note:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteDeliveryNote(id: string) {
  try {
    await db.collection("deliveryNotes").doc(id).delete();
    revalidatePath("/despatches");
    return { success: true };
  } catch (error) {
    console.error("Error deleting delivery note:", error);
    return { success: false, error: "No se pudo eliminar el albarán" };
  }
}

export async function deleteMultipleDeliveryNotes(ids: string[]) {
  try {
    const batch = db.batch();
    ids.forEach(id => {
      const docRef = db.collection("deliveryNotes").doc(id);
      batch.delete(docRef);
    });
    await batch.commit();
    revalidatePath("/despatches");
    return { success: true };
  } catch (error) {
    console.error("Error deleting delivery notes:", error);
    return { success: false, error: "No se pudieron eliminar los albaranes" };
  }
}

"use server";

import { db } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import type { InventoryItem, InventoryLocation } from "@/lib/types";

export async function addInventoryItem(data: Omit<InventoryItem, "id">) {
  try {
    const docRef = await db.collection("inventory").add({
      ...data,
      createdAt: new Date().toISOString(),
    });
    revalidatePath("/inventory");
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding inventory item:", error);
    return { success: false, error: "No se pudo crear el artículo" };
  }
}

export async function updateInventoryItem(id: string, data: Partial<InventoryItem>) {
  try {
    await db.collection("inventory").doc(id).update({
      ...data,
      updatedAt: new Date().toISOString(),
    });
    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return { success: false, error: "No se pudo actualizar el artículo" };
  }
}

export async function deleteInventoryItem(id: string) {
  try {
    await db.collection("inventory").doc(id).delete();
    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    return { success: false, error: "No se pudo eliminar el artículo" };
  }
}

export async function deleteMultipleInventoryItems(ids: string[]) {
  try {
    const batch = db.batch();
    ids.forEach(id => {
      const docRef = db.collection("inventory").doc(id);
      batch.delete(docRef);
    });
    await batch.commit();
    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("Error deleting inventory items:", error);
    return { success: false, error: "No se pudieron eliminar los artículos" };
  }
}

export async function addStock(itemId: string, locationId: string, quantity: number) {
  try {
    // Check if there's existing stock for this item at this location
    const existingSnapshot = await db.collection("inventoryLocations")
      .where("itemId", "==", itemId)
      .where("locationId", "==", locationId)
      .get();

    if (!existingSnapshot.empty) {
      // Update existing stock
      const docRef = existingSnapshot.docs[0].ref;
      const currentQuantity = existingSnapshot.docs[0].data().quantity || 0;
      await docRef.update({ quantity: currentQuantity + quantity });
    } else {
      // Add new stock entry
      await db.collection("inventoryLocations").add({
        itemId,
        locationId,
        quantity
      });
    }

    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("Error adding stock:", error);
    return { success: false, error: "No se pudo añadir el stock" };
  }
}

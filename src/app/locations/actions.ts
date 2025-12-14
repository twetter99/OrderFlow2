"use server";

import { db, admin } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";

export async function addLocation(values: any) {
  try {
    const docRef = await db.collection("locations").add({
      ...values,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    revalidatePath("/locations");
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding location:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function updateLocation(id: string, values: any) {
  try {
    await db.collection("locations").doc(id).update(values);
    revalidatePath("/locations");
    return { success: true };
  } catch (error) {
    console.error("Error updating location:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteLocation(id: string) {
  try {
    // Check if location has stock
    const inventoryLocationsSnapshot = await db.collection("inventoryLocations")
      .where("locationId", "==", id)
      .get();
    
    const hasStock = inventoryLocationsSnapshot.docs.some(doc => doc.data().quantity > 0);
    if (hasStock) {
      return { success: false, error: "No se puede eliminar el almacén porque contiene stock. Transfiere los artículos primero." };
    }

    await db.collection("locations").doc(id).delete();
    revalidatePath("/locations");
    return { success: true };
  } catch (error) {
    console.error("Error deleting location:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteMultipleLocations(ids: string[]) {
  try {
    const batch = db.batch();
    
    // Check for stock in each location
    for (const id of ids) {
      const inventoryLocationsSnapshot = await db.collection("inventoryLocations")
        .where("locationId", "==", id)
        .get();
      
      const hasStock = inventoryLocationsSnapshot.docs.some(doc => doc.data().quantity > 0);
      if (hasStock) {
        const locDoc = await db.collection("locations").doc(id).get();
        const locName = locDoc.data()?.name || id;
        return { success: false, error: `No se puede eliminar "${locName}" porque contiene stock.` };
      }
    }
    
    for (const id of ids) {
      batch.delete(db.collection("locations").doc(id));
    }
    
    await batch.commit();
    revalidatePath("/locations");
    return { success: true, message: `${ids.length} almacén(es) eliminado(s).` };
  } catch (error) {
    console.error("Error deleting locations:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function transferStock(values: { 
  itemId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
}) {
  try {
    const batch = db.batch();

    // Decrement from source
    const fromSnapshot = await db.collection("inventoryLocations")
      .where("itemId", "==", values.itemId)
      .where("locationId", "==", values.fromLocationId)
      .get();

    if (fromSnapshot.empty) {
      return { success: false, error: "Stock de origen no encontrado." };
    }

    const fromDoc = fromSnapshot.docs[0];
    const fromCurrentQty = fromDoc.data().quantity;
    
    if (fromCurrentQty < values.quantity) {
      return { success: false, error: "No hay suficiente stock en el origen." };
    }

    const fromNewQty = fromCurrentQty - values.quantity;
    batch.update(fromDoc.ref, { quantity: fromNewQty });

    // Increment in destination
    const toSnapshot = await db.collection("inventoryLocations")
      .where("itemId", "==", values.itemId)
      .where("locationId", "==", values.toLocationId)
      .get();

    if (toSnapshot.empty) {
      // If item doesn't exist in destination, create new entry
      const newEntryRef = db.collection("inventoryLocations").doc();
      batch.set(newEntryRef, {
        itemId: values.itemId,
        locationId: values.toLocationId,
        quantity: values.quantity
      });
    } else {
      // If it exists, update quantity
      const toDoc = toSnapshot.docs[0];
      const toNewQty = toDoc.data().quantity + values.quantity;
      batch.update(toDoc.ref, { quantity: toNewQty });
    }

    await batch.commit();
    revalidatePath("/locations");
    return { success: true };
  } catch (error) {
    console.error("Error transferring stock:", error);
    return { success: false, error: (error as Error).message };
  }
}

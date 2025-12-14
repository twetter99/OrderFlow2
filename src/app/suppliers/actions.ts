"use server";

import { db } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";

export async function addSupplier(data: any) {
  try {
    const docRef = await db.collection("suppliers").add({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
    });
    revalidatePath("/suppliers");
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding supplier:", error);
    return { success: false, message: "No se pudo crear el proveedor." };
  }
}

export async function updateSupplier(id: string, data: any) {
  try {
    await db.collection("suppliers").doc(id).update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });
    revalidatePath("/suppliers");
    return { success: true };
  } catch (error) {
    console.error("Error updating supplier:", error);
    return { success: false, message: "No se pudo actualizar el proveedor." };
  }
}

export async function deleteSupplier(id: string) {
  try {
    await db.collection("suppliers").doc(id).delete();
    revalidatePath("/suppliers");
    return { success: true };
  } catch (error) {
    console.error("Error deleting supplier:", error);
    return { success: false, message: "No se pudo eliminar el proveedor." };
  }
}

export async function deleteSuppliers(ids: string[]) {
  try {
    const batch = db.batch();
    for (const id of ids) {
      batch.delete(db.collection("suppliers").doc(id));
    }
    await batch.commit();
    revalidatePath("/suppliers");
    return { success: true };
  } catch (error) {
    console.error("Error deleting suppliers:", error);
    return { success: false, message: "No se pudieron eliminar los proveedores." };
  }
}

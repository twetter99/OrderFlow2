"use server";

import { db } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";

export async function addClient(data: any) {
  try {
    const docRef = await db.collection("clients").add({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
    });

    revalidatePath("/clients");

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding client:", error);
    return { success: false, message: "No se pudo crear el cliente." };
  }
}

export async function updateClient(id: string, data: any) {
  try {
    await db.collection("clients").doc(id).update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });

    revalidatePath("/clients");

    return { success: true };
  } catch (error) {
    console.error("Error updating client:", error);
    return { success: false, message: "No se pudo actualizar el cliente." };
  }
}

export async function deleteClient(id: string) {
  try {
    await db.collection("clients").doc(id).delete();

    revalidatePath("/clients");

    return { success: true };
  } catch (error) {
    console.error("Error deleting client:", error);
    return { success: false, message: "No se pudo eliminar el cliente." };
  }
}

export async function deleteClients(ids: string[]) {
  try {
    const batch = db.batch();
    
    for (const id of ids) {
      batch.delete(db.collection("clients").doc(id));
    }

    await batch.commit();

    revalidatePath("/clients");

    return { success: true };
  } catch (error) {
    console.error("Error deleting clients:", error);
    return { success: false, message: "No se pudieron eliminar los clientes." };
  }
}

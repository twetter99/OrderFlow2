"use server";

import { db } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import type { Operador } from "@/lib/types";

export async function addOperador(data: Omit<Operador, "id">) {
  try {
    const docRef = await db.collection("operadores").add({
      ...data,
      createdAt: new Date().toISOString(),
    });
    revalidatePath("/operadores");
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding operador:", error);
    return { success: false, error: "No se pudo crear el operador" };
  }
}

export async function updateOperador(id: string, data: Partial<Operador>) {
  try {
    await db.collection("operadores").doc(id).update({
      ...data,
      updatedAt: new Date().toISOString(),
    });
    revalidatePath("/operadores");
    return { success: true };
  } catch (error) {
    console.error("Error updating operador:", error);
    return { success: false, error: "No se pudo actualizar el operador" };
  }
}

export async function deleteOperador(id: string) {
  try {
    await db.collection("operadores").doc(id).delete();
    revalidatePath("/operadores");
    return { success: true };
  } catch (error) {
    console.error("Error deleting operador:", error);
    return { success: false, error: "No se pudo eliminar el operador" };
  }
}

"use server";

import { db } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import type { Supervisor } from "@/lib/types";

export async function addSupervisor(data: Omit<Supervisor, "id">) {
  try {
    const docRef = await db.collection("supervisores").add({
      ...data,
      createdAt: new Date().toISOString(),
    });
    revalidatePath("/supervisores");
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding supervisor:", error);
    return { success: false, error: "No se pudo crear el supervisor" };
  }
}

export async function updateSupervisor(id: string, data: Partial<Supervisor>) {
  try {
    await db.collection("supervisores").doc(id).update({
      ...data,
      updatedAt: new Date().toISOString(),
    });
    revalidatePath("/supervisores");
    return { success: true };
  } catch (error) {
    console.error("Error updating supervisor:", error);
    return { success: false, error: "No se pudo actualizar el supervisor" };
  }
}

export async function deleteSupervisor(id: string) {
  try {
    await db.collection("supervisores").doc(id).delete();
    revalidatePath("/supervisores");
    return { success: true };
  } catch (error) {
    console.error("Error deleting supervisor:", error);
    return { success: false, error: "No se pudo eliminar el supervisor" };
  }
}

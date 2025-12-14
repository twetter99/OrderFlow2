"use server";

import { db } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";

export async function addTechnician(data: any) {
  try {
    const docRef = await db.collection("technicians").add({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
    });
    revalidatePath("/technicians");
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding technician:", error);
    return { success: false, message: "No se pudo crear el técnico." };
  }
}

export async function updateTechnician(id: string, data: any) {
  try {
    await db.collection("technicians").doc(id).update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });
    revalidatePath("/technicians");
    return { success: true };
  } catch (error) {
    console.error("Error updating technician:", error);
    return { success: false, message: "No se pudo actualizar el técnico." };
  }
}

export async function deleteTechnician(id: string) {
  try {
    await db.collection("technicians").doc(id).delete();
    revalidatePath("/technicians");
    return { success: true };
  } catch (error) {
    console.error("Error deleting technician:", error);
    return { success: false, message: "No se pudo eliminar el técnico." };
  }
}

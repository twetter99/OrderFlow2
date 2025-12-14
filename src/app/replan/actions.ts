"use server";

import { db } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";

export async function addReplanteo(values: any) {
  try {
    const docRef = await db.collection("replanteos").add({
      ...values,
      createdAt: new Date().toISOString(),
    });
    revalidatePath("/replan");
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding replanteo:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function updateReplanteo(id: string, values: any) {
  try {
    await db.collection("replanteos").doc(id).update(values);
    revalidatePath("/replan");
    return { success: true };
  } catch (error) {
    console.error("Error updating replanteo:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteReplanteo(id: string) {
  try {
    await db.collection("replanteos").doc(id).delete();
    revalidatePath("/replan");
    return { success: true };
  } catch (error) {
    console.error("Error deleting replanteo:", error);
    return { success: false, error: (error as Error).message };
  }
}

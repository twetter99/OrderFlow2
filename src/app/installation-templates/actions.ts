"use server";

import { db, admin } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";

export async function addInstallationTemplate(values: any) {
  try {
    const dataToSave = {
      ...values,
      fecha_creacion: new Date().toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection("installationTemplates").add(dataToSave);
    revalidatePath("/installation-templates");
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding template:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function updateInstallationTemplate(id: string, values: any) {
  try {
    const dataToSave = {
      ...values,
      fecha_creacion: new Date().toISOString(),
    };
    await db.collection("installationTemplates").doc(id).update(dataToSave);
    revalidatePath("/installation-templates");
    return { success: true };
  } catch (error) {
    console.error("Error updating template:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteInstallationTemplate(id: string) {
  try {
    await db.collection("installationTemplates").doc(id).delete();
    revalidatePath("/installation-templates");
    return { success: true };
  } catch (error) {
    console.error("Error deleting template:", error);
    return { success: false, error: (error as Error).message };
  }
}

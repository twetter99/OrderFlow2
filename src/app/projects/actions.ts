"use server";

import { db } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";

export async function addProject(data: any) {
  try {
    const docRef = await db.collection("projects").add({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
    });
    
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding project:", error);
    return { success: false, message: "No se pudo crear el proyecto." };
  }
}

export async function updateProject(id: string, data: any) {
  try {
    await db.collection("projects").doc(id).update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    
    return { success: true };
  } catch (error) {
    console.error("Error updating project:", error);
    return { success: false, message: "No se pudo actualizar el proyecto." };
  }
}

export async function deleteProject(id: string) {
  try {
    await db.collection("projects").doc(id).delete();
    
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting project:", error);
    return { success: false, message: "No se pudo eliminar el proyecto." };
  }
}

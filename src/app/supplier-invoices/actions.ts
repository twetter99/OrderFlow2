
"use server";

import { revalidatePath } from "next/cache";
import { collection, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function deleteMultipleInvoices(ids: string[]) {
    if (ids.length === 0) {
        return { success: false, message: "No se seleccionaron facturas para eliminar." };
    }

    try {
        const batch = writeBatch(db);
        ids.forEach(id => {
            const docRef = doc(db, "supplierInvoices", id);
            batch.delete(docRef);
        });
        await batch.commit();
        revalidatePath("/supplier-invoices");
        return { success: true, message: `${ids.length} factura(s) eliminada(s).` };
    } catch(error) {
        console.error("Error deleting multiple invoices: ", error);
        return { success: false, message: "No se pudieron eliminar las facturas." };
    }
}
